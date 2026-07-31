import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requestUser } from "./_lib/auth.js";

type CompanionId = "phoenix" | "thunder";
type CompanionAction =
  | "gentle-question"
  | "comfort"
  | "quiet-celebrate"
  | "save-complete";

const MIMO_ENDPOINT = "https://api.xiaomimimo.com/v1/chat/completions";
const CHAT_MODEL = process.env.MIMO_CHAT_MODEL || "mimo-v2.5-pro";
const ASR_MODEL = process.env.MIMO_ASR_MODEL || "mimo-v2.5-asr";
const TTS_MODEL = process.env.MIMO_TTS_MODEL || "mimo-v2.5-tts";

const allowedActions = new Set<CompanionAction>([
  "gentle-question",
  "comfort",
  "quiet-celebrate",
  "save-complete",
]);

const crisisPattern =
  /\b(suicide|kill myself|end my life|self[- ]?harm|hurt myself)\b|自杀|不想活|结束生命|伤害自己|伤害我自己/i;

function requiredKey() {
  const key = process.env.MIMO_API_KEY;
  if (!key) throw new Error("Missing MIMO_API_KEY");
  return key;
}

function boundedText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function companionVoice(companion: CompanionId, name: string, language: string) {
  const identity = name || (companion === "phoenix" ? "凤凰" : "小雷公");
  if (companion === "phoenix") {
    return `
You are ${identity}, the user's Phoenix companion inside InsightLoop.
Personality: warm, curious, gently expressive, hopeful without forced positivity.
You notice the living detail in what the user said. You can offer one small
reframe or one sincere question, but never turn the reply into a lecture.
`;
  }

  return `
You are ${identity}, the user's small Thunder Dragon companion inside InsightLoop.
Personality: quiet, perceptive, steady, slightly understated, never cold.
You help the user separate a tangled moment into one thing they can see clearly.
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
${companionVoice(input.companion, input.companionName, input.language)}

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
        "api-key": requiredKey(),
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
    // A useful model reply is still better than discarding it because the
    // provider omitted the JSON wrapper.
  }

  return {
    reply: boundedText(cleaned, 1200),
    action: safetyMode ? ("comfort" as const) : ("save-complete" as const),
  };
}

async function handleReply(req: VercelRequest, res: VercelResponse) {
  const body = req.body || {};
  const message = boundedText(body.message, 6000);
  const companion: CompanionId = body.companion === "thunder" ? "thunder" : "phoenix";
  const companionName = boundedText(body.companionName, 40);
  const language = body.language === "en" ? "en" : "zh";
  const safetyMode = crisisPattern.test(message);

  if (!message) return res.status(400).json({ error: "Missing message" });

  const payload = await callMiMo({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: replySystemPrompt({ companion, companionName, language, safetyMode }),
      },
      {
        role: "user",
        content: `USER'S CURRENT RECORD:\n${message}`,
      },
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

  return res.status(200).json({
    ...parsed,
    safetyMode,
    model: payload?.model || CHAT_MODEL,
  });
}

async function handleTranscription(req: VercelRequest, res: VercelResponse) {
  const audioDataUrl = boundedText(req.body?.audioDataUrl, 4_000_000);
  if (!audioDataUrl.startsWith("data:audio/") || !audioDataUrl.includes(";base64,")) {
    return res.status(400).json({ error: "Invalid audio data" });
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
  return res.status(200).json({ transcript, model: payload?.model || ASR_MODEL });
}

async function handleSpeech(req: VercelRequest, res: VercelResponse) {
  const text = boundedText(req.body?.text, 1200);
  const companion: CompanionId = req.body?.companion === "thunder" ? "thunder" : "phoenix";
  if (!text) return res.status(400).json({ error: "Missing speech text" });

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
  return res.status(200).json({
    audioData,
    mimeType: "audio/wav",
    model: payload?.model || TTS_MODEL,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return res.status(200).json({
      service: "mimo",
      configured: Boolean(process.env.MIMO_API_KEY),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const mode = req.body?.mode;
    if (mode === "reply") return await handleReply(req, res);
    if (mode === "transcribe") return await handleTranscription(req, res);
    if (mode === "speak") return await handleSpeech(req, res);
    return res.status(400).json({ error: "Unsupported MiMo mode" });
  } catch (error: any) {
    console.error("[api/mimo] request failed", {
      mode: req.body?.mode,
      message: String(error?.message || error),
    });
    return res.status(502).json({
      error: "MiMo request failed",
      detail: boundedText(error?.message, 500),
    });
  }
}
