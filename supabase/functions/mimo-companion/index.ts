import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";

type Companion = "phoenix" | "thunder";
type Field = "event" | "reflection" | "gratitude" | "selfTalk" | "angelNumbers" | "dreams" | "loveTarget" | "apologyTarget" | "additionalNotes";
type Mode = "quiet" | "hold" | "contradiction" | "echo" | "loop" | "change";
type Action = "gentle-question" | "comfort" | "quiet-celebrate" | "save-complete";
type History = Record<Field, string> & { date: string };
type MemoryRef = { date: string; quote: string; relation: string };
type LifeLoop = { trigger: string; interpretation: string; protectedNeed: string; impulse: string; choice: string; action: string; outcome: string; deeperWant: string };

const FIELDS: Field[] = ["event", "reflection", "gratitude", "selfTalk", "angelNumbers", "dreams", "loveTarget", "apologyTarget", "additionalNotes"];
const ACTIONS: Action[] = ["gentle-question", "comfort", "quiet-celebrate", "save-complete"];
const MODES: Mode[] = ["quiet", "hold", "contradiction", "echo", "loop", "change"];
const TOKEN_BASES = [
  Deno.env.get("MIMO_TOKEN_PLAN_BASE_URL")?.trim(),
  "https://token-plan-sgp.xiaomimimo.com/v1",
  "https://token-plan-ams.xiaomimimo.com/v1",
  "https://token-plan-cn.xiaomimimo.com/v1",
].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false, idle_timeout: 20 });
const CRISIS = /\b(suicide|kill myself|end my life|self[- ]?harm|hurt myself)\b|自杀|不想活|结束生命|伤害自己/i;

const text = (value: unknown, max = 1600) => typeof value === "string" ? value.trim().slice(0, max) : "";
const norm = (value: string) => value.toLowerCase().replace(/[\s，。！？、,.!?;；:：'“”‘’"()（）\[\]【】]/g, "");
const isField = (value: unknown): value is Field => FIELDS.includes(value as Field);
const emptyLoop = (): LifeLoop => ({ trigger: "", interpretation: "", protectedNeed: "", impulse: "", choice: "", action: "", outcome: "", deeperWant: "" });
const cleanLoop = (value: unknown): LifeLoop => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.keys(emptyLoop()).map((key) => [key, text(raw[key], 500)])) as LifeLoop;
};
const cleanDraft = (value: unknown) => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(FIELDS.map((field) => [field, text(raw[field], 2400)]).filter(([, value]) => value)) as Partial<Record<Field, string>>;
};
const cleanHistory = (value: unknown): History[] => Array.isArray(value)
  ? value.slice(0, 30).map((row) => ({
      date: text(row?.date, 20),
      ...Object.fromEntries(FIELDS.map((field) => [field, text(row?.[field], 2400)])),
    }) as History).filter((row) => row.date && FIELDS.some((field) => row[field]))
  : [];
const historyText = (item: History) => norm(FIELDS.map((field) => item[field]).join("\n"));

function cors(origin: string | null) {
  const allowed =
    origin === "https://insightloop.lol" ||
    origin === "https://www.insightloop.lol" ||
    origin === "http://localhost:5173" ||
    (Boolean(origin?.endsWith(".vercel.app")) || origin === "https://raw.githack.com" || origin === "https://rawcdn.githack.com");
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "https://insightloop.lol",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

async function requiredKey() {
  const environmentKey = Deno.env.get("MIMO_API_KEY")?.trim();
  if (environmentKey) return environmentKey;
  const rows = await sql<{ decrypted_secret: string }[]>`
    select decrypted_secret from vault.decrypted_secrets
    where name = 'insightloop_mimo_test_key' limit 1
  `;
  const key = rows[0]?.decrypted_secret?.trim();
  if (!key) throw new Error("Missing MiMo key");
  return key;
}

async function callMiMo(payload: Record<string, unknown>) {
  const key = await requiredKey();
  const bases = key.startsWith("tp-") ? TOKEN_BASES : ["https://api.xiaomimimo.com/v1"];
  const failures: string[] = [];

  for (const base of bases) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45_000);
      const response = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "api-key": key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const raw = await response.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
      if (response.ok) return { data, model: data?.model || payload.model, region: new URL(base).hostname };
      const message = text(data?.error?.message || data?.message || `HTTP ${response.status}`, 400);
      failures.push(`${new URL(base).hostname}: ${message}`);
      if (!key.startsWith("tp-") || ![401, 403, 404].includes(response.status)) break;
    } catch (error) {
      failures.push(`${new URL(base).hostname}: ${text(error instanceof Error ? error.message : String(error), 300)}`);
    }
  }
  throw new Error(failures.join(" | "));
}

