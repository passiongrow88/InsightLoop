import React, { useState } from "react";
import { ArrowRight, ChevronLeft, Clock3, Lock, Mail, ShieldCheck, Sparkles, UserCircle } from "lucide-react";
import { User, Language } from "../types";
import { supabase } from "../services/supabaseClient";
import { CompanionMedia } from "./CompanionMedia";

interface AuthProps {
  onLogin: (user: User) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

type Screen = "landing" | "login" | "register";

const copy = {
  zh: {
    eyebrow: "不是陪聊，而是一颗会记得你的大脑",
    title: "当熟悉的路口再次出现，\n看见这一次仍然有选择。",
    body: "记录今天的故事、梦境和选择。InsightLoop 会在真实日期与原话的基础上，陪你看见重复，也看见你已经不同的地方。",
    primary: "开始第一段记录",
    login: "已有账号登录",
    privacy: "你的记录由你掌控。AI 的理解可以被修改或否定。",
    today: "今天",
    todayText: "我明明不同意，却还是没有说。",
    memory: "过去的你",
    memoryText: "我怕说出来以后，大家会觉得我难相处。",
    insight: "这一次的不同",
    insightText: "你已经开始在意：沉默是否仍是你想要的选择。",
    loginTitle: "欢迎回来",
    registerTitle: "开始认识自己",
    name: "名字",
    email: "邮箱",
    password: "密码",
    loginButton: "登录并继续",
    registerButton: "创建我的空间",
    switchRegister: "还没有账号？开始记录",
    switchLogin: "已经有账号？返回登录",
    working: "处理中…",
    back: "返回介绍",
    registered: "注册成功。请先验证邮箱，然后再登录。",
    invalid: "请输入有效的邮箱和密码。",
  },
  en: {
    eyebrow: "Not a chat pet — a mind that remembers you",
    title: "When a familiar crossroads returns,\nsee that you still have a choice.",
    body: "Record today's stories, dreams and choices. InsightLoop uses real dates and your own words to reveal repetition—and where you have already changed.",
    primary: "Start my first record",
    login: "I already have an account",
    privacy: "Your records stay under your control. You can edit or reject every AI interpretation.",
    today: "Today",
    todayText: "I disagreed, but I still said nothing.",
    memory: "A past moment",
    memoryText: "I was afraid people would think I was difficult.",
    insight: "What is different now",
    insightText: "You have begun to ask whether silence is still the choice you want.",
    loginTitle: "Welcome back",
    registerTitle: "Begin knowing yourself",
    name: "Name",
    email: "Email",
    password: "Password",
    loginButton: "Sign in and continue",
    registerButton: "Create my space",
    switchRegister: "New here? Start recording",
    switchLogin: "Already registered? Sign in",
    working: "Working…",
    back: "Back to introduction",
    registered: "Registered. Please verify your email, then sign in.",
    invalid: "Enter a valid email and password.",
  },
} as const;

const Auth: React.FC<AuthProps> = ({ onLogin, language, setLanguage }) => {
  const c = copy[language];
  const [screen, setScreen] = useState<Screen>("landing");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });

  const isRegistering = screen === "register";

  const openAuth = (next: "login" | "register") => {
    setScreen(next);
    setError("");
    setNotice("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const email = formData.email.trim().toLowerCase();
      const password = formData.password;
      if (!email || !password) throw new Error(c.invalid);

      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: formData.name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        if (data.user && !data.user.email_confirmed_at) {
          setNotice(c.registered);
          setScreen("login");
          return;
        }
        if (data.user) {
          onLogin({ id: data.user.id, email: data.user.email ?? email, name: formData.name.trim() });
          return;
        }
        setNotice(c.registered);
        setScreen("login");
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (!data.user) throw new Error("Login succeeded but user is missing.");
      onLogin({
        id: data.user.id,
        email: data.user.email ?? email,
        name: typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : "",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : c.invalid);
    } finally {
      setLoading(false);
    }
  };

  const languageSwitcher = (
    <div className="flex rounded-full border border-orange-100 bg-white/75 p-1 shadow-sm backdrop-blur">
      <button type="button" onClick={() => setLanguage("zh")} className={`rounded-full px-3 py-1.5 text-xs transition ${language === "zh" ? "bg-orange-500 text-white" : "text-stone-500"}`}>中文</button>
      <button type="button" onClick={() => setLanguage("en")} className={`rounded-full px-3 py-1.5 text-xs transition ${language === "en" ? "bg-orange-500 text-white" : "text-stone-500"}`}>EN</button>
    </div>
  );

  if (screen === "landing") {
    return (
      <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_5%,#fff1e4_0,transparent_35%),radial-gradient(circle_at_90%_70%,#f2edff_0,transparent_32%),#fffaf6] text-stone-800">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-2 font-serif text-xl font-semibold tracking-wide text-stone-800">
            <Sparkles size={20} className="text-orange-500" />
            InsightL<span className="-mx-1 text-orange-500">∞</span>p
          </div>
          <div className="flex items-center gap-3">
            {languageSwitcher}
            <button type="button" onClick={() => openAuth("login")} className="hidden rounded-full px-4 py-2 text-sm text-stone-600 transition hover:bg-white/70 sm:block">{c.login}</button>
          </div>
        </header>

        <section className="mx-auto grid min-h-[calc(100vh-86px)] max-w-6xl items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-2xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">{c.eyebrow}</p>
            <h1 className="whitespace-pre-line font-serif text-4xl font-semibold leading-[1.18] text-stone-800 sm:text-6xl">{c.title}</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-stone-600 sm:text-lg">{c.body}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => openAuth("register")} className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(249,115,22,.25)] transition hover:-translate-y-0.5 hover:bg-orange-600">
                {c.primary}<ArrowRight size={17} />
              </button>
              <button type="button" onClick={() => openAuth("login")} className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white/70 px-6 py-3.5 text-sm font-medium text-stone-600 transition hover:bg-white">{c.login}</button>
            </div>

            <p className="mt-5 flex max-w-xl items-start gap-2 text-xs leading-6 text-stone-500">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />{c.privacy}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-lg pb-8">
            <div className="absolute inset-x-10 top-12 h-72 rounded-full bg-orange-200/35 blur-3xl" />
            <div className="relative mx-auto h-56 w-56 sm:h-64 sm:w-64">
              <CompanionMedia companion="phoenix" action="welcome" className="h-full w-full" label="InsightLoop Phoenix" />
            </div>

            <div className="relative -mt-4 rounded-[32px] border border-white/90 bg-white/85 p-5 shadow-[0_24px_70px_rgba(96,72,48,.14)] backdrop-blur sm:p-6">
              <div className="space-y-3">
                <div className="rounded-2xl bg-stone-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">{c.today}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-700">“{c.todayText}”</p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-indigo-50/70 px-4 py-3">
                  <Clock3 size={16} className="mt-1 shrink-0 text-indigo-500" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">{c.memory}</p>
                    <p className="mt-1 text-sm leading-6 text-stone-650">“{c.memoryText}”</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-orange-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600">{c.insight}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-700">{c.insightText}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_5%,#fff1e4_0,transparent_35%),radial-gradient(circle_at_90%_70%,#f2edff_0,transparent_32%),#fffaf6] px-4 py-6 text-stone-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <button type="button" onClick={() => setScreen("landing")} className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-stone-600 shadow-sm">
          <ChevronLeft size={16} />{c.back}
        </button>
        {languageSwitcher}
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl items-center gap-8 lg:grid-cols-[.85fr_1.15fr]">
        <div className="hidden text-center lg:block">
          <div className="mx-auto h-64 w-64"><CompanionMedia companion="phoenix" action="idle-breathe" className="h-full w-full" label="InsightLoop Phoenix" /></div>
          <p className="mx-auto mt-4 max-w-sm font-serif text-2xl leading-10 text-stone-700">
            {language === "zh" ? "先让你看见这里为什么值得停留，再邀请你把记录留下。" : "See why this place matters before being asked to leave your story here."}
          </p>
        </div>

        <section className="rounded-[34px] border border-white/90 bg-white/85 p-6 shadow-[0_24px_70px_rgba(96,72,48,.12)] backdrop-blur sm:p-10">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">InsightLoop</p>
            <h1 className="mt-3 font-serif text-3xl font-semibold text-stone-800">{isRegistering ? c.registerTitle : c.loginTitle}</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-stone-500">{c.name}</span>
                <div className="relative">
                  <UserCircle size={18} className="absolute left-4 top-3.5 text-stone-400" />
                  <input required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full rounded-2xl border border-stone-200 bg-white px-11 py-3 text-stone-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
                </div>
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-xs font-medium text-stone-500">{c.email}</span>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-3.5 text-stone-400" />
                <input type="email" required autoComplete="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} className="w-full rounded-2xl border border-stone-200 bg-white px-11 py-3 text-stone-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium text-stone-500">{c.password}</span>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-3.5 text-stone-400" />
                <input type="password" required autoComplete={isRegistering ? "new-password" : "current-password"} value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} className="w-full rounded-2xl border border-stone-200 bg-white px-11 py-3 text-stone-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
              </div>
            </label>

            {notice && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
            {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(249,115,22,.22)] transition hover:bg-orange-600 disabled:opacity-60">
              {loading ? c.working : isRegistering ? c.registerButton : c.loginButton}{!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <button type="button" onClick={() => openAuth(isRegistering ? "login" : "register")} className="mt-6 w-full text-center text-sm text-stone-500 transition hover:text-orange-600">
            {isRegistering ? c.switchLogin : c.switchRegister}
          </button>
        </section>
      </div>
    </main>
  );
};

export default Auth;
