import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
      { method: "GET" }
    );

    const data = await r.json();

    // 只把重要信息筛出来给你看
    const models = (data?.models || []).map((m: any) => ({
      name: m.name,
      supportedGenerationMethods: m.supportedGenerationMethods,
    }));

    return res.status(200).json({ models });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
