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

// ✅ 这里一定是 ./services/cloudStore （因为你的文件在 services/ 不是 src/services）
import {
  loadJournals,
  saveJournal,
  deleteJournal,
  loadGoals,
  saveGoal,
  deleteGoal,
} from "./services/cloudStore";

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

  // 1) Initial Load
  useEffect(() => {
    const savedSession = localStorage.getItem("insightLoop_session");
    const savedLang = localStorage.getItem("insightLoop_lang_global");

    if (savedLang) setLanguage(savedLang as Language);

    if (savedSession) {
      try {
        const user = JSON.parse(savedSession);
        setCurrentUser(user);
      } catch (e) {
        console.error("Invalid session", e);
      }
    }

    setIsAppReady(true);
  }, []);

  // 2) Load from Cloud when user changes (跨设备关键)
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
        console.error("Cloud load failed, fallback to local cache:", e);

        // fallback cache (仅备用)
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

  // 3) local cache (备用，不是主数据源)
  useEffect(() => {
    if (currentUser && isAppReady) {
      const userKey = `insightLoop_data_${currentUser.email}`;
      localStorage.setItem(
        userKey,
        JSON.stringify({ entries, goals, language })
      );
    }
  }, [entries, goals, currentUser, isAppReady, language]);

  // 4) global language
  useEffect(() => {
    localStorage.setItem("insightLoop_lang_global", language);
  }, [language]);

  // 5) Check Paywall
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

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("insightLoop_session", JSON.stringify(user));
    setCurrentView("home");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("insightLoop_session");
    setCurrentView("home");
    setEditingEntry(null);
    setPaywall(false);
    setPaywallChecked(false);
    setCloudLoaded(false);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("insightLoop_session", JSON.stringify(updatedUser));

    const usersStr = localStorage.getItem("insightLoop_users");
    if (usersStr) {
      const users: User[] = JSON.parse(usersStr);
      const newUsers = users.map((u) =>
        u.email === updatedUser.email ? updatedUser : u
      );
      localStorage.setItem("insightLoop_users", JSON.stringify(newUsers));
    }
  };

  // --- Journal (Cloud) ---
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
      alert("保存失败：云端写入失败");
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

  // --- Goals (Cloud) ---
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

  // ✅ 这句是避免你登录后 “空一下”，等云端数据回来
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
