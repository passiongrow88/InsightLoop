import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import Auth from "./components/Auth";
import Home from "./components/Home";
import Journal from "./components/Journal";
import Manifestation from "./components/Manifestation";
import Billing from "./components/Billing";
import Paywall from "./components/Paywall";
import MemberSpace from "./components/MemberSpace";
import AdminConsole from "./components/AdminConsole";
import FounderInvitation from "./components/FounderInvitation";
import DailyRecord from "./components/DailyRecord";
import CompanionOnboarding from "./components/CompanionOnboarding";

import { getMyEntitlement, isPaywallActive } from "./services/entitlements";
import {
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
} from "./services/entriesStore";

import { supabase } from "./services/supabaseClient";

import {
  JournalEntry,
  ManifestationItem,
  ViewType,
  Language,
  User,
  CompanionId,
} from "./types";

function toAppUser(authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): User {
  const metadata = authUser.user_metadata || {};
  const companion = metadata.insightloop_companion;

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name: typeof metadata.name === "string" ? metadata.name : "",
    reminderTime: typeof metadata.reminder_time === "string" ? metadata.reminder_time : undefined,
    companion: companion === "phoenix" || companion === "thunder" ? companion : undefined,
    companionName: typeof metadata.insightloop_companion_name === "string" ? metadata.insightloop_companion_name : undefined,
    companionChosenAt: typeof metadata.insightloop_companion_chosen_at === "string" ? metadata.insightloop_companion_chosen_at : undefined,
  };
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [language, setLanguage] = useState<Language>("zh");
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [goals, setGoals] = useState<ManifestationItem[]>([]);
  const [isAppReady, setIsAppReady] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [paywallChecked, setPaywallChecked] = useState(false);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [inviteToken, setInviteToken] = useState(() => new URLSearchParams(window.location.search).get("invite"));

  useEffect(() => {
    const savedLang = localStorage.getItem("insightLoop_lang_global");
    if (savedLang) setLanguage(savedLang as Language);

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.warn("Supabase getUser error:", error.message);
          setCurrentUser(null);
        } else if (data?.user) {
          setCurrentUser(toAppUser(data.user));
        } else {
          setCurrentUser(null);
        }
      } finally {
        setIsAppReady(true);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) setCurrentUser(toAppUser(session.user));
      else setCurrentUser(null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setEntries([]);
      setGoals([]);
      setPaywall(false);
      setPaywallChecked(false);
      setCloudLoaded(false);
      return;
    }

    setCloudLoaded(false);
    (async () => {
      try {
        const [journalRows, manifestRows] = await Promise.all([
          listEntries<JournalEntry>("journal"),
          listEntries<ManifestationItem>("manifestation"),
        ]);
        setEntries(journalRows || []);
        setGoals(manifestRows || []);
      } catch (e) {
        console.error("Error loading cloud data", e);
        const userKey = `insightLoop_data_${currentUser.email}`;
        const userDataStr = localStorage.getItem(userKey);
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            setEntries(userData.entries || []);
            setGoals(userData.goals || []);
            if (userData.language) setLanguage(userData.language);
          } catch {}
        }
      } finally {
        setCloudLoaded(true);
      }
    })();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && isAppReady) {
      const userKey = `insightLoop_data_${currentUser.email}`;
      localStorage.setItem(userKey, JSON.stringify({ entries, goals, language }));
    }
  }, [entries, goals, currentUser, isAppReady, language]);

  useEffect(() => {
    localStorage.setItem("insightLoop_lang_global", language);
  }, [language]);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const ent = await getMyEntitlement();
        setPaywall(isPaywallActive(ent));
      } catch (e) {
        console.error("Entitlement check failed:", e);
        setPaywall(false);
      } finally {
        setPaywallChecked(true);
      }
    })();
  }, [currentUser]);

  const handleLogin = (_user: User) => setCurrentView("home");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentView("home");
    setEditingEntry(null);
    setPaywall(false);
    setPaywallChecked(false);
    setCloudLoaded(false);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    const usersStr = localStorage.getItem("insightLoop_users");
    if (usersStr) {
      try {
        const users: User[] = JSON.parse(usersStr);
        localStorage.setItem(
          "insightLoop_users",
          JSON.stringify(users.map((u) => (u.email === updatedUser.email ? updatedUser : u)))
        );
      } catch {}
    }
  };

  const handleCompanionComplete = async (companion: CompanionId, companionName: string) => {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        insightloop_companion: companion,
        insightloop_companion_name: companionName,
        insightloop_companion_chosen_at: new Date().toISOString(),
      },
    });
    if (error || !data.user) throw error || new Error("Could not save your companion choice.");
    setCurrentUser(toAppUser(data.user));
  };

  const handleAddEntry = async (entry: JournalEntry) => {
    setEntries((prev) => [entry, ...prev]);
    setCurrentView("history");
    setEditingEntry(null);
    try {
      const newId = await createEntry("journal", entry);
      setEntries((prev) => prev.map((e) => (e === entry ? { ...e, id: e.id ?? newId } : e)));
    } catch (e) {
      console.error("Create journal entry failed", e);
      setEntries((prev) => prev.filter((x) => x !== entry));
      alert("保存失败：云端写入失败（请确认已登录且网络正常）");
    }
  };

  const handleAddDailyEntry = async (entry: JournalEntry): Promise<string> => {
    setEntries((prev) => [entry, ...prev]);
    try {
      const newId = await createEntry("journal", entry);
      setEntries((prev) => prev.map((e) => (e === entry ? { ...e, id: e.id ?? newId } : e)));
      return newId;
    } catch (e) {
      console.error("Create daily journal entry failed", e);
      setEntries((prev) => prev.filter((x) => x !== entry));
      alert("保存失败：云端写入失败（请确认已登录且网络正常）");
      throw e;
    }
  };

  const handleUpdateDailyEntry = async (updatedEntry: JournalEntry) => {
    if (!updatedEntry.id) throw new Error("Missing entry id");
    setEntries((prev) => prev.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)));
    await updateEntry(updatedEntry.id, "journal", updatedEntry);
  };

  const handleUpdateEntry = async (updatedEntry: JournalEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e)));
    setCurrentView("history");
    setEditingEntry(null);
    try {
      if (!updatedEntry.id) throw new Error("Missing entry id");
      await updateEntry(updatedEntry.id, "journal", updatedEntry);
    } catch (e) {
      console.error("Update journal entry failed", e);
      alert("更新失败：云端更新失败（请刷新后重试）");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const snapshot = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteEntry(id, "journal");
    } catch (e) {
      console.error("Delete journal entry failed", e);
      setEntries(snapshot);
      alert("删除失败：云端删除失败（请刷新后重试）");
    }
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setCurrentView("journal");
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setCurrentView("history");
  };

  const handleAddGoal = async (goal: ManifestationItem) => {
    setGoals((prev) => [goal, ...prev]);
    try {
      const newId = await createEntry("manifestation", goal);
      setGoals((prev) => prev.map((g) => (g === goal ? { ...g, id: g.id ?? newId } : g)));
    } catch (e) {
      console.error("Create goal failed", e);
      setGoals((prev) => prev.filter((x) => x !== goal));
      alert("保存失败：显化目标云端写入失败");
    }
  };

  const handleUpdateGoal = async (updatedGoal: ManifestationItem) => {
    setGoals((prev) => prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)));
    try {
      if (!updatedGoal.id) throw new Error("Missing goal id");
      await updateEntry(updatedGoal.id, "manifestation", updatedGoal);
    } catch (e) {
      console.error("Update goal failed", e);
      alert("更新失败：显化目标云端更新失败");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const snapshot = goals;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      await deleteEntry(id, "manifestation");
    } catch (e) {
      console.error("Delete goal failed", e);
      setGoals(snapshot);
      alert("删除失败：显化目标云端删除失败");
    }
  };

  const handleSetCurrentView = (view: ViewType) => {
    if (view !== "journal" && editingEntry) setEditingEntry(null);
    setCurrentView(view);
  };

  if (!isAppReady) return null;
  if (!currentUser) return <Auth onLogin={handleLogin} language={language} setLanguage={setLanguage} />;

  if (inviteToken) {
    return (
      <FounderInvitation
        token={inviteToken}
        language={language}
        onComplete={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", url);
          setInviteToken(null);
          setCurrentView("home");
        }}
      />
    );
  }

  if (!currentUser.companion) {
    return <CompanionOnboarding language={language} onComplete={handleCompanionComplete} />;
  }
  if (!paywallChecked) return null;
  if (paywall) return <Paywall />;
  if (!cloudLoaded) return null;

  const dailyRecord = (
    <DailyRecord
      onAddEntry={handleAddDailyEntry}
      onUpdateEntry={handleUpdateDailyEntry}
      entries={entries}
      companion={currentUser.companion}
      companionName={currentUser.companionName || (currentUser.companion === "phoenix" ? "凤凰" : "小雷公")}
      language={language}
    />
  );

  const renderContent = () => {
    switch (currentView) {
      case "home":
        return dailyRecord;
      case "journal":
        return (
          <Journal
            entries={entries}
            onAddEntry={handleAddEntry}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            language={language}
            viewOnly={false}
            editingEntry={editingEntry}
            onCancelEdit={handleCancelEdit}
            currentUser={currentUser}
          />
        );
      case "manifestation":
        return (
          <Manifestation
            goals={goals}
            journalHistory={entries}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
            language={language}
            currentUser={currentUser}
          />
        );
      case "history":
        return (
          <Journal
            entries={entries}
            onAddEntry={handleAddEntry}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            language={language}
            viewOnly={true}
            onEditEntry={handleEditEntry}
          />
        );
      case "billing":
        return <Billing language={language} />;
      case "member-space":
        return <MemberSpace language={language} setCurrentView={handleSetCurrentView} />;
      case "admin":
        return <AdminConsole language={language} />;
      default:
        return dailyRecord;
    }
  };

  return (
    <Layout
      currentView={currentView}
      setCurrentView={handleSetCurrentView}
      language={language}
      setLanguage={setLanguage}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
