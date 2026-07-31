import { supabase } from "./supabaseClient";
import type { CompanionId, Language } from "../types";

export type CompanionReplyAction =
  | "gentle-question"
  | "comfort"
  | "quiet-celebrate"
  | "save-complete";

export type CompanionPatternStatus = "none" | "echo" | "pattern";
export type CompanionResponseMode = "quiet" | "hold" | "contradiction" | "echo" | "loop" | "change";

export type DailyField =
  | "event"
  | "reflection"
  | "gratitude"
  | "selfTalk"
  | "angelNumbers"
  | "dreams"
  | "loveTarget"
  | "apologyTarget"
  | "additionalNotes";

export type DailyDraft = Record<DailyField, string>;

export type CompanionMemoryReference = {
  date: string;
  quote: string;
  relation: string;
};

export type CompanionLifeLoop = {
  trigger: string;
  interpretation: string;
  protectedNeed: string;
  impulse: string;
  choice: string;
  action: string;
  outcome: string;
  deeperWant: string;
};

export type CompanionHistoryItem = {
  date: string;
  event: string;
  reflection?: string;
  gratitude?: string;
  selfTalk?: string;
  dreams?: string;
  angelNumbers?: string;
  loveTarget?: string;
  apologyTarget?: string;
  additionalNotes?: string;
};

export type CompanionReply = {
  reply: string;
  observation: string;
  question: string;
  questionField: DailyField | "";
  fieldPatch: Partial<DailyDraft>;
  coveredFields: DailyField[];
  readyToSave: boolean;
  action: CompanionReplyAction;
  responseMode: CompanionResponseMode;
  patternStatus: CompanionPatternStatus;
  memoryReferences: CompanionMemoryReference[];
  loopCandidate: CompanionLifeLoop;
  choicePoint: string;
  changeEvidence: string;
  finalReflection: string;
  safetyMode: boolean;
  model: string;
};

export type CompanionBrainInput = {
  message: string;
  companion: CompanionId;
  companionName: string;
  language: Language;
  history?: CompanionHistoryItem[];
  draft?: Partial<DailyDraft>;
  askedFields?: DailyField[];
  currentQuestion?: string;
  currentQuestionField?: DailyField | "";
  turn?: number;
  skipped?: boolean;
  previousReply?: string;
  previousObservation?: string;
  previousChoicePoint?: string;
  previousChangeEvidence?: string;
};

const DAILY_FIELDS: DailyField[] = [
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

const RESPONSE_MODES: CompanionResponseMode[] = [
  "quiet",
  "hold",
  "contradiction",
  "echo",
  "loop",
  "change",
];

const EMPTY_LOOP: CompanionLifeLoop = {
  trigger: "",
  interpretation: "",
  protectedNeed: "",
  impulse: "",
  choice: "",
  action: "",
  outcome: "",
  deeperWant: "",
};

async function authToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again before using the companion.");
  return token;
}

async function callMiMo<T>(body: Record<string, unknown>): Promise<T> {
  const token = await authToken();
  const { data, error } = await supabase.functions.invoke("mimo-companion", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(error.message || "MiMo is temporarily unavailable.");
  return data as T;
}

function cleanText(value: unknown, max = 1600) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanField(value: unknown) {
  return cleanText(value, 2400);
}

function normaliseFieldPatch(value: unknown): Partial<DailyDraft> {
  if (!value || typeof value !== "object") return {};
  const result: Partial<DailyDraft> = {};
  for (const field of DAILY_FIELDS) {
    const text = cleanField((value as Record<string, unknown>)[field]);
    if (text) result[field] = text;
  }
  return result;
}

function normaliseCoveredFields(value: unknown): DailyField[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DailyField => DAILY_FIELDS.includes(item as DailyField));
}

function normaliseQuestionField(value: unknown): DailyField | "" {
  return DAILY_FIELDS.includes(value as DailyField) ? (value as DailyField) : "";
}

