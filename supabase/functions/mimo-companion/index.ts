import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";

type CompanionId = "phoenix" | "thunder";
type CompanionAction = "gentle-question" | "comfort" | "quiet-celebrate" | "save-complete";
type DailyField =
  | "event"
  | "reflection"
  | "gratitude"
  | "selfTalk"
  | "angelNumbers"
  | "dreams"
  | "loveTarget"
  | "apologyTarget"
  | "additionalNotes";

type HistoryItem = {
  date: string;
  event: string;
  reflection: string;
  gratitude: string;
  selfTalk: string;
  dreams: string;
  angelNumbers: string;
  loveTarget: string;
  apologyTarget: string;
  additionalNotes: string;
};

type MemoryReference = { date: string; quote: string; relation: string };

type StructuredReply = {
  reply: string;
  observation: string;
  question: string;
  questionField: DailyField | "";
  fieldPatch: Partial<Record<DailyField, string>>;
  coveredFields: DailyField[];
  readyToSave: boolean;
  action: CompanionAction;
  patternStatus: "none" | "echo" | "pattern";
  memoryReferences: MemoryReference[];
  safetyMode: boolean;
};

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
const dailyFields: DailyField[] = [
  "event",
  "reflection",
  "gratitude",
  "selfTalk",
  "angelNumbers",
  "dreams",
  "loveTarget",
  "apologyTarget",
  "additionalNotes",
];
const crisisPattern = /\b(suicide|kill myself|end my life|self[- ]?harm|hurt myself)\b|自杀|不想活|结束生命|伤害自己|伤害我自己/i;
const cannedOpeningPattern = /^(谢谢你(?:愿意)?分享|感谢你分享|听起来你|我能感受到|我理解你的感受|你做得很好|很高兴听到)/i;

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
  return value.toLocaleLowerCase().replace(/[\s，。！？、,.!?;；:：'“”‘’"()（）\[\]【】]/g, "");
}

function isDailyField(value: unknown): value is DailyField {
  return dailyFields.includes(value as DailyField);
}

function sanitiseDraft(value: unknown) {
  const draft: Partial<Record<DailyField, string>> = {};
  if (!value || typeof value !== "object") return draft;
  for (const field of dailyFields) {
    const text = boundedText((value as Record<string, unknown>)[field], 2400);
    if (text) draft[field] = text;
  }
  return draft;
}

function sanitiseHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 24).map((raw) => ({
    date: boundedText(raw?.date, 20),
    event: boundedText(raw?.event, 2400),
    reflection: boundedText(raw?.reflection, 1800),
    gratitude: boundedText(raw?.gratitude, 1800),
    selfTalk: boundedText(raw?.selfTalk, 1800),
    dreams: boundedText(raw?.dreams, 1800),
    angelNumbers: boundedText(raw?.angelNumbers, 500),
    loveTarget: boundedText(raw?.loveTarget, 1000),
    apologyTarget: boundedText(raw?.apologyTarget, 1000),
    additionalNotes: boundedText(raw?.additionalNotes, 1800),
  })).filter((item) => item.date && Object.values(item).some(Boolean));
}

function historyBlob(item: HistoryItem) {
  return normaliseForMatch([
    item.event,
    item.reflection,
    item.gratitude,
    item.selfTalk,
    item.dreams,
    item.angelNumbers,
    item.loveTarget,
    item.apologyTarget,
    item.additionalNotes,
  ].join("\n"));
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
  const key = rows[0]?.decrypted_secret?.trim();
  if (!key) throw new Error("Missing MiMo test key in Vault");
  return key;
}

function companionVoice(companion: CompanionId, name: string) {
  const identity = name || (companion === "phoenix" ? "凤凰" : "小雷公");
  return companion === "phoenix"
    ? `You are ${identity}, the user's Phoenix companion inside InsightLoop. You are warm, emotionally alive, curious, tender and quietly hopeful. You notice feeling, courage, gratitude, dreams and hidden choice points. Never sound like a wellness chatbot.`
    : `You are ${identity}, the user's small Thunder Dragon companion inside InsightLoop. You are grounded, perceptive, loyal, concise and protective without controlling. You notice effort, boundaries, contradictions, pressure and the next controllable choice. Never sound like a productivity coach.`;
}