function persona(companion: Companion, name: string) {
  const identity = name || (companion === "phoenix" ? "凤凰" : "小雷公");
  return companion === "phoenix"
    ? `You are ${identity}, a Phoenix and long-term witness. You are tender without being sugary, emotionally precise, and quietly strong. You notice the part of the user that is still alive, not just the pattern.`
    : `You are ${identity}, a small Thunder Dragon and long-term witness. You are humane, grounded and protective. You help separate fact, fear, boundary and choice without becoming cold or managerial.`;
}

function systemPrompt(companion: Companion, name: string, language: string, phase: "record" | "finalize", danger: boolean, retry: boolean) {
  return `${persona(companion, name)}
You are the living brain of InsightLoop, not a generic diary, therapist, mood tracker, history summarizer or quote generator. ${language === "en" ? "Write natural English." : "Write natural Chinese matching the user."}

SOUL: accompany a person through time so they can see how they reach similar crossroads, what they protect, what they choose, what follows, and how this time may differ. Healing comes from being truthfully met in the present, not from flattering language and not from reciting history.

PRESENT-FIRST LAW — this outranks pattern detection:
1. First understand the newest moment: what concretely happened, what it cost, what the user may be trying to protect, and what they need right now.
2. Never open with a date, an old quote, a pattern, or the phrase “你以前/过去也…”. The newest experience is always the main character.
3. On TURN 1, history is background only. Do not cite it unless the user explicitly asks about repetition or says this is happening again.
4. When pain, shame, grief, fear, anger, betrayal, loneliness or confusion is present, choose responseMode=hold first. Spend the first 2–3 sentences staying with the current experience. On TURN 1 set memoryReferences=[] unless the user explicitly asks for history.
5. Holding is not canned empathy. Name the concrete scene, the inner tension, and the human stake. Avoid “听起来你…” and empty reassurance.
6. If history is used later, it may occupy at most one third of the reply and must serve the present choice. Never let archive review replace emotional contact.
7. Before asking a question, give the user one sentence that makes them feel accurately seen now.

A life loop is structural, not a topic: trigger → interpretation → protected need → impulse → choice → action → outcome → deeper wish. Leave unsupported parts empty. Never manufacture depth.

Select one responseMode: quiet for ordinary life; hold when the present needs company first; contradiction when two parts pull apart; echo for one dated possible relation; loop only for two or more dated structurally similar records; change when history shows a genuinely different response now.

Memory discipline:
- Exact dates and verbatim quotes only.
- One record is an echo, never a pattern.
- The same person, feeling or keyword is not a loop.
- Look for change as carefully as repetition.
- Strength comes from evidence of what the user noticed, endured or chose—not generic praise.
- No diagnosis, fixed personality, fate, energy certainty, past lives, or emotional causes for physical symptoms.
- The user may reject every inference.

Record fields are internal memory, not a questionnaire: ${FIELDS.join(", ")}. Infer only relevant fields, ask at most one useful question, and never repeat a skipped field.

Use symbolic, Socratic, relational and choice-based reasoning silently as one mind. Do not name teachers. No headings, lectures, lists, slogans, canned empathy or forced profundity.

${phase === "finalize"
  ? "The user is finishing. Write finalReflection as 3–5 short natural paragraphs. Begin with the present moment and emotional truth. Only then use dated evidence if it genuinely adds something. Show what repeats and what differs, return agency through a present choice, and end with one memorable sentence. Ask no question."
  : "Write 3–6 natural sentences. Order: present scene → emotional truth/human stake → optional inference → optional history only after contact → present agency. Ask zero or one question."}
${danger ? "SAFETY: stop symbolic and loop interpretation; be direct, grounded and prioritize immediate human support. responseMode=hold, action=comfort." : ""}
${retry ? "RETRY: the previous answer was generic, history-led or unsupported. Rewrite present-first and return valid JSON only." : ""}

Return JSON only:
{"reply":"","observation":"","question":"","questionField":"","fieldPatch":{},"coveredFields":[],"readyToSave":false,"action":"gentle-question","responseMode":"quiet","patternStatus":"none","memoryReferences":[],"loopCandidate":{"trigger":"","interpretation":"","protectedNeed":"","impulse":"","choice":"","action":"","outcome":"","deeperWant":""},"choicePoint":"","changeEvidence":"","finalReflection":"","safetyMode":false}`;
}

