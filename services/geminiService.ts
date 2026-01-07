import { SYSTEM_INSTRUCTION } from "../constants";
import { JournalEntry, ManifestationItem, Language } from "../types";

/**
 * ✅ Vercel Serverless API endpoint
 * DO NOT change this path
 */
const API_ENDPOINT = "/api/gemini";

/**
 * ✅ v1beta confirmed supported model
 * (must align with backend /api/gemini.ts)
 *
 * IMPORTANT:
 * - Backend already supports Gemini 3 Pro Preview
 * - Keep model string WITHOUT "models/" prefix if your backend strips/normalizes it
 */
const MODEL_NAME = "gemini-3-pro-preview";

/**
 * ================================
 * Low-level Gemini API Caller
 * ================================
 * - Keeps payload structure stable
 * - Does NOT parse / alter AI output
 * - Any structure enforcement stays in SYSTEM_INSTRUCTION
 */
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

  const data = (await res.json()) as {
    text?: string;
    error?: string;
    detail?: string;
  };

  if (data.error) {
    throw new Error(
      `${data.error}${data.detail ? `: ${JSON.stringify(data.detail)}` : ""}`
    );
  }

  return data.text || "";
}

/**
 * ================================
 * Journal Insight Generator
 * ================================
 * ⚠️ IMPORTANT:
 * - DOES NOT change InsightLoop structure
 * - DOES NOT inject extra formatting
 * - ALL structure enforcement is handled by SYSTEM_INSTRUCTION
 * 
 * ✅ UPDATED: Now accepts userName parameter
 */
export const generateJournalInsight = async (
  currentEntry: JournalEntry,
  history: JournalEntry[],
  language: Language,
  userName?: string  // ✅ 新增：用户名字参数
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

    const uiContext =
      language === "zh" ? "UI Language: Chinese" : "UI Language: English";

    // ✅ 新增：用户名字，如果没有则使用温暖的默认称呼
    const displayName = userName?.trim() || (language === "zh" ? "朋友" : "Friend");

    const prompt = `
USER_NAME: ${displayName}

CONTEXT (User History):
${historyContext || "No prior records."}

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
1. Begin by greeting the user by their name (USER_NAME) and naturally introduce yourself as InsightLoop.
2. Analyze the language used in "CURRENT ENTRY". Respond in that MAIN language. (${uiContext} is for reference only).
3. Use the "Gratitude" field to generate the "Energy Anchor" output.
4. Analyze the "CONTEXT (User History)" against the "CURRENT ENTRY". Look for recurring emotional patterns, event structures, or self-talk themes.
5. Use these findings to populate the "Patterns & Synchronicity" section.
6. Follow the 7-section structure defined in the system instruction, using ◈ markers and dynamic titles.
7. Ensure the TONE is warm, specific, and companionable - like a handwritten letter, not a report.
`;

    const text = await callGeminiAPI({
      model: MODEL_NAME,
      prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    });

    return (
      text ||
      "I apologize, I could not generate an insight at this moment. Please try again."
    );
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "InsightLoop is currently unavailable. Please check server/API settings and try again.";
  }
};

/**
 * ================================
 * Manifestation Guidance Generator
 * ================================
 * - Keeps tone gentle
 * - No success/failure narratives injected here
 * - System rules still live in SYSTEM_INSTRUCTION
 * 
 * ✅ UPDATED: Now accepts userName parameter
 */
export const generateManifestationGuidance = async (
  goal: ManifestationItem,
  journalHistory: JournalEntry[],
  language: Language,
  userName?: string  // ✅ 新增：用户名字参数
): Promise<string> => {
  try {
    const uiContext =
      language === "zh" ? "UI Language: Chinese" : "UI Language: English";

    // ✅ 新增：用户名字
    const displayName = userName?.trim() || (language === "zh" ? "朋友" : "Friend");

    const prompt = `
USER_NAME: ${displayName}

The user has set a new Manifestation Goal.
Goal: ${goal.goal}
Expected Date: ${goal.expectedDate}
Reason: ${goal.reason || "Not specified"}
Beneficiaries: ${goal.beneficiaries || "Not specified"}

Instructions:
1. Begin by greeting the user by their name (USER_NAME) and naturally introduce yourself as InsightLoop.
2. Analyze the language of the "Goal". Respond in that same language. (${uiContext} is for reference only).
3. Based on the user's journal history (briefly summarized below), provide a gentle, stabilizing message.
4. Do not judge the goal. Focus on the mindset and the journey.
5. Keep the response warm and personal, like a supportive friend.

Recent History Context:
${
  journalHistory.length > 0
    ? journalHistory
        .slice(0, 3)
        .map((h) => `- ${h.event}: ${h.reflection}`)
        .join("\n")
    : "No recent history available."
}
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