function brainSystemPrompt(input: {
  companion: CompanionId;
  companionName: string;
  language: string;
  safetyMode: boolean;
  retry: boolean;
}) {
  const languageRule = input.language === "en"
    ? "Write all human-readable text in natural English."
    : "Write all human-readable text in natural Chinese matching the user's language.";

  return `${companionVoice(input.companion, input.companionName)}
You are the reasoning brain of InsightLoop, not a casual chat bot and not a generic assistant.
${languageRule}

The original InsightLoop record has these INTERNAL fields:
- event: what happened today; the main factual record.
- reflection: what stood out, what the user noticed or learned.
- gratitude: what felt good, meaningful, or worth appreciating.
- selfTalk: words the user wants to say to themself.
- angelNumbers: repeated numbers or signs. Never claim supernatural certainty.
- dreams: recent dreams, images, symbols, or fragments.
- loveTarget: someone the user wants to thank.
- apologyTarget: someone the user wants to apologize to.
- additionalNotes: anything else.
These fields are memory structure, not a questionnaire. Infer where the newest words belong, update only relevant fields, and ask at most ONE useful next question. Never force every field. Never ask a skipped field again. The user may save at any time.

Think silently through four lenses without naming them:
- dreams, symbols, projection, shadow and recurring images, always as possibilities;
- one precise Socratic question;
- relationship context, boundaries, timing, roles, pressure and human complexity;
- inertia is not fate; return agency through a small present choice.

LONG-TERM MEMORY EVIDENCE:
- Never claim a pattern without at least two separate prior dated records.
- One prior dated record may only be a possible echo.
- Every memory reference must quote exact words from supplied history and include its exact date.
- Separate user words, AI organisation and AI inference.
- No diagnosis, fixed personality claims, fate, energy certainty, past-life claims, or emotional explanations for bodily symptoms.
- Only mention historical connection when evidence is supplied.

CONVERSATION:
- Begin from one concrete detail in the newest user message.
- Use 2–4 natural sentences, no headings, lists, lectures, compulsory greeting or canned opening.
- Ask zero or one question.
- If enough meaning exists to save, set readyToSave=true. Any question remains optional.
- Do not ask more than four follow-up questions in one daily record. Then invite saving.
- If SKIPPED_CURRENT_QUESTION=true, do not treat the skip marker as journal content.
${input.safetyMode ? "SAFETY MODE: Stop symbolic interpretation. Be calm, direct and reality-based. Prioritize immediate human support. action must be comfort." : ""}
${input.retry ? "RETRY: The previous answer was too generic or invalid. Ground every sentence and return valid JSON only." : ""}

Return JSON only with exactly these keys:
{
  "reply":"natural companion response",
  "observation":"tentative 1–2 sentence InsightLoop observation, or empty",
  "question":"zero or one natural question",
  "questionField":"event|reflection|gratitude|selfTalk|angelNumbers|dreams|loveTarget|apologyTarget|additionalNotes|",
  "fieldPatch":{"event":"","reflection":"","gratitude":"","selfTalk":"","angelNumbers":"","dreams":"","loveTarget":"","apologyTarget":"","additionalNotes":""},
  "coveredFields":["event"],
  "readyToSave":false,
  "action":"gentle-question|comfort|quiet-celebrate|save-complete",
  "patternStatus":"none|echo|pattern",
  "memoryReferences":[{"date":"YYYY-MM-DD","quote":"verbatim historical words","relation":"why it may relate"}],
  "safetyMode":false
}`;
}

function serialiseDraft(draft: Partial<Record<DailyField, string>>) {
  return dailyFields.map((field) => `${field}: ${draft[field] || ""}`).join("\n");
}

function serialiseHistory(history: HistoryItem[]) {
  if (!history.length) return "No prior records.";
  return history.map((item) => `
[${item.date}]
Event: ${item.event}
Reflection: ${item.reflection}
Gratitude: ${item.gratitude}
Self-talk: ${item.selfTalk}
Dreams: ${item.dreams}
Signs: ${item.angelNumbers}
Thanks: ${item.loveTarget}
Apology: ${item.apologyTarget}
Notes: ${item.additionalNotes}
`.trim()).join("\n---\n");
}

function buildUserPrompt(body: Record<string, unknown>, history: HistoryItem[]) {
  const message = boundedText(body.message, 6000);
  const draft = sanitiseDraft(body.draft);
  const askedFields = Array.isArray(body.askedFields)
    ? body.askedFields.filter(isDailyField).slice(0, 9).join(", ")
    : "";
  const currentQuestionField = isDailyField(body.currentQuestionField) ? body.currentQuestionField : "";
  const currentQuestion = boundedText(body.currentQuestion, 500);
  const turn = Number.isFinite(Number(body.turn)) ? Math.max(1, Math.min(8, Number(body.turn))) : 1;
  const skipped = Boolean(body.skipped);

  return `
TURN: ${turn}
SKIPPED_CURRENT_QUESTION: ${skipped}
CURRENT_QUESTION_FIELD: ${currentQuestionField}
CURRENT_QUESTION: ${currentQuestion}
ALREADY_ASKED_FIELDS: ${askedFields || "none"}

NEWEST USER MESSAGE:
<message>
${message}
</message>

CURRENT STRUCTURED DRAFT:
<draft>
${serialiseDraft(draft)}
</draft>

DATED HISTORY:
<history>
${serialiseHistory(history)}
</history>
`.trim();
}

