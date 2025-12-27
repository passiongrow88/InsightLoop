import type { VercelRequest, VercelResponse } from 'vercel';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../constants';

const MODEL_NAME = 'gemini-3-flash-preview';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      error: 'Missing GEMINI_API_KEY in server environment',
    });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    return res.status(200).json({
      text: response.text,
    });
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    return res.status(500).json({
      error: 'Gemini request failed',
      detail: err?.message,
    });
  }
}
