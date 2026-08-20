import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const PREVIEW_SUPABASE_URL = "https://psgjismukjxpsnodtwvl.supabase.co";
const PREVIEW_SUPABASE_KEY = "sb_publishable_V51jM3gFdCgsJA_Kw9W2zg_522aw52U";

function normalizeModel(model?: string) {
  if (!model) return "gemini-3-pro-preview";
  return model.replace(/^models\//, "");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    if (process.env.VERCEL_ENV !== "preview" && process.env.ALLOW_LOCAL_PREVIEW_AI !== "true") {
      return res.status(403).json({ error: "Journal AI is enabled only in the V5 Preview." });
    }

    const bearer = String(req.headers.authorization || "");
    const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
    const authClient = createClient(
      process.env.SUPABASE_URL || PREVIEW_SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY || PREVIEW_SUPABASE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return res.status(401).json({ error: "A valid Preview session is required." });

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

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing prompt" });
    }

    if (prompt.length > 48_000 || (systemInstruction?.length || 0) > 12_000) {
      return res.status(413).json({ error: "Journal context is too large" });
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
