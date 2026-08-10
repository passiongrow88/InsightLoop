import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const PREVIEW_SUPABASE_URL = "https://psgjismukjxpsnodtwvl.supabase.co";

export const config = { api: { bodyParser: false } };

const readBody = (req: VercelRequest) => new Promise<Buffer>((resolve, reject) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => resolve(Buffer.concat(chunks)));
  req.on("error", reject);
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (process.env.VERCEL_ENV !== "preview") return res.status(403).json({ error: "Preview webhook only." });

  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!secretKey.startsWith("sk_test_") || !webhookSecret.startsWith("whsec_") || !serviceKey) {
    return res.status(503).json({ error: "Preview webhook is not configured." });
  }

  try {
    const stripe = new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });
    const event = stripe.webhooks.constructEvent(await readBody(req), String(req.headers["stripe-signature"] || ""), webhookSecret);
    const admin = createClient(PREVIEW_SUPABASE_URL, serviceKey, { auth: { persistSession: false } });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.environment === "preview" ? (session.metadata.userId || session.client_reference_id) : null;
      if (userId && session.customer && session.subscription) {
        const { error } = await admin.from("profiles").update({
          plan: "pro",
          subscription_status: "active",
          stripe_customer_id: String(session.customer),
          stripe_subscription_id: String(session.subscription),
        }).eq("id", userId);
        if (error) throw error;
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.metadata?.environment === "preview") {
        const deleted = event.type === "customer.subscription.deleted";
        const { error } = await admin.from("profiles").update({
          plan: deleted ? "free" : (subscription.status === "active" || subscription.status === "trialing" ? "pro" : "free"),
          subscription_status: subscription.status,
        }).eq("stripe_subscription_id", subscription.id);
        if (error) throw error;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Preview Stripe webhook failed", error);
    return res.status(400).json({ error: "Invalid Preview webhook." });
  }
}
