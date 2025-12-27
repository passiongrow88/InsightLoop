import { JournalEntry, ManifestationItem, Language } from '../types';

const callGemini = async (prompt: string): Promise<string> => {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    throw new Error('Gemini API request failed');
  }

  const data = await res.json();
  return data.text || '';
};

export const generateJournalInsight = async (
  currentEntry: JournalEntry,
  history: JournalEntry[],
  language: Language
): Promise<string> => {
  const historyContext = history.map(h => `
[Date: ${h.date}]
Event: ${h.event}
Reflection: ${h.reflection}
Gratitude: ${h.gratitude}
SelfTalk: ${h.selfTalk}
Dreams/Signs: ${h.angelNumbers || ''} ${h.dreams || ''}
`).join('\n---\n');

  const uiContext = language === 'zh' ? 'UI Language: Chinese' : 'UI Language: English';

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
1. Analyze the language used in CURRENT ENTRY. Respond in that language. (${uiContext})
2. Use Gratitude to generate Energy Anchor.
3. Analyze patterns between history and today.
4. Follow the strict 7-block structure.
`;

  try {
    return await callGemini(prompt);
  } catch {
    return 'InsightLoop is currently unavailable. Please try again later.';
  }
};

export const generateManifestationGuidance = async (
  goal: ManifestationItem,
  journalHistory: JournalEntry[],
  language: Language
): Promise<string> => {
  const uiContext = language === 'zh' ? 'UI Language: Chinese' : 'UI Language: English';

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

  try {
    return await callGemini(prompt);
  } catch {
    return 'Your intention is saved.';
  }
};
