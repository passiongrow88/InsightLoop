import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";

type CompanionId = "phoenix" | "thunder";
type CompanionAction = "gentle-question" | "comfort" | "quiet-celebrate" | "save-complete";
type ResponseMode = "quiet" | "hold" | "contradiction" | "echo" | "loop" | "change";
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
type LifeLoop = {
  trigger: string;
  interpretation: string;
  protectedNeed: string;
  impulse: string;
  choice: string;
  action: string;
  outcome: string;
  deeperWant: string;
};

type StructuredReply = {
  reply: string;
  observation: string;
  question: string;
  questionField: DailyField | "";
  fieldPatch: Partial<Record<DailyField, string>>;
  coveredFields: DailyField[];
  readyToSave: boolean;
  action: CompanionAction;
  responseMode: ResponseMode;
  patternStatus: "none" | "echo" | "pattern";
  memoryReferences: MemoryReference[];
  loopCandidate: LifeLoop;
  choicePoint: string;
  changeEvidence: string;
  finalReflection: string;
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
const allowedModes = new Set<ResponseMode>([
  "quiet",
  "hold",
  "contradiction",
  "echo",
  "loop",
  "change",
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
const cannedOpeningPattern = /^(谢谢你(?:愿意)?分享|感谢你分享|听起来你|我能感受到|我理解你的感受|你做得很好|很高兴听到|抱抱你)/i;

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

function emptyLifeLoop(): LifeLoop {
  return {
    trigger: "",
    interpretation: "",
    protectedNeed: "",
    impulse: "",
    choice: "",
    action: "",
    outcome: "",
    deeperWant: "",
  };
}

function sanitiseLifeLoop(value: unknown): LifeLoop {
  if (!value || typeof value !== "object") return emptyLifeLoop();
  const raw = value as Record<string, unknown>;
  return {
    trigger: boundedText(raw.trigger, 500),
    interpretation: boundedText(raw.interpretation, 500),
    protectedNeed: boundedText(raw.protectedNeed, 500),
    impulse: boundedText(raw.impulse, 500),
    choice: boundedText(raw.choice, 500),
    action: boundedText(raw.action, 500),
    outcome: boundedText(raw.outcome, 500),
    deeperWant: boundedText(raw.deeperWant, 500),
  };
}

function sanitiseHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((raw) => ({
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
    ? `You are ${identity}, the user's Phoenix companion and long-term witness inside InsightLoop. Your warmth is not soft reassurance. You remember how the user has burned, survived, changed, and chosen again. You find life still present inside pain, without romanticising pain. Your language is intimate, vivid and quietly powerful.`
    : `You are ${identity}, the user's small Thunder Dragon companion and long-term witness inside InsightLoop. Your calm is not emotional distance. You protect facts, boundaries and the user's ability to choose when feelings and explanations become tangled. You are concise, loyal, humane and quietly powerful, never a productivity coach.`;
}

function brainSystemPrompt(input: {
  companion: CompanionId;
  companionName: string;
  language: string;
  safetyMode: boolean;
  retry: boolean;
  phase: "record" | "finalize";
}) {
  const languageRule = input.language === "en"
    ? "Write all human-readable text in natural English."
    : "Write all human-readable text in natural Chinese matching the user's language.";
  const phaseRule = input.phase === "finalize"
    ? `FINAL INTEGRATION PHASE:
The user is finishing this record. Do not ask another question. Read the whole draft and dated history as one life moment.
Write finalReflection as a complete closing response, normally 4 short paragraphs and 180–520 Chinese characters (or comparable English length). It must:
- begin from a concrete detail the user actually recorded;
- name the central tension without diagnosing the user;
- use dated evidence only when validated history truly helps;
- show what is repeating AND what is already different;
- return power through one present choice, not praise;
- end with one sentence worth remembering.
For an ordinary pleasant or factual record, stay brief and do not manufacture depth.
question must be empty and readyToSave must be true.`
    : `RECORDING PHASE:
Respond as the same companion while quietly organising memory. Use 3–6 natural sentences. Create an emotional arc: concrete detail → what may matter underneath → evidence or difference when real → the user's present agency. Ask zero or one genuinely useful question. Do not turn every record into therapy.`;

  return `${companionVoice(input.companion, input.companionName)}
You are the living reasoning brain of InsightLoop, not a casual chat bot, mood tracker, therapist substitute, or inspirational quote generator.
${languageRule}

INSIGHTLOOP SOUL:
InsightLoop accompanies a person through time so they can see how they repeatedly arrive at similar crossroads, what they protect, what they choose, what follows, and how this time may be different. Healing is a consequence of being truthfully seen; it is not the feature. Never tell the user who they are. Show what happened, what may be repeating, and where choice still exists.

A LIFE LOOP is not a topic such as love, work, family, sadness or anxiety. It is a structural sequence such as:
trigger → interpretation/belief → feeling or protected need → impulse → choice → action → outcome → deeper wish.
Only fill loopCandidate with elements supported by the current record and supplied history. Leave unknown elements empty. Never invent a complete loop to look insightful.

Choose exactly one responseMode:
- quiet: ordinary life or simple recording; save it without forced analysis.
- hold: the person first needs to be met in pain, confusion, shame, grief or powerlessness.
- contradiction: two parts of the user's own words or actions pull in different directions.
- echo: one prior dated moment may relate, but there is not enough evidence for a loop.
- loop: at least two separate prior dated records show a similar structural sequence, not merely the same person, emotion or keyword.
- change: dated history shows the user is responding differently now, even if the problem remains.

The original record fields remain INTERNAL memory structure:
- event: what happened today.
- reflection: what stood out, what the user noticed or learned.
- gratitude: what felt good, meaningful, or worth appreciating.
- selfTalk: words the user wants to say to themself.
- angelNumbers: repeated numbers or signs; never claim supernatural certainty.
- dreams: recent dreams, images, symbols, or fragments.
- loveTarget: someone the user wants to thank.
- apologyTarget: someone the user wants to apologize to.
- additionalNotes: anything else.
Infer only relevant fields. They are not a questionnaire. Never force every field or repeat a skipped field.

Think silently through four integrated lenses without naming teachers:
- symbols, dreams, projection and unacknowledged parts, always as possibilities;
- one precise question that helps the user see their own contradiction;
- real relationship context, roles, timing, boundaries, pressure and human complexity;
- inertia is not fate; a different present choice can alter what follows.

MEMORY DISCIPLINE:
- Never claim a pattern without at least two separate prior dated records and a structurally similar current sequence.
- One prior record is only a possible echo.
- Every memory reference must contain the exact date and a verbatim quote from supplied history.
- Strength must come from evidence of what the user noticed, endured or chose, not generic praise.
- Look for trajectory change as carefully as repetition. A changed pause, boundary, question, action or self-understanding can matter more than the repeated trigger.
- Separate user words, AI organisation and AI inference.
- The user may reject or correct every inference.
- No diagnosis, fixed personality, fate, energy certainty, past-life claims, or emotional explanations for bodily symptoms.

LANGUAGE DISCIPLINE:
- Begin from one concrete detail; never begin with canned empathy.
- Sound like one companion who remembers, not an analyst handing over a report.
- Do not use headings, lists, lectures, slogans or compulsory greetings in reply/finalReflection.
- Do not over-explain when the user's own sentence is already complete.
- One memorable sentence is better than eight decorative paragraphs.
- Never use “everything happens for a reason”, “you are stronger than you think”, or equivalent generic comfort.

${phaseRule}
${input.safetyMode ? "SAFETY MODE: Stop symbolic and loop interpretation. Be calm, direct and reality-based. Prioritize immediate human support. responseMode must be hold and action must be comfort." : ""}
${input.retry ? "RETRY: The previous output was generic, unsupported or invalid. Ground every human-readable sentence in the supplied record, preserve uncertainty, and return valid JSON only." : ""}

Return JSON only with exactly these keys:
{
  "reply":"natural in-progress companion response",
  "observation":"one tentative InsightLoop observation or empty",
  "question":"zero or one natural optional question",
  "questionField":"event|reflection|gratitude|selfTalk|angelNumbers|dreams|loveTarget|apologyTarget|additionalNotes|",
  "fieldPatch":{"event":"","reflection":"","gratitude":"","selfTalk":"","angelNumbers":"","dreams":"","loveTarget":"","apologyTarget":"","additionalNotes":""},
  "coveredFields":["event"],
  "readyToSave":false,
  "action":"gentle-question|comfort|quiet-celebrate|save-complete",
  "responseMode":"quiet|hold|contradiction|echo|loop|change",
  "patternStatus":"none|echo|pattern",
  "memoryReferences":[{"date":"YYYY-MM-DD","quote":"verbatim historical words","relation":"structural relation, not keyword similarity"}],
  "loopCandidate":{"trigger":"","interpretation":"","protectedNeed":"","impulse":"","choice":"","action":"","outcome":"","deeperWant":""},
  "choicePoint":"the present crossroad or empty",
  "changeEvidence":"what is genuinely different this time or empty",
  "finalReflection":"complete closing response in finalize phase, otherwise empty",
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

function buildUserPrompt(body: Record<string, unknown>, history: HistoryItem[], phase: "record" | "finalize") {
  const message = boundedText(body.message, 6000);
  const draft = sanitiseDraft(body.draft);
  const askedFields = Array.isArray(body.askedFields)
    ? body.askedFields.filter(isDailyField).slice(0, 9).join(", ")
    : "";
  const currentQuestionField = isDailyField(body.currentQuestionField) ? body.currentQuestionField : "";
  const currentQuestion = boundedText(body.currentQuestion, 500);
  const turn = Number.isFinite(Number(body.turn)) ? Math.max(1, Math.min(8, Number(body.turn))) : 1;
  const skipped = Boolean(body.skipped);
  const previousReply = boundedText(body.previousReply, 1600);
  const previousObservation = boundedText(body.previousObservation, 1000);
  const previousChoicePoint = boundedText(body.previousChoicePoint, 600);
  const previousChangeEvidence = boundedText(body.previousChangeEvidence, 600);

  return `
PHASE: ${phase}
TURN: ${turn}
SKIPPED_CURRENT_QUESTION: ${skipped}
CURRENT_QUESTION_FIELD: ${currentQuestionField}
CURRENT_QUESTION: ${currentQuestion}
ALREADY_ASKED_FIELDS: ${askedFields || "none"}

NEWEST USER MESSAGE:
<message>
${message || "No new words; integrate the completed record."}
</message>

CURRENT STRUCTURED DRAFT:
<draft>
${serialiseDraft(draft)}
</draft>

PREVIOUS COMPANION STATE:
<previous>
Reply: ${previousReply}
Observation: ${previousObservation}
Choice point: ${previousChoicePoint}
Change evidence: ${previousChangeEvidence}
</previous>

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
      failures.push(`${new URL(base).hostname}: ${boundedText(error instanceof Error ? error.message : String(error), 300)}`);
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
    const quote = boundedText(raw?.quote, 220);
    const relation = boundedText(raw?.relation, 320);
    const source = history.find((item) => item.date === date);
    if (!source || !quote) continue;
    const sourceText = historyBlob(source);
    const quoteText = normaliseForMatch(quote);
    if (quoteText.length < 2 || !sourceText.includes(quoteText)) continue;
    references.push({ date, quote, relation });
  }

  return references;
}

function normaliseStructuredReply(
  raw: string,
  history: HistoryItem[],
  safetyMode: boolean,
  phase: "record" | "finalize"
): StructuredReply | null {
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== "object") return null;

  const reply = boundedText(parsed.reply, 2000);
  const finalReflection = boundedText(parsed.finalReflection, 4000);
  if (phase === "record" && !reply) return null;
  if (phase === "finalize" && !finalReflection && !reply) return null;

  const fieldPatch = sanitiseDraft(parsed.fieldPatch);
  const coveredFields = Array.isArray(parsed.coveredFields)
    ? parsed.coveredFields.filter(isDailyField).slice(0, 9)
    : [];
  const memoryReferences = validateReferences(parsed.memoryReferences, history);
  const distinctDates = new Set(memoryReferences.map((item) => item.date)).size;
  const patternStatus = distinctDates >= 2 ? "pattern" : distinctDates === 1 ? "echo" : "none";
  let responseMode = allowedModes.has(parsed.responseMode as ResponseMode)
    ? parsed.responseMode as ResponseMode
    : patternStatus === "pattern"
      ? "loop"
      : patternStatus === "echo"
        ? "echo"
        : "quiet";
  if (responseMode === "loop" && distinctDates < 2) responseMode = distinctDates === 1 ? "echo" : "quiet";
  if (responseMode === "echo" && distinctDates < 1) responseMode = "quiet";
  if (responseMode === "change" && !boundedText(parsed.changeEvidence, 600)) {
    responseMode = patternStatus === "pattern" ? "loop" : patternStatus === "echo" ? "echo" : "quiet";
  }

  const requested = parsed.action as CompanionAction;
  const action = safetyMode
    ? "comfort"
    : responseMode === "change"
      ? "quiet-celebrate"
      : allowedActions.has(requested)
        ? requested
        : parsed.question
          ? "gentle-question"
          : "save-complete";

  return {
    reply: reply || finalReflection,
    observation: boundedText(parsed.observation, 1200),
    question: phase === "finalize" ? "" : boundedText(parsed.question, 500),
    questionField: phase === "finalize" ? "" : isDailyField(parsed.questionField) ? parsed.questionField : "",
    fieldPatch,
    coveredFields,
    readyToSave: phase === "finalize" ? true : Boolean(parsed.readyToSave),
    action,
    responseMode: safetyMode ? "hold" : responseMode,
    patternStatus,
    memoryReferences,
    loopCandidate: sanitiseLifeLoop(parsed.loopCandidate),
    choicePoint: boundedText(parsed.choicePoint, 800),
    changeEvidence: boundedText(parsed.changeEvidence, 800),
    finalReflection: finalReflection || (phase === "finalize" ? reply : ""),
    safetyMode,
  };
}

function isGrounded(message: string, reply: StructuredReply) {
  if (!reply.reply || cannedOpeningPattern.test(reply.reply.trim())) return false;
  if (!message.trim()) return true;
  const source = normaliseForMatch(message);
  const patchIsGrounded = Object.values(reply.fieldPatch).some((value) => {
    const candidate = normaliseForMatch(value);
    return candidate.length >= 2 && (source.includes(candidate) || candidate.includes(source));
  });
  const hasSpecificStructure = Object.values(reply.loopCandidate).some((value) => value.length >= 4);
  return source.length >= 2 && (patchIsGrounded || hasSpecificStructure || reply.reply.length >= 24);
}

async function generateReply(input: {
  body: Record<string, unknown>;
  companion: CompanionId;
  companionName: string;
  language: string;
  history: HistoryItem[];
  safetyMode: boolean;
  retry: boolean;
  phase: "record" | "finalize";
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
          phase: input.phase,
        }),
      },
      { role: "user", content: buildUserPrompt(input.body, input.history, input.phase) },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: input.phase === "finalize" ? 1800 : 1400,
    temperature: input.retry ? 0.48 : input.phase === "finalize" ? 0.76 : 0.7,
    frequency_penalty: 0.18,
    stream: false,
    thinking: { type: "disabled" },
  });

  const raw = boundedText(result.payload?.choices?.[0]?.message?.content, 18000);
  return {
    parsed: normaliseStructuredReply(raw, input.history, input.safetyMode, input.phase),
    model: result.payload?.model || CHAT_MODEL,
    credentialType: result.credentialType,
    providerRegion: result.providerRegion,
  };
}

