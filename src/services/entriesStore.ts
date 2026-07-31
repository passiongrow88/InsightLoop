import { supabase } from "./supabaseClient";
import type { JournalEntry, ManifestationItem } from "../../types";

export type EntryType = "journal" | "manifestation";

// ✅ 对齐你真实 Supabase 表名（你现在数据就在这里）
const TABLE_JOURNAL = "journal_entries";
const TABLE_MANIFEST = "manifestations";

// --- helpers ---
async function requireUid(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("Not authenticated: missing user id.");
  return uid;
}

function toCreatedAtNumber(v: any): number {
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
  }
  return Date.now();
}

function mapJournalRowToEntry(r: any): JournalEntry {
  return {
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
    aiResponse: r.ai_response || "",
    insight: r.insight || "",

    // ✅【修复点】补 createdAt（number）
    createdAt: toCreatedAtNumber(r.created_at),
  } as JournalEntry;
}

function mapManifestRowToItem(r: any): ManifestationItem {
  return {
    id: r.id,
    goal: r.goal || "",
    expectedDate: r.expected_date || "",
    reason: r.reason || "",

    // ✅【修复点】补 createdAt（number）
    createdAt: toCreatedAtNumber(r.created_at),
  } as ManifestationItem;
}

// ✅ App.tsx 用到的 4 个函数：保持名字不变（不影响 UI/功能）
export async function listEntries<T>(type: EntryType): Promise<T[]> {
  const uid = await requireUid();

  if (type === "journal") {
    const { data, error } = await supabase
      .from(TABLE_JOURNAL)
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data || []).map(mapJournalRowToEntry) as unknown) as T[];
  }

  // manifestation
  const { data, error } = await supabase
    .from(TABLE_MANIFEST)
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data || []).map(mapManifestRowToItem) as unknown) as T[];
}

export async function createEntry<T extends { id?: string }>(
  type: EntryType,
  payload: T
): Promise<string> {
  const uid = await requireUid();

  // --- journal_entries ---
  if (type === "journal") {
    const e = payload as any as JournalEntry;

    const row: any = {
      user_id: uid,
      date: e.date || "",
      event: e.event || "",
      reflection: e.reflection || "",
      gratitude: e.gratitude || "",
      self_talk: (e as any).selfTalk || "",
      angel_numbers: (e as any).angelNumbers || "",
      dreams: (e as any).dreams || "",
      love_target: (e as any).loveTarget || "",
      apology_target: (e as any).apologyTarget || "",
      ai_response: (e as any).aiResponse || "",
      insight: (e as any).insight || "",

      // ✅【修复点】写 created_at
      created_at: new Date((e as any).createdAt ?? Date.now()).toISOString(),
    };

    // 如果你前端已经有 id（例如 uuid），就沿用
    if ((e as any).id) {
      row.id = (e as any).id;
      const { error } = await supabase
        .from(TABLE_JOURNAL)
        .upsert(row, { onConflict: "id" });
      if (error) throw error;
      return (e as any).id as string;
    }

    // 否则让 DB 生成 id
    const { data, error } = await supabase
      .from(TABLE_JOURNAL)
      .insert(row)
      .select("id")
      .single();

    if (error) throw error;
    return (data as any).id as string;
  }

  // --- manifestations ---
  const g = payload as any as ManifestationItem;
  const row: any = {
    user_id: uid,
    goal: g.goal || "",
    expected_date: (g as any).expectedDate || "",
    reason: (g as any).reason || "",

    // ✅【修复点】写 created_at
    created_at: new Date((g as any).createdAt ?? Date.now()).toISOString(),
  };

  if ((g as any).id) {
    row.id = (g as any).id;
    const { error } = await supabase
      .from(TABLE_MANIFEST)
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    return (g as any).id as string;
  }

  const { data, error } = await supabase
    .from(TABLE_MANIFEST)
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;
  return (data as any).id as string;
}

export async function updateEntry<T>(
  id: string,
  type: EntryType,
  payload: T
): Promise<void> {
  const uid = await requireUid();

  if (type === "journal") {
    const e = payload as any as JournalEntry;
    const row: any = {
      id,
      user_id: uid,
      date: e.date || "",
      event: e.event || "",
      reflection: e.reflection || "",
      gratitude: e.gratitude || "",
      self_talk: (e as any).selfTalk || "",
      angel_numbers: (e as any).angelNumbers || "",
      dreams: (e as any).dreams || "",
      love_target: (e as any).loveTarget || "",
      apology_target: (e as any).apologyTarget || "",
      ai_response: (e as any).aiResponse || "",
      insight: (e as any).insight || "",
    };

    const { error } = await supabase
      .from(TABLE_JOURNAL)
      .upsert(row, { onConflict: "id" });

    if (error) throw error;
    return;
  }

  const g = payload as any as ManifestationItem;
  const row: any = {
    id,
    user_id: uid,
    goal: g.goal || "",
    expected_date: (g as any).expectedDate || "",
    reason: (g as any).reason || "",

    // ✅【修复点】
    created_at: new Date((g as any).createdAt ?? Date.now()).toISOString(),
  };

  const { error } = await supabase
    .from(TABLE_MANIFEST)
    .upsert(row, { onConflict: "id" });

  if (error) throw error;
}

export async function deleteEntry(id: string, type: EntryType): Promise<void> {
  const uid = await requireUid();

  const table = type === "journal" ? TABLE_JOURNAL : TABLE_MANIFEST;

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("user_id", uid);

  if (error) throw error;
}
