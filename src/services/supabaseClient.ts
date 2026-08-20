import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Publishable Preview credentials are safe to ship to the browser. RLS is the
// security boundary. Environment variables still take precedence for local work.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "https://psgjismukjxpsnodtwvl.supabase.co";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "sb_publishable_V51jM3gFdCgsJA_Kw9W2zg_522aw52U";

export const supabaseFunctionsUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
export const supabasePublishableKey = supabaseAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "Missing Supabase env vars: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY"
  );
}

const configuredClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  : null;

// Existing data services predate V5 and import `supabase` directly. V5 guards
// every entry point with `isSupabaseConfigured` / `getSupabaseClient`; this
// compatibility export prevents an unconfigured Preview from crashing at module
// evaluation while legacy services are migrated behind the guarded accessor.
export const supabase = configuredClient as SupabaseClient;

export const getSupabaseClient = (): SupabaseClient => {
  if (!configuredClient) {
    throw new Error(missingSupabaseConfigurationMessage);
  }
  return configuredClient;
};

export const missingSupabaseConfigurationMessage =
  "This Preview is missing its secure storage configuration. You can still explore and write a local draft, but sign-in and permanent saving are unavailable until the Preview environment is configured.";
