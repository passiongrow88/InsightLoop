import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Lock, Mail, UserCircle } from "lucide-react";
import { Language, User } from "../types";
import { getSupabaseClient } from "../services/supabaseClient";

interface AuthProps {
  onLogin: (user: User) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

type Mode = "login" | "register" | "reset";

const Auth: React.FC<AuthProps> = ({ onLogin, language, setLanguage }) => {
  const zh = language === "zh";
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const changeMode = (next: Mode) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const client = getSupabaseClient();
      const email = form.email.trim().toLowerCase();
      if (!email) throw new Error(zh ? "请输入邮箱。" : "Enter your email.");

      if (mode === "reset") {
        const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setNotice(zh ? "重设密码邮件已发送。请检查收件箱和垃圾邮件。" : "Password reset email sent. Check your inbox and spam folder.");
        return;
      }

      if (form.password.length < 8) {
        throw new Error(zh ? "密码至少需要 8 个字符。" : "Password must be at least 8 characters.");
      }

      if (mode === "register") {
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password: form.password,
          options: {
            data: { name: form.name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session && data.user) {
          onLogin({ id: data.user.id, email: data.user.email || email, name: form.name.trim() });
          return;
        }
        changeMode("login");
        setNotice(zh ? "账户已建立。验证邮箱后即可登录。" : "Account created. Verify your email, then sign in.");
        return;
      }

      const { data, error: signInError } = await client.auth.signInWithPassword({ email, password: form.password });
      if (signInError) throw signInError;
      if (!data.user) throw new Error(zh ? "登录成功，但未取得用户资料。" : "Signed in, but no user profile was returned.");
      onLogin({
        id: data.user.id,
        email: data.user.email || email,
        name: String(data.user.user_metadata?.name || ""),
      });
    } catch (caught: any) {
      setError(caught?.message || (zh ? "操作失败，请稍后再试。" : "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#21170f] px-4 py-16 text-[#fff5e5]">
      <div className="w-full max-w-md rounded-[30px] border border-[#e8cfaa]/15 bg-[#302219]/96 p-7 shadow-2xl sm:p-9">
        <div className="mb-7 flex items-center justify-between">
          <p className="font-serif text-sm tracking-[0.18em] text-[#f7e7cf]">INSIGHTLOOP</p>
          <div className="flex rounded-full bg-black/20 p-1 text-[10px]">
            <button type="button" onClick={() => setLanguage("zh")} className={`rounded-full px-3 py-1.5 ${zh ? "bg-[#7a5837] text-white" : "text-[#bda98f]"}`}>中文</button>
            <button type="button" onClick={() => setLanguage("en")} className={`rounded-full px-3 py-1.5 ${!zh ? "bg-[#7a5837] text-white" : "text-[#bda98f]"}`}>EN</button>
          </div>
        </div>

        <h1 className="font-serif text-3xl text-[#fff1dc]">
          {mode === "login" ? (zh ? "回到你的书房" : "Return to your study") : mode === "register" ? (zh ? "建立自己的书房" : "Create your study") : (zh ? "重设密码" : "Reset password")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#cbb99f]">
          {mode === "reset"
            ? (zh ? "输入注册邮箱，我们会发送安全重设链接。" : "Enter your account email and we'll send a secure reset link.")
            : (zh ? "日记只保存在独立的 Preview 环境；它不会写入生产数据。" : "Journal data is stored only in the isolated Preview environment, never production.")}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "register" && (
            <Field icon={<UserCircle size={18} />} label={zh ? "名字" : "Name"} type="text" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} autoComplete="name" required />
          )}
          <Field icon={<Mail size={18} />} label={zh ? "邮箱" : "Email"} type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} autoComplete="email" required />
          {mode !== "reset" && (
            <Field icon={<Lock size={18} />} label={zh ? "密码（至少 8 个字符）" : "Password (8+ characters)"} type="password" value={form.password} onChange={(value) => setForm((prev) => ({ ...prev, password: value }))} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
          )}

          {notice && <p role="status" className="rounded-2xl bg-emerald-900/25 p-3 text-sm leading-6 text-emerald-100">{notice}</p>}
          {error && <p role="alert" className="rounded-2xl bg-red-950/35 p-3 text-sm leading-6 text-red-100">{error}</p>}

          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#795535] px-5 py-3 text-sm text-white shadow-lg disabled:opacity-50">
            {loading ? (zh ? "处理中…" : "Working…") : mode === "login" ? (zh ? "登录" : "Sign in") : mode === "register" ? (zh ? "注册" : "Create account") : (zh ? "发送重设邮件" : "Send reset email")}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#baa68d]">
          {mode === "login" ? (
            <>
              <button onClick={() => changeMode("register")} className="hover:text-white">{zh ? "还没有账户？注册" : "New here? Create account"}</button>
              <button onClick={() => changeMode("reset")} className="hover:text-white">{zh ? "忘记密码" : "Forgot password"}</button>
            </>
          ) : (
            <button onClick={() => changeMode("login")} className="inline-flex items-center gap-1 hover:text-white"><ArrowLeft size={14} /> {zh ? "返回登录" : "Back to sign in"}</button>
          )}
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  required?: boolean;
}> = ({ icon, label, type, value, onChange, autoComplete, required }) => (
  <label className="block text-xs text-[#cbb99f]">
    <span className="mb-2 block">{label}</span>
    <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/16 px-4 focus-within:border-amber-100/30">
      <span className="text-[#a88c6c]">{icon}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} className="w-full bg-transparent py-3.5 text-sm text-white outline-none" />
    </span>
  </label>
);

export default Auth;