async function callEndpoint(endpoint: string, key: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "api-key": key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { message: text };
    }
    return { response, payload };
  } finally {
    clearTimeout(timeout);
  }
}

async function callMiMo(body: Record<string, unknown>) {
  const key = await requiredKey();
  const bases = key.startsWith("tp-") ? TOKEN_PLAN_BASE_URLS : [PAYG_BASE_URL];
  const failures: string[] = [];

  for (const base of bases) {
    const endpoint = `${base.replace(/\/+$/, "")}/chat/completions`;
    try {
      const { response, payload } = await callEndpoint(endpoint, key, body);
      if (response.ok) {
        return {
          payload,
          credentialType: key.startsWith("tp-") ? "token-plan" : "pay-as-you-go",
          providerRegion: new URL(base).hostname,
        };
      }
      const message =
        boundedText(payload?.error?.message, 400) ||
        boundedText(payload?.message, 400) ||
        `HTTP ${response.status}`;
      failures.push(`${new URL(base).hostname}: ${message}`);
      if (!key.startsWith("tp-") || ![401, 403].includes(response.status)) break;
    } catch (error) {
      failures.push(
        `${new URL(base).hostname}: ${boundedText(error instanceof Error ? error.message : String(error), 300)}`
      );
    }
  }

  throw new Error(`MiMo authentication failed across configured endpoint(s): ${failures.join(" | ")}`);
}

function parseJson(raw: string) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function validateReferences(value: unknown, history: HistoryItem[]): MemoryReference[] {
  if (!Array.isArray(value)) return [];
  const references: MemoryReference[] = [];

  for (const raw of value.slice(0, 4)) {
    const date = boundedText(raw?.date, 20);
    const quote = boundedText(raw?.quote, 160);
    const relation = boundedText(raw?.relation, 240);
    const source = history.find((item) => item.date === date);
    if (!source || !quote) continue;
    const sourceText = historyBlob(source);
    const quoteText = normaliseForMatch(quote);
    if (quoteText.length < 2 || !sourceText.includes(quoteText)) continue;
    references.push({ date, quote, relation });
  }

  return references;
}

function normaliseStructuredReply(raw: string, history: HistoryItem[], safetyMode: boolean): StructuredReply | null {
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== "object") return null;

  const reply = boundedText(parsed.reply, 1600);
  if (!reply) return null;

  const fieldPatch = sanitiseDraft(parsed.fieldPatch);
  const coveredFields = Array.isArray(parsed.coveredFields)
    ? parsed.coveredFields.filter(isDailyField).slice(0, 9)
    : [];
  const memoryReferences = validateReferences(parsed.memoryReferences, history);
  const distinctDates = new Set(memoryReferences.map((item) => item.date)).size;
  const patternStatus = distinctDates >= 2 ? "pattern" : distinctDates === 1 ? "echo" : "none";
  const requested = parsed.action as CompanionAction;
  const action = safetyMode
    ? "comfort"
    : allowedActions.has(requested)
      ? requested
      : parsed.question
        ? "gentle-question"
        : "save-complete";

  return {
    reply,
    observation: boundedText(parsed.observation, 1000),
    question: boundedText(parsed.question, 420),
    questionField: isDailyField(parsed.questionField) ? parsed.questionField : "",
    fieldPatch,
    coveredFields,
    readyToSave: Boolean(parsed.readyToSave),
    action,
    patternStatus,
    memoryReferences,
    safetyMode,
  };
}

function isGrounded(message: string, reply: StructuredReply) {
  if (!reply.reply || cannedOpeningPattern.test(reply.reply.trim())) return false;
  if (!message.trim()) return true;
  const source = normaliseForMatch(message);
  return source.length >= 2 && (
    Object.values(reply.fieldPatch).some((value) => source.includes(normaliseForMatch(value)) || normaliseForMatch(value).includes(source)) ||
    reply.reply.length >= 12
  );
}

