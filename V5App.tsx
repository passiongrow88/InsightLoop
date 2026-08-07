import React, { useEffect, useState } from "react";
import Auth from "./components/Auth";
import V5StudyShell from "./components/v5/V5StudyShell";
import { JournalEntry, Language, User } from "./types";
import { createEntry, listEntries } from "./services/entriesStore";
import { supabase } from "./services/supabaseClient";

const V5App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("insightLoop_lang_global");
    return saved === "en" ? "en" : "zh";
  });

  useEffect(() => {
    localStorage.setItem("insightLoop_lang_global", language);
  }, [language]);

  useEffect(() => {
    let mounted = true;

    const mapUser = (user: any): User => ({
      email: user?.email || "",
      name:
        user?.user_metadata?.name ||
        user?.user_metadata?.full_name ||
        (user?.email ? String(user.email).split("@")[0] : ""),
    });

    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!error && data?.user) setCurrentUser(mapUser(data.user));
    };

    void init();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!mounted) return;
      if (session?.user) {
        setCurrentUser(mapUser(session.user));
        setAuthGateOpen(false);
      } else {
        setCurrentUser(null);
        setEntries([]);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    const load = async () => {
      try {
        const rows = await listEntries<JournalEntry>("journal");
        if (!cancelled) setEntries(rows || []);
      } catch (error) {
        console.error("V5 journal load failed", error);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const saveEntry = async (entry: JournalEntry) => {
    if (!currentUser) throw new Error(language === "zh" ? "请先登录后保存。" : "Please sign in before saving.");

    setEntries((prev) => [entry, ...prev]);
    try {
      const newId = await createEntry("journal", entry);
      setEntries((prev) =>
        prev.map((item) => (item.id === entry.id ? { ...item, id: newId || item.id } : item)),
      );
    } catch (error) {
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
      console.error("V5 journal save failed", error);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setEntries([]);
  };

  return (
    <>
      <V5StudyShell
        language={language}
        currentUser={currentUser}
        entries={entries}
        onRequestAuth={() => setAuthGateOpen(true)}
        onSaveEntry={saveEntry}
        onLogout={logout}
      />

      {authGateOpen && !currentUser && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#1d140e]/72 p-3 backdrop-blur-md sm:p-6">
          <button
            onClick={() => setAuthGateOpen(false)}
            className="fixed right-4 top-4 z-[130] rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs text-white/85 backdrop-blur-sm hover:bg-black/50"
          >
            {language === "zh" ? "回到日记" : "Back to journal"}
          </button>
          <Auth
            onLogin={() => setAuthGateOpen(false)}
            language={language}
            setLanguage={setLanguage}
          />
        </div>
      )}
    </>
  );
};

export default V5App;
