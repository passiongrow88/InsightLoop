import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin, serviceSupabase } from "../_lib/auth";

const LIFETIME = "invited_lifetime";
const TRIAL = "invited_90day";

function parseBody(body: unknown) {
  if (typeof body === "string") return JSON.parse(body || "{}");
  return body || {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Administrator access is required." });

  try {
    const supabase = serviceSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("founder_invites")
        .select("id, claim_token, recipient_email, recipient_name, access_kind, seat_number, expires_at, claimed_at, revoked_at, created_at")
        .order("seat_number", { ascending: true });
      if (error) throw error;
      return res.status(200).json({ invites: data || [] });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const body = parseBody(req.body) as Record<string, unknown>;

    if (body.action === "revoke") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) return res.status(400).json({ error: "Missing invitation id." });
      const revokedAt = new Date().toISOString();
      const { error: inviteError } = await supabase
        .from("founder_invites")
        .update({ revoked_at: revokedAt })
        .eq("id", id);
      if (inviteError) throw inviteError;
      const { error: grantError } = await supabase
        .from("founder_access_grants")
        .update({ status: "revoked", revoked_at: revokedAt })
        .eq("invite_id", id)
        .eq("status", "active");
      if (grantError) throw grantError;
      return res.status(200).json({ ok: true });
    }

    const recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail.trim().toLowerCase() : "";
    const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim() : null;
    const accessKind = body.accessKind === TRIAL ? TRIAL : body.accessKind === LIFETIME ? LIFETIME : null;
    if (!recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail) || !accessKind) {
      return res.status(400).json({ error: "A valid email and invitation type are required." });
    }

    const { data: existing, error: existingError } = await supabase
      .from("founder_invites")
      .select("seat_number, access_kind, revoked_at")
      .eq("access_kind", accessKind);
    if (existingError) throw existingError;

    const occupied = new Set((existing || []).filter((row) => !row.revoked_at).map((row) => row.seat_number));
    const start = accessKind === LIFETIME ? 1 : 6;
    const seatNumber = Array.from({ length: 5 }, (_, offset) => start + offset).find((seat) => !occupied.has(seat));
    if (!seatNumber) return res.status(409).json({ error: "All five seats in this invitation group have been issued." });

    const { data, error } = await supabase
      .from("founder_invites")
      .insert({
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        access_kind: accessKind,
        seat_number: seatNumber,
        created_by: admin.id,
      })
      .select("id, claim_token, recipient_email, recipient_name, access_kind, seat_number, expires_at, claimed_at, revoked_at, created_at")
      .single();
    if (error) throw error;
    return res.status(201).json({ invite: data });
  } catch (error: any) {
    console.error("Founder invitation admin error:", error);
    return res.status(500).json({ error: error?.message || "Unable to update founder invitations." });
  }
}
