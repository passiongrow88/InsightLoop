import { createClient } from "@supabase/supabase-js";

// Supabase's publishable client configuration is intentionally safe to ship
// in a browser bundle. Service-role credentials must never be added here.
const publicSupabaseUrl = "https://hiipbyrdkdaetroajrwk.supabase.co";
const publicSupabaseAnonKey = "sb_publishable_WZ9n5t3bXwvimVTKVDqvXA_-TOG51hC";
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || publicSupabaseUrl;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || publicSupabaseAnonKey;

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
