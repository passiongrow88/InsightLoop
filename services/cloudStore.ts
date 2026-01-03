import { supabase } from "../supabaseClient";
import type { JournalEntry, ManifestationItem, User } from "../types";

// ✅ 对齐你真实 Supabase 表名
const TABLE_JOURNAL = "journal_entries";
const TABLE_MANIFEST = "manifestations"; // 没建这个表就先别用显化云端

async function requireUid(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("Not authenticated: missing user id.");
  return uid;
}

// --------------------
// Auth
// --------------------
export async function signUp(
  email: string,
  password: string,
  name?: string
): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: name ? { data: { name } } : undefined,
  });
  if (error) throw error;

  if (!data.user?.email) throw new Error("Signup succeeded but user missing.");
  return {
    email: data.user.email,
    name: (data.user.user_metadata?.name as string) || name || "",
  } as User;
}

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  if (!data.user?.email) throw new Error("Login succeeded but user missing.");
  return {
    email: data.user.email,
    name: (data.user.user_metadata?.name as string) || "",
  } as User;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// --------------------
// Journals (journal_entries)
// --------------------
export async function loadJournals(): Promise<JournalEntry[]> {
  const uid = await requireUid();

  const { data, error } = await supabase
    .from(TABLE_JOURNAL)
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    date: r.date || "",
    event: r.event || "",
    reflection: r.reflection || "",
    gratitude: r.gratitude || "",
    selfTalk: r.self_talk || "",
    angelNumbers: r.angel_numbers || "",
    dreams: r.dreams || "",
    loveTarget: r.love_target || "",
    apologyTarget: r.apology_target || "",
    insight: r.insight || "",
  })) as JournalEntry[];
}

export async function saveJournal(entry: JournalEntry): Promise<void> {
  const uid = await requireUid();

  const payload: any = {
    id: entry.id,
    user_id: uid,

    date: entry.date || "",
    event: entry.event || "",
    reflection: entry.reflection || "",
    gratitude: entry.gratitude || "",
    self_talk: entry.selfTalk || "",
    angel_numbers: entry.angelNumbers || "",
    dreams: entry.dreams || "",
    love_target: entry.loveTarget || "",
    apology_target: entry.apologyTarget || "",
    insight: (entry as any).insight || "",
  };

  const { error } = await supabase
    .from(TABLE_JOURNAL)
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;
}

export async function deleteJournal(id: string): Promise<void> {
  const uid = await requireUid();
  const { error } = await supabase
    .from(TABLE_JOURNAL)
    .delete()
    .eq("id", id)
    .eq("user_id", uid);

  if (error) throw error;
}

// --------------------
// Manifestations (可选)
// --------------------
export async function loadGoals(): Promise<ManifestationItem[]> {
  const uid = await requireUid();

  const { data, error } = await supabase
    .from(TABLE_MANIFEST)
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    goal: r.goal || "",
    expectedDate: r.expected_date || "",
    reason: r.reason || "",
    createdAt: r.created_at || "",
  })) as ManifestationItem[];
}

export async function saveGoal(goal: ManifestationItem): Promise<void> {
  const uid = await requireUid();

  const payload: any = {
    id: goal.id,
    user_id: uid,
    goal: goal.goal || "",
    expected_date: goal.expectedDate || "",
    reason: goal.reason || "",
  };

  const { error } = await supabase
    .from(TABLE_MANIFEST)
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const uid = await requireUid();
  const { error } = await supabase
    .from(TABLE_MANIFEST)
    .delete()
    .eq("id", id)
    .eq("user_id", uid);

  if (error) throw error;
}
