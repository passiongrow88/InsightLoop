import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  Mic,
  Save,
  Send,
  SkipForward,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { CompanionId, JournalEntry, Language } from "../types";
import {
  CompanionHistoryItem,
  CompanionResponseMode,
  DailyDraft,
  DailyField,
  generateCompanionReply,
  generateFinalInsight,
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
  | "browse-archive"
  | "memory-found"
  | "pattern-found"
  | "comfort"
  | "quiet-celebrate"
  | "save-complete"
>;

interface DailyRecordProps {
  onAddEntry: (entry: JournalEntry) => Promise<string>;
  onUpdateEntry: (entry: JournalEntry) => Promise<void>;
  entries: JournalEntry[];
  companion: CompanionId;
  companionName: string;
  language: Language;
}

const EMPTY_DRAFT: DailyDraft = {
  event: "",
  reflection: "",
  gratitude: "",
  selfTalk: "",
  angelNumbers: "",
  dreams: "",
  loveTarget: "",
  apologyTarget: "",
  additionalNotes: "",
};

const FIELD_LABEL_ZH: Record<DailyField, string> = {
  event: "今天发生的事",
  reflection: "反思与觉察",
  gratitude: "感恩与美好",
  selfTalk: "想对自己说的话",
  angelNumbers: "重复数字",
  dreams: "梦境",
  loveTarget: "想说的谢谢",
  apologyTarget: "想说的对不起",
  additionalNotes: "补充记录",
};

const FIELD_LABEL_EN: Record<DailyField, string> = {
  event: "What happened",
  reflection: "Reflection",
  gratitude: "Gratitude",
  selfTalk: "Words to yourself",
  angelNumbers: "Repeating numbers",
  dreams: "Dreams",
  loveTarget: "Someone to thank",
  apologyTarget: "Someone to apologise to",
  additionalNotes: "Additional notes",
};

const ACTION_LABEL: Record<MascotAction, string> = {
  "idle-breathe": "安静守候",
  welcome: "看见你了",
  listening: "认真倾听",
  "voice-listening": "听你说",
  writing: "整理并写下",
  thinking: "理解这段经历",
  "gentle-question": "轻轻问一句",
  "browse-archive": "翻阅真实旧记录",
  "memory-found": "看见一次可能的呼应",
  "pattern-found": "看见一个熟悉的路口",
  comfort: "先陪你停一下",
  "quiet-celebrate": "看见这次的不同",
  "save-complete": "这一刻已经收好",
};

function MascotStage({
  action,
  companion,
  companionName,
}: {
  action: MascotAction;
  companion: CompanionId;
  companionName: string;
}) {
  const loops = [
    "idle-breathe",
    "listening",
    "voice-listening",
    "thinking",
    "browse-archive",
  ].includes(action);

  return (
    <div
      className="relative mx-auto flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52"
      aria-label={`${companionName}${ACTION_LABEL[action]}`}
    >
      <div
        className={`absolute inset-5 rounded-full blur-2xl transition-all duration-700 ${
          companion === "phoenix" ? "bg-orange-100/80" : "bg-indigo-100/80"
        } ${action === "pattern-found" || action === "quiet-celebrate" ? "scale-110 opacity-100" : "opacity-75"}`}
      />
      <CompanionMedia
        companion={companion}
        action={action}
        loop={loops}
        className="relative h-full w-full"
        label={`${companionName}${ACTION_LABEL[action]}`}
      />
      <span className="absolute -bottom-1 rounded-full bg-white/90 px-3 py-1 text-[11px] text-stone-400 shadow-sm">
        {ACTION_LABEL[action]}
      </span>
    </div>
  );
}

function appendUnique(existing: string, incoming: string) {
  const next = incoming.trim();
  if (!next) return existing;
  if (!existing.trim()) return next;
  if (existing.includes(next) || next.includes(existing)) return next.length > existing.length ? next : existing;
  return `${existing.trim()}\n${next}`;
}

function mergeDraft(current: DailyDraft, patch: Partial<DailyDraft>) {
  const next = { ...current };
  (Object.keys(patch) as DailyField[]).forEach((field) => {
    next[field] = appendUnique(next[field], patch[field] || "");
  });
  return next;
}

function hasDraftContent(draft: DailyDraft) {
  return Object.values(draft).some((value) => value.trim());
}

function toHistory(entries: JournalEntry[]): CompanionHistoryItem[] {
  return [...entries]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 30)
    .map((entry) => ({
      date: entry.date,
      event: entry.event || "",
      reflection: entry.reflection || "",
      gratitude: entry.gratitude || "",
      selfTalk: entry.selfTalk || "",
      dreams: entry.dreams || "",
      angelNumbers: entry.angelNumbers || "",
      loveTarget: entry.loveTarget || "",
      apologyTarget: entry.apologyTarget || "",
      additionalNotes: entry.additionalNotes || "",
    }));
}

