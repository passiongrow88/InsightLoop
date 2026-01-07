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
  loadJournals,
  saveJournal,
  deleteJournal,
  loadGoals,
  saveGoal,
  deleteGoal,
} from "./services/cloudStore";

import { supabase } from "./supabaseClient"; // ✅ 根目录版（与 services/cloudStore.ts 对齐）

import {
  JournalEntry,
  ManifestationItem,
  ViewType,
  Language,
  User,
} from "./types";

function App() {
  // Auth State (真实来源：Supabase session)
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
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // Paywall State
  const [paywall, setPaywall] = useState(false);
  const [paywallChecked, setPaywallChecked] = useState(false);

  // 0) Language global
  useEffect(() => {
    const savedLang = localStorage.getItem("insightLoop_lang_global");
    if (savedLang) setLanguage(savedLang as Language);
    setIsAppReady(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("insightLoop_lang_global", language);
  }, [language]);

  // 1) Boot: get Supabase session + listen auth changes (跨设备关键)
  useEffect(() => {
    if (!isAppReady) return;

    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;

      if (!alive) return;

      if (u) {
        // 你原本的 User 类型如果不是 supabase user，这里只保留最必要字段
        setCurrentUser({
          id: u.id,
          email: u.email ?? "",
        } as any);
      } else {
        setCurrentUser(null);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u) {
        setCurrentUser({
          id: u.id,
          email: u.email ?? "",
        } as any);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [isAppReady]);

  // 2) Load cloud data after auth user ready
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
        const [j, g] = await Promise.all([loadJournals(), loadGoals()]);
        setEntries(j || []);
        setGoals(g || []);
      } catch (e) {
        console.error("Cloud load failed:", e);
        setEntries([]);
        setGoals([]);
      } finally {
        setCloudLoaded(true);
      }
    })();
  }, [currentUser]);

  // 3) Paywall check
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
  // Auth 组件登录成功后，应该已经触发 supabase session
  // 这里仅用于切 view
  const handleLogin = (_user: User) => {
    setCurrentView("home");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentView("home");
    setEditingEntry(null);
    setPaywall(false);
    setPaywallChecked(false);
    setCloudLoaded(false);
  };

  const handleUpdateUser = (updatedUser: User) => {
    // 你如果有 profile 更新逻辑，可保留；不影响跨设备
    setCurrentUser(updatedUser);
  };

  // --- Journal CRUD ---
  const handleAddEntry = async (entry: JournalEntry) => {
    setEntries((prev) => [entry, ...prev]);
    setCurrentView("history");
    setEditingEntry(null);

    try {
      await saveJournal(entry);
      const j = await loadJournals();
      setEntries(j || []);
    } catch (e) {
      console.error("saveJournal failed", e);
      alert("保存失败：云端写入失败（请确认手机/电脑都真的登录成功）");
    }
  };

  const handleUpdateEntry = async (updatedEntry: JournalEntry) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
    setCurrentView("history");
    setEditingEntry(null);

    try {
      await saveJournal(updatedEntry);
      const j = await loadJournals();
      setEntries(j || []);
    } catch (e) {
      console.error("update journal failed", e);
      alert("更新失败：云端更新失败");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const snapshot = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));

    try {
      await deleteJournal(id);
      const j = await loadJournals();
      setEntries(j || []);
    } catch (e) {
      console.error("delete journal failed", e);
      setEntries(snapshot);
      alert("删除失败：云端删除失败");
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

  // --- Goals CRUD ---
  const handleAddGoal = async (goal: ManifestationItem) => {
    setGoals((prev) => [goal, ...prev]);
    try {
      await saveGoal(goal);
      const g = await loadGoals();
      setGoals(g || []);
    } catch (e) {
      console.error("saveGoal failed", e);
      alert("保存失败：显化云端写入失败");
    }
  };

  const handleUpdateGoal = async (updatedGoal: ManifestationItem) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
    );
    try {
      await saveGoal(updatedGoal);
      const g = await loadGoals();
      setGoals(g || []);
    } catch (e) {
      console.error("update goal failed", e);
      alert("更新失败：显化云端更新失败");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const snapshot = goals;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      await deleteGoal(id);
      const g = await loadGoals();
      setGoals(g || []);
    } catch (e) {
      console.error("delete goal failed", e);
      setGoals(snapshot);
      alert("删除失败：显化云端删除失败");
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