function normaliseLifeLoop(value: unknown): CompanionLifeLoop {
  if (!value || typeof value !== "object") return { ...EMPTY_LOOP };
  const raw = value as Record<string, unknown>;
  return {
    trigger: cleanText(raw.trigger, 500),
    interpretation: cleanText(raw.interpretation, 500),
    protectedNeed: cleanText(raw.protectedNeed, 500),
    impulse: cleanText(raw.impulse, 500),
    choice: cleanText(raw.choice, 500),
    action: cleanText(raw.action, 500),
    outcome: cleanText(raw.outcome, 500),
    deeperWant: cleanText(raw.deeperWant, 500),
  };
}

function historyBlob(item: CompanionHistoryItem) {
  return [
    item.event,
    item.reflection,
    item.gratitude,
    item.selfTalk,
    item.dreams,
    item.angelNumbers,
    item.loveTarget,
    item.apologyTarget,
    item.additionalNotes,
  ]
    .filter(Boolean)
    .join("\n")
    .toLocaleLowerCase()
    .replace(/[\s，。！？、,.!?;；:：'“”‘’"()（）\[\]【】]/g, "");
}

function validateMemoryReferences(value: unknown, history: CompanionHistoryItem[]) {
  if (!Array.isArray(value)) return [] as CompanionMemoryReference[];
  const references: CompanionMemoryReference[] = [];

  for (const raw of value.slice(0, 4)) {
    const date = cleanText(raw?.date, 20);
    const quote = cleanText(raw?.quote, 220);
    const relation = cleanText(raw?.relation, 320);
    const source = history.find((item) => item.date === date);
    if (!source || !quote) continue;
    const normalisedQuote = quote
      .toLocaleLowerCase()
      .replace(/[\s，。！？、,.!?;；:：'“”‘’"()（）\[\]【】]/g, "");
    if (!normalisedQuote || !historyBlob(source).includes(normalisedQuote)) continue;
    references.push({ date, quote, relation });
  }

  return references;
}

function normaliseReply(
  value: Partial<CompanionReply> | null | undefined,
  history: CompanionHistoryItem[],
  fallbackModel: string,
  phase: "record" | "finalize"
): CompanionReply {
  const memoryReferences = validateMemoryReferences(value?.memoryReferences, history);
  const distinctDates = new Set(memoryReferences.map((item) => item.date)).size;
  const patternStatus: CompanionPatternStatus =
    distinctDates >= 2 ? "pattern" : distinctDates === 1 ? "echo" : "none";
  const allowedActions: CompanionReplyAction[] = [
    "gentle-question",
    "comfort",
    "quiet-celebrate",
    "save-complete",
  ];
  let responseMode: CompanionResponseMode = RESPONSE_MODES.includes(value?.responseMode as CompanionResponseMode)
    ? (value?.responseMode as CompanionResponseMode)
    : patternStatus === "pattern"
      ? "loop"
      : patternStatus === "echo"
        ? "echo"
        : "quiet";
  if (responseMode === "loop" && distinctDates < 2) responseMode = distinctDates === 1 ? "echo" : "quiet";
  if (responseMode === "echo" && distinctDates < 1) responseMode = "quiet";
  const changeEvidence = cleanText(value?.changeEvidence, 800);
  if (responseMode === "change" && !changeEvidence) {
    responseMode = patternStatus === "pattern" ? "loop" : patternStatus === "echo" ? "echo" : "quiet";
  }
  const finalReflection = cleanText(value?.finalReflection, 4000);
  const reply =
    cleanText(value?.reply, 2000) ||
    finalReflection ||
    "我先替你把这一刻收好。真正重要的部分，我们可以慢慢看。";

  return {
    reply,
    observation: cleanText(value?.observation, 1200),
    question: phase === "finalize" ? "" : cleanText(value?.question, 500),
    questionField: phase === "finalize" ? "" : normaliseQuestionField(value?.questionField),
    fieldPatch: normaliseFieldPatch(value?.fieldPatch),
    coveredFields: normaliseCoveredFields(value?.coveredFields),
    readyToSave: phase === "finalize" ? true : Boolean(value?.readyToSave),
    action: responseMode === "change"
      ? "quiet-celebrate"
      : allowedActions.includes(value?.action as CompanionReplyAction)
        ? (value?.action as CompanionReplyAction)
        : phase === "finalize"
          ? "save-complete"
          : "gentle-question",
    responseMode,
    patternStatus,
    memoryReferences,
    loopCandidate: normaliseLifeLoop(value?.loopCandidate),
    choicePoint: cleanText(value?.choicePoint, 800),
    changeEvidence,
    finalReflection: finalReflection || (phase === "finalize" ? reply : ""),
    safetyMode: Boolean(value?.safetyMode),
    model: cleanText(value?.model, 120) || fallbackModel,
  };
}

const SOUL_SYSTEM = `
You are the living reasoning brain of InsightLoop, a long-term awareness companion. You are not a casual chat bot, therapist substitute, mood tracker, or inspirational quote generator.

InsightLoop accompanies a person through time so they can see how they repeatedly arrive at similar crossroads, what they protect, what they choose, what follows, and how this time may be different. Never tell the user who they are. Show what happened, what may be repeating, and where choice still exists.

A life loop is a structural sequence, not a topic: trigger → interpretation → protected need → impulse → choice → action → outcome → deeper wish. Leave unsupported elements empty. Do not manufacture depth.

Select one responseMode:
quiet = ordinary life; hold = pain first needs company; contradiction = two parts pull apart; echo = one dated possible relation; loop = two or more dated structurally similar records; change = the user responds differently now.

Memory discipline:
- Exact dates and verbatim quotes only.
- One dated record is an echo, not a pattern.
- A pattern needs at least two dated records and structural similarity, not the same person, emotion or keyword.
- Look for change as carefully as repetition.
- No diagnosis, fixed personality, fate, energy certainty, past lives, or emotional causes for bodily symptoms.
- Strength comes from evidence of what the user noticed or chose, never generic praise.

Return JSON only with the same fields requested by the user prompt.
`.trim();

function stripJsonFence(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
}

function serialiseDraft(draft: Partial<DailyDraft>) {
  return DAILY_FIELDS.map((field) => `${field}: ${cleanField(draft[field])}`).join("\n");
}

function serialiseHistory(history: CompanionHistoryItem[]) {
  if (!history.length) return "No prior records.";
  return history
    .map(
      (item) =>
        `[${item.date}]\nEvent: ${item.event}\nReflection: ${item.reflection || ""}\nGratitude: ${item.gratitude || ""}\nSelf-talk: ${item.selfTalk || ""}\nDreams: ${item.dreams || ""}\nSigns: ${item.angelNumbers || ""}\nThanks: ${item.loveTarget || ""}\nApology: ${item.apologyTarget || ""}\nNotes: ${item.additionalNotes || ""}`
    )
    .join("\n---\n");
}

function buildPrompt(input: CompanionBrainInput, phase: "record" | "finalize") {
  const history = (input.history || []).slice(0, 30);
  return `
PHASE: ${phase}
COMPANION: ${input.companionName || input.companion}
COMPANION_STYLE: ${
    input.companion === "phoenix"
      ? "warm, intimate, emotionally alive, quietly strong, remembers survival and change"
      : "grounded, perceptive, humane, quietly protective, guards facts and boundaries"
  }
OUTPUT_LANGUAGE: ${input.language === "en" ? "English" : "Chinese matching the user"}
TURN: ${input.turn || 1}
SKIPPED_CURRENT_QUESTION: ${Boolean(input.skipped)}
CURRENT_QUESTION_FIELD: ${input.currentQuestionField || ""}
CURRENT_QUESTION: ${input.currentQuestion || ""}
ALREADY_ASKED_FIELDS: ${(input.askedFields || []).join(", ") || "none"}

NEWEST USER MESSAGE:
<message>${input.message || "No new words; integrate the completed record."}</message>

CURRENT STRUCTURED DRAFT:
<draft>${serialiseDraft(input.draft || {})}</draft>

PREVIOUS COMPANION STATE:
Reply: ${input.previousReply || ""}
Observation: ${input.previousObservation || ""}
Choice point: ${input.previousChoicePoint || ""}
Change evidence: ${input.previousChangeEvidence || ""}

DATED HISTORY:
<history>${serialiseHistory(history)}</history>

${phase === "finalize"
  ? `Write finalReflection as a complete closing response. No question. Begin from a concrete detail, name the tension, use dated evidence only if real, show repetition and difference, return agency through a present choice, and end with one memorable sentence. Stay brief for ordinary life. Set readyToSave=true.`
  : `Write 3–6 natural sentences with no headings. Follow concrete detail → what may matter → real evidence or difference → present agency. Ask zero or one useful question. Do not turn every record into therapy.`}

Return JSON only:
{
  "reply":"",
  "observation":"",
  "question":"",
  "questionField":"event|reflection|gratitude|selfTalk|angelNumbers|dreams|loveTarget|apologyTarget|additionalNotes|",
  "fieldPatch":{"event":"","reflection":"","gratitude":"","selfTalk":"","angelNumbers":"","dreams":"","loveTarget":"","apologyTarget":"","additionalNotes":""},
  "coveredFields":["event"],
  "readyToSave":false,
  "action":"gentle-question|comfort|quiet-celebrate|save-complete",
  "responseMode":"quiet|hold|contradiction|echo|loop|change",
  "patternStatus":"none|echo|pattern",
  "memoryReferences":[{"date":"YYYY-MM-DD","quote":"verbatim historical words","relation":"structural relation"}],
  "loopCandidate":{"trigger":"","interpretation":"","protectedNeed":"","impulse":"","choice":"","action":"","outcome":"","deeperWant":""},
  "choicePoint":"",
  "changeEvidence":"",
  "finalReflection":"",
  "safetyMode":false,
  "model":"provider-model"
}
`.trim();
}

async function callGeminiFallback(
  input: CompanionBrainInput,
  phase: "record" | "finalize"
): Promise<CompanionReply> {
  const history = (input.history || []).slice(0, 30);
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-3-pro-preview",
      systemInstruction: SOUL_SYSTEM,
      prompt: buildPrompt(input, phase),
      temperature: phase === "finalize" ? 0.72 : 0.64,
    }),
  });

  if (!response.ok) throw new Error(`Gemini fallback failed: ${response.status}`);
  const data = (await response.json()) as { text?: string; error?: string };
  if (data.error) throw new Error(data.error);

  let parsed: Partial<CompanionReply> = {};
  try {
    parsed = JSON.parse(stripJsonFence(data.text || ""));
  } catch {
    parsed = phase === "finalize"
      ? { finalReflection: cleanText(data.text, 4000), model: "gemini-fallback" }
      : { reply: cleanText(data.text, 2000), model: "gemini-fallback" };
  }
  return normaliseReply(parsed, history, "gemini-fallback", phase);
}

