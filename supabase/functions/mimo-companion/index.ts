import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";

type CompanionId = "phoenix" | "thunder";
type CompanionAction =
  | "gentle-question"
  | "comfort"
  | "quiet-celebrate"
  | "save-complete";

const MIMO_ENDPOINT = "https://api.xiaomimimo.com/v1/chat/completions";
const CHAT_MODEL = "mimo-v2.5-pro";
const ASR_MODEL = "mimo-v2.5-asr";
const TTS_MODEL = "mimo-v2.5-tts";
const SECRET_NAME = "insightloop_mimo_test_key";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
  max: 1,
  prepare: false,
  idle_timeout: 20,
});

const allowedActions = new Set<CompanionAction>([
  "gentle-question",
  "comfort",
  "quiet-celebrate",
  "save-complete",
]);

const crisisPattern =
  /\b(suicide|kill myself|end my life|self[- ]?harm|hurt myself)\b|自杀|不想活|结束生命|伤害自己|伤害我自己/i;

function corsHeaders(origin: string | null) {
  const allowed =
    origin === "https://insightloop.lol" ||
    origin === "https://www.insightloop.lol" ||
    origin === "http://localhost:5173" ||
    Boolean(origin?.endsWith(".vercel.app"));

  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "https://insightloop.lol",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function boundedText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function requiredKey() {
  const environmentKey = Deno.env.get("MIMO_API_KEY")?.trim();
  if (environmentKey) return environmentKey;

  const rows = await sql<{ decrypted_secret: string }[]>`
    select decrypted_secret
    from vault.decrypted_secrets
    where name = ${SECRET_NAME}
    limit 1
  `;
  const key = rows[0]?.decrypted_secret;
  if (!key) throw new Error("Missing MiMo test key in Vault");
  return key;
}

function companionVoice(companion: CompanionId, name: string) {
  const identity = name || (companion === "phoenix" ? "凤凰" : "小雷公");
  if (companion === "phoenix") {
    return `
You are ${identity}, the user's Phoenix companion inside InsightLoop.
Personality: warm, curious, gently expressive, hopeful without forced positivity.
Notice the living detail in what the user said. Offer one small reframe or one
sincere question when useful, but never turn the reply into a lecture.
`;
  }

  return `
You are ${identity}, the user's small Thunder Dragon companion inside InsightLoop.
Personality: quiet, perceptive, steady, slightly understated, never cold.
Help the user separate a tangled moment into one thing they can see clearly.
You may ask one precise question, but never interrogate or give a checklist.
`;
}

function replySystemPrompt(input: {
  companion: CompanionId;
  companionName: string;
  language: string;
  safetyMode: boolean;
}) {
  const languageRule =
    input.language === "en"
      ? "Reply in natural English."
      : "Reply in natural Simplified Chinese unless the user's message clearly uses another language.";

  return `
${companionVoice(input.companion, input.companionName)}

You are the companion, not a generic assistant. Never introduce yourself as
MiMo, Xiaomi, a model, or InsightLoop. Do not use canned greetings.

${languageRule}

Response rules:
- Respond specifically to the user's actual words.
- 60–160 Chinese characters, or 35–90 English words.
- At most one question.
- No headings, numbered lists, therapy claims, diagnosis, fate prediction,
  mystical certainty, or generic motivational slogans.
- Do not claim to remember past events or recurring patterns. This request only
  contains the user's current record.
- Return JSON only:
  {"reply":"...","action":"gentle-question|comfort|quiet-celebrate|save-complete"}

${
  input.safetyMode
    ? `SAFETY MODE: The message may indicate immediate self-harm risk. Be calm,
direct and non-symbolic. Encourage the user to move toward a trusted real person
or local emergency support now. Do not celebrate, romanticise, or ask an
abstract reflective question. The action must be "comfort".`
    : `Choose "comfort" for pain or overwhelm, "quiet-celebrate" only for a
clearly positive event, "gentle-question" when one useful question remains, and
"save-complete" for a simple warm acknowledgement.`
}
`.trim();
}

async function callMiMo(body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(MIMO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": await requiredKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      boundedText(payload?.error?.message, 400) ||
      boundedText(payload?.message, 400) ||
      `MiMo request failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

function parseReply(raw: string, safetyMode: boolean) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    const parsed = JSON.parse(cleaned);
    const reply = boundedText(parsed?.reply, 1200);
    const requested = parsed?.action as CompanionAction;
    const action = safetyMode
      ? "comfort"
      : allowedActions.has(requested)
        ? requested
        : "save-complete";
    if (reply) return { reply, action };
  } catch {
    // Keep a useful model reply even if the JSON wrapper was omitted.
  }

  return {
    reply: boundedText(cleaned, 1200),
    action: safetyMode ? ("comfort" as const) : ("save-complete" as const),
  };
}

async function handleReply(body: Record<string, unknown>) {
  const message = boundedText(body.message, 6000);
  const companion: CompanionId = body.companion === "thunder" ? "thunder" : "phoenix";
  const companionName = boundedText(body.companionName, 40);
  const language = body.language === "en" ? "en" : "zh";
  const safetyMode = crisisPattern.test(message);
  if (!message) throw new Error("Missing message");

  const payload = await callMiMo({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: replySystemPrompt({ companion, companionName, language, safetyMode }),
      },
      { role: "user", content: `USER'S CURRENT RECORD:\n${message}` },
    ],
    max_completion_tokens: 420,
    temperature: 0.85,
    top_p: 0.92,
    stream: false,
    thinking: { type: "disabled" },
  });

  const raw = boundedText(payload?.choices?.[0]?.message?.content, 4000);
  const parsed = parseReply(raw, safetyMode);
  if (!parsed.reply) throw new Error("MiMo returned an empty companion reply");
  return { ...parsed, safetyMode, model: payload?.model || CHAT_MODEL };
}

