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
      return res.status(403).json({ error: "Journal voice is enabled only in the V5 Preview." });
    }
    await requirePreviewUser(req);

    const apiKey = process.env.MIMO_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "MiMo TTS is not configured for this Preview." });

    const { text, language } = (req.body || {}) as { text?: string; language?: "zh" | "en" };
    if (!text || typeof text !== "string") return res.status(400).json({ error: "Missing speech text" });
    if (text.length > 3_000) return res.status(413).json({ error: "Speech text is too long" });

    const style = language === "en"
      ? "Warm, calm, intimate journal reading. Unhurried pace, soft natural tone, emotionally present without sounding theatrical or clinical."
      : "温暖、平静、亲近地朗读日记。语速舒缓，声音自然柔和，有情感但不表演化，也不像临床播报。";

    const upstream = await fetch(chatCompletionsUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mimo-v2.5-tts",
        messages: [
          { role: "user", content: style },
          { role: "assistant", content: text },
        ],
        audio: { format: "wav", voice: "mimo_default" },
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        error: "MiMo could not synthesize the journal voice.",
        providerStatus: upstream.status,
        requestId: upstream.headers.get("x-request-id") || undefined,
      });
    }

    const data = await upstream.json() as {
      choices?: Array<{ message?: { audio?: { data?: string } } }>;
    };
    const encoded = data.choices?.[0]?.message?.audio?.data || "";
    if (!encoded || !/^[A-Za-z0-9+/=]+$/.test(encoded)) {
      return res.status(502).json({ error: "MiMo returned no playable journal audio." });
    }
    const audio = Buffer.from(encoded, "base64");
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", String(audio.length));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-InsightLoop-Voice-Provider", "mimo-v2.5-tts");
    return res.status(200).send(audio);
  } catch (error: any) {
    const status = Number(error?.status) || (error?.name === "TimeoutError" ? 504 : 500);
    return res.status(status).json({
      error: status === 504 ? "MiMo TTS timed out. You can continue reading the saved text." : String(error?.message || "MiMo TTS request failed."),
    });
  }
}