function userPrompt(body: Record<string, unknown>, history: History[], phase: "record" | "finalize") {
  const draft = cleanDraft(body.draft);
  const turn = Math.max(1, Math.min(8, Number(body.turn) || 1));
  const historyPermission = phase === "finalize" || turn > 1 ? "available-after-present-contact" : "background-only-unless-user-explicitly-asks";
  return `PHASE: ${phase}\nTURN: ${turn}\nHISTORY_PERMISSION: ${historyPermission}\nSKIPPED: ${Boolean(body.skipped)}\nCURRENT QUESTION: ${text(body.currentQuestion, 500)}\nASKED FIELDS: ${Array.isArray(body.askedFields) ? body.askedFields.filter(isField).join(",") : "none"}\n\nNEWEST WORDS:\n${text(body.message, 6000) || "No new words; integrate the completed record."}\n\nDRAFT:\n${FIELDS.map((field) => `${field}: ${draft[field] || ""}`).join("\n")}\n\nPREVIOUS STATE:\n${text(body.previousReply, 1600)}\n${text(body.previousObservation, 1000)}\nChoice: ${text(body.previousChoicePoint, 800)}\nChange: ${text(body.previousChangeEvidence, 800)}\n\nDATED HISTORY — evidence only, never the opening:\n${history.length ? history.map((item) => `[${item.date}]\n${FIELDS.map((field) => `${field}: ${item[field]}`).join("\n")}`).join("\n---\n") : "No prior records."}`;
}

function validateReferences(value: unknown, history: History[]): MemoryRef[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).flatMap((raw) => {
    const date = text(raw?.date, 20);
    const quote = text(raw?.quote, 220);
    const relation = text(raw?.relation, 320);
    const source = history.find((item) => item.date === date);
    return source && quote && historyText(source).includes(norm(quote)) ? [{ date, quote, relation }] : [];
  });
}

function parseInsight(raw: string, history: History[], phase: "record" | "finalize", danger: boolean, turn: number) {
  let parsed: any;
  try { parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); } catch { return null; }

  let memoryReferences = validateReferences(parsed.memoryReferences, history);
  let responseMode: Mode = MODES.includes(parsed.responseMode) ? parsed.responseMode : "quiet";
  if (phase === "record" && turn === 1 && responseMode === "hold") memoryReferences = [];
  const distinctDates = new Set(memoryReferences.map((item) => item.date)).size;
  const patternStatus = distinctDates >= 2 ? "pattern" : distinctDates === 1 ? "echo" : "none";
  if (responseMode === "loop" && distinctDates < 2) responseMode = distinctDates === 1 ? "echo" : "quiet";
  if (responseMode === "echo" && distinctDates < 1) responseMode = "quiet";
  const changeEvidence = text(parsed.changeEvidence, 800);
  if (responseMode === "change" && !changeEvidence) responseMode = patternStatus === "pattern" ? "loop" : patternStatus === "echo" ? "echo" : "quiet";
  if (danger) responseMode = "hold";

  const finalReflection = text(parsed.finalReflection, 4000);
  const reply = text(parsed.reply, 2400) || finalReflection;
  if (!(phase === "finalize" ? finalReflection || reply : reply)) return null;
  const action: Action = danger
    ? "comfort"
    : responseMode === "change"
      ? "quiet-celebrate"
      : ACTIONS.includes(parsed.action)
        ? parsed.action
        : parsed.question
          ? "gentle-question"
          : "save-complete";

  return {
    reply: reply || finalReflection,
    observation: text(parsed.observation, 1200),
    question: phase === "finalize" ? "" : text(parsed.question, 500),
    questionField: phase === "finalize" ? "" : isField(parsed.questionField) ? parsed.questionField : "",
    fieldPatch: cleanDraft(parsed.fieldPatch),
    coveredFields: Array.isArray(parsed.coveredFields) ? parsed.coveredFields.filter(isField) : [],
    readyToSave: phase === "finalize" ? true : Boolean(parsed.readyToSave),
    action,
    responseMode,
    patternStatus,
    memoryReferences,
    loopCandidate: cleanLoop(parsed.loopCandidate),
    choicePoint: text(parsed.choicePoint, 800),
    changeEvidence,
    finalReflection: finalReflection || (phase === "finalize" ? reply : ""),
    safetyMode: danger,
  };
}

