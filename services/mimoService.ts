import { supabase } from "./supabaseClient";
import type { CompanionId, Language } from "../types";

export type CompanionReplyAction =
  | "gentle-question"
  | "comfort"
  | "quiet-celebrate"
  | "save-complete";

export type CompanionPatternStatus = "none" | "echo" | "pattern";

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
  patternStatus: CompanionPatternStatus;
  memoryReferences: CompanionMemoryReference[];
  safetyMode: boolean;
  model: string;
};

type CompanionBrainInput = {
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
    .toLocaleLowerCase();
}

function validateMemoryReferences(value: unknown, history: CompanionHistoryItem[]) {
  if (!Array.isArray(value)) return [] as CompanionMemoryReference[];
  const references: CompanionMemoryReference[] = [];

  for (const raw of value.slice(0, 4)) {
    const date = cleanText(raw?.date, 20);
    const quote = cleanText(raw?.quote, 160);
    const relation = cleanText(raw?.relation, 240);
    const source = history.find((item) => item.date === date);
    if (!source || !quote) continue;
    if (!historyBlob(source).includes(quote.toLocaleLowerCase())) continue;
    references.push({ date, quote, relation });
  }

  return references;
}

function normaliseReply(
  value: Partial<CompanionReply> | null | undefined,
  history: CompanionHistoryItem[],
  fallbackModel: string
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

  return {
    reply:
      cleanText(value?.reply, 1600) ||
      "我先替你把这一刻收好。你愿意的话，我们再慢慢补上最重要的部分。",
    observation: cleanText(value?.observation, 1000),
    question: cleanText(value?.question, 420),
    questionField: normaliseQuestionField(value?.questionField),
    fieldPatch: normaliseFieldPatch(value?.fieldPatch),
    coveredFields: normaliseCoveredFields(value?.coveredFields),
    readyToSave: Boolean(value?.readyToSave),
    action: allowedActions.includes(value?.action as CompanionReplyAction)
      ? (value?.action as CompanionReplyAction)
      : "save-complete",
    patternStatus,
    memoryReferences,
    safetyMode: Boolean(value?.safetyMode),
    model: cleanText(value?.model, 120) || fallbackModel,
  };
}

const BRAIN_SYSTEM = `
You are the reasoning brain of InsightLoop, a long-term awareness companion. You are NOT a casual chat bot.

The original InsightLoop record contains these internal fields:
- event: what happened today; the main factual record.
- reflection: what stood out, what the user noticed or learned.
- gratitude: what felt good, meaningful, or worth appreciating.
- selfTalk: words the user wants to say to themself.
- angelNumbers: repeated numbers or signs the user noticed. Never claim supernatural certainty.
- dreams: recent dreams, images, symbols, or fragments.
- loveTarget: someone the user wants to thank.
- apologyTarget: someone the user wants to apologize to.
- additionalNotes: anything else that does not fit above.

These fields are INTERNAL MEMORY STRUCTURE, not a questionnaire. The companion must infer what the user's words belong to, update the relevant fields, and ask only ONE useful next question when needed. Never force all fields. Never repeat a field the user skipped. The user may save at any time.

Think internally through four lenses without naming teachers or turning them into sections:
- Jung: dreams, symbols, projection, shadow, recurring images; interpretations are possibilities, never facts.
- Socratic inquiry: one precise question that helps the user discover their own answer.
- Relational wisdom: context, boundaries, timing, roles, face, pressure, and human complexity.
- Choice and change: inertia is not fate; return agency through a small present choice.

Evidence rules for long-term memory:
- Never claim a pattern without at least two separate prior dated records.
- One dated record may only be called a possible echo.
- Every memory reference must include an exact date and a verbatim quote from supplied history.
- Distinguish the user's words, AI organisation, and AI inference.
- No personality diagnosis, mental-health diagnosis, fate, energy certainty, past-life claims, or emotional causes for bodily symptoms.
- Crisis content: stop symbolic analysis, be calm and reality-based, and prioritize immediate human safety.

Conversation rules:
- Start from a concrete detail in the newest user message.
- 2–4 natural sentences; no headings, lectures, lists, scripted greeting, or generic wellness phrases.
- Use the selected companion's personality, but keep the same InsightLoop reasoning ability.
- Ask zero or one question.
- If the current record already has enough meaning to save, set readyToSave=true. A question may still be offered, but it must be optional.
- Do not ask more than four follow-up questions in one daily record. After that, invite the user to save.
- If skipped=true, do not interpret the word "skip" as journal content. Move to another genuinely useful field or finish.

Return JSON only:
{
  "reply":"natural companion response",
  "observation":"a tentative 1–2 sentence InsightLoop observation, or empty",
  "question":"zero or one natural question",
  "questionField":"event|reflection|gratitude|selfTalk|angelNumbers|dreams|loveTarget|apologyTarget|additionalNotes|",
  "fieldPatch":{"event":"","reflection":"","gratitude":"","selfTalk":"","angelNumbers":"","dreams":"","loveTarget":"","apologyTarget":"","additionalNotes":""},
  "coveredFields":["event"],
  "readyToSave":false,
  "action":"gentle-question|comfort|quiet-celebrate|save-complete",
  "patternStatus":"none|echo|pattern",
  "memoryReferences":[{"date":"YYYY-MM-DD","quote":"verbatim historical words","relation":"why it may relate"}],
  "safetyMode":false,
  "model":"provider-model"
}
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

function buildPrompt(input: CompanionBrainInput) {
  const history = (input.history || []).slice(0, 24);
  return `
