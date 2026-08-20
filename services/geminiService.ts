import { SYSTEM_INSTRUCTION } from "../constants";
import { JournalEntry, ManifestationItem, Language } from "../types";
import { getSupabaseClient } from "../src/services/supabaseClient";

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

const V5_JOURNAL_INSTRUCTION = `
You write the right-hand page of the InsightLoop journal.

Respond in the main language of the current entry. Start from one concrete detail the user actually wrote. Be warm, precise, and calm, without introducing yourself or using a ritual greeting.

The response must adapt to the entry. Use zero to three short paragraphs and, only when it genuinely helps, end with one open question. Do not force headings, numbered sections, generic affirmations, diagnoses, predictions, fate claims, or spiritual certainty.

Historical evidence rule: mention a recurring pattern only when the supplied records show the same concrete theme on at least two separate prior dates as well as today. If that threshold is not met, do not imply that a pattern exists. Dreams, numbers, and symbols may be explored as personal metaphors only when the user included them; never present an interpretation as fact.

Preserve the user's agency. Suggest at most one small next step, phrased as an invitation. Never claim memory beyond the records supplied in this request.
`.trim();

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
  const { data: sessionData } = await getSupabaseClient().auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sign in before requesting an InsightLoop response.");
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

    const prompt = `
LANGUAGE PREFERENCE: ${uiContext}
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
`;

    const text = await callGeminiAPI({
      model: MODEL_NAME,
      prompt,
      systemInstruction: V5_JOURNAL_INSTRUCTION,
      temperature: 0.55,
    });

    if (!text.trim()) throw new Error("InsightLoop returned an empty response.");
    return text.trim();
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
/**
 * ✅ HISTORY / CALENDAR SUMMARY (TEMP)
 * - For History/Calendar page ONLY
 * - ❌ Never saved to Supabase
 * - ❌ Never overwrites aiResponse
 * - Keeps core long-term mode untouched
 */
export const generateHistorySummary = async (
  entries: JournalEntry[],
  language: Language,
  userName?: string
): Promise<string> => {
  try {
    const langMap: Record<string, string> = {
      en: "English",
      zh: "Simplified Chinese",
      ja: "Japanese",
    };
    const targetLanguage = langMap[language] || "English";

    // Minimal, cost-controlled input (backend should also enforce limits)
    const MAX_CHARS_PER_ENTRY = 1200;
    const compact = entries
      .map((e) => {
        const blob = [
          `Date: ${e.date}`,
          `Event: ${e.event || ""}`,
          `Reflection: ${e.reflection || ""}`,
          `Gratitude: ${e.gratitude || ""}`,
          `SelfTalk: ${e.selfTalk || ""}`,
          `AngelNumbers: ${e.angelNumbers || ""}`,
          `Dreams: ${e.dreams || ""}`,
          `Notes: ${(e as any).additionalNotes || ""}`,
        ].join("\n");
        return blob.slice(0, MAX_CHARS_PER_ENTRY);
      })
      .join("\n\n---\n\n");

    const prompt = `
You are InsightLoop's History Summary analyst.

LANGUAGE REQUIREMENT (CRITICAL):
- Output ALL human-readable text strictly in ${targetLanguage}.

SCOPE (CRITICAL):
- This is a TEMP summary for the History/Calendar page.
- Do NOT say you will remember anything later.
- Do NOT mention databases, Supabase, or storage.

USER_NAME: ${userName || ""}

TASK:
From the entries below, output:
1) Recurring themes (3-6 bullets)
2) Emotional patterns & triggers (3-6 bullets)
3) What helped (2-4 bullets)
4) Next 3 micro-actions for the next 24–72h (numbered, tiny steps)
5) A 2-sentence compassionate recap (no medical/therapy claims)

ENTRIES:
${compact}
`.trim();

    const text = await callGeminiAPI({
      model: MODEL_NAME,
      prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.4,
    });

    return text || (language === "zh" ? "暂时无法生成总结，请稍后再试。" : "Unable to generate summary right now. Please try again later.");
  } catch (error) {
    console.error("Gemini API Error (History Summary):", error);
    return language === "zh" ? "暂时无法生成总结，请稍后再试。" : "Unable to generate summary right now. Please try again later.";
  }
};

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
