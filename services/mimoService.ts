import { supabase } from "./supabaseClient";
import type { CompanionId, Language } from "../types";

export type CompanionReplyAction =
  | "gentle-question"
  | "comfort"
  | "quiet-celebrate"
  | "save-complete";

export type CompanionPatternStatus = "none" | "echo" | "pattern";

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
};

export type CompanionReply = {
  reply: string;
  observation: string;
  question: string;
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
  if (error) {
    throw new Error(error.message || "MiMo is temporarily unavailable.");
  }
  return data as T;
}

function cleanText(value: unknown, max = 1600) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function historyBlob(item: CompanionHistoryItem) {
  return [
    item.event,
    item.reflection,
    item.gratitude,
    item.selfTalk,
    item.dreams,
    item.angelNumbers,
  ]
    .filter(Boolean)
    .join("\n")
    .toLocaleLowerCase();
}

function validateMemoryReferences(
  value: unknown,
  history: CompanionHistoryItem[]
): CompanionMemoryReference[] {
  if (!Array.isArray(value)) return [];

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

  const action = value?.action;
  const allowedActions: CompanionReplyAction[] = [
    "gentle-question",
    "comfort",
    "quiet-celebrate",
    "save-complete",
  ];

  return {
    reply:
      cleanText(value?.reply, 1600) ||
      "我先替你把这一刻收好。等你愿意时，我们再慢慢看看它留下了什么。",
    observation: cleanText(value?.observation, 1000),
    question: cleanText(value?.question, 420),
    action: allowedActions.includes(action as CompanionReplyAction)
      ? (action as CompanionReplyAction)
      : "save-complete",
    patternStatus,
    memoryReferences,
    safetyMode: Boolean(value?.safetyMode),
    model: cleanText(value?.model, 120) || fallbackModel,
  };
}

const GEMINI_FALLBACK_SYSTEM = `
You are the reasoning brain of InsightLoop, a long-term awareness companion.
Your purpose is not casual chat. Help the user record what happened, notice a meaningful tension or choice point, and—only when real dated records support it—show a possible echo across time.

Think internally through four lenses without naming teachers or creating separate sections:
- Jung: dreams, symbols, projection, shadow, recurring images; present interpretations only as possibilities.
- Socratic inquiry: ask at most one precise question that helps the user discover their own answer.
- Relational wisdom: notice context, boundaries, timing, roles, face, pressure, and the complexity of human relationships.
- Choice and change: inertia is not fate; return agency to the user through a small present choice.

Strict evidence rules:
- Never claim a pattern without at least two separate prior dated records.
- One prior record may only be described as a possible echo.
- Every memory reference must quote words that really appear in the supplied history and include its exact date.
- Distinguish observation from inference. Use tentative language when evidence is limited.
- Do not diagnose personality, trauma, mental illness, destiny, energy, past lives, or bodily symptoms.
- In crisis content, stop symbolic interpretation and respond calmly with real-world safety support.

Style:
- Natural, warm, specific, and concise. Never sound like a textbook, therapist template, or generic wellness chatbot.
- Start from one concrete detail in the current record.
- No headings, lectures, numbered lists, or compulsory greeting.
- The reply should be 2–4 sentences. The observation should be 1–2 sentences. Ask zero or one question.

Return JSON only with this exact shape:
{
  "reply": "natural companion response",
  "observation": "temporary interpretation, clearly not a verdict",
  "question": "zero or one question",
  "action": "gentle-question|comfort|quiet-celebrate|save-complete",
  "patternStatus": "none|echo|pattern",
  "memoryReferences": [{"date":"YYYY-MM-DD","quote":"verbatim historical words","relation":"why it may relate"}],
  "safetyMode": false,
  "model": "gemini-fallback"
}
`.trim();

function stripJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

async function callGeminiFallback(input: CompanionBrainInput): Promise<CompanionReply> {
  const history = (input.history || []).slice(0, 24);
  const historyText = history.length
    ? history
        .map(
          (item) =>
            `[${item.date}]\nEvent: ${item.event}\nReflection: ${item.reflection || ""}\nGratitude: ${item.gratitude || ""}\nSelf-talk: ${item.selfTalk || ""}\nDreams: ${item.dreams || ""}\nSigns: ${item.angelNumbers || ""}`
        )
        .join("\n---\n")
    : "No prior records.";

  const prompt = `
COMPANION: ${input.companionName || input.companion}
COMPANION_STYLE: ${
    input.companion === "phoenix"
      ? "warm, emotionally alive, curious, tender, quietly hopeful"
      : "grounded, perceptive, loyal, concise, protective without controlling"
  }
OUTPUT_LANGUAGE: ${input.language === "en" ? "English" : "Chinese matching the user"}

CURRENT RECORD:
<current>
${input.message}
</current>

DATED HISTORY:
<history>
${historyText}
</history>
`.trim();

  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-3-pro-preview",
      systemInstruction: GEMINI_FALLBACK_SYSTEM,
      prompt,
      temperature: 0.55,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini fallback failed: ${response.status}`);
  }

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

  try {
    const result = await callMiMo<CompanionReply>({
      mode: "reply",
      ...input,
      history,
    });
    return normaliseReply(result, history, "mimo-v2.5-pro");
  } catch (error) {
    console.warn("MiMo companion unavailable; using the existing Gemini preview fallback.", error);
    return callGeminiFallback({ ...input, history });
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
