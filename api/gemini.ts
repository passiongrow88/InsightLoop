import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";

function normalizeModel(model?: string) {
  if (!model) return "gemini-3-pro-preview";
  return model.replace(/^models\//, "");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const { prompt, systemInstruction, temperature, model } = (req.body || {}) as {
      prompt?: string;
      systemInstruction?: string;
      temperature?: number;
      model?: string;
    };

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = normalizeModel(model);

    const gm = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction || undefined
    });

    const result = await gm.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: typeof temperature === "number" ? temperature : 0.7
      }
    });

    const text = result.response.text() || "";
    return res.status(200).json({ text });
  } catch (err: any) {
    return res.status(500).json({
      error: "Gemini call failed",
      detail: String(err?.message || err)
    });
  }
}
