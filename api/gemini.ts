import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

// Server-side env var (DO NOT use VITE_ here)
const API_KEY = process.env.GEMINI_API_KEY || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "Missing GEMINI_API_KEY in Vercel Environment Variables",
      });
    }

    // Allow only POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { model, prompt, systemInstruction, temperature } = (req.body || {}) as {
      model?: string;
      prompt?: string;
      systemInstruction?: string;
      temperature?: number;
    };

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: model || "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: typeof temperature === "number" ? temperature : 0.7,
      },
    });

    return res.status(200).json({ text: response.text || "" });
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    return res.status(500).json({
      error: "Gemini request failed",
      detail: err?.message || String(err),
    });
  }
}
