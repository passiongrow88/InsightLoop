import { CompanionKind, JournalEntry, Language } from "../types";
import {
  getSupabaseClient,
  supabaseFunctionsUrl,
  supabasePublishableKey,
} from "../src/services/supabaseClient";

const V5_JOURNAL_INSTRUCTION = `
You write the right-hand page of the InsightLoop journal.

Respond in the main language of the current entry. Start from one concrete detail the user actually wrote. Be warm, precise, and calm, without introducing yourself or using a ritual greeting.

The response must adapt to the entry. Use zero to three short paragraphs and, only when it genuinely helps, end with one open question. Do not force headings, numbered sections, generic affirmations, diagnoses, predictions, fate claims, or spiritual certainty.

Historical evidence rule: mention a recurring pattern only when the supplied records show the same concrete theme on at least two separate prior dates as well as today. If that threshold is not met, do not imply that a pattern exists. Dreams, numbers, and symbols may be explored as personal metaphors only when the user included them; never present an interpretation as fact.

Preserve the user's agency. Suggest at most one small next step, phrased as an invitation. Never claim memory beyond the records supplied in this request.
`.trim();

async function previewToken() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (data.session?.access_token) return data.session.access_token;

  const refreshed = await client.auth.refreshSession();
  if (refreshed.error) throw refreshed.error;
  const token = refreshed.data.session?.access_token;
  if (!token) throw new Error("Sign in again before requesting an InsightLoop response.");
  return token;
}

async function readApiError(response: Response) {
  const data = await response.json().catch(() => ({})) as { error?: string; providerStatus?: number; requestId?: string };
  const suffix = data.providerStatus ? ` (MiMo ${data.providerStatus})` : "";
  const request = data.requestId ? ` [${data.requestId}]` : "";
  return `${data.error || `Request failed with status ${response.status}`}${suffix}${request}`;
}

async function requestMiMo(prompt: string, systemInstruction: string) {
  const response = await fetch(`${supabaseFunctionsUrl}/mimo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${await previewToken()}`,
    },
    body: JSON.stringify({ action: "chat", prompt, systemInstruction }),
  });
  if (!response.ok) throw new Error(await readApiError(response));
  const data = await response.json() as { text?: string };
  if (!data.text?.trim()) throw new Error("MiMo returned an empty response.");
  return data.text.trim();
}

export const generateJournalInsight = async (
  currentEntry: JournalEntry,
  history: JournalEntry[],
  language: Language,
  userName?: string,
) => {
  const historyContext = history.map((item) => `
[Date: ${item.date}]
Event: ${item.event}
Reflection: ${item.reflection}
Gratitude: ${item.gratitude}
SelfTalk: ${item.selfTalk}
Dreams/Signs: ${item.angelNumbers || ""} ${item.dreams || ""}
`).join("\n---\n");

  const prompt = `
LANGUAGE PREFERENCE: ${language === "zh" ? "Chinese" : "English"}
USER DISPLAY NAME (use only if naturally necessary, never as a forced greeting): ${userName?.trim() || "Not provided"}

CURRENT ENTRY (Today):
Date: ${currentEntry.date}
Event: ${currentEntry.event}
Gratitude: ${currentEntry.gratitude}
Reflection: ${currentEntry.reflection}
Self Talk: ${currentEntry.selfTalk}
Repeating Numbers/Signs: ${currentEntry.angelNumbers || "None"}
Dreams: ${currentEntry.dreams || "None"}
Love: ${currentEntry.loveTarget || "None"}
Apology: ${currentEntry.apologyTarget || "None"}

PRIOR DATED RECORDS:
${historyContext || "No prior records were supplied."}

Write only the journal response. Follow the evidence threshold in the system instruction.
`.trim();

  return requestMiMo(prompt, V5_JOURNAL_INSTRUCTION);
};

export const generateCompanionRecommendation = async (
  entries: JournalEntry[],
  language: Language,
): Promise<{ recommendedKind: CompanionKind; reason: string }> => {
  const records = entries
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 14)
    .map((entry) => ({
      date: entry.date,
      event: (entry.event || "").slice(0, 900),
      dream: (entry.dreams || "").slice(0, 500),
      gratitude: (entry.gratitude || "").slice(0, 500),
    }));

  const systemInstruction = `
You recommend one of two InsightLoop archive companions. This is a gentle symbolic fit, never a diagnosis or hidden-truth claim.

Phoenix represents warmth, renewal, perspective, and helping a person revisit what changed.
Little Thunder Dragon represents steady courage, grounding, clarity, and helping a person face what needs to be named.

Use only the supplied records. Do not invent history or claim a fixed personality. The user may choose either companion regardless of your recommendation.

Return only valid JSON with this exact shape:
{"recommendedKind":"phoenix"|"thunder_dragon","reason":"one or two warm, specific sentences in the requested language"}
`.trim();

  const prompt = `
OUTPUT LANGUAGE: ${language === "zh" ? "Simplified Chinese" : "English"}
RECORDS:
${JSON.stringify(records)}
`.trim();

  const raw = await requestMiMo(prompt, systemInstruction);
  const json = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
  const parsed = JSON.parse(json) as { recommendedKind?: CompanionKind; reason?: string };
  if (!parsed.reason?.trim() || !["phoenix", "thunder_dragon"].includes(parsed.recommendedKind || "")) {
    throw new Error(language === "zh" ? "MiMo 没有返回可用的陪伴兽推荐，请重试。" : "MiMo did not return a usable companion recommendation. Please retry.");
  }
  return { recommendedKind: parsed.recommendedKind!, reason: parsed.reason.trim() };
};

export const generateJournalSpeech = async (text: string, language: Language) => {
  const response = await fetch(`${supabaseFunctionsUrl}/mimo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${await previewToken()}`,
    },
    body: JSON.stringify({ action: "tts", text, language }),
  });
  if (!response.ok) throw new Error(await readApiError(response));
  const data = await response.json() as { audioBase64?: string; contentType?: string };
  if (!data.audioBase64) throw new Error("MiMo returned no playable journal audio.");
  const bytes = Uint8Array.from(atob(data.audioBase64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: data.contentType || "audio/wav" });
};