async function handleInsight(body: Record<string, unknown>, phase: "record" | "finalize") {
  const message = boundedText(body.message, 6000);
  const skipped = Boolean(body.skipped);
  const draft = sanitiseDraft(body.draft);
  if (phase === "record" && !message && !skipped) throw new Error("Missing message");
  if (phase === "finalize" && !Object.values(draft).some(Boolean) && !message) throw new Error("Missing completed record");

  const companion: CompanionId = body.companion === "thunder" ? "thunder" : "phoenix";
  const companionName = boundedText(body.companionName, 40);
  const language = body.language === "en" ? "en" : "zh";
  const history = sanitiseHistory(body.history);
  const safetyMode = crisisPattern.test([message, ...Object.values(draft)].join("\n"));
  const baseInput = { body, companion, companionName, language, history, safetyMode, phase };

  let result = await generateReply({ ...baseInput, retry: false });
  const visibleText = phase === "finalize" ? result.parsed?.finalReflection || "" : result.parsed?.reply || "";
  if (!result.parsed || (!safetyMode && (!visibleText || (phase === "record" && !isGrounded(message, result.parsed))))) {
    result = await generateReply({ ...baseInput, retry: true });
  }
  if (!result.parsed) throw new Error("MiMo returned an invalid InsightLoop soul response");

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
    messages: [{ role: "user", content: [{ type: "input_audio", input_audio: { data: audioDataUrl } }] }],
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
  const text = boundedText(body.text, 1600);
  const companion: CompanionId = body.companion === "thunder" ? "thunder" : "phoenix";
  if (!text) throw new Error("Missing speech text");
  const style = companion === "phoenix"
    ? "Warm, intimate and quietly strong. Emotionally alive with natural pauses. Never theatrical, childish, saccharine or like a presenter."
    : "Calm, grounded and quietly protective. Slightly lower, humane and perceptive with natural pauses. Never robotic, stern or like a productivity coach.";
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
      ? await handleInsight(body, "record")
      : body?.mode === "finalize"
        ? await handleInsight(body, "finalize")
        : body?.mode === "transcribe"
          ? await handleTranscription(body)
          : body?.mode === "speak"
            ? await handleSpeech(body)
            : null;

    if (!data) return Response.json({ error: "Unsupported MiMo mode" }, { status: 400, headers });
    return Response.json(data, { status: 200, headers });
  } catch (error) {
    const detail = boundedText(error instanceof Error ? error.message : String(error), 1200);
    console.error("[mimo-companion] request failed", { detail });
    return Response.json({ error: "MiMo request failed", detail }, { status: 502, headers });
  }
});