async function generateReply(input: {
  body: Record<string, unknown>;
  companion: CompanionId;
  companionName: string;
  language: string;
  history: HistoryItem[];
  safetyMode: boolean;
  retry: boolean;
}) {
  const result = await callMiMo({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: brainSystemPrompt({
          companion: input.companion,
          companionName: input.companionName,
          language: input.language,
          safetyMode: input.safetyMode,
          retry: input.retry,
        }),
      },
      { role: "user", content: buildUserPrompt(input.body, input.history) },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 1100,
    temperature: input.retry ? 0.45 : 0.62,
    frequency_penalty: 0.25,
    stream: false,
    thinking: { type: "disabled" },
  });

  const raw = boundedText(result.payload?.choices?.[0]?.message?.content, 12000);
  return {
    parsed: normaliseStructuredReply(raw, input.history, input.safetyMode),
    model: result.payload?.model || CHAT_MODEL,
    credentialType: result.credentialType,
    providerRegion: result.providerRegion,
  };
}

async function handleReply(body: Record<string, unknown>) {
  const message = boundedText(body.message, 6000);
  const skipped = Boolean(body.skipped);
  if (!message && !skipped) throw new Error("Missing message");

  const companion: CompanionId = body.companion === "thunder" ? "thunder" : "phoenix";
  const companionName = boundedText(body.companionName, 40);
  const language = body.language === "en" ? "en" : "zh";
  const history = sanitiseHistory(body.history);
  const safetyMode = crisisPattern.test(message);
  const baseInput = { body, companion, companionName, language, history, safetyMode };

  let result = await generateReply({ ...baseInput, retry: false });
  if (!result.parsed || (!safetyMode && !isGrounded(message, result.parsed))) {
    result = await generateReply({ ...baseInput, retry: true });
  }
  if (!result.parsed) throw new Error("MiMo returned an invalid InsightLoop brain response");

  return {
    ...result.parsed,
    model: result.model,
    credentialType: result.credentialType,
    providerRegion: result.providerRegion,
  };
}

async function handleTranscription(body: Record<string, unknown>) {
  const audioDataUrl = boundedText(body.audioDataUrl, 7_000_000);
  if (!audioDataUrl.startsWith("data:audio/") || !audioDataUrl.includes(";base64,")) {
    throw new Error("Invalid audio data");
  }
  const result = await callMiMo({
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
  const transcript = boundedText(result.payload?.choices?.[0]?.message?.content, 6000);
  if (!transcript) throw new Error("MiMo returned an empty transcript");
  return {
    transcript,
    model: result.payload?.model || ASR_MODEL,
    credentialType: result.credentialType,
    providerRegion: result.providerRegion,
  };
}

async function handleSpeech(body: Record<string, unknown>) {
  const text = boundedText(body.text, 1200);
  const companion: CompanionId = body.companion === "thunder" ? "thunder" : "phoenix";
  if (!text) throw new Error("Missing speech text");
  const style = companion === "phoenix"
    ? "Warm, bright and intimate. Emotionally alive, natural pace, gentle curiosity, never theatrical, childish or like a presenter."
    : "Calm, perceptive and reassuring. Slightly lower, understated warmth, natural pauses, never robotic, stern or overly cheerful.";
  const result = await callMiMo({
    model: TTS_MODEL,
    messages: [
      { role: "user", content: style },
      { role: "assistant", content: text },
    ],
    audio: { format: "wav", voice: "mimo_default" },
    stream: false,
  });
  const audioData = boundedText(result.payload?.choices?.[0]?.message?.audio?.data, 12_000_000);
  if (!audioData) throw new Error("MiMo returned no speech audio");
  return {
    audioData,
    mimeType: "audio/wav",
    model: result.payload?.model || TTS_MODEL,
    credentialType: result.credentialType,
    providerRegion: result.providerRegion,
  };
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return Response.json({ error: "Method Not Allowed" }, { status: 405, headers });
  }

  try {
    const body = await req.json();
    const data = body?.mode === "reply"
      ? await handleReply(body)
      : body?.mode === "transcribe"
        ? await handleTranscription(body)
        : body?.mode === "speak"
          ? await handleSpeech(body)
          : null;

    if (!data) {
      return Response.json({ error: "Unsupported MiMo mode" }, { status: 400, headers });
    }
    return Response.json(data, { status: 200, headers });
  } catch (error) {
    const detail = boundedText(error instanceof Error ? error.message : String(error), 1200);
    console.error("[mimo-companion] request failed", { detail });
    return Response.json({ error: "MiMo request failed", detail }, { status: 502, headers });
  }
});
