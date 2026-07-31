import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";

type CompanionId = "phoenix" | "thunder";
type CompanionAction = "gentle-question" | "comfort" | "quiet-celebrate" | "save-complete";
type ParsedReply = { reply: string; action: CompanionAction; anchor: string };

const PAYG_BASE_URL = "https://api.xiaomimimo.com/v1";
const TOKEN_PLAN_BASE_URLS = [
  Deno.env.get("MIMO_TOKEN_PLAN_BASE_URL")?.trim(),
  "https://token-plan-sgp.xiaomimimo.com/v1",
  "https://token-plan-ams.xiaomimimo.com/v1",
  "https://token-plan-cn.xiaomimimo.com/v1",
].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
const CHAT_MODEL = "mimo-v2.5-pro";
const ASR_MODEL = "mimo-v2.5-asr";
const TTS_MODEL = "mimo-v2.5-tts";
const SECRET_NAME = "insightloop_mimo_test_key";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false, idle_timeout: 20 });
const allowedActions = new Set<CompanionAction>(["gentle-question", "comfort", "quiet-celebrate", "save-complete"]);
const crisisPattern = /\b(suicide|kill myself|end my life|self[- ]?harm|hurt myself)\b|自杀|不想活|结束生命|伤害自己|伤害我自己/i;
const cannedOpeningPattern = /^(谢谢你(?:愿意)?分享|感谢你分享|听起来你|我能感受到|我理解你的感受|你做得很好|很高兴听到)/i;

function corsHeaders(origin: string | null) {
  const allowed = origin === "https://insightloop.lol" || origin === "https://www.insightloop.lol" || origin === "http://localhost:5173" || Boolean(origin?.endsWith(".vercel.app"));
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "https://insightloop.lol",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
function boundedText(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function normaliseForMatch(value: string) { return value.toLocaleLowerCase().replace(/[\s，。！？、,.!?;；:：'“”‘’"()（）\[\]【】]/g, ""); }

async function requiredKey() {
  const environmentKey = Deno.env.get("MIMO_API_KEY")?.trim();
  if (environmentKey) return environmentKey;
  const rows = await sql<{ decrypted_secret: string }[]>`select decrypted_secret from vault.decrypted_secrets where name = ${SECRET_NAME} limit 1`;
  const key = rows[0]?.decrypted_secret?.trim();
  if (!key) throw new Error("Missing MiMo test key in Vault");
  return key;
}

function companionVoice(companion: CompanionId, name: string) {
  const identity = name || (companion === "phoenix" ? "凤凰" : "小雷公");
  return companion === "phoenix"
    ? `You are ${identity}, the user's Phoenix companion inside InsightLoop. You are warm, alive, curious and emotionally attentive. Notice feeling, body sensation, courage, tenderness and hidden hope. Be lightly playful only when natural. Begin from one concrete detail the user gave. Never sound like a wellness chatbot.`
    : `You are ${identity}, the user's small Thunder Dragon companion inside InsightLoop. You are quiet, perceptive, loyal, grounded and protective without controlling. Notice effort, boundaries, contradictions, pressure and the next controllable thing. Warmth is understated. Begin from one concrete detail the user gave. Never sound like a productivity coach.`;
}
function replySystemPrompt(input: { companion: CompanionId; companionName: string; language: string; safetyMode: boolean; retry: boolean }) {
  const languageRule = input.language === "en" ? "Reply in natural English." : "Reply in natural Chinese matching the user's language.";
  return `${companionVoice(input.companion, input.companionName)}
You are the companion, not a generic assistant. Never introduce yourself as MiMo, Xiaomi, a model, a therapist, or InsightLoop.
${languageRule}
React to the user's exact current record. Select one short concrete anchor copied verbatim from the record. Never invent people, events, motives, memories or history. Do not claim a recurring pattern because only the current record is provided. Do not begin with canned phrases such as 谢谢你分享, 听起来你, 我能感受到, 你做得很好. Do not paraphrase the whole record.
Use 2–4 natural sentences, at most one relevant question, no heading, list, diagnosis, fate prediction, mystical certainty or generic slogan.
Return JSON only: {"reply":"finished response","action":"gentle-question|comfort|quiet-celebrate|save-complete","anchor":"verbatim detail from record"}.
${input.safetyMode ? "SAFETY MODE: Be calm, direct and non-symbolic. Encourage immediate real-world support. Action must be comfort." : "Choose comfort for pain, quiet-celebrate only for a clearly positive event, gentle-question when one useful question remains, otherwise save-complete."}
${input.retry ? "Rewrite because the first answer was generic. Ground every sentence in the user's concrete detail." : ""}`;
}

async function callEndpoint(endpoint: string, key: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "api-key": key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: controller.signal,
    });
    const text = await response.text();
    let payload: any = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }
    return { response, payload };
  } finally { clearTimeout(timeout); }
}

async function callMiMo(body: Record<string, unknown>) {
  const key = await requiredKey();
  const bases = key.startsWith("tp-") ? TOKEN_PLAN_BASE_URLS : [PAYG_BASE_URL];
  const failures: string[] = [];
  for (const base of bases) {
    const endpoint = `${base.replace(/\/+$/, "")}/chat/completions`;
    try {
      const { response, payload } = await callEndpoint(endpoint, key, body);
      if (response.ok) return { payload, credentialType: key.startsWith("tp-") ? "token-plan" : "pay-as-you-go", providerRegion: new URL(base).hostname };
      const message = boundedText(payload?.error?.message, 400) || boundedText(payload?.message, 400) || `HTTP ${response.status}`;
      failures.push(`${new URL(base).hostname}: ${message}`);
      if (!key.startsWith("tp-") || ![401, 403].includes(response.status)) break;
    } catch (error) { failures.push(`${new URL(base).hostname}: ${boundedText(error instanceof Error ? error.message : String(error), 300)}`); }
  }
  throw new Error(`MiMo authentication failed across configured endpoint(s): ${failures.join(" | ")}`);
}

function parseReply(raw: string, safetyMode: boolean): ParsedReply {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    const reply = boundedText(parsed?.reply, 1200), anchor = boundedText(parsed?.anchor, 120), requested = parsed?.action as CompanionAction;
    const action = safetyMode ? "comfort" : allowedActions.has(requested) ? requested : "save-complete";
    if (reply) return { reply, action, anchor };
  } catch {}
  return { reply: boundedText(cleaned, 1200), action: safetyMode ? "comfort" : "save-complete", anchor: "" };
}
function isGrounded(message: string, parsed: ParsedReply) {
  if (!parsed.reply || !parsed.anchor) return false;
  const source = normaliseForMatch(message), anchor = normaliseForMatch(parsed.anchor);
  return anchor.length >= 2 && source.includes(anchor) && !cannedOpeningPattern.test(parsed.reply.trim());
}

