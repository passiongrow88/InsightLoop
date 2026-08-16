import { supabase } from "./supabaseClient";
import type { CompanionProfile, JournalEntry, ManifestationItem } from "../../types";

export type EntryType = "journal" | "manifestation";

// ✅ 对齐你真实 Supabase 表名（你现在数据就在这里）
const TABLE_JOURNAL = "journal_entries";
const TABLE_MANIFEST = "manifestations";
const TABLE_COMPANIONS = "companions";

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
    aiResponse: r.insight || "",
    responseStatus: r.response_status || (r.insight ? "ready" : "pending"),

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

function mapCompanionRow(r: any): CompanionProfile {
  return {
    userId: r.user_id,
    recommendedKind: r.recommended_kind,
    recommendationReason: r.recommendation_reason || "",
    selectedKind: r.selected_kind || undefined,
    name: r.name || undefined,
    status: r.status,
    createdAt: toCreatedAtNumber(r.created_at),
    updatedAt: toCreatedAtNumber(r.updated_at),
    hatchedAt: r.hatched_at ? toCreatedAtNumber(r.hatched_at) : undefined,
  } as CompanionProfile;
}

export async function getCompanion(): Promise<CompanionProfile | null> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from(TABLE_COMPANIONS)
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw error;
  return data ? mapCompanionRow(data) : null;
}

export async function saveCompanion(payload: CompanionProfile): Promise<CompanionProfile> {
  const uid = await requireUid();
  const now = new Date();
  const row = {
    user_id: uid,
    recommended_kind: payload.recommendedKind,
    recommendation_reason: payload.recommendationReason,
    selected_kind: payload.selectedKind || null,
    name: payload.name?.trim() || null,
    status: payload.status,
    created_at: new Date(payload.createdAt || now.getTime()).toISOString(),
    updated_at: new Date(payload.updatedAt || now.getTime()).toISOString(),
    hatched_at: payload.hatchedAt ? new Date(payload.hatchedAt).toISOString() : null,
  };

  const { data, error } = await supabase
    .from(TABLE_COMPANIONS)
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw error;
  return mapCompanionRow(data);
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
      insight: (e as any).aiResponse || "",
      response_status: (e as any).responseStatus || ((e as any).aiResponse ? "ready" : "pending"),

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
      insight: (e as any).aiResponse || "",
      response_status: (e as any).responseStatus || ((e as any).aiResponse ? "ready" : "pending"),

      // ✅【修复点】更新时也写 created_at（确保一致）
      created_at: new Date((e as any).createdAt ?? Date.now()).toISOString(),
    };

    const { error } = await supabase
      .from(TABLE_JOURNAL)
      .update(row)
      .eq("id", id)
      .eq("user_id", uid);

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
