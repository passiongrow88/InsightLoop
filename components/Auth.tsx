import React, { useState } from "react";
import { User, Language } from "../types";
import { translations } from "../i18n";
import { Sparkles, ArrowRight, UserCircle, Lock, Mail } from "lucide-react";
import { getSupabaseClient } from "../services/supabaseClient";

interface AuthProps {
  onLogin: (user: User) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, language, setLanguage }) => {
  const t = translations[language];
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const client = getSupabaseClient();
      const email = formData.email.trim().toLowerCase();
      const password = formData.password;

      if (!email || !password) {
        throw new Error(t.auth_error_invalid || "Invalid email or password.");
      }

      if (isRegistering) {
        // ✅ Supabase signUp
        // NOTE: Supabase does not store "name" automatically unless you put it in user metadata
        // This will NOT affect your UI, just enriches profile data.
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: formData.name || "",
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (signUpError) throw signUpError;

        // 常见情况：需要邮箱验证
        if (data?.user && !data.user.email_confirmed_at) {
          setIsRegistering(false);

          // ✅【修复点 1】不再引用不存在的 t.auth_register_success
          setError(
            language === "zh"
              ? "注册成功。请先验证邮箱，然后再登录。"
              : "Registered. Please verify email, then login."
          );
          return;
        }

        // 若不需要验证/立即有 session
        if (data?.user) {
          const u = {
            id: data.user.id,
            email: data.user.email ?? email,
            name: formData.name || "",
          } as unknown as User;

          // ✅ 只负责跳转/体验；真正 session 由 App.tsx 的 onAuthStateChange 统一管理
          onLogin(u);
          return;
        }

        setIsRegistering(false);

        // ✅【修复点 2】不再引用不存在的 t.auth_register_success
        setError(
          language === "zh" ? "注册成功，请登录。" : "Registered. Please login."
        );
        return;
      }

      // ✅ Supabase signInWithPassword
      const { data, error: signInError } = await client.auth.signInWithPassword(
        { email, password }
      );

      if (signInError) throw signInError;

      if (!data?.user) {
        throw new Error("Login succeeded but user is missing.");
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email ?? email,
        // Supabase user metadata (if you stored name during signUp)
        name: (data.user.user_metadata?.name as string) || "",
      } as unknown as User;

      // ✅ 交给 App：它会切 view；currentUser 会由 onAuthStateChange 同步
      onLogin(user);
    } catch (err: any) {
      // Supabase error message is usually human-readable
      setError(err?.message || t.auth_error_invalid);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F8F7FF] relative overflow-hidden">
      {/* Background Decor - Softer and more diffuse for healing vibe */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-brand-50/60 rounded-full blur-[100px] opacity-40"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-fuchsia-50/60 rounded-full blur-[100px] opacity-40"></div>
      </div>

      {/* Language Switcher */}
      <div className="absolute top-8 right-8 z-10">
        <div className="flex bg-white/50 backdrop-blur rounded-full border border-stone-100 p-1 shadow-sm">
          <button
            onClick={() => setLanguage("en")}
            className={`px-4 py-1.5 rounded-full text-[10px] tracking-widest font-medium transition-all duration-500 ${
              language === "en"
                ? "bg-white text-stone-600 shadow-sm"
                : "text-stone-400 hover:text-stone-500"
            }`}
            disabled={loading}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("zh")}
            className={`px-4 py-1.5 rounded-full text-[10px] tracking-widest font-medium transition-all duration-500 ${
              language === "zh"
                ? "bg-white text-stone-600 shadow-sm"
                : "text-stone-400 hover:text-stone-500"
            }`}
            disabled={loading}
          >
            中文
          </button>
        </div>
      </div>

      <div className="bg-white/40 backdrop-blur-md p-10 sm:p-14 rounded-[3rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)] border border-white/50 w-full max-w-lg relative z-10 animate-in fade-in zoom-in duration-700">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="font-serif text-5xl font-bold text-brand-600 tracking-wide flex items-center justify-center gap-3">
            <Sparkles className="text-brand-300 stroke-1" size={32} />
            <div className="flex items-baseline">
              <span>InsightL</span>
              <span className="text-red-500 font-normal relative top-[2px] mx-[2px] text-5xl">
                ∞
              </span>
              <span>p</span>
            </div>
          </h1>
          <p className="text-[10px] tracking-[0.4em] text-stone-400 font-light uppercase pl-2">
            {t.subtitle}
          </p>
        </div>

        {/* Welcome Message */}
        <h2 className="font-serif text-3xl font-normal text-stone-600 mb-10 text-center tracking-wider leading-relaxed">
          {isRegistering ? t.auth_register_title : t.auth_login_title}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <div className="space-y-2 group">
              <label className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-brand-400 transition-colors">
                {t.auth_name}
              </label>
              <div className="relative">
                <UserCircle
                  className="absolute left-4 top-3.5 text-stone-300 stroke-1 group-focus-within:text-brand-300 transition-colors"
                  size={20}
                />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full pl-12 pr-4 py-3 bg-white/60 border-none rounded-2xl focus:outline-none focus:ring-1 focus:ring-brand-200/50 shadow-sm transition-all font-serif text-stone-600 placeholder:text-stone-300"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="space-y-2 group">
            <label className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-brand-400 transition-colors">
              {t.auth_email}
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-3.5 text-stone-300 stroke-1 group-focus-within:text-brand-300 transition-colors"
                size={20}
              />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                autoComplete="email"
                className="w-full pl-12 pr-4 py-3 bg-white/60 border-none rounded-2xl focus:outline-none focus:ring-1 focus:ring-brand-200/50 shadow-sm transition-all font-serif text-stone-600 placeholder:text-stone-300"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-brand-400 transition-colors">
              {t.auth_password}
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-3.5 text-stone-300 stroke-1 group-focus-within:text-brand-300 transition-colors"
                size={20}
              />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                autoComplete="current-password"
                className="w-full pl-12 pr-4 py-3 bg-white/60 border-none rounded-2xl focus:outline-none focus:ring-1 focus:ring-brand-200/50 shadow-sm transition-all font-serif text-stone-600 placeholder:text-stone-300"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center font-serif italic tracking-wide animate-pulse">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white font-medium py-3.5 rounded-full shadow-lg shadow-brand-200/50 transition-all transform mt-8 flex items-center justify-center gap-3 tracking-widest text-sm ${
              loading ? "opacity-70 cursor-not-allowed" : "hover:-translate-y-0.5"
            }`}
          >
            {loading
              ? language === "zh"
                ? "处理中..."
                : "Working..."
              : isRegistering
              ? t.auth_btn_register
              : t.auth_btn_login}
            <ArrowRight size={16} className="stroke-2" />
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
            }}
            className="text-stone-400 text-xs hover:text-brand-500 transition-colors tracking-widest uppercase"
            disabled={loading}
          >
            {isRegistering ? t.auth_switch_to_login : t.auth_switch_to_register}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
