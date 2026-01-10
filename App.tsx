import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import Auth from "./components/Auth";
import Home from "./components/Home";
import Journal from "./components/Journal";
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
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App State
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [language, setLanguage] = useState<Language>("zh");
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  // Data State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [goals, setGoals] = useState<ManifestationItem[]>([]);

  // Loading & Initialization
  const [isAppReady, setIsAppReady] = useState(false);

  // Paywall State
  const [paywall, setPaywall] = useState(false);
  const [paywallChecked, setPaywallChecked] = useState(false);

  // Data loading indicator (avoid flashing empty lists)
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // 1) Initial Load (CRITICAL: ONLY trust Supabase session, not localStorage session)
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
          } as unknown as User);
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
        } as unknown as User);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2) Load User Data when User Changes (NOW: from Supabase)
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

        // Fallback: show local cache if any (NOT source of truth)
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

  // 3) Save lightweight cache (optional fallback, not source of truth)
  useEffect(() => {
    if (currentUser && isAppReady) {
      const userKey = `insightLoop_data_${currentUser.email}`;
      const userData = { entries, goals, language };
      localStorage.setItem(userKey, JSON.stringify(userData));
    }
  }, [entries, goals, currentUser, isAppReady, language]);

  // 4) Persist Language Global Preference
  useEffect(() => {
    localStorage.setItem("insightLoop_lang_global", language);
  }, [language]);

  // 5) Check Paywall (after login)
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

  // --- Actions ---

  // IMPORTANT:
  // Auth.tsx MUST do real Supabase sign-in.
  // After sign-in, onAuthStateChange above will set currentUser automatically.
  const handleLogin = (_user: User) => {
    setCurrentView("home");
  };

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
    // Keep in-memory user updated for UI fields (if any)
    setCurrentUser(updatedUser);

    // Keep your old "users" cache if you still use it elsewhere
    const usersStr = localStorage.getItem("insightLoop_users");
    if (usersStr) {
      try {
        const users: User[] = JSON.parse(usersStr);
        const newUsers = users.map((u) =>
          u.email === updatedUser.email ? updatedUser : u
        );
        localStorage.setItem("insightLoop_users", JSON.stringify(newUsers));
      } catch {}
    }
  };

  // --- Journal CRUD (write to Supabase) ---

  const handleAddEntry = async (entry: JournalEntry) => {
    // optimistic UI
    setEntries((prev) => [entry, ...prev]);
    setCurrentView("history");
    setEditingEntry(null);

    try {
      const newId = await createEntry("journal", entry);
      // ensure local state id matches DB id for later update/delete
      setEntries((prev) =>
        prev.map((e) => (e === entry ? { ...e, id: e.id ?? newId } : e))
      );
    } catch (e) {
      console.error("Create journal entry failed", e);
      // rollback
      setEntries((prev) => prev.filter((x) => x !== entry));
      alert("保存失败：云端写入失败（请确认已登录且网络正常）");
    }
  };

  const handleUpdateEntry = async (updatedEntry: JournalEntry) => {
    // optimistic
    setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
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
      setEntries(snapshot); // rollback
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

  // --- Manifestation CRUD (write to Supabase) ---

  const handleAddGoal = async (goal: ManifestationItem) => {
    setGoals((prev) => [goal, ...prev]);

    try {
      const newId = await createEntry("manifestation", goal);
      setGoals((prev) =>
        prev.map((g) => (g === goal ? { ...g, id: g.id ?? newId } : g))
      );
    } catch (e) {
      console.error("Create goal failed", e);
      setGoals((prev) => prev.filter((x) => x !== goal));
      alert("保存失败：显化目标云端写入失败");
    }
  };

  const handleUpdateGoal = async (updatedGoal: ManifestationItem) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
    );

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

  // --- Render ---

  if (!isAppReady) return null;

  if (!currentUser) {
    return (
      <Auth onLogin={handleLogin} language={language} setLanguage={setLanguage} />
    );
  }

  // Wait paywall check (avoid flashing UI)
  if (!paywallChecked) return null;

  // Paywall block
  if (paywall) return <Paywall />;

  // Optional: wait cloud load once after login (prevents "empty flash")
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
            onSuccess={() => console.log("Resource added!")}
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