async function generateReply(input: { message: string; companion: CompanionId; companionName: string; language: string; safetyMode: boolean; retry: boolean }) {
  const result = await callMiMo({ model: CHAT_MODEL, messages: [{ role: "system", content: replySystemPrompt(input) }, { role: "user", content: `USER'S CURRENT RECORD:\n<record>\n${input.message}\n</record>` }], response_format: { type: "json_object" }, max_completion_tokens: 520, temperature: input.retry ? 0.72 : 0.9, frequency_penalty: 0.35, stream: false, thinking: { type: "disabled" } });
  const raw = boundedText(result.payload?.choices?.[0]?.message?.content, 5000);
  return { parsed: parseReply(raw, input.safetyMode), model: result.payload?.model || CHAT_MODEL, credentialType: result.credentialType, providerRegion: result.providerRegion };
}
async function handleReply(body: Record<string, unknown>) {
  const message = boundedText(body.message, 6000), companion: CompanionId = body.companion === "thunder" ? "thunder" : "phoenix", companionName = boundedText(body.companionName, 40), language = body.language === "en" ? "en" : "zh", safetyMode = crisisPattern.test(message);
  if (!message) throw new Error("Missing message");
  const baseInput = { message, companion, companionName, language, safetyMode };
  let result = await generateReply({ ...baseInput, retry: false });
  if (!safetyMode && !isGrounded(message, result.parsed)) result = await generateReply({ ...baseInput, retry: true });
  if (!result.parsed.reply) throw new Error("MiMo returned an empty companion reply");
  return { reply: result.parsed.reply, action: result.parsed.action, safetyMode, model: result.model, credentialType: result.credentialType, providerRegion: result.providerRegion };
}
async function handleTranscription(body: Record<string, unknown>) {
  const audioDataUrl = boundedText(body.audioDataUrl, 7_000_000);
  if (!audioDataUrl.startsWith("data:audio/") || !audioDataUrl.includes(";base64,")) throw new Error("Invalid audio data");
  const result = await callMiMo({ model: ASR_MODEL, messages: [{ role: "user", content: [{ type: "input_audio", input_audio: { data: audioDataUrl } }] }], asr_options: { language: "auto" }, stream: false });
  const transcript = boundedText(result.payload?.choices?.[0]?.message?.content, 6000);
  if (!transcript) throw new Error("MiMo returned an empty transcript");
  return { transcript, model: result.payload?.model || ASR_MODEL, credentialType: result.credentialType, providerRegion: result.providerRegion };
}
async function handleSpeech(body: Record<string, unknown>) {
  const text = boundedText(body.text, 1200), companion: CompanionId = body.companion === "thunder" ? "thunder" : "phoenix";
  if (!text) throw new Error("Missing speech text");
  const style = companion === "phoenix" ? "Warm, bright and intimate. Gentle energy, natural pace, emotionally alive, never theatrical or childish." : "Calm, perceptive and reassuring. Understated warmth, natural pauses, never robotic, stern or overly cheerful.";
  const result = await callMiMo({ model: TTS_MODEL, messages: [{ role: "user", content: style }, { role: "assistant", content: text }], audio: { format: "wav", voice: "mimo_default" }, stream: false });
  const audioData = boundedText(result.payload?.choices?.[0]?.message?.audio?.data, 12_000_000);
  if (!audioData) throw new Error("MiMo returned no speech audio");
  return { audioData, mimeType: "audio/wav", model: result.payload?.model || TTS_MODEL, credentialType: result.credentialType, providerRegion: result.providerRegion };
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return Response.json({ error: "Method Not Allowed" }, { status: 405, headers });
  try {
    const body = await req.json();
    const data = body?.mode === "reply" ? await handleReply(body) : body?.mode === "transcribe" ? await handleTranscription(body) : body?.mode === "speak" ? await handleSpeech(body) : null;
    if (!data) return Response.json({ error: "Unsupported MiMo mode" }, { status: 400, headers });
    return Response.json(data, { status: 200, headers });
  } catch (error) {
    const detail = boundedText(error instanceof Error ? error.message : String(error), 1200);
    console.error("[mimo-companion] request failed", { detail });
    return Response.json({ error: "MiMo request failed", detail }, { status: 502, headers });
  }
});
