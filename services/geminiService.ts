console.log("ENV CHECK:", (import.meta as any)?.env);
console.log("API_KEY LENGTH:", API_KEY?.length);

import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { JournalEntry, ManifestationItem, Language } from '../types';

// Browser (Vite) environment variables must start with VITE_
const API_KEY =
  (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
  (import.meta as any)?.env?.VITE_GOOGLE_API_KEY ||
  "";

// ❗只定义一次
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const MODEL_NAME = 'gemini-3-flash-preview';

export const generateJournalInsight = async (
  currentEntry: JournalEntry,
  history: JournalEntry[],
  language: Language
): Promise<string> => {
  try {
    if (!ai) {
      return "InsightLoop is not connected yet. Please check API configuration.";
    }

    const historyContext = history.map(h => `
      [Date: ${h.date}]
      Event: ${h.event}
      Reflection: ${h.reflection}
      Gratitude: ${h.gratitude}
      SelfTalk: ${h.selfTalk}
      Dreams/Signs: ${h.angelNumbers || ''} ${h.dreams || ''}
    `).join('\n---\n');

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
      1. Analyze the language used in "CURRENT ENTRY". Respond in that MAIN language. (${uiContext} is for reference only).
      2. Use the "Gratitude" field to generate the "Energy Anchor".
      3. Analyze patterns between history and today.
      4. Follow the strict 7-block structure.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    return response.text || "I could not generate an insight right now.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "InsightLoop is temporarily unavailable. Please try again later.";
  }
};

export const generateManifestationGuidance = async (
  goal: ManifestationItem,
  journalHistory: JournalEntry[],
  language: Language
): Promise<string> => {
  try {
    if (!ai) {
      return "InsightLoop is not connected yet. Please check API configuration.";
    }

    const uiContext = language === 'zh' ? "UI Language: Chinese" : "UI Language: English";

    const prompt = `
      Goal: ${goal.goal}
      Expected Date: ${goal.expectedDate}
      Reason: ${goal.reason || 'Not specified'}

      Instructions:
      1. Respond in the language of the Goal. (${uiContext})
      2. Provide a gentle, stabilizing message.
      
      Recent History:
      ${journalHistory.slice(0, 3).map(h => `- ${h.event}: ${h.reflection}`).join('\n')}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "Your intention has been recorded.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Your intention is saved.";
  }
};
