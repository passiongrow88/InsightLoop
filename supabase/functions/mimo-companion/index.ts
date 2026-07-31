import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";

type Companion = "phoenix" | "thunder";
type Field = "event" | "reflection" | "gratitude" | "selfTalk" | "angelNumbers" | "dreams" | "loveTarget" | "apologyTarget" | "additionalNotes";
type Mode = "quiet" | "hold" | "contradiction" | "echo" | "loop" | "change";
type Action = "gentle-question" | "comfort" | "quiet-celebrate" | "save-complete";
type History = Record<Field, string> & { date: string };
type Ref = { date: string; quote: string; relation: string };
type Loop = { trigger: string; interpretation: string; protectedNeed: string; impulse: string; choice: string; action: string; outcome: string; deeperWant: string };

const fields: Field[] = ["event", "reflection", "gratitude", "selfTalk", "angelNumbers", "dreams", "loveTarget", "apologyTarget", "additionalNotes"];
const actions: Action[] = ["gentle-question", "comfort", "quiet-celebrate", "save-complete"];
const modes: Mode[] = ["quiet", "hold", "contradiction", "echo", "loop", "change"];
const tokenBases = [Deno.env.get("MIMO_TOKEN_PLAN_BASE_URL")?.trim(), "https://token-plan-sgp.xiaomimimo.com/v1", "https://token-plan-ams.xiaomimimo.com/v1", "https://token-plan-cn.xiaomimimo.com/v1"].filter((x, i, a): x is string => Boolean(x) && a.indexOf(x) === i);
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const crisis = new RegExp(["suic" + "ide", "kill my" + "self", "end my life", "self[- ]?harm", "hurt my" + "self", "\\u81ea\\u6740", "\\u4e0d\\u60f3\\u6d3b", "\\u7ed3\\u675f\\u751f\\u547d", "\\u4f24\\u5bb3\\u81ea\\u5df1"].join("|"), "i");