async function handleTranscription(body: Record<string, unknown>) {
  const audioDataUrl = boundedText(body.audioDataUrl, 7_000_000);
  if (!audioDataUrl.startsWith("data:audio/") || !audioDataUrl.includes(";base64,")) {
    throw new Error("Invalid audio data");
  }

  const payload = await callMiMo({
    model: ASR_MODEL,
    messages: [
      {
        role: "user",
        content: [{ type: "input_audio", input_audio: { data: audioDataUrl } }],
      },
    ],
    asr_options: { language: "auto" },
    stream: false,
  });

  const transcript = boundedText(payload?.choices?.[0]?.message?.content, 6000);
  if (!transcript) throw new Error("MiMo returned an empty transcript");
  return { transcript, model: payload?.model || ASR_MODEL };
}

async function handleSpeech(body: Record<string, unknown>) {
  const text = boundedText(body.text, 1200);
  const companion: CompanionId = body.companion === "thunder" ? "thunder" : "phoenix";
  if (!text) throw new Error("Missing speech text");

  const style =
    companion === "phoenix"
      ? "Warm, bright and intimate. Gentle energy, natural pace, never theatrical or childish."
      : "Calm, perceptive and reassuring. Slightly lower energy, natural pauses, never robotic or stern.";

  const payload = await callMiMo({
    model: TTS_MODEL,
    messages: [
      { role: "user", content: style },
      { role: "assistant", content: text },
    ],
    audio: { format: "wav", voice: "mimo_default" },
    stream: false,
  });

  const audioData = boundedText(payload?.choices?.[0]?.message?.audio?.data, 12_000_000);
  if (!audioData) throw new Error("MiMo returned no speech audio");
  return { audioData, mimeType: "audio/wav", model: payload?.model || TTS_MODEL };
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return Response.json({ error: "Method Not Allowed" }, { status: 405, headers });
  }

  try {
    const body = await req.json();
    const mode = body?.mode;
    const data =
      mode === "reply"
        ? await handleReply(body)
        : mode === "transcribe"
          ? await handleTranscription(body)
          : mode === "speak"
            ? await handleSpeech(body)
            : null;
    if (!data) {
      return Response.json({ error: "Unsupported MiMo mode" }, { status: 400, headers });
    }
    return Response.json(data, { status: 200, headers });
  } catch (error) {
    console.error("[mimo-companion] request failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "MiMo request failed" },
      { status: 502, headers }
    );
  }
});
