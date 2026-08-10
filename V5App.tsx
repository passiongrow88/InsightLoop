import React, { useEffect, useState } from "react";
import Auth from "./components/Auth";
import V5StudyShell from "./components/v5/V5StudyShell";
import { JournalEntry, Language, User } from "./types";
import { createEntry, listEntries, updateEntry } from "./services/entriesStore";
import { getSupabaseClient, isSupabaseConfigured, supabase } from "./services/supabaseClient";
import { getMyEntitlement } from "./services/entitlements";

const V5App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("insightLoop_lang_global");
    return saved === "en" ? "en" : "zh";
  });

  useEffect(() => {
    localStorage.setItem("insightLoop_lang_global", language);
  }, [language]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let mounted = true;

    const mapUser = (user: any): User => ({
      id: user?.id || "",
      email: user?.email || "",
      name:
        user?.user_metadata?.name ||
        user?.user_metadata?.full_name ||
        (user?.email ? String(user.email).split("@")[0] : ""),
    });

    const init = async () => {
      const { data, error } = await client.auth.getUser();
      if (!mounted) return;
      if (!error && data?.user) setCurrentUser(mapUser(data.user));
    };

    void init();

    const { data: subscription } = client.auth.onAuthStateChange((_event: any, session: any) => {
      if (!mounted) return;
      if (session?.user) {
        setCurrentUser(mapUser(session.user));
        setAuthGateOpen(false);
      } else {
        setCurrentUser(null);
        setEntries([]);
        setPlan("free");
        setSubscriptionStatus(null);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !supabase) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [rows, entitlement] = await Promise.all([
          listEntries<JournalEntry>("journal"),
          getMyEntitlement(),
        ]);
        if (!cancelled) {
          setEntries(rows || []);
          setPlan(entitlement.plan);
          setSubscriptionStatus(entitlement.subscriptionStatus || null);
        }
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
    if (!supabase) {
      throw new Error(language === "zh"
        ? "这个 Preview 尚未配置安全储存，因此不能永久保存。你写下的草稿仍会保留在当前浏览器。"
        : "This Preview is not configured for secure storage, so it cannot permanently save yet. Your draft remains in this browser.");
    }
    if (!currentUser) throw new Error(language === "zh" ? "请先登录后保存。" : "Please sign in before saving.");

    try {
      const newId = await createEntry("journal", entry);
      setEntries((prev) => [{ ...entry, id: newId || entry.id }, ...prev]);
    } catch (error) {
      console.error("V5 journal save failed", error);
      throw error;
    }
  };

  const updateSavedEntry = async (entry: JournalEntry) => {
    if (!supabase || !currentUser) {
      throw new Error(language === "zh" ? "请先登录后更新日记。" : "Please sign in before updating the journal.");
    }
    await updateEntry(entry.id, "journal", entry);
    setEntries((prev) => prev.map((item) => (item.id === entry.id ? entry : item)));
  };

  const logout = async () => {
    if (!supabase) return;
    await getSupabaseClient().auth.signOut();
    setCurrentUser(null);
    setEntries([]);
  };

  return (
    <>
      <V5StudyShell
        language={language}
        currentUser={currentUser}
        entries={entries}
        plan={plan}
        subscriptionStatus={subscriptionStatus}
        persistenceAvailable={isSupabaseConfigured}
        onRequestAuth={() => setAuthGateOpen(true)}
        onSaveEntry={saveEntry}
        onUpdateEntry={updateSavedEntry}
        onLogout={logout}
      />

      {authGateOpen && !currentUser && isSupabaseConfigured && (
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

      {authGateOpen && !currentUser && !isSupabaseConfigured && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1d140e]/72 p-4 backdrop-blur-md">
          <section className="w-full max-w-md rounded-[28px] border border-[#e8cfaa]/15 bg-[#2a2018]/96 p-7 text-center shadow-2xl">
            <p className="font-serif text-xl text-[#fff0d8]">
              {language === "zh" ? "这间 Preview 还不能保存" : "This Preview cannot save yet"}
            </p>
            <p className="mt-4 text-sm leading-7 text-[#d7c4aa]">
              {language === "zh"
                ? "安全储存尚未配置。你仍可先探索书房和写草稿；草稿会留在当前浏览器，但注册和永久保存暂时不可用。"
                : "Secure storage is not configured. You can still explore the study and write a browser draft, but registration and permanent saving are not available yet."}
            </p>
            <button
              onClick={() => setAuthGateOpen(false)}
              className="mt-6 rounded-full bg-[#66482a] px-5 py-2.5 text-sm text-[#fff8e8] shadow-md"
            >
              {language === "zh" ? "回到书房" : "Return to study"}
            </button>
          </section>
        </div>
      )}
    </>
  );
};

export default V5App;
