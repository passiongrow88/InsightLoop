import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const PREVIEW_SUPABASE_URL = "https://psgjismukjxpsnodtwvl.supabase.co";
const PREVIEW_SUPABASE_KEY = "sb_publishable_V51jM3gFdCgsJA_Kw9W2zg_522aw52U";
const DEFAULT_MIMO_BASE_URL = "https://token-plan-sgp.xiaomimimo.com/v1";
const ALLOWED_MIMO_HOSTS = new Set([
  "api.xiaomimimo.com",
  "token-plan-cn.xiaomimimo.com",
  "token-plan-sgp.xiaomimimo.com",
  "token-plan-ams.xiaomimimo.com",
]);

function chatCompletionsUrl() {
  const base = new URL(process.env.MIMO_BASE_URL || DEFAULT_MIMO_BASE_URL);
  if (base.protocol !== "https:" || !ALLOWED_MIMO_HOSTS.has(base.hostname)) {
    throw new Error("MIMO_BASE_URL is not an approved Xiaomi MiMo endpoint.");
  }
  return `${base.toString().replace(/\/$/, "")}/chat/completions`;
}

async function requirePreviewUser(req: VercelRequest) {
  const bearer = String(req.headers.authorization || "");
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  const authClient = createClient(
    process.env.SUPABASE_URL || PREVIEW_SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY || PREVIEW_SUPABASE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw Object.assign(new Error("A valid Preview session is required."), { status: 401 });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
    if (process.env.VERCEL_ENV !== "preview" && process.env.ALLOW_LOCAL_PREVIEW_AI !== "true") {
      return res.status(403).json({ error: "Journal AI is enabled only in the V5 Preview." });
    }
    await requirePreviewUser(req);

    const apiKey = process.env.MIMO_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "MiMo is not configured for this Preview." });

    const { prompt, systemInstruction } = (req.body || {}) as {
      prompt?: string;
      systemInstruction?: string;
    };
    if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "Missing prompt" });
    if (prompt.length > 48_000 || (systemInstruction?.length || 0) > 12_000) {
      return res.status(413).json({ error: "Journal context is too large" });
    }

    const upstream = await fetch(chatCompletionsUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mimo-v2.5",
        messages: [
          ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 1400,
        temperature: 0.7,
        top_p: 0.95,
        stream: false,
        thinking: { type: "disabled" },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        error: "MiMo could not generate the journal response.",
        providerStatus: upstream.status,
        requestId: upstream.headers.get("x-request-id") || undefined,
      });
    }

    const data = await upstream.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    if (!text) return res.status(502).json({ error: "MiMo returned an empty journal response." });
    return res.status(200).json({ text, provider: "mimo", model: "mimo-v2.5" });
  } catch (error: any) {
    const status = Number(error?.status) || (error?.name === "TimeoutError" ? 504 : 500);
    return res.status(status).json({
      error: status === 504 ? "MiMo timed out. Your journal entry remains saved." : String(error?.message || "MiMo request failed."),
    });
  }
}
