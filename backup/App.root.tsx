import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import Auth from "./components/Auth";
import Home from "./components/Home";
import Journal from "./components/Journal";
import Manifestation from "./components/Manifestation";
import Paywall from "./components/Paywall";
import { getMyEntitlement, isPaywallActive } from "./services/entitlements";
import { JournalEntry, ManifestationItem, ViewType, Language, User } from "./types";

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

  // 1. Initial Load (Check for existing session)
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

  // 2. Load User Data when User Changes
  useEffect(() => {
    if (!currentUser) {
      // Clear sensitive data from memory on logout
      setEntries([]);
      setGoals([]);
      setPaywall(false);
      setPaywallChecked(false);
      return;
    }

    const userKey = `insightLoop_data_${currentUser.email}`;
    const userDataStr = localStorage.getItem(userKey);

    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        setEntries(userData.entries || []);
        setGoals(userData.goals || []);
        if (userData.language) setLanguage(userData.language);
      } catch (e) {
        console.error("Error loading user data", e);
      }
    } else {
      setEntries([]);
      setGoals([]);
    }
  }, [currentUser]);

  // 3. Save User Data on Change
  useEffect(() => {
    if (currentUser && isAppReady) {
      const userKey = `insightLoop_data_${currentUser.email}`;
      const userData = { entries, goals, language };
      localStorage.setItem(userKey, JSON.stringify(userData));
    }
  }, [entries, goals, currentUser, isAppReady, language]);

  // 4. Persist Language Global Preference
  useEffect(() => {
    localStorage.setItem("insightLoop_lang_global", language);
  }, [language]);

  // 5. Check Paywall (after login)
  useEffect(() => {
    if (!currentUser) return;

    (async () => {
      const ent = await getMyEntitlement();
      setPaywall(isPaywallActive(ent));
      setPaywallChecked(true);
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

  const handleAddEntry = (entry: JournalEntry) => {
    setEntries((prev) => [entry, ...prev]);
    setCurrentView("history");
    setEditingEntry(null);
  };

  const handleUpdateEntry = (updatedEntry: JournalEntry) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
    setCurrentView("history");
    setEditingEntry(null);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setCurrentView("journal");
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setCurrentView("history");
  };

  const handleAddGoal = (goal: ManifestationItem) => {
    setGoals((prev) => [goal, ...prev]);
  };

  const handleUpdateGoal = (updatedGoal: ManifestationItem) => {
    setGoals((prev) => prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)));
  };

  const handleDeleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleSetCurrentView = (view: ViewType) => {
    if (view !== "journal" && editingEntry) setEditingEntry(null);
    setCurrentView(view);
  };

  // --- Render ---

  if (!isAppReady) return null;

  if (!currentUser) {
    return <Auth onLogin={handleLogin} language={language} setLanguage={setLanguage} />;
  }

  // Wait paywall check (avoid flashing UI)
  if (!paywallChecked) return null;

  // Paywall block
  if (paywall) return <Paywall />;

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
