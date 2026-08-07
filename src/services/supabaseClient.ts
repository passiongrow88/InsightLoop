import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
