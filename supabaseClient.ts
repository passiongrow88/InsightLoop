import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase env vars: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,      // ✅ 记住登录
      autoRefreshToken: true,    // ✅ 自动刷新 token
      detectSessionInUrl: true,  // ✅ 处理 email magic link / redirect
    },
  }
);
