import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import Auth from "./components/Auth";
import Home from "./components/Home";
import Journal from "./components/Journal";
import JournalExperience from "./components/JournalExperience";
import Manifestation from "./components/Manifestation";
import Billing from "./components/Billing";
import Paywall from "./components/Paywall";
import MemberSpace from "./components/MemberSpace";
import AdminResourceUpload from "./components/AdminResourceUpload";

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
} from "./types";

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
          setCurrentUser({
            id: data.user.id,
            email: data.user.email ?? "",
          });
        } else {
          setCurrentUser(null);
        }
      } finally {
        setIsAppReady(true);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email ?? "",
        });
      } else {
        setCurrentUser(null);
      }
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
      } catch (error) {
        console.error("Error loading cloud data", error);
        const userKey = `insightLoop_data_${currentUser.email}`;
        const userDataStr = localStorage.getItem(userKey);
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            setEntries(userData.entries || []);
            setGoals(userData.goals || []);
            if (userData.language) setLanguage(userData.language);
          } catch {
            // Ignore malformed fallback cache.
          }
        }
      } finally {
        setCloudLoaded(true);
      }
    })();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && isAppReady) {
      const userKey = `insightLoop_data_${currentUser.email}`;
      localStorage.setItem(
        userKey,
        JSON.stringify({ entries, goals, language })
      );
    }
  }, [entries, goals, currentUser, isAppReady, language]);

  useEffect(() => {
    localStorage.setItem("insightLoop_lang_global", language);
  }, [language]);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const entitlement = await getMyEntitlement();
        setPaywall(isPaywallActive(entitlement));
      } catch (error) {
        console.error("Entitlement check failed:", error);
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
    if (!usersStr) return;
    try {
      const users: User[] = JSON.parse(usersStr);
      localStorage.setItem(
        "insightLoop_users",
        JSON.stringify(
          users.map((user) =>
            user.email === updatedUser.email ? updatedUser : user
          )
        )
      );
    } catch {
      // Ignore malformed legacy cache.
    }
  };

  const handleAddEntry = async (entry: JournalEntry) => {
    setEntries((previous) => [entry, ...previous]);
    setCurrentView("history");
    setEditingEntry(null);

    try {
      const newId = await createEntry("journal", entry);
      setEntries((previous) =>
        previous.map((item) =>
          item === entry ? { ...item, id: item.id ?? newId } : item
        )
      );
    } catch (error) {
      console.error("Create journal entry failed", error);
      setEntries((previous) => previous.filter((item) => item !== entry));
      alert("保存失败：云端写入失败（请确认已登录且网络正常）");
      throw error;
    }
  };

  const handleUpdateEntry = async (updatedEntry: JournalEntry) => {
    setEntries((previous) =>
      previous.map((entry) =>
        entry.id === updatedEntry.id ? updatedEntry : entry
      )
    );
    setCurrentView("history");
    setEditingEntry(null);

    try {
      if (!updatedEntry.id) throw new Error("Missing entry id");
      await updateEntry(updatedEntry.id, "journal", updatedEntry);
    } catch (error) {
      console.error("Update journal entry failed", error);
      alert("更新失败：云端更新失败（请刷新后重试）");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const snapshot = entries;
    setEntries((previous) => previous.filter((entry) => entry.id !== id));
    try {
      await deleteEntry(id, "journal");
    } catch (error) {
      console.error("Delete journal entry failed", error);
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
    setGoals((previous) => [goal, ...previous]);
    try {
      const newId = await createEntry("manifestation", goal);
      setGoals((previous) =>
        previous.map((item) =>
          item === goal ? { ...item, id: item.id ?? newId } : item
        )
      );
    } catch (error) {
      console.error("Create goal failed", error);
      setGoals((previous) => previous.filter((item) => item !== goal));
      alert("保存失败：显化目标云端写入失败");
    }
  };

  const handleUpdateGoal = async (updatedGoal: ManifestationItem) => {
    setGoals((previous) =>
      previous.map((goal) =>
        goal.id === updatedGoal.id ? updatedGoal : goal
      )
    );
    try {
      if (!updatedGoal.id) throw new Error("Missing entry id");
      await updateEntry(updatedGoal.id, "manifestation", updatedGoal);
    } catch (error) {
      console.error("Update goal failed", error);
      alert("更新失败：显化目标云端更新失败");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const snapshot = goals;
    setGoals((previous) => previous.filter((goal) => goal.id !== id));
    try {
      await deleteEntry(id, "manifestation");
    } catch (error) {
      console.error("Delete goal failed", error);
      setGoals(snapshot);
      alert("删除失败：显化目标云端删除失败");
    }
  };

  const handleSetCurrentView = (view: ViewType) => {
    if (view !== "journal" && editingEntry) setEditingEntry(null);
    setCurrentView(view);
  };

  if (!isAppReady) return null;
  if (!currentUser) {
    return (
      <Auth onLogin={handleLogin} language={language} setLanguage={setLanguage} />
    );
  }
  if (!paywallChecked) return null;
  if (paywall) return <Paywall />;
  if (!cloudLoaded) return null;

  const renderContent = () => {
    switch (currentView) {
      case "home":
        return (
          <Home
            setCurrentView={handleSetCurrentView}
            language={language}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
          />
        );
      case "journal":
        if (editingEntry) {
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
        }
        return (
          <JournalExperience
            entries={entries}
            onAddEntry={handleAddEntry}
            language={language}
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
        return (
          <MemberSpace
            language={language}
            setCurrentView={handleSetCurrentView}
          />
        );
      case "admin":
        return (
          <AdminResourceUpload
            language={language}
            onSuccess={() => console.log("Resource added")}
          />
        );
      default:
        return (
          <Home
            setCurrentView={handleSetCurrentView}
            language={language}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
          />
        );
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
