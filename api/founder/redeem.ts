import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requestUser, serviceSupabase } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await requestUser(req);
  if (!user?.email) return res.status(401).json({ error: "Please sign in before accepting this invitation." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) return res.status(400).json({ error: "Missing invitation token." });

    const { data, error } = await serviceSupabase().rpc("redeem_founder_invite", {
      p_claim_token: token,
      p_user_id: user.id,
      p_user_email: user.email,
    });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ claim: data?.[0] });
  } catch (error: any) {
    console.error("Founder invitation redemption error:", error);
    return res.status(500).json({ error: error?.message || "Unable to accept invitation." });
  }
}
