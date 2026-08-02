import type { VercelRequest } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// These are Supabase's public project coordinates, not service-role secrets.
// Environment variables still take precedence in managed deployments.
const publicSupabaseUrl = "https://hiipbyrdkdaetroajrwk.supabase.co";
const publicSupabaseAnonKey = "sb_publishable_WZ9n5t3bXwvimVTKVDqvXA_-TOG51hC";
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || publicSupabaseUrl;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  publicSupabaseAnonKey;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

export function serviceSupabase() {
  return createClient(
    required(supabaseUrl, "SUPABASE_URL"),
    required(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function requestUser(req: VercelRequest) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const client = createClient(
    required(supabaseUrl, "SUPABASE_URL"),
    required(supabaseAnonKey, "SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await client.auth.getUser(token);
  if (error) return null;
  return data.user;
}

export async function requireAdmin(req: VercelRequest) {
  const user = await requestUser(req);
  const adminEmail = (process.env.INSIGHTLOOP_ADMIN_EMAIL || "passiongrow88@gmail.com").toLowerCase();
  if (!user?.email || user.email.toLowerCase() !== adminEmail) return null;
  return user;
}
