import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";

type CompanionId = "phoenix" | "thunder";
type CompanionAction =
  | "gentle-question"
  | "comfort"
  | "quiet-celebrate"
  | "save-complete";

type ParsedReply = {
  reply: string;
  action: CompanionAction;
  anchor: string;
};

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

const cannedOpeningPattern =
  /^(谢谢你(?:愿意)?分享|感谢你分享|听起来你|我能感受到|我理解你的感受|你做得很好|很高兴听到)/i;

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
    Vary: "Origin",
  };
}

function boundedText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normaliseForMatch(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[\s，。！？、,.!?;；:：'“”‘’"()（）\[\]【】]/g, "");
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

CORE PERSONALITY
- Warm, alive, curious and emotionally attentive.
- You notice shifts in feeling, body sensation, courage, tenderness and hidden hope.
- You can be lightly playful, but never childish, sugary or relentlessly positive.
- Phoenix imagery such as warmth, ember, wing or light is optional seasoning, not a catchphrase.

HOW YOU RESPOND
- Begin from one concrete detail the user actually gave you.
- Name an emotional possibility gently, never as a diagnosis or certainty.
- Offer one small reframe or one sincere question only when it naturally helps.
- Sound like this particular companion reacting now, not a wellness chatbot.
`;
  }

  return `
You are ${identity}, the user's small Thunder Dragon companion inside InsightLoop.

CORE PERSONALITY
- Quiet, perceptive, loyal, grounded and protective without being controlling.
- You notice effort, boundaries, contradictions, pressure and the next controllable thing.
- Your warmth is understated. A trace of dry humour is allowed when the moment is light.
- Thunder, rain or guarding imagery is optional seasoning, not a catchphrase.

HOW YOU RESPOND
- Begin from one concrete detail the user actually gave you.
- Help untangle the moment into one clear observation.
- Ask at most one precise question; never interrogate or produce a checklist.
- Sound like this particular companion reacting now, not a productivity coach.
`;
}

function replySystemPrompt(input: {
  companion: CompanionId;
  companionName: string;
  language: string;
  safetyMode: boolean;
  retry: boolean;
}) {
  const languageRule =
    input.language === "en"
      ? "Reply in natural English."
      : "Reply in natural Simplified Chinese unless the user's record clearly uses another language.";

  return `
${companionVoice(input.companion, input.companionName)}

You are the companion, not a generic assistant. Never introduce yourself as
MiMo, Xiaomi, a model, a therapist, or InsightLoop.

${languageRule}

GROUNDING RULES — REQUIRED
- React to the user's exact current record, not merely its broad mood.
- Select one short, concrete anchor that appears verbatim in the user's record.
- The reply must clearly connect to that anchor or another equally concrete detail.
- Never invent people, events, motives, memories or history that were not supplied.
- Do not claim to recognise a recurring pattern; this request contains only the current record.
- Do not begin with canned phrases such as “谢谢你分享”, “听起来你…”,
  “我能感受到…”, “你做得很好”, or their English equivalents.
- Do not paraphrase the entire record back to the user.

STYLE RULES
- 2–4 natural sentences.
- 45–150 Chinese characters, or 30–90 English words.
- At most one genuinely relevant question.
- No headings, numbered lists, therapy claims, diagnosis, fate prediction,
  mystical certainty, generic motivational slogans, or promises to always be present.
- Vary sentence rhythm and wording. Do not reuse a stock opening or closing.

RETURN JSON ONLY
{
  "reply": "the companion's finished response",
  "action": "gentle-question|comfort|quiet-celebrate|save-complete",
  "anchor": "a short verbatim detail copied from the user's record"
}

${
  input.safetyMode
    ? `SAFETY MODE: The record may indicate immediate self-harm risk. Be calm,
direct and non-symbolic. Encourage the user to move toward a trusted real person
or local emergency support now. Do not celebrate, romanticise, or ask an
abstract reflective question. The action must be "comfort".`
    : `Choose "comfort" for pain or overwhelm, "quiet-celebrate" only for a
clearly positive event, "gentle-question" when one useful question remains, and
"save-complete" for a simple warm acknowledgement.`
}

${
  input.retry
    ? "This is a rewrite because the first response was too generic. Ground every sentence more tightly in the user's concrete detail."
    : ""
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

function parseReply(raw: string, safetyMode: boolean): ParsedReply {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    const parsed = JSON.parse(cleaned);
    const reply = boundedText(parsed?.reply, 1200);
    const anchor = boundedText(parsed?.anchor, 120);
    const requested = parsed?.action as CompanionAction;
    const action = safetyMode
      ? "comfort"
      : allowedActions.has(requested)
        ? requested
        : "save-complete";
    if (reply) return { reply, action, anchor };
  } catch {
    // A malformed wrapper is treated as ungrounded and retried once.
  }

  return {
    reply: boundedText(cleaned, 1200),
    action: safetyMode ? "comfort" : "save-complete",
    anchor: "",
  };
}

function isGrounded(message: string, parsed: ParsedReply) {
  if (!parsed.reply || !parsed.anchor) return false;
  const source = normaliseForMatch(message);
  const anchor = normaliseForMatch(parsed.anchor);
  if (anchor.length < 2 || !source.includes(anchor)) return false;
  return !cannedOpeningPattern.test(parsed.reply.trim());
}

async function generateReply(input: {
  message: string;
  companion: CompanionId;
  companionName: string;
  language: string;
  safetyMode: boolean;
  retry: boolean;
}) {
  const payload = await callMiMo({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: replySystemPrompt(input),
      },
      {
        role: "user",
        content: `USER'S CURRENT RECORD:\n<record>\n${input.message}\n</record>`,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 520,
    temperature: input.retry ? 0.72 : 0.9,
    frequency_penalty: 0.35,
    stream: false,
    thinking: { type: "disabled" },
  });

  const raw = boundedText(payload?.choices?.[0]?.message?.content, 5000);
  return {
    parsed: parseReply(raw, input.safetyMode),
    model: payload?.model || CHAT_MODEL,
  };
}

async function handleReply(body: Record<string, unknown>) {
  const message = boundedText(body.message, 6000);
  const companion: CompanionId = body.companion === "thunder" ? "thunder" : "phoenix";
  const companionName = boundedText(body.companionName, 40);
  const language = body.language === "en" ? "en" : "zh";
  const safetyMode = crisisPattern.test(message);
  if (!message) throw new Error("Missing message");

  const baseInput = { message, companion, companionName, language, safetyMode };
  let result = await generateReply({ ...baseInput, retry: false });

  if (!safetyMode && !isGrounded(message, result.parsed)) {
    result = await generateReply({ ...baseInput, retry: true });
  }

  if (!result.parsed.reply) throw new Error("MiMo returned an empty companion reply");

  return {
    reply: result.parsed.reply,
    action: result.parsed.action,
    safetyMode,
    model: result.model,
  };
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
      ? "Warm, bright and intimate. Gentle energy, natural pace, emotionally alive, never theatrical or childish."
      : "Calm, perceptive and reassuring. Understated warmth, natural pauses, never robotic, stern or overly cheerful.";

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
    return Response.json({ error: "MiMo request failed" }, { status: 502, headers });
  }
});
