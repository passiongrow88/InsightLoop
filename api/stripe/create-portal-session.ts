import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const PREVIEW_SUPABASE_URL = "https://psgjismukjxpsnodtwvl.supabase.co";
const PREVIEW_SUPABASE_KEY = "sb_publishable_V51jM3gFdCgsJA_Kw9W2zg_522aw52U";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (process.env.VERCEL_ENV !== "preview" && process.env.ALLOW_LOCAL_PREVIEW_BILLING !== "true") {
    return res.status(403).json({ error: "Preview billing is disabled outside Vercel Preview." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!secretKey.startsWith("sk_test_") || !serviceKey) {
    return res.status(503).json({ error: "Preview billing portal is not configured." });
  }

  const bearer = String(req.headers.authorization || "");
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  const authClient = createClient(PREVIEW_SUPABASE_URL, PREVIEW_SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error: authError } = await authClient.auth.getUser(token);
  if (authError || !data.user) return res.status(401).json({ error: "Invalid Preview session." });

  const admin = createClient(PREVIEW_SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
  const { data: profile, error: profileError } = await admin.from("profiles").select("stripe_customer_id").eq("id", data.user.id).single();
  if (profileError || !profile?.stripe_customer_id) return res.status(404).json({ error: "No Preview subscription found." });

  try {
    const stripe = new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });
    const appUrl = `https://${process.env.VERCEL_URL || ""}`;
    const session = await stripe.billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: appUrl });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Preview Stripe portal failed", error);
    return res.status(500).json({ error: "Preview billing portal could not be opened." });
  }
}