export async function generateCompanionReply(input: CompanionBrainInput) {
  const history = (input.history || []).slice(0, 30);
  const payload = { ...input, history, systemVersion: "insightloop-soul-v1" };

  try {
    const result = await callMiMo<CompanionReply>({ mode: "reply", ...payload });
    return normaliseReply(result, history, "mimo-v2.5-pro", "record");
  } catch (error) {
    console.warn("MiMo companion unavailable; using Gemini preview fallback.", error);
    return callGeminiFallback(payload, "record");
  }
}

export async function generateFinalInsight(input: CompanionBrainInput) {
  const history = (input.history || []).slice(0, 30);
  const payload = { ...input, history, systemVersion: "insightloop-soul-v1" };

  try {
    const result = await callMiMo<CompanionReply>({ mode: "finalize", ...payload });
    return normaliseReply(result, history, "mimo-v2.5-pro", "finalize");
  } catch (error) {
    console.warn("MiMo final integration unavailable; using Gemini preview fallback.", error);
    return callGeminiFallback(payload, "finalize");
  }
}

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read audio."));
    reader.readAsDataURL(blob);
  });
}

export async function transcribeCompanionAudio(blob: Blob) {
  const audioDataUrl = await blobAsDataUrl(blob);
  return callMiMo<{ transcript: string; model: string }>({
    mode: "transcribe",
    audioDataUrl,
  });
}

export async function synthesizeCompanionReply(input: {
  text: string;
  companion: CompanionId;
}) {
  const result = await callMiMo<{ audioData: string; mimeType: string; model: string }>({
    mode: "speak",
    ...input,
  });
  return `data:${result.mimeType};base64,${result.audioData}`;
}