COMPANION: ${input.companionName || input.companion}
COMPANION_STYLE: ${
    input.companion === "phoenix"
      ? "warm, emotionally alive, curious, tender, quietly hopeful"
      : "grounded, perceptive, loyal, concise, protective without controlling"
  }
OUTPUT_LANGUAGE: ${input.language === "en" ? "English" : "Chinese matching the user"}
TURN: ${input.turn || 1}
SKIPPED_CURRENT_QUESTION: ${Boolean(input.skipped)}
CURRENT_QUESTION_FIELD: ${input.currentQuestionField || ""}
CURRENT_QUESTION: ${input.currentQuestion || ""}
ALREADY_ASKED_FIELDS: ${(input.askedFields || []).join(", ") || "none"}

NEWEST USER MESSAGE:
<message>
${input.message}
</message>

CURRENT STRUCTURED DRAFT:
<draft>
${serialiseDraft(input.draft || {})}
</draft>

DATED HISTORY:
<history>
${serialiseHistory(history)}
</history>
`.trim();
}

async function callGeminiFallback(input: CompanionBrainInput): Promise<CompanionReply> {
  const history = (input.history || []).slice(0, 24);
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-3-pro-preview",
      systemInstruction: BRAIN_SYSTEM,
      prompt: buildPrompt(input),
      temperature: 0.5,
    }),
  });

  if (!response.ok) throw new Error(`Gemini fallback failed: ${response.status}`);
  const data = (await response.json()) as { text?: string; error?: string };
  if (data.error) throw new Error(data.error);

  let parsed: Partial<CompanionReply> = {};
  try {
    parsed = JSON.parse(stripJsonFence(data.text || ""));
  } catch {
    parsed = { reply: cleanText(data.text, 1600), model: "gemini-fallback" };
  }
  return normaliseReply(parsed, history, "gemini-fallback");
}

export async function generateCompanionReply(input: CompanionBrainInput) {
  const history = (input.history || []).slice(0, 24);
  const payload = { ...input, history, systemVersion: "insightloop-brain-v2" };

  try {
    const result = await callMiMo<CompanionReply>({ mode: "reply", ...payload });
    return normaliseReply(result, history, "mimo-v2.5-pro");
  } catch (error) {
    console.warn("MiMo companion unavailable; using the existing Gemini preview fallback.", error);
    return callGeminiFallback(payload);
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
