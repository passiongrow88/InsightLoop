import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { JournalEntry, ManifestationItem, Language } from '../types';

// Initialize Gemini Client
// Browser (Vite) environment variables must start with VITE_
const API_KEY =
  (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
  (import.meta as any)?.env?.VITE_GOOGLE_API_KEY ||
  "";

if (!API_KEY) {
  throw new Error("Missing Gemini API key. Set VITE_GEMINI_API_KEY (or VITE_GOOGLE_API_KEY) in Vercel and redeploy.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });



const MODEL_NAME = 'gemini-3-flash-preview';

export const generateJournalInsight = async (
  currentEntry: JournalEntry,
  history: JournalEntry[],
  language: Language
): Promise<string> => {
  try {
    const historyContext = history.map(h => `
      [Date: ${h.date}]
      Event: ${h.event}
      Reflection: ${h.reflection}
      Gratitude: ${h.gratitude}
      SelfTalk: ${h.selfTalk}
      Dreams/Signs: ${h.angelNumbers || ''} ${h.dreams || ''}
    `).join('\n---\n');

    // We pass the UI language as a hint, but the System Instruction "Language Follow Principle" overrides it based on content.
    const uiContext = language === 'zh' ? "UI Language: Chinese" : "UI Language: English";

    const prompt = `
      CONTEXT (User History):
      ${historyContext}

      CURRENT ENTRY (Today):
      Date: ${currentEntry.date}
      Event: ${currentEntry.event}
      Gratitude: ${currentEntry.gratitude}
      Reflection: ${currentEntry.reflection}
      Self Talk: ${currentEntry.selfTalk}
      Repeating Numbers/Signs: ${currentEntry.angelNumbers || 'None'}
      Dreams: ${currentEntry.dreams || 'None'}
      Love: ${currentEntry.loveTarget || 'None'}
      Apology: ${currentEntry.apologyTarget || 'None'}
      
      INSTRUCTIONS:
      1. **Language Priority**: Analyze the language used in "CURRENT ENTRY". Respond in that MAIN language. (${uiContext} is for reference only).
      2. Use the "Gratitude" field to generate the "Energy Anchor" output.
      3. Analyze the "CONTEXT (User History)" against the "CURRENT ENTRY". Look for recurring emotional patterns, event structures, or self-talk themes. 
      4. Use these findings to populate the "Patterns & Synchronicity" section.
      5. Follow the strict 7-block structure defined in the system instruction, but ensure the TONE is warm, specific, and companionable.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7, // Balanced creativity and stability
      }
    });

    return response.text || "I apologize, I could not generate an insight at this moment. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "InsightLoop is currently meditating (Connection Error). Please check your API key or network connection.";
  }
};

export const generateManifestationGuidance = async (
  goal: ManifestationItem,
  journalHistory: JournalEntry[],
  language: Language
): Promise<string> => {
  try {
     // We pass the UI language as a hint, but the System Instruction "Language Follow Principle" overrides it based on content.
    const uiContext = language === 'zh' ? "UI Language: Chinese" : "UI Language: English";

    const prompt = `
      The user has set a new Manifestation Goal.
      Goal: ${goal.goal}
      Expected Date: ${goal.expectedDate}
      Reason: ${goal.reason || 'Not specified'}
      
      Instructions:
      1. Analyze the language of the "Goal". Respond in that same language. (${uiContext} is for reference only).
      2. Based on the user's journal history (briefly summarized below), provide a gentle, stabilizing message. 
      3. Do not judge the goal. Focus on the mindset and the journey.
      
      Recent History Context:
      ${journalHistory.slice(0, 3).map(h => `- ${h.event}: ${h.reflection}`).join('\n')}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "Your intention has been recorded. Trust the process.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Your intention is saved.";
  }
};