export default function DailyRecord({
  onAddEntry,
  onUpdateEntry: _onUpdateEntry,
  entries,
  companion,
  companionName,
  language,
}: DailyRecordProps) {
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<DailyDraft>({ ...EMPTY_DRAFT });
  const [action, setAction] = useState<MascotAction>("welcome");
  const [isWorking, setIsWorking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reply, setReply] = useState("");
  const [finalReflection, setFinalReflection] = useState("");
  const [observation, setObservation] = useState("");
  const [question, setQuestion] = useState("");
  const [questionField, setQuestionField] = useState<DailyField | "">("");
  const [askedFields, setAskedFields] = useState<DailyField[]>([]);
  const [coveredFields, setCoveredFields] = useState<DailyField[]>([]);
  const [turn, setTurn] = useState(0);
  const [lastUserWords, setLastUserWords] = useState("");
  const [responseMode, setResponseMode] = useState<CompanionResponseMode>("quiet");
  const [choicePoint, setChoicePoint] = useState("");
  const [changeEvidence, setChangeEvidence] = useState("");
  const [memoryReferences, setMemoryReferences] = useState<
    { date: string; quote: string; relation: string }[]
  >([]);
  const [readyToSave, setReadyToSave] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
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

  const history = useMemo(() => toHistory(entries), [entries]);
  const fieldLabels = language === "en" ? FIELD_LABEL_EN : FIELD_LABEL_ZH;
  const filledFields = (Object.keys(draft) as DailyField[]).filter((field) => draft[field].trim());
  const visibleReply = saved && finalReflection ? finalReflection : reply;

  useEffect(() => {
    const timer = window.setTimeout(() => setAction("idle-breathe"), 2200);
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

  const opening =
    language === "en"
      ? "What happened today? Start with the moment you most want to keep."
      : "今天发生了什么？从你最想留下的那个瞬间说起就好。";

  const playReply = async (text = [visibleReply, saved ? "" : question].filter(Boolean).join(" ")) => {
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
        setVoiceError(language === "en" ? "Voice playback failed." : "伙伴暂时没能播放声音。 ");
      };
      await audio.play();
    } catch {
      setVoiceError(language === "en" ? "Voice is temporarily unavailable." : "伙伴的声音暂时没有连上。 ");
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
      setVoiceError(language === "en" ? "This browser cannot record audio." : "这个浏览器暂不支持录音。 ");
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
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];

        if (!blob.size) {
          setAction("idle-breathe");
          setVoiceError(language === "en" ? "No audio was captured." : "没有录到声音，请再试一次。 ");
          return;
        }

        setIsTranscribing(true);
        setAction("thinking");
        try {
          const result = await transcribeCompanionAudio(blob);
          setInput((previous) => (previous.trim() ? `${previous.trim()}\n${result.transcript}` : result.transcript));
          setVoiceInput(true);
          setSaved(false);
          setAction("listening");
        } catch {
          setAction("idle-breathe");
          setVoiceError(language === "en" ? "I could not understand that recording." : "伙伴暂时没能听清，请再试一次。 ");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setAction("voice-listening");
      recordingTimerRef.current = window.setTimeout(stopRecording, 60_000);
    } catch {
      setVoiceError(language === "en" ? "Microphone permission was not granted." : "没有取得麦克风权限。 ");
    }
  };

  const applyBrainResult = (
    result: Awaited<ReturnType<typeof generateCompanionReply>>,
    newestWords: string,
    fallbackField: DailyField
  ) => {
    const patch = { ...result.fieldPatch };
    if (!Object.values(patch).some((value) => value?.trim()) && newestWords.trim()) {
      patch[fallbackField] = newestWords.trim();
    }

    setDraft((current) => mergeDraft(current, patch));
    setCoveredFields(
      (current) => Array.from(new Set([...current, ...result.coveredFields, ...Object.keys(patch)])) as DailyField[]
    );
    setReply(result.reply);
    setFinalReflection("");
    setObservation(result.observation);
    setQuestion(result.question);
    setQuestionField(result.questionField);
    setMemoryReferences(result.memoryReferences);
    setResponseMode(result.responseMode);
    setChoicePoint(result.choicePoint);
    setChangeEvidence(result.changeEvidence);
    setReadyToSave(result.readyToSave || turn >= 3 || !result.question);

    if (result.questionField) {
      setAskedFields((current) => Array.from(new Set<DailyField>([...current, result.questionField as DailyField])));
    }

    if (result.responseMode === "change") setAction("quiet-celebrate");
    else if (result.patternStatus === "pattern") setAction("pattern-found");
    else if (result.patternStatus === "echo") setAction("memory-found");
    else setAction(result.action);
  };

  const continueRecord = async () => {
    const text = input.trim();
    if (!text || isWorking || isSaving) return;

    const fallbackField: DailyField = questionField || (turn === 0 ? "event" : "additionalNotes");
    setIsWorking(true);
    setVoiceError("");
    setSaved(false);
    setLastUserWords(text);
    setAction(history.length ? "browse-archive" : "thinking");

    try {
      const result = await generateCompanionReply({
        message: text,
        companion,
        companionName,
        language,
        history,
        draft,
        askedFields,
        currentQuestion: question,
        currentQuestionField: questionField,
        turn: turn + 1,
        previousReply: reply,
        previousObservation: observation,
        previousChoicePoint: choicePoint,
        previousChangeEvidence: changeEvidence,
      });
      applyBrainResult(result, text, fallbackField);
      setTurn((value) => value + 1);
      setInput("");
      if (voiceInput) void playReply([result.reply, result.question].filter(Boolean).join(" "));
      setVoiceInput(false);
    } catch {
      setAction("idle-breathe");
      setVoiceError(
        language === "en"
          ? "The record is still here, but the companion could not respond. You can save it now."
          : "你的内容还在，但伙伴暂时没有回应。你可以先保存。"
      );
      setDraft((current) => mergeDraft(current, { [fallbackField]: text }));
      setReadyToSave(true);
      setInput("");
    } finally {
      setIsWorking(false);
    }
  };

  const skipQuestion = async () => {
    if (isWorking || isSaving || !question) return;
    const skippedField = questionField;
    setIsWorking(true);
    setAction("thinking");

    try {
      const result = await generateCompanionReply({
        message: "（用户跳过了上一题）",
        companion,
        companionName,
        language,
        history,
        draft,
        askedFields: skippedField
          ? Array.from(new Set([...askedFields, skippedField]))
          : askedFields,
        currentQuestion: question,
        currentQuestionField: questionField,
        turn: turn + 1,
        skipped: true,
        previousReply: reply,
        previousObservation: observation,
        previousChoicePoint: choicePoint,
        previousChangeEvidence: changeEvidence,
      });
      applyBrainResult(result, "", "additionalNotes");
      setTurn((value) => value + 1);
    } catch {
      setQuestion("");
      setQuestionField("");
      setReadyToSave(true);
      setAction("idle-breathe");
    } finally {
      setIsWorking(false);
    }
  };

  const saveRecord = async () => {
    if (isSaving || isWorking) return;
    let finalDraft = { ...draft };
    const pending = input.trim();
    if (pending) {
      const target: DailyField = questionField || (turn === 0 ? "event" : "additionalNotes");
      finalDraft = mergeDraft(finalDraft, { [target]: pending });
    }
    if (!hasDraftContent(finalDraft)) return;

    setIsSaving(true);
    setVoiceError("");
    setAction(history.length ? "browse-archive" : "thinking");

    let integratedReply = "";
    let integratedReferences = memoryReferences;
    let integratedMode = responseMode;
    let integratedChoice = choicePoint;
    let integratedChange = changeEvidence;

    try {
      const finalResult = await generateFinalInsight({
        message: lastUserWords || pending || finalDraft.event || finalDraft.additionalNotes,
        companion,
        companionName,
        language,
        history,
        draft: finalDraft,
        askedFields,
        currentQuestion: question,
        currentQuestionField: questionField,
        turn: turn + 1,
        previousReply: reply,
        previousObservation: observation,
        previousChoicePoint: choicePoint,
        previousChangeEvidence: changeEvidence,
      });
      integratedReply = finalResult.finalReflection || finalResult.reply;
      integratedReferences = finalResult.memoryReferences.length
        ? finalResult.memoryReferences
        : memoryReferences;
      integratedMode = finalResult.responseMode;
      integratedChoice = finalResult.choicePoint || choicePoint;
      integratedChange = finalResult.changeEvidence || changeEvidence;
    } catch {
      const evidenceText = memoryReferences.length
        ? `\n\n${memoryReferences.map((item) => `${item.date}｜“${item.quote}”｜${item.relation}`).join("\n")}`
        : "";
      integratedReply = [reply, observation, evidenceText].filter(Boolean).join("\n\n");
    }

    if (!integratedReply) {
      integratedReply = language === "en"
        ? "This moment is saved as it was. You do not need to force an answer tonight."
        : "这一刻已经照原来的样子留下来了。今晚不必急着把所有答案想清楚。";
    }

    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      createdAt: now.getTime(),
      date,
      event: finalDraft.event || finalDraft.additionalNotes,
      reflection: finalDraft.reflection,
      gratitude: finalDraft.gratitude,
      selfTalk: finalDraft.selfTalk,
      angelNumbers: finalDraft.angelNumbers,
      dreams: finalDraft.dreams,
      loveTarget: finalDraft.loveTarget,
      apologyTarget: finalDraft.apologyTarget,
      additionalNotes: finalDraft.additionalNotes,
      aiResponse: integratedReply,
    };

    setAction("writing");
    try {
      await onAddEntry(entry);
      setDraft(finalDraft);
      setInput("");
      setSaved(true);
      setReadyToSave(true);
      setQuestion("");
      setQuestionField("");
      setFinalReflection(integratedReply);
      setMemoryReferences(integratedReferences);
      setResponseMode(integratedMode);
      setChoicePoint(integratedChoice);
      setChangeEvidence(integratedChange);
      setAction(integratedMode === "change" ? "quiet-celebrate" : "save-complete");
    } catch {
      setAction("idle-breathe");
      setVoiceError(language === "en" ? "The record could not be saved." : "这段记录没有保存成功，请检查网络后重试。 ");
    } finally {
      setIsSaving(false);
    }
  };

  const resetRecord = () => {
    setInput("");
    setDraft({ ...EMPTY_DRAFT });
    setReply("");
    setFinalReflection("");
    setObservation("");
    setQuestion("");
    setQuestionField("");
    setAskedFields([]);
    setCoveredFields([]);
    setTurn(0);
    setLastUserWords("");
    setMemoryReferences([]);
    setResponseMode("quiet");
    setChoicePoint("");
    setChangeEvidence("");
    setReadyToSave(false);
    setSaved(false);
    setShowDraft(false);
    setAction("welcome");
  };

  return (
    <section className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-2xl flex-col items-center px-3 pb-14 pt-2 text-center">
      <MascotStage action={action} companion={companion} companionName={companionName} />

      <div className="mt-3 w-full max-w-xl">
        {visibleReply && (
          <div className="rounded-3xl bg-white/85 px-5 py-5 text-left shadow-[0_14px_45px_rgba(95,72,46,.07)] ring-1 ring-stone-100">
            <p className="whitespace-pre-line text-[15px] leading-7 text-stone-700">{visibleReply}</p>

            {!saved && observation && (
              <div className="mt-4 border-l-2 border-amber-200 pl-4">
                <p className="text-xs text-amber-700/70">
                  {language === "en" ? "What I may be hearing…" : "我听见的可能是……"}
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{observation}</p>
              </div>
            )}

            {changeEvidence && (
              <div className="mt-4 rounded-2xl bg-emerald-50/70 px-4 py-3">
                <p className="text-xs text-emerald-700/70">
                  {language === "en" ? "What is different this time" : "这一次不同的是"}
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-650">{changeEvidence}</p>
              </div>
            )}

            {choicePoint && (
              <div className="mt-3 rounded-2xl bg-orange-50/70 px-4 py-3">
                <p className="text-xs text-orange-700/70">
                  {language === "en" ? "The crossroad in front of you" : "你现在站着的路口"}
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-650">{choicePoint}</p>
              </div>
            )}

            {memoryReferences.length > 0 && (
              <details className="mt-4 rounded-2xl bg-indigo-50/55 px-4 py-3 text-left">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-indigo-700/75">
                  <Clock3 size={13} />
                  {language === "en" ? "Why this reminded me of your past" : "为什么我会想到过去"}
                </summary>
                <div className="mt-3 space-y-3">
                  {memoryReferences.map((item, index) => (
                    <p key={`${item.date}-${index}`} className="text-sm leading-6 text-stone-600">
                      <span className="font-medium text-indigo-700">{item.date}</span>
                      {` · “${item.quote}”`}
                      {item.relation ? ` — ${item.relation}` : ""}
                    </p>
                  ))}
                </div>
              </details>
            )}

            <button
              type="button"
              onClick={() => void playReply()}
              disabled={isSpeaking}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-2 text-xs text-stone-500 transition hover:bg-stone-200 disabled:opacity-60"
            >
              {isSpeaking ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
              {language === "en" ? "Listen" : "听伙伴说"}
            </button>
          </div>
        )}

        {!saved && (
          <div className="mt-4 px-2">
            <p className="text-lg font-medium leading-8 text-stone-700 sm:text-xl">{question || opening}</p>
            {question && (
              <p className="mt-1 text-sm text-stone-400">
                {language === "en" ? "Answer, skip it, or save this moment now." : "你可以回答、跳过，或先把这一刻保存下来。"}
              </p>
            )}
          </div>
        )}
      </div>

      {!saved && (
        <div className="mt-5 w-full max-w-xl rounded-[28px] border border-orange-100 bg-white p-3 text-left shadow-[0_14px_50px_rgba(129,90,38,0.08)]">
          <textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setSaved(false);
              setVoiceInput(false);
              setAction("listening");
            }}
            onFocus={() => setAction("listening")}
            placeholder={
              language === "en"
                ? question
                  ? "Answer in your own words…"
                  : "Start with any moment…"
                : question
                  ? "照你自己的方式回答就好……"
                  : "从任何一个瞬间开始写就好……"
            }
            rows={4}
            className="w-full resize-none bg-transparent px-3 py-2 text-base leading-7 text-stone-700 outline-none placeholder:text-stone-300"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-1 pt-3">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing || isWorking || isSaving}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition disabled:opacity-50 ${
                isRecording ? "bg-rose-50 text-rose-600" : "text-stone-500 hover:bg-stone-50"
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
                ? isRecording
                  ? "Stop"
                  : "Voice"
                : isRecording
                  ? "停止录音"
                  : "语音"}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void saveRecord()}
                disabled={(!input.trim() && !hasDraftContent(draft)) || isWorking || isSaving}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-40"
              >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {language === "en" ? "Finish and save" : "完成并保存"}
              </button>

              <button
                type="button"
                onClick={() => void continueRecord()}
                disabled={!input.trim() || isWorking || isSaving || isRecording || isTranscribing}
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600 disabled:bg-orange-200"
              >
                {isWorking ? <Sparkles size={16} className="animate-pulse" /> : <Send size={16} />}
                {language === "en" ? (turn ? "Continue" : "Tell my companion") : turn ? "继续记录" : "告诉伙伴"}
              </button>
            </div>
          </div>
        </div>
      )}

      {question && !saved && (
        <button
          type="button"
          onClick={() => void skipQuestion()}
          disabled={isWorking || isSaving}
          className="mt-3 inline-flex items-center gap-2 text-sm text-stone-400 transition hover:text-stone-600 disabled:opacity-40"
        >
          <SkipForward size={15} />
          {language === "en" ? "Skip this question" : "跳过这一题"}
        </button>
      )}

      {(filledFields.length > 0 || coveredFields.length > 0) && (
        <div className="mt-5 w-full max-w-xl rounded-2xl border border-stone-100 bg-white/65 text-left">
          <button
            type="button"
            onClick={() => setShowDraft((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm text-stone-600"
          >
            <span className="inline-flex items-center gap-2">
              <BookOpen size={16} className="text-orange-500" />
              {language === "en" ? "Open today's record" : "打开今天的记录"}
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-600">{filledFields.length}</span>
            </span>
            {showDraft ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showDraft && (
            <div className="space-y-3 border-t border-stone-100 px-4 py-4">
              {filledFields.map((field) => (
                <div key={field}>
                  <p className="text-xs font-medium text-stone-400">{fieldLabels[field]}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-600">{draft[field]}</p>
                </div>
              ))}
              {lastUserWords && (
                <div className="rounded-xl bg-stone-50 px-3 py-2">
                  <p className="text-[11px] text-stone-400">{language === "en" ? "Your latest words" : "你刚才的原话"}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{lastUserWords}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {saved && (
        <button
          type="button"
          onClick={resetRecord}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-100 px-5 py-2.5 text-sm text-stone-600 transition hover:bg-stone-200"
        >
          <Check size={15} />
          {language === "en" ? "Record another moment" : "再记一个瞬间"}
        </button>
      )}

      {readyToSave && !saved && hasDraftContent(draft) && (
        <p className="mt-3 text-xs text-stone-400">
          {language === "en" ? "There is enough to save. Every next question is optional." : "现在已经足够保存；后面的每一个问题都只是邀请。"}
        </p>
      )}

      {voiceError && (
        <p role="alert" className="mt-3 rounded-2xl bg-stone-100 px-4 py-2 text-xs text-stone-600">
          {voiceError}
        </p>
      )}
    </section>
  );
}