const text = (v: unknown, n = 1600) => typeof v === "string" ? v.trim().slice(0, n) : "";
const norm = (v: string) => v.toLowerCase().replace(/[\s，。！？、,.!?;；:：'“”‘’"()（）\[\]【】]/g, "");
const isField = (v: unknown): v is Field => fields.includes(v as Field);
const blankLoop = (): Loop => ({ trigger: "", interpretation: "", protectedNeed: "", impulse: "", choice: "", action: "", outcome: "", deeperWant: "" });
const cleanLoop = (v: any): Loop => v && typeof v === "object" ? Object.fromEntries(Object.keys(blankLoop()).map(k => [k, text(v[k], 500)])) as Loop : blankLoop();
const cleanDraft = (v: any) => Object.fromEntries(fields.map(f => [f, text(v?.[f], 2400)]).filter(([, v]) => v)) as Partial<Record<Field, string>>;
const cleanHistory = (v: any): History[] => Array.isArray(v) ? v.slice(0, 30).map(x => ({ date: text(x?.date, 20), ...Object.fromEntries(fields.map(f => [f, text(x?.[f], 2400)])) } as History)).filter(x => x.date && fields.some(f => x[f])) : [];
const historyText = (h: History) => norm(fields.map(f => h[f]).join("\n"));

function headers(origin: string | null) {
  const ok = origin === "https://insightloop.lol" || origin === "https://www.insightloop.lol" || origin === "http://localhost:5173" || (Boolean(origin?.endsWith(".vercel.app")) || origin === "https://raw.githack.com" || origin === "https://rawcdn.githack.com");
  return { "Access-Control-Allow-Origin": ok && origin ? origin : "https://insightloop.lol", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
}

async function key() {
  const env = Deno.env.get("MIMO_API_KEY")?.trim();
  if (env) return env;
  const rows = await sql<{ decrypted_secret: string }[]>`select decrypted_secret from vault.decrypted_secrets where name = 'insightloop_mimo_test_key' limit 1`;
  if (!rows[0]?.decrypted_secret) throw new Error("Missing MiMo key");
  return rows[0].decrypted_secret.trim();
}

async function mimo(payload: Record<string, unknown>) {
  const k = await key();
  const bases = k.startsWith("tp-") ? tokenBases : ["https://api.xiaomimimo.com/v1"];
  const failures: string[] = [];
  for (const base of bases) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const r = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, { method: "POST", headers: { "api-key": k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
      clearTimeout(timer);
      const raw = await r.text();
      let data: any;
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
      if (r.ok) return { data, model: data?.model || payload.model, region: new URL(base).hostname };
      failures.push(`${new URL(base).hostname}: ${text(data?.error?.message || data?.message || `HTTP ${r.status}`, 300)}`);
      if (!k.startsWith("tp-") || ![401, 403].includes(r.status)) break;
    } catch (e) { failures.push(`${new URL(base).hostname}: ${text(e instanceof Error ? e.message : String(e), 300)}`); }
  }
  throw new Error(failures.join(" | "));
}

function persona(c: Companion, name: string) {
  const n = name || (c === "phoenix" ? "凤凰" : "小雷公");
  return c === "phoenix"
    ? `You are ${n}, a Phoenix and long-term witness. Your warmth is intimate and quietly strong. You remember survival, change and choice. Never use sugary reassurance.`
    : `You are ${n}, a small Thunder Dragon and long-term witness. You protect facts, boundaries and choice with humane calm. Never sound like a productivity coach.`;
}

function system(c: Companion, name: string, lang: string, phase: "record" | "finalize", danger: boolean, retry: boolean) {
  return `${persona(c, name)}
You are the living brain of InsightLoop, not a generic diary, therapist, mood tracker or quote generator. ${lang === "en" ? "Write natural English." : "Write natural Chinese matching the user."}

SOUL: accompany a person through time so they can see how they reach similar crossroads, what they protect, what they choose, what follows, and how this time differs. Healing comes from being truthfully seen; never manufacture comfort. Never tell the user who they are.

A life loop is structural, not a topic: trigger → interpretation → protected need → impulse → choice → action → outcome → deeper wish. Leave unsupported parts empty.

Select one responseMode: quiet for ordinary life; hold when pain needs company first; contradiction when two parts pull apart; echo for one dated possible relation; loop only for two or more dated structurally similar records; change when history shows a different response now.

Memory rules: exact dates and verbatim quotes only. One record is never a pattern. The same person, feeling or keyword is not a loop. Look for change as carefully as repetition. Strength must come from evidence of what the user noticed or chose, not praise. No diagnosis, fixed personality, fate, energy certainty, past lives, or emotional causes for physical symptoms. The user may reject every inference.

Record fields are internal memory, not a questionnaire: ${fields.join(", ")}. Infer only relevant fields, ask at most one useful question, never repeat a skipped field.

Use symbolic, Socratic, relational and choice-based reasoning silently as one mind. Do not name teachers. Begin from a concrete detail. No headings, lectures, lists, slogans, canned empathy, or forced depth.

${phase === "finalize" ? "The user is finishing. Write finalReflection as 3–5 short natural paragraphs: concrete moment, central tension, real dated evidence only if useful, what repeats and what differs, present agency, one memorable final sentence. Ask no question. Stay brief for ordinary life." : "Write 3–6 natural sentences: concrete detail → what may matter → real evidence or difference → present agency. Ask zero or one question."}
${danger ? "SAFETY: stop symbolic and loop interpretation; be direct, grounded and prioritize immediate human support. responseMode=hold, action=comfort." : ""}
${retry ? "RETRY: previous output was generic or unsupported. Be specific and return valid JSON only." : ""}

Return JSON only:
{"reply":"","observation":"","question":"","questionField":"","fieldPatch":{},"coveredFields":[],"readyToSave":false,"action":"gentle-question","responseMode":"quiet","patternStatus":"none","memoryReferences":[],"loopCandidate":{"trigger":"","interpretation":"","protectedNeed":"","impulse":"","choice":"","action":"","outcome":"","deeperWant":""},"choicePoint":"","changeEvidence":"","finalReflection":"","safetyMode":false}`;
}

function userPrompt(b: any, history: History[], phase: string) {
  const draft = cleanDraft(b.draft);
  return `PHASE: ${phase}\nTURN: ${Number(b.turn) || 1}\nSKIPPED: ${Boolean(b.skipped)}\nCURRENT QUESTION: ${text(b.currentQuestion, 500)}\nASKED FIELDS: ${Array.isArray(b.askedFields) ? b.askedFields.filter(isField).join(",") : "none"}\n\nNEWEST WORDS:\n${text(b.message, 6000) || "No new words; integrate the completed record."}\n\nDRAFT:\n${fields.map(f => `${f}: ${draft[f] || ""}`).join("\n")}\n\nPREVIOUS STATE:\n${text(b.previousReply, 1600)}\n${text(b.previousObservation, 1000)}\nChoice: ${text(b.previousChoicePoint, 800)}\nChange: ${text(b.previousChangeEvidence, 800)}\n\nDATED HISTORY:\n${history.length ? history.map(h => `[${h.date}]\n${fields.map(f => `${f}: ${h[f]}`).join("\n")}`).join("\n---\n") : "No prior records."}`;
}

function refs(v: any, history: History[]): Ref[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 4).flatMap(x => {
    const date = text(x?.date, 20), quote = text(x?.quote, 220), relation = text(x?.relation, 320);
    const h = history.find(i => i.date === date);
    return h && quote && historyText(h).includes(norm(quote)) ? [{ date, quote, relation }] : [];
  });
}

function parse(raw: string, history: History[], phase: "record" | "finalize", danger: boolean) {
  let p: any;
  try { p = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); } catch { return null; }
  const memoryReferences = refs(p.memoryReferences, history);
  const dates = new Set(memoryReferences.map(x => x.date)).size;
  const patternStatus = dates >= 2 ? "pattern" : dates === 1 ? "echo" : "none";
  let responseMode: Mode = modes.includes(p.responseMode) ? p.responseMode : patternStatus === "pattern" ? "loop" : patternStatus === "echo" ? "echo" : "quiet";
  if (responseMode === "loop" && dates < 2) responseMode = dates === 1 ? "echo" : "quiet";
  if (responseMode === "echo" && !dates) responseMode = "quiet";
  const changeEvidence = text(p.changeEvidence, 800);
  if (responseMode === "change" && !changeEvidence) responseMode = patternStatus === "pattern" ? "loop" : patternStatus === "echo" ? "echo" : "quiet";
  if (danger) responseMode = "hold";
  const finalReflection = text(p.finalReflection, 4000), reply = text(p.reply, 2000) || finalReflection;
  if (!(phase === "finalize" ? finalReflection || reply : reply)) return null;
  return {
    reply: reply || finalReflection,
    observation: text(p.observation, 1200),
    question: phase === "finalize" ? "" : text(p.question, 500),
    questionField: phase === "finalize" ? "" : isField(p.questionField) ? p.questionField : "",
    fieldPatch: cleanDraft(p.fieldPatch),
    coveredFields: Array.isArray(p.coveredFields) ? p.coveredFields.filter(isField) : [],
    readyToSave: phase === "finalize" ? true : Boolean(p.readyToSave),
    action: danger ? "comfort" : responseMode === "change" ? "quiet-celebrate" : actions.includes(p.action) ? p.action : p.question ? "gentle-question" : "save-complete",
    responseMode,
    patternStatus,
    memoryReferences,
    loopCandidate: cleanLoop(p.loopCandidate),
    choicePoint: text(p.choicePoint, 800),
    changeEvidence,
    finalReflection: finalReflection || (phase === "finalize" ? reply : ""),
    safetyMode: danger,
  };
}

async function insight(b: any, phase: "record" | "finalize") {
  const history = cleanHistory(b.history), draft = cleanDraft(b.draft), message = text(b.message, 6000);
  if (phase === "record" && !message && !b.skipped) throw new Error("Missing message");
  if (phase === "finalize" && !message && !Object.values(draft).some(Boolean)) throw new Error("Missing record");
  const companion: Companion = b.companion === "thunder" ? "thunder" : "phoenix";
  const danger = crisis.test([message, ...Object.values(draft)].join("\n"));
  for (const retry of [false, true]) {
    const r = await mimo({ model: "mimo-v2.5-pro", messages: [{ role: "system", content: system(companion, text(b.companionName, 40), b.language === "en" ? "en" : "zh", phase, danger, retry) }, { role: "user", content: userPrompt(b, history, phase) }], response_format: { type: "json_object" }, max_completion_tokens: phase === "finalize" ? 1800 : 1400, temperature: retry ? 0.48 : phase === "finalize" ? 0.76 : 0.7, frequency_penalty: 0.18, stream: false, thinking: { type: "disabled" } });
    const parsed = parse(text(r.data?.choices?.[0]?.message?.content, 18000), history, phase, danger);
    if (parsed) return { ...parsed, model: r.model, providerRegion: r.region };
  }
  throw new Error("Invalid InsightLoop response");
}

async function transcribe(b: any) {
  const audio = text(b.audioDataUrl, 7000000);
  if (!audio.startsWith("data:audio/") || !audio.includes(";base64,")) throw new Error("Invalid audio");
  const r = await mimo({ model: "mimo-v2.5-asr", messages: [{ role: "user", content: [{ type: "input_audio", input_audio: { data: audio } }] }], asr_options: { language: "auto" }, stream: false });
  const transcript = text(r.data?.choices?.[0]?.message?.content, 6000);
  if (!transcript) throw new Error("Empty transcript");
  return { transcript, model: r.model };
}

async function speak(b: any) {
  const words = text(b.text, 1600), c: Companion = b.companion === "thunder" ? "thunder" : "phoenix";
  if (!words) throw new Error("Missing text");
  const style = c === "phoenix" ? "Warm, intimate and quietly strong; natural pauses; never theatrical or sugary." : "Calm, grounded and quietly protective; humane, perceptive, never robotic or stern.";
  const r = await mimo({ model: "mimo-v2.5-tts", messages: [{ role: "user", content: style }, { role: "assistant", content: words }], audio: { format: "wav", voice: "mimo_default" }, stream: false });
  const data = text(r.data?.choices?.[0]?.message?.audio?.data, 12000000);
  if (!data) throw new Error("No speech audio");
  return { audioData: data, mimeType: "audio/wav", model: r.model };
}

Deno.serve(async req => {
  const h = headers(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return Response.json({ error: "Method Not Allowed" }, { status: 405, headers: h });
  try {
    const b = await req.json();
    const data = b.mode === "reply" ? await insight(b, "record") : b.mode === "finalize" ? await insight(b, "finalize") : b.mode === "transcribe" ? await transcribe(b) : b.mode === "speak" ? await speak(b) : null;
    return data ? Response.json(data, { headers: h }) : Response.json({ error: "Unsupported mode" }, { status: 400, headers: h });
  } catch (e) {
    const detail = text(e instanceof Error ? e.message : String(e), 1200);
    console.error("[mimo-companion]", detail);
    return Response.json({ error: "MiMo request failed", detail }, { status: 502, headers: h });
  }
});