import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-12-15.clover",
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { customerId } = req.body as { customerId?: string };
    if (!customerId) return res.status(400).json({ error: "Missing customerId" });

    const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
    if (!appUrl) return res.status(500).json({ error: "Missing APP_URL" });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (e: any) {
    return res.status(500).json({ error: "Server error", detail: e?.message || String(e) });
  }
}
