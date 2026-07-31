import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requestUser, serviceSupabase } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const user = await requestUser(req);
  if (!user) return res.status(401).json({ error: "Please sign in again." });

  try {
    const { data, error } = await serviceSupabase()
      .from("founder_access_grants")
      .select("access_kind, seat_number, ends_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .lte("starts_at", new Date().toISOString())
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return res.status(200).json({ grant: data || null });
  } catch (error: any) {
    console.error("Founder access lookup error:", error);
    return res.status(500).json({ error: error?.message || "Unable to load founder access." });
  }
}
