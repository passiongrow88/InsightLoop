import { JournalEntry, Language } from "../types";
import { getSupabaseClient } from "../src/services/supabaseClient";

const V5_JOURNAL_INSTRUCTION = `
You write the right-hand page of the InsightLoop journal.

Respond in the main language of the current entry. Start from one concrete detail the user actually wrote. Be warm, precise, and calm, without introducing yourself or using a ritual greeting.

The response must adapt to the entry. Use zero to three short paragraphs and, only when it genuinely helps, end with one open question. Do not force headings, numbered sections, generic affirmations, diagnoses, predictions, fate claims, or spiritual certainty.

Historical evidence rule: mention a recurring pattern only when the supplied records show the same concrete theme on at least two separate prior dates as well as today. If that threshold is not met, do not imply that a pattern exists. Dreams, numbers, and symbols may be explored as personal metaphors only when the user included them; never present an interpretation as fact.

Preserve the user's agency. Suggest at most one small next step, phrased as an invitation. Never claim memory beyond the records supplied in this request.
`.trim();

async function previewToken() {
  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in before requesting an InsightLoop response.");
  return token;
}

async function readApiError(response: Response) {
  const data = await response.json().catch(() => ({})) as { error?: string; providerStatus?: number };
  const suffix = data.providerStatus ? ` (MiMo ${data.providerStatus})` : "";
  return `${data.error || `Request failed with status ${response.status}`}${suffix}`;
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

  const response = await fetch("/api/mimo", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await previewToken()}` },
    body: JSON.stringify({ prompt, systemInstruction: V5_JOURNAL_INSTRUCTION }),
  });
  if (!response.ok) throw new Error(await readApiError(response));
  const data = await response.json() as { text?: string };
  if (!data.text?.trim()) throw new Error("MiMo returned an empty journal response.");
  return data.text.trim();
};

export const generateJournalSpeech = async (text: string, language: Language) => {
  const response = await fetch("/api/mimo-tts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await previewToken()}` },
    body: JSON.stringify({ text, language }),
  });
  if (!response.ok) throw new Error(await readApiError(response));
  return response.blob();
};
