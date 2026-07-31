import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { CompanionId, JournalEntry, Language } from "../types";
import {
  generateCompanionReply,
  synthesizeCompanionReply,
  transcribeCompanionAudio,
} from "../services/mimoService";
import { CompanionAction, CompanionMedia } from "./CompanionMedia";

type MascotAction = Extract<
  CompanionAction,
  | "idle-breathe"
  | "welcome"
  | "listening"
  | "voice-listening"
  | "writing"
  | "thinking"
  | "gentle-question"
  | "comfort"
  | "quiet-celebrate"
  | "save-complete"
>;

interface DailyRecordProps {
  onAddEntry: (entry: JournalEntry) => Promise<string>;
  onUpdateEntry: (entry: JournalEntry) => Promise<void>;
  companion: CompanionId;
  companionName: string;
  language: Language;
}

const ACTION_LABEL: Record<MascotAction, string> = {
  "idle-breathe": "安静守候",
  welcome: "看见你了",
  listening: "认真倾听",
  "voice-listening": "听你说",
  writing: "收好这一刻",
  thinking: "正在想你说的话",
  "gentle-question": "轻轻问一句",
  comfort: "陪在你身边",
  "quiet-celebrate": "替你开心",
  "save-complete": "已经保存",
};

/**
 * Mascot media contract:
 * public/mascots/{phoenix|thunder}/{action}.webp
 * Each file must be a transparent animated WebP, not the original green-screen export.
 */
function MascotStage({
  action,
  companion,
  companionName,
}: {
  action: MascotAction;
  companion: CompanionId;
  companionName: string;
}) {
  const loops =
    action === "idle-breathe" ||
    action === "listening" ||
    action === "voice-listening" ||
    action === "thinking";

  return (
    <div
      className="relative mx-auto flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56"
      aria-label={`${companionName}${ACTION_LABEL[action]}`}
    >
      <div
        className={`absolute inset-5 rounded-full blur-2xl ${
          companion === "phoenix" ? "bg-orange-100/75" : "bg-indigo-100/75"
        }`}
      />
      <CompanionMedia
        companion={companion}
        action={action}
        loop={loops}
        className="relative h-full w-full"
        label={`${companionName}${ACTION_LABEL[action]}`}
      />
    </div>
  );
}

