import { supabase } from "../supabaseClient";
import type { JournalEntry, ManifestationItem, User } from "../types";

// --------------------
// Auth (required by Auth.tsx)
// --------------------
async function _signUp(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const u = data.user;
  if (!u?.email) throw new Error("Sign up succeeded but user is missing.");

  return { id: u.id, email: u.email } as User;
}

async function _signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  const u = data.user;
  if (!u?.email) throw new Error("Sign in succeeded but user is missing.");

  return { id: u.id, email: u.email } as User;
}

async function _signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// --------------------
// Journals (Supabase)
// --------------------
async function _loadJournals(userId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as JournalEntry[];
}

async function _saveJournal(userId: string, entry: JournalEntry): Promise<void> {
  const payload = { ...entry, user_id: userId };

  const { error } = await supabase.from("journals").upsert(payload, {
    onConflict: "id",
  });

  if (error) throw error;
}

async function _deleteJournal(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("journals")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) throw error;
}

// --------------------
// Manifestations (Supabase)
// --------------------
async function _loadGoals(userId: string): Promise<ManifestationItem[]> {
  const { data, error } = await supabase
    .from("manifestations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ManifestationItem[];
}

async function _saveGoal(
  userId: string,
  goal: ManifestationItem
): Promise<void> {
  const payload = { ...goal, user_id: userId };

  const { error } = await supabase.from("manifestations").upsert(payload, {
    onConflict: "id",
  });

  if (error) throw error;
}

async function _deleteGoal(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("manifestations")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) throw error;
}

// ✅ Hard-export: force Rollup to see named exports
export const signUp = _signUp;
export const signIn = _signIn;
export const signOut = _signOut;

export const loadJournals = _loadJournals;
export const saveJournal = _saveJournal;
export const deleteJournal = _deleteJournal;

export const loadGoals = _loadGoals;
export const saveGoal = _saveGoal;
export const deleteGoal = _deleteGoal;

// ✅ Extra explicit re-export (belt + suspenders)
export {
  signUp as _exported_signUp,
  signIn as _exported_signIn,
  loadJournals as _exported_loadJournals,
  saveJournal as _exported_saveJournal,
  loadGoals as _exported_loadGoals,
};