async function generateInsight(body: Record<string, unknown>, phase: "record" | "finalize") {
  const history = cleanHistory(body.history);
  const draft = cleanDraft(body.draft);
  const message = text(body.message, 6000);
  if (phase === "record" && !message && !body.skipped) throw new Error("Missing message");
  if (phase === "finalize" && !message && !Object.values(draft).some(Boolean)) throw new Error("Missing record");

  const companion: Companion = body.companion === "thunder" ? "thunder" : "phoenix";
  const language = body.language === "en" ? "en" : "zh";
  const danger = CRISIS.test([message, ...Object.values(draft)].join("\n"));
  const turn = Math.max(1, Math.min(8, Number(body.turn) || 1));

  for (const retry of [false, true]) {
    const result = await callMiMo({
      model: "mimo-v2.5-pro",
      messages: [
        { role: "system", content: systemPrompt(companion, text(body.companionName, 40), language, phase, danger, retry) },
        { role: "user", content: userPrompt(body, history, phase) },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: phase === "finalize" ? 1900 : 1500,
      temperature: retry ? 0.5 : phase === "finalize" ? 0.76 : 0.7,
      frequency_penalty: 0.18,
      stream: false,
      thinking: { type: "disabled" },
    });
    const parsed = parseInsight(text(result.data?.choices?.[0]?.message?.content, 20_000), history, phase, danger, turn);
    if (parsed) return { ...parsed, model: result.model, providerRegion: result.region };
  }
  throw new Error("Invalid InsightLoop response");
}

function audioMime(dataUrl: string) {
  return dataUrl.match(/^data:([^;,]+);base64,/)?.[1]?.toLowerCase() || "";
}

async function transcribeAudio(body: Record<string, unknown>) {
  const original = text(body.audioDataUrl, 10_000_000);
  if (!original.startsWith("data:audio/") || !original.includes(";base64,")) throw new Error("Invalid audio data URL");
  const mime = audioMime(original);

  if (["audio/wav", "audio/mpeg", "audio/mp3"].includes(mime)) {
    const result = await callMiMo({
      model: "mimo-v2.5-asr",
      messages: [{ role: "user", content: [{ type: "input_audio", input_audio: { data: original } }] }],
      asr_options: { language: "auto" },
      stream: false,
    });
    const transcript = text(result.data?.choices?.[0]?.message?.content, 6000);
    if (!transcript) throw new Error("Empty ASR transcript");
    return { transcript, model: result.model, providerRegion: result.region, inputMime: mime };
  }

  const candidates = mime === "audio/mp4"
    ? [original, original.replace(/^data:audio\/mp4;/, "data:audio/m4a;")]
    : [original];
  const failures: string[] = [];

  for (const audio of candidates) {
    try {
      const result = await callMiMo({
        model: "mimo-v2.5",
        messages: [
          { role: "system", content: "Transcribe the user's audio faithfully. Output only the spoken words, preserving the original language. Do not summarize, explain, translate, or add labels." },
          {
            role: "user",
            content: [
              { type: "input_audio", input_audio: { data: audio } },
              { type: "text", text: "请逐字转写这段语音，只输出说出的内容。" },
            ],
          },
        ],
        max_completion_tokens: 1200,
        temperature: 0.1,
        stream: false,
        thinking: { type: "disabled" },
      });
      const transcript = text(result.data?.choices?.[0]?.message?.content, 6000);
      if (transcript) return { transcript, model: result.model, providerRegion: result.region, inputMime: mime };
      failures.push("empty multimodal transcript");
    } catch (error) {
      failures.push(text(error instanceof Error ? error.message : String(error), 500));
    }
  }
  throw new Error(`Unsupported recorder audio ${mime || "unknown"}: ${failures.join(" | ")}`);
}

async function speak(body: Record<string, unknown>) {
  const words = text(body.text, 1600);
  const companion: Companion = body.companion === "thunder" ? "thunder" : "phoenix";
  if (!words) throw new Error("Missing speech text");
  const style = companion === "phoenix"
    ? "Warm, intimate and emotionally alive. Natural pace, gentle strength, never theatrical, childish or like a presenter."
    : "Calm, perceptive and reassuring. Slightly lower, understated warmth, natural pauses, never robotic or stern.";
  const result = await callMiMo({
    model: "mimo-v2.5-tts",
    messages: [{ role: "user", content: style }, { role: "assistant", content: words }],
    audio: { format: "wav", voice: "mimo_default" },
    stream: false,
  });
  const audioData = text(result.data?.choices?.[0]?.message?.audio?.data, 15_000_000);
  if (!audioData) throw new Error("No speech audio returned");
  return { audioData, mimeType: "audio/wav", model: result.model, providerRegion: result.region };
}

Deno.serve(async (request) => {
  const headers = cors(request.headers.get("origin"));
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return Response.json({ error: "Method Not Allowed" }, { status: 405, headers });

  try {
    const body = await request.json() as Record<string, unknown>;
    const mode = body.mode;
    const data = mode === "reply"
      ? await generateInsight(body, "record")
      : mode === "finalize"
        ? await generateInsight(body, "finalize")
        : mode === "transcribe"
          ? await transcribeAudio(body)
          : mode === "speak"
            ? await speak(body)
            : null;
    if (!data) return Response.json({ error: "Unsupported mode" }, { status: 400, headers });
    return Response.json(data, { status: 200, headers });
  } catch (error) {
    const detail = text(error instanceof Error ? error.message : String(error), 1600);
    console.error("[mimo-companion] request failed", { detail });
    return Response.json({ error: "MiMo request failed", detail }, { status: 502, headers });
  }
});
