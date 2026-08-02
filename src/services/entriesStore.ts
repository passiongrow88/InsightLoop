import { supabase } from "./supabaseClient";
import type { JournalEntry, ManifestationItem } from "../../types";

export type EntryType = "journal" | "manifestation";

const TABLE_JOURNAL = "journal_entries";
const TABLE_MANIFEST = "manifestations";

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
    additionalNotes: r.additional_notes || "",
    aiResponse: r.ai_response || "",
    insight: r.insight || "",
    createdAt: toCreatedAtNumber(r.created_at),
  } as JournalEntry;
}

function mapManifestRowToItem(r: any): ManifestationItem {
  return {
    id: r.id,
    goal: r.goal || "",
    expectedDate: r.expected_date || "",
    reason: r.reason || "",
    createdAt: toCreatedAtNumber(r.created_at),
  } as ManifestationItem;
}

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

  const { data, error } = await supabase
    .from(TABLE_MANIFEST)
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data || []).map(mapManifestRowToItem) as unknown) as T[];
}

function journalRow(e: JournalEntry, uid: string, id?: string) {
  return {
    ...(id ? { id } : {}),
    user_id: uid,
    date: e.date || "",
    event: e.event || "",
    reflection: e.reflection || "",
    gratitude: e.gratitude || "",
    self_talk: e.selfTalk || "",
    angel_numbers: e.angelNumbers || "",
    dreams: e.dreams || "",
    love_target: e.loveTarget || "",
    apology_target: e.apologyTarget || "",
    additional_notes: e.additionalNotes || "",
    ai_response: e.aiResponse || "",
    insight: (e as any).insight || "",
    created_at: new Date(e.createdAt ?? Date.now()).toISOString(),
  };
}

export async function createEntry<T extends { id?: string }>(
  type: EntryType,
  payload: T
): Promise<string> {
  const uid = await requireUid();

  if (type === "journal") {
    const e = payload as any as JournalEntry;
    const row = journalRow(e, uid, e.id || undefined);

    if (e.id) {
      const { error } = await supabase.from(TABLE_JOURNAL).upsert(row, { onConflict: "id" });
      if (error) throw error;
      return e.id;
    }

    const { data, error } = await supabase.from(TABLE_JOURNAL).insert(row).select("id").single();
    if (error) throw error;
    return (data as any).id as string;
  }

  const g = payload as any as ManifestationItem;
  const row: any = {
    user_id: uid,
    goal: g.goal || "",
    expected_date: g.expectedDate || "",
    reason: g.reason || "",
    created_at: new Date(g.createdAt ?? Date.now()).toISOString(),
  };

  if (g.id) {
    row.id = g.id;
    const { error } = await supabase.from(TABLE_MANIFEST).upsert(row, { onConflict: "id" });
    if (error) throw error;
    return g.id;
  }

  const { data, error } = await supabase.from(TABLE_MANIFEST).insert(row).select("id").single();
  if (error) throw error;
  return (data as any).id as string;
}

export async function updateEntry<T>(id: string, type: EntryType, payload: T): Promise<void> {
  const uid = await requireUid();

  if (type === "journal") {
    const e = payload as any as JournalEntry;
    const { error } = await supabase
      .from(TABLE_JOURNAL)
      .upsert(journalRow(e, uid, id), { onConflict: "id" });
    if (error) throw error;
    return;
  }

  const g = payload as any as ManifestationItem;
  const row: any = {
    id,
    user_id: uid,
    goal: g.goal || "",
    expected_date: g.expectedDate || "",
    reason: g.reason || "",
    created_at: new Date(g.createdAt ?? Date.now()).toISOString(),
  };

  const { error } = await supabase.from(TABLE_MANIFEST).upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteEntry(id: string, type: EntryType): Promise<void> {
  const uid = await requireUid();
  const table = type === "journal" ? TABLE_JOURNAL : TABLE_MANIFEST;
  const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", uid);
  if (error) throw error;
}
