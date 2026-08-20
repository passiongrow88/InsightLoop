import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const PREVIEW_SUPABASE_URL = "https://psgjismukjxpsnodtwvl.supabase.co";
const PREVIEW_SUPABASE_KEY = "sb_publishable_V51jM3gFdCgsJA_Kw9W2zg_522aw52U";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // This route is deliberately unusable in Production, even if secrets are copied accidentally.
  if (process.env.VERCEL_ENV !== "preview" && process.env.ALLOW_LOCAL_PREVIEW_BILLING !== "true") {
    return res.status(403).json({ error: "Preview billing is disabled outside Vercel Preview." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  const priceId = process.env.STRIPE_PREVIEW_PRICE_MONTHLY || "";
  if (!secretKey.startsWith("sk_test_") || !priceId.startsWith("price_")) {
    return res.status(503).json({ error: "Stripe Test Mode is not configured for this Preview yet." });
  }

  const bearer = String(req.headers.authorization || "");
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Sign in before starting checkout." });

  const authClient = createClient(
    process.env.SUPABASE_URL || PREVIEW_SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY || PREVIEW_SUPABASE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error: authError } = await authClient.auth.getUser(token);
  if (authError || !data.user?.email) return res.status(401).json({ error: "Your Preview session is no longer valid." });

  try {
    const stripe = new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });
    const appUrl = `https://${process.env.VERCEL_URL || ""}`.replace(/\/$/, "");
    if (appUrl === "https://") return res.status(500).json({ error: "Missing Preview deployment URL." });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?billing=canceled`,
      client_reference_id: data.user.id,
      customer_email: data.user.email,
      metadata: { userId: data.user.id, environment: "preview" },
      subscription_data: { metadata: { userId: data.user.id, environment: "preview" } },
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("Preview Stripe checkout failed", error);
    return res.status(500).json({ error: "Preview checkout could not be created." });
  }
}