export default function DailyRecord({
  onAddEntry,
  onUpdateEntry,
  companion,
  companionName,
  language,
}: DailyRecordProps) {
  const [content, setContent] = useState("");
  const [action, setAction] = useState<MascotAction>("welcome");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [petReply, setPetReply] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceInput, setVoiceInput] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const replyAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setAction("idle-breathe"), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(
    () => () => {
      if (recordingTimerRef.current) window.clearTimeout(recordingTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      replyAudioRef.current?.pause();
    },
    []
  );

  const prompt =
    petReply ||
    (language === "en"
      ? "What happened today? Tell me the part you do not want to lose."
      : "今天有什么有趣的故事，还是奇特的梦想要记入的吗？值得珍惜的小事、想说的谢谢或抱歉，也可以。");

  const playReply = async (text = petReply) => {
    if (!text || isSpeaking) return;
    setVoiceError("");
    setIsSpeaking(true);
    try {
      replyAudioRef.current?.pause();
      const source = await synthesizeCompanionReply({ text, companion });
      const audio = new Audio(source);
      replyAudioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => {
        setIsSpeaking(false);
        setVoiceError(language === "en" ? "Audio playback failed. Please try again." : "语音播放失败，请再试一次。");
      };
      await audio.play();
    } catch {
      setVoiceError(language === "en" ? "MiMo voice is temporarily unavailable." : "MiMo 语音暂时没有连上，请稍后再试。");
      setIsSpeaking(false);
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const startRecording = async () => {
    setVoiceError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError(language === "en" ? "This browser does not support audio recording." : "这个浏览器暂不支持录音。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        if (!blob.size) {
          setAction("idle-breathe");
          setVoiceError(language === "en" ? "No audio was captured." : "没有录到声音，请再试一次。");
          return;
        }

        setIsTranscribing(true);
        setAction("thinking");
        try {
          const result = await transcribeCompanionAudio(blob);
          setContent((previous) =>
            previous.trim() ? `${previous.trim()}\n${result.transcript}` : result.transcript
          );
          setSaved(false);
          setPetReply("");
          setVoiceInput(true);
          setAction("listening");
        } catch {
          setAction("idle-breathe");
          setVoiceError(language === "en" ? "MiMo could not transcribe that recording." : "MiMo 暂时没能识别这段录音，请再试一次。");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setAction("voice-listening");
      recordingTimerRef.current = window.setTimeout(stopRecording, 60_000);
    } catch {
      setVoiceError(language === "en" ? "Microphone permission was not granted." : "没有取得麦克风权限，请在浏览器里允许后重试。");
    }
  };

  const save = async () => {
    const text = content.trim();
    if (!text || isSaving || isTranscribing || isRecording) return;

    setIsSaving(true);
    setVoiceError("");
    setAction("thinking");
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;

    try {
      const entry: JournalEntry = {
        id: String(now.getTime()),
        createdAt: now.getTime(),
        date,
        event: text,
        reflection: "",
        gratitude: "",
        selfTalk: "",
      };

      await onAddEntry(entry);
      setContent("");
      setSaved(true);
      setAction("thinking");

      try {
        const result = await generateCompanionReply({
          message: text,
          companion,
          companionName,
          language,
        });
        const updatedEntry = { ...entry, aiResponse: result.reply };
        setPetReply(result.reply);
        setAction(result.action);

        try {
          await onUpdateEntry(updatedEntry);
        } catch {
          setVoiceError(
            language === "en"
              ? "The reply is visible, but it could not be added to the saved entry."
              : "回应已经显示，但暂时没能写回这条日记。"
          );
        }

        if (voiceInput) {
          void playReply(result.reply);
        }
      } catch {
        setAction("save-complete");
        setVoiceError(
          language === "en"
            ? "Your entry is saved. MiMo could not respond just now."
            : "这段记录已经保存，但 MiMo 暂时没有回应。"
        );
      }
      setVoiceInput(false);
    } catch {
      setAction("idle-breathe");
      setVoiceError(
        language === "en"
          ? "The entry could not be saved. Please check your connection and try again."
          : "这段记录没有保存成功，请检查网络后重试。"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-xl flex-col items-center justify-center px-1 pb-12 text-center">
      <MascotStage action={action} companion={companion} companionName={companionName} />
      <div className="mt-1 max-w-md">
        <p className="font-serif text-xl leading-8 text-stone-700 sm:text-2xl sm:leading-9">{prompt}</p>
        {petReply && (
          <button
            type="button"
            onClick={() => void playReply()}
            disabled={isSpeaking}
            className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-200 disabled:opacity-60"
          >
            {isSpeaking ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} />}
            {language === "en" ? (isSpeaking ? "Playing…" : "Play reply") : isSpeaking ? "播放中…" : "播放回应"}
          </button>
        )}
      </div>

      <div className="mt-8 w-full rounded-3xl border border-orange-100 bg-white p-3 text-left shadow-[0_12px_48px_rgba(129,90,38,0.08)]">
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            if (saved) {
              setSaved(false);
              setPetReply("");
            }
            setVoiceInput(false);
            setAction("listening");
          }}
          onFocus={() => !saved && setAction("listening")}
          placeholder={language === "en" ? "Start with any moment…" : "从任何一个瞬间开始写就好…"}
          aria-label={language === "en" ? "Today’s entry" : "今日记录"}
          rows={5}
          className="w-full resize-none bg-transparent px-3 py-2 text-base leading-7 text-stone-700 outline-none placeholder:text-stone-300"
        />
        <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-1 pt-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing || isSaving}
            aria-pressed={isRecording}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition disabled:opacity-50 ${
              isRecording
                ? "bg-rose-50 text-rose-600"
                : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
            }`}
          >
            {isTranscribing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isRecording ? (
              <Square size={15} fill="currentColor" />
            ) : (
              <Mic size={16} />
            )}
            {language === "en"
              ? isTranscribing
                ? "Transcribing…"
                : isRecording
                  ? "Stop"
                  : "Voice"
              : isTranscribing
                ? "识别中…"
                : isRecording
                  ? "停止录音"
                  : "语音"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!content.trim() || isSaving || isTranscribing || isRecording}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200"
          >
            {isSaving ? (
              <Sparkles size={16} className="animate-pulse" />
            ) : saved ? (
              <Check size={16} />
            ) : (
              <Send size={16} />
            )}
            {language === "en"
              ? isSaving
                ? "Thinking…"
                : saved
                  ? "Saved"
                  : "Save"
              : isSaving
                ? "回应中"
                : saved
                  ? "已收好"
                  : "先保存"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setContent("");
          setSaved(true);
          setPetReply("");
          setAction("idle-breathe");
        }}
        className="mt-4 text-sm text-stone-400 transition hover:text-stone-600"
      >
        {language === "en" ? "Skip today" : "今天先跳过"}
      </button>

      {voiceError && (
        <p role="alert" className="mt-3 rounded-2xl bg-stone-100 px-4 py-2 text-xs text-stone-600">
          {voiceError}
        </p>
      )}
    </section>
  );
}
