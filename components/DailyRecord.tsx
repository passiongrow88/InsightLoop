import React, { useEffect, useMemo, useState } from "react";
import { Check, Mic, Send, Sparkles } from "lucide-react";
import { CompanionId, JournalEntry } from "../types";
import { CompanionAction, CompanionMedia } from "./CompanionMedia";

type MascotAction = Extract<CompanionAction, "idle-breathe" | "welcome" | "listening" | "writing" | "save-complete">;

interface DailyRecordProps {
  onAddEntry: (entry: JournalEntry) => Promise<void> | void;
  companion: CompanionId;
  companionName: string;
}

const ACTION_LABEL: Record<MascotAction, string> = {
  "idle-breathe": "安静守候",
  welcome: "看见你了",
  listening: "认真倾听",
  writing: "收好这一刻",
  "save-complete": "已经保存",
};

/**
 * Mascot media contract:
 * public/mascots/{phoenix|thunder}/{action}.webm
 * Each file must be a transparent WebM (VP9 + alpha), not the original green-screen export.
 */
function MascotStage({ action, companion, companionName }: { action: MascotAction; companion: CompanionId; companionName: string }) {
  return (
    <div className="relative mx-auto flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56" aria-label={`${companionName}${ACTION_LABEL[action]}`}>
      <div className={`absolute inset-5 rounded-full blur-2xl ${companion === "phoenix" ? "bg-orange-100/75" : "bg-indigo-100/75"}`} />
      <CompanionMedia companion={companion} action={action} loop={action === "idle-breathe" || action === "listening"} className="relative h-full w-full" label={`${companionName}${ACTION_LABEL[action]}`} />
    </div>
  );
}

export default function DailyRecord({ onAddEntry, companion, companionName }: DailyRecordProps) {
  const [content, setContent] = useState("");
  const [action, setAction] = useState<MascotAction>("welcome");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setAction("idle-breathe"), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  const prompt = useMemo(
    () => saved
      ? "我已经先替你收好了。之后想聊，我们再慢慢聊。"
      : "今天有什么有趣的故事，还是奇特的梦想要记入的吗？值得珍惜的小事、想说的谢谢或抱歉，也可以。",
    [saved]
  );

  const save = async () => {
    const text = content.trim();
    if (!text || isSaving) return;

    setIsSaving(true);
    setAction("writing");
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    try {
      await onAddEntry({
        id: String(now.getTime()),
        createdAt: now.getTime(),
        date,
        event: text,
        reflection: "",
        gratitude: "",
        selfTalk: "",
      });
      setContent("");
      setSaved(true);
      setAction("save-complete");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-xl flex-col items-center justify-center px-1 pb-12 text-center">
      <MascotStage action={action} companion={companion} companionName={companionName} />
      <div className="mt-1 max-w-md">
        <p className="font-serif text-xl leading-8 text-stone-700 sm:text-2xl sm:leading-9">{prompt}</p>
      </div>

      <div className="mt-8 w-full rounded-3xl border border-orange-100 bg-white p-3 text-left shadow-[0_12px_48px_rgba(129,90,38,0.08)]">
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            if (!saved) setAction("listening");
          }}
          onFocus={() => !saved && setAction("listening")}
          placeholder="从任何一个瞬间开始写就好…"
          aria-label="今日记录"
          rows={5}
          className="w-full resize-none bg-transparent px-3 py-2 text-base leading-7 text-stone-700 outline-none placeholder:text-stone-300"
        />
        <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-1 pt-3">
          <button
            type="button"
            onClick={() => setVoiceNotice(true)}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-50 hover:text-stone-700"
          >
            <Mic size={16} />
            语音
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!content.trim() || isSaving}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200"
          >
            {isSaving ? <Sparkles size={16} className="animate-pulse" /> : saved ? <Check size={16} /> : <Send size={16} />}
            {isSaving ? "保存中" : saved ? "已收好" : "先保存"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { setContent(""); setSaved(true); setAction("idle-breathe"); }}
        className="mt-4 text-sm text-stone-400 transition hover:text-stone-600"
      >
        今天先跳过
      </button>

      {voiceNotice && (
        <p className="mt-3 rounded-full bg-stone-100 px-4 py-2 text-xs text-stone-500">
          语音转文字会在 MiMo 服务端接入后开放；现在不会假装正在录音。
        </p>
      )}
    </section>
  );
}
