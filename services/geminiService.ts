import { SYSTEM_INSTRUCTION } from "../constants";
import { JournalEntry, ManifestationItem, Language } from "../types";

const API_ENDPOINT = "/api/gemini";
const MODEL_NAME = "gemini-3-flash-preview";

async function callGeminiAPI(payload: {
  model?: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
}): Promise<string> {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { text?: string; error?: string; detail?: string };
  if (data.error) throw new Error(`${data.error}${data.detail ? `: ${data.detail}` : ""}`);

  return data.text || "";
}

export const generateJournalInsight = async (
  currentEntry: JournalEntry,
  history: JournalEntry[],
  language: Language
): Promise<string> => {
  try {
    const historyContext = history
      .map(
        (h) => `
[Date: ${h.date}]
Event: ${h.event}
Reflection: ${h.reflection}
Gratitude: ${h.gratitude}
SelfTalk: ${h.selfTalk}
Dreams/Signs: ${h.angelNumbers || ""} ${h.dreams || ""}
`
      )
      .join("\n---\n");

    const uiContext = language === "zh" ? "UI Language: Chinese" : "UI Language: English";

    const prompt = `
CONTEXT (User History):
${historyContext}

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

INSTRUCTIONS:
1. Analyze the language used in "CURRENT ENTRY". Respond in that MAIN language. (${uiContext} is for reference only).
2. Use the "Gratitude" field to generate the "Energy Anchor" output.
3. Analyze the "CONTEXT (User History)" against the "CURRENT ENTRY". Look for recurring emotional patterns, event structures, or self-talk themes.
4. Use these findings to populate the "Patterns & Synchronicity" section.
5. Follow the strict 7-block structure defined in the system instruction, but ensure the TONE is warm, specific, and companionable.
`;

    const text = await callGeminiAPI({
      model: MODEL_NAME,
      prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    });

    return text || "I apologize, I could not generate an insight at this moment. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "InsightLoop is currently unavailable. Please check server/API settings and try again.";
  }
};

export const generateManifestationGuidance = async (
  goal: ManifestationItem,
  journalHistory: JournalEntry[],
  language: Language
): Promise<string> => {
  try {
    const uiContext = language === "zh" ? "UI Language: Chinese" : "UI Language: English";

    const prompt = `
The user has set a new Manifestation Goal.
Goal: ${goal.goal}
Expected Date: ${goal.expectedDate}
Reason: ${goal.reason || "Not specified"}

Instructions:
1. Analyze the language of the "Goal". Respond in that same language. (${uiContext} is for reference only).
2. Based on the user's journal history (briefly summarized below), provide a gentle, stabilizing message.
3. Do not judge the goal. Focus on the mindset and the journey.

Recent History Context:
${journalHistory.slice(0, 3).map((h) => `- ${h.event}: ${h.reflection}`).join("\n")}
`;

    const text = await callGeminiAPI({
      model: MODEL_NAME,
      prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    });

    return text || "Your intention has been recorded. Trust the process.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Your intention is saved.";
  }
};
