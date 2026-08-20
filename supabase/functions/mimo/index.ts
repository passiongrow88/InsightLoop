import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";

const DEFAULT_MIMO_BASE_URL = "https://token-plan-sgp.xiaomimimo.com/v1";
const ALLOWED_MIMO_HOSTS = new Set([
  "api.xiaomimimo.com",
  "token-plan-cn.xiaomimimo.com",
  "token-plan-sgp.xiaomimimo.com",
  "token-plan-ams.xiaomimimo.com",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "private, no-store",
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function chatCompletionsUrl() {
  const base = new URL(Deno.env.get("MIMO_BASE_URL") || DEFAULT_MIMO_BASE_URL);
  if (base.protocol !== "https:" || !ALLOWED_MIMO_HOSTS.has(base.hostname)) {
    throw new Error("MIMO_BASE_URL is not an approved Xiaomi MiMo endpoint.");
  }
  return `${base.toString().replace(/\/$/, "")}/chat/completions`;
}

function publishableKey() {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) return legacy;

  const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}") as Record<string, string>;
  if (!keys.default) throw new Error("Supabase publishable key is unavailable.");
  return keys.default;
}

async function requireUser(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw Object.assign(new Error("A valid Preview session is required."), { status: 401 });

  const client = createClient(Deno.env.get("SUPABASE_URL")!, publishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw Object.assign(new Error("A valid Preview session is required."), { status: 401 });
  }
  return data.user.id;
}

type ChatBody = {
  action?: "chat";
  prompt?: string;
  systemInstruction?: string;
};

type SpeechBody = {
  action: "tts";
  text?: string;
  language?: "zh" | "en";
};

Deno.serve(async (req: Request) => {
  const requestId = req.headers.get("x-request-id") || `mimo-${crypto.randomUUID()}`;
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method === "GET") {
      return jsonResponse({ ok: true, configured: Boolean(Deno.env.get("MIMO_API_KEY")), model: "mimo-v2.5" });
    }
    if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, 405);

    const userId = await requireUser(req);
    const apiKey = Deno.env.get("MIMO_API_KEY");
    if (!apiKey) return jsonResponse({ error: "MiMo is not configured for this Preview." }, 503);

    const body = await req.json() as ChatBody | SpeechBody;
    console.log("[mimo] request", { requestId, userId, action: body.action || "chat" });

    if (body.action === "tts") {
      if (!body.text || typeof body.text !== "string") return jsonResponse({ error: "Missing speech text" }, 400);
      if (body.text.length > 3_000) return jsonResponse({ error: "Speech text is too long" }, 413);

      const style = body.language === "en"
        ? "Warm, calm, intimate journal reading. Unhurried pace, soft natural tone, emotionally present without sounding theatrical or clinical."
        : "温暖、平静、亲近地朗读日记。语速舒缓，声音自然柔和，有情感但不表演化，也不像临床播报。";

      const upstream = await fetch(chatCompletionsUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "mimo-v2.5-tts",
          messages: [
            { role: "user", content: style },
            { role: "assistant", content: body.text },
          ],
          audio: { format: "wav", voice: "mimo_default" },
          stream: false,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!upstream.ok) {
        return jsonResponse({
          error: "MiMo could not synthesize the journal voice.",
          providerStatus: upstream.status,
          requestId: upstream.headers.get("x-request-id") || requestId,
        }, upstream.status >= 500 ? 502 : upstream.status);
      }

      const data = await upstream.json() as { choices?: Array<{ message?: { audio?: { data?: string } } }> };
      const audioBase64 = data.choices?.[0]?.message?.audio?.data || "";
      if (!audioBase64 || !/^[A-Za-z0-9+/=]+$/.test(audioBase64)) {
        return jsonResponse({ error: "MiMo returned no playable journal audio.", requestId }, 502);
      }
      return jsonResponse({ audioBase64, contentType: "audio/wav", provider: "mimo-v2.5-tts" });
    }

    if (!body.prompt || typeof body.prompt !== "string") return jsonResponse({ error: "Missing prompt" }, 400);
    if (body.prompt.length > 48_000 || (body.systemInstruction?.length || 0) > 12_000) {
      return jsonResponse({ error: "Journal context is too large" }, 413);
    }

    const upstream = await fetch(chatCompletionsUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "mimo-v2.5",
        messages: [
          ...(body.systemInstruction ? [{ role: "system", content: body.systemInstruction }] : []),
          { role: "user", content: body.prompt },
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
      return jsonResponse({
        error: "MiMo could not generate the journal response.",
        providerStatus: upstream.status,
        requestId: upstream.headers.get("x-request-id") || requestId,
      }, upstream.status >= 500 ? 502 : upstream.status);
    }

    const data = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    if (!text) return jsonResponse({ error: "MiMo returned an empty journal response.", requestId }, 502);
    return jsonResponse({ text, provider: "mimo", model: "mimo-v2.5" });
  } catch (error) {
    const details = error as { name?: string; message?: string; status?: number };
    const status = Number(details.status) || (details.name === "TimeoutError" ? 504 : 500);
    console.error("[mimo] failed", { requestId, status, name: details.name, message: details.message });
    return jsonResponse({
      error: status === 504
        ? "MiMo timed out. Your journal entry remains saved."
        : String(details.message || "MiMo request failed."),
      requestId,
    }, status);
  }
});
