import { supabase } from "./supabaseClient";
import type { CompanionId, Language } from "../types";

export type CompanionReplyAction =
  | "gentle-question"
  | "comfort"
  | "quiet-celebrate"
  | "save-complete";

export type CompanionReply = {
  reply: string;
  action: CompanionReplyAction;
  safetyMode: boolean;
  model: string;
};

async function authToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again before using the companion.");
  return token;
}

async function callMiMo<T>(body: Record<string, unknown>): Promise<T> {
  const token = await authToken();
  const { data, error } = await supabase.functions.invoke("mimo-companion", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    throw new Error(error.message || "MiMo is temporarily unavailable.");
  }
  return data as T;
}

export async function generateCompanionReply(input: {
  message: string;
  companion: CompanionId;
  companionName: string;
  language: Language;
}) {
  return callMiMo<CompanionReply>({
    mode: "reply",
    ...input,
  });
}

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read audio."));
    reader.readAsDataURL(blob);
  });
}

export async function transcribeCompanionAudio(blob: Blob) {
  const audioDataUrl = await blobAsDataUrl(blob);
  return callMiMo<{ transcript: string; model: string }>({
    mode: "transcribe",
    audioDataUrl,
  });
}

export async function synthesizeCompanionReply(input: {
  text: string;
  companion: CompanionId;
}) {
  const result = await callMiMo<{ audioData: string; mimeType: string; model: string }>({
    mode: "speak",
    ...input,
  });
  return `data:${result.mimeType};base64,${result.audioData}`;
}
