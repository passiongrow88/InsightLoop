import { supabase } from "./supabaseClient";

export type EntryType = "journal" | "manifestation";

type DbRow = {
  id: string;
  user_id: string;
  type: EntryType;
  content: any; // text or json/jsonb
  created_at?: string;
  updated_at?: string;
};

function safeParseContent(raw: any) {
  // content might be:
  // - stringified JSON (text)
  // - JSON object (jsonb)
  // - plain string (older)
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return raw; // fallback to raw string
    }
  }
  return raw;
}

function safeStringifyContent(payload: any) {
  // If your DB column is TEXT, we must stringify.
  // If it's JSONB, stringifying is still accepted but stores a string; not ideal but safe.
  // We accept this safety trade-off for "小白不踩坑".
  try {
    return JSON.stringify(payload);
  } catch {
    return JSON.stringify({ _raw: String(payload) });
  }
}

export async function listEntries<T>(type: EntryType): Promise<T[]> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("entries")
    .select("id,user_id,type,content,created_at,updated_at")
    .eq("user_id", user.id)
    .eq("type", type)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data || []) as DbRow[];

  return rows
    .map((r) => {
      const parsed = safeParseContent(r.content);
      // ensure the object has id
      if (parsed && typeof parsed === "object") {
        return { ...parsed, id: parsed.id ?? r.id } as T;
      }
      // if parsed is string, wrap it
      return ({ id: r.id, content: parsed } as unknown) as T;
    })
    .filter(Boolean) as T[];
}

export async function createEntry<T extends { id?: string }>(
  type: EntryType,
  payload: T
): Promise<string> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: user.id,
      type,
      content: safeStringifyContent(payload),
    })
    .select("id")
    .single();

  if (error) throw error;
  return (data as any)?.id as string;
}

export async function updateEntry<T>(
  id: string,
  type: EntryType,
  payload: T
): Promise<void> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("entries")
    .update({
      content: safeStringifyContent(payload),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("type", type);

  if (error) throw error;
}

export async function deleteEntry(
  id: string,
  type: EntryType
): Promise<void> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("type", type);

  if (error) throw error;
}
