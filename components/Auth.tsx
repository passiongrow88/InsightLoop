import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Lock, Mail, UserCircle } from "lucide-react";
import { Language, User } from "../types";
import { getSupabaseClient } from "../services/supabaseClient";

interface AuthProps {
  onLogin: (user: User) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  recoveryMode?: boolean;
  onPasswordUpdated?: () => void;
}

type Mode = "login" | "register" | "reset" | "update-password";

const Auth: React.FC<AuthProps> = ({ onLogin, language, setLanguage, recoveryMode = false, onPasswordUpdated }) => {
  const zh = language === "zh";
  const [mode, setMode] = useState<Mode>(recoveryMode ? "update-password" : "login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");

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

      if (mode === "update-password") {
        if (form.password.length < 8) {
          throw new Error(zh ? "新密码至少需要 8 个字符。" : "The new password must be at least 8 characters.");
        }
        const { error: updateError } = await client.auth.updateUser({ password: form.password });
        if (updateError) throw updateError;
        setNotice(zh ? "密码已经更新，可以继续回到书房。" : "Password updated. You can return to your study.");
        onPasswordUpdated?.();
        return;
      }

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
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setPendingVerificationEmail("");
          changeMode("login");
          setNotice(zh
            ? "这个邮箱已经建立过书房。请直接登录；如果忘记密码，请使用“忘记密码”。"
            : "This email already has a study. Sign in, or use password recovery if needed.");
          return;
        }
        if (data.session && data.user) {
          onLogin({ id: data.user.id, email: data.user.email || email, name: form.name.trim() });
          return;
        }
        setPendingVerificationEmail(email);
        changeMode("login");
        setNotice(zh
          ? "账户已建立。请打开验证邮件；完成后会回到这篇日记。没有收到可在这里重新发送。"
          : "Account created. Open the verification email; you will return to this journal afterward. You can resend it here if needed.");
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
      const code = String(caught?.code || "");
      const message = String(caught?.message || "");
      if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
        setPendingVerificationEmail(form.email.trim().toLowerCase());
        setError(zh
          ? "邮箱还没有验证。请打开验证邮件，或点击下方重新发送；你的日记草稿仍在。"
          : "This email is not verified yet. Open the verification email or resend it below; your journal draft is still safe.");
      } else if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
        setError(zh
          ? "这个账号或密码不属于独立的 V5 Preview。正式站账号不会自动复制到这里；请注册 Preview 账号或重设密码。"
          : "These credentials do not belong to the isolated V5 Preview. Production accounts are not copied here; create a Preview account or reset the password.");
      } else if (code === "over_email_send_rate_limit" || /rate limit/i.test(message)) {
        setError(zh ? "验证邮件发送太频繁，请稍后再试；草稿不会消失。" : "Too many verification emails were requested. Wait briefly and retry; your draft remains safe.");
      } else if (/failed to fetch|network|load failed/i.test(message)) {
        setError(zh ? "网络暂时无法连接认证服务。请重试；草稿仍保存在这个浏览器。" : "The authentication service could not be reached. Retry when connected; your draft remains in this browser.");
      } else {
        setError(message || (zh ? "操作失败，请稍后再试。" : "Something went wrong. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!pendingVerificationEmail || loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const client = getSupabaseClient();
      const { error: resendError } = await client.auth.resend({
        type: "signup",
        email: pendingVerificationEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (resendError) throw resendError;
      setNotice(zh
        ? "验证邮件已重新发送。请检查收件箱和垃圾邮件；完成后会回到这篇日记。"
        : "Verification email resent. Check inbox and spam; afterward you will return to this journal.");
    } catch (caught: any) {
      const message = String(caught?.message || "");
      setError(/rate limit/i.test(message)
        ? (zh ? "发送太频繁，请稍后再试。" : "Too many requests. Wait briefly and retry.")
        : (message || (zh ? "验证邮件暂时无法发送。" : "The verification email could not be sent.")));
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
          {mode === "login" ? (zh ? "回到你的书房" : "Return to your study") : mode === "register" ? (zh ? "建立自己的书房" : "Create your study") : mode === "update-password" ? (zh ? "设置新密码" : "Set a new password") : (zh ? "重设密码" : "Reset password")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#cbb99f]">
          {mode === "update-password"
            ? (zh ? "输入新密码后，你会回到原本尚未完成的日记。" : "Set a new password, then return to your pending journal.")
            : mode === "reset"
            ? (zh ? "输入注册邮箱，我们会发送安全重设链接。" : "Enter your account email and we'll send a secure reset link.")
            : (zh ? "日记只保存在独立的 Preview 环境；它不会写入生产数据。" : "Journal data is stored only in the isolated Preview environment, never production.")}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "register" && (
            <Field icon={<UserCircle size={18} />} label={zh ? "名字" : "Name"} type="text" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} autoComplete="name" required />
          )}
          {mode !== "update-password" && <Field icon={<Mail size={18} />} label={zh ? "邮箱" : "Email"} type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} autoComplete="email" required />}
          {mode !== "reset" && (
            <Field icon={<Lock size={18} />} label={zh ? "密码（至少 8 个字符）" : "Password (8+ characters)"} type="password" value={form.password} onChange={(value) => setForm((prev) => ({ ...prev, password: value }))} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
          )}

          {notice && <p role="status" className="rounded-2xl bg-emerald-900/25 p-3 text-sm leading-6 text-emerald-100">{notice}</p>}
          {error && <p role="alert" className="rounded-2xl bg-red-950/35 p-3 text-sm leading-6 text-red-100">{error}</p>}
          {pendingVerificationEmail && mode === "login" && (
            <button type="button" onClick={() => void resendVerification()} disabled={loading} className="w-full rounded-full border border-[#e8cfaa]/20 px-5 py-3 text-sm text-[#f5ddbd] disabled:opacity-50">
              {zh ? "重新发送验证邮件" : "Resend verification email"}
            </button>
          )}

          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#795535] px-5 py-3 text-sm text-white shadow-lg disabled:opacity-50">
            {loading ? (zh ? "处理中…" : "Working…") : mode === "login" ? (zh ? "登录" : "Sign in") : mode === "register" ? (zh ? "注册" : "Create account") : mode === "update-password" ? (zh ? "保存新密码" : "Save new password") : (zh ? "发送重设邮件" : "Send reset email")}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#baa68d]">
          {mode === "login" && !recoveryMode ? (
            <>
              <button onClick={() => changeMode("register")} className="hover:text-white">{zh ? "还没有账户？注册" : "New here? Create account"}</button>
              <button onClick={() => changeMode("reset")} className="hover:text-white">{zh ? "忘记密码" : "Forgot password"}</button>
            </>
          ) : mode !== "update-password" ? (
            <button onClick={() => changeMode("login")} className="inline-flex items-center gap-1 hover:text-white"><ArrowLeft size={14} /> {zh ? "返回登录" : "Back to sign in"}</button>
          ) : null}
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
