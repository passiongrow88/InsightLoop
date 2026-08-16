import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Feather, Loader2, Mic, MicOff, Pencil, Play, RotateCcw, Square, Volume2, VolumeX, X } from "lucide-react";
import { JournalEntry, Language, User } from "../../types";
import { generateJournalInsight, generateJournalSpeech } from "../../services/mimoService";
import { V5_ASSETS } from "../../src/v5/assetManifest";
import { resolveDreamText } from "../../src/v5/journalSignals";
import V5AssetVideo from "./V5AssetVideo";

type Step = "event" | "dream" | "gratitude" | "apology" | "review" | "writing-user" | "thinking" | "response";
type Intro = "fly" | "open" | "ready";

interface Draft {
  event: string;
  dreams: string;
  gratitude: string;
  apologyTarget: string;
}

interface Props {
  language: Language;
  currentUser: User | null;
  entries: JournalEntry[];
  persistenceAvailable: boolean;
  onRequestAuth: () => void;
  onSaveEntry: (entry: JournalEntry) => Promise<void>;
  onUpdateEntry: (entry: JournalEntry) => Promise<void>;
  soundEnabled: boolean;
  onSoundEnabledChange: (enabled: boolean) => void;
  onPlayWritingSound: (durationMs: number) => void;
  onStopWritingSound: () => void;
  onPlayBookSound: () => void;
  onDreamSaved?: () => void;
  onClose: () => void;
}

const DRAFT_KEY = "insightLoop_v5_pending_draft";
const AUTH_HANDOFF_KEY = "insightLoop_v5_auth_handoff";

const emptyDraft: Draft = { event: "", dreams: "", gratitude: "", apologyTarget: "" };

const hasAuthHandoff = () => {
  try {
    return localStorage.getItem(AUTH_HANDOFF_KEY) === "pending";
  } catch {
    return false;
  }
};

const V5JournalBook: React.FC<Props> = ({
  language,
  currentUser,
  entries,
  persistenceAvailable,
  onRequestAuth,
  onSaveEntry,
  onUpdateEntry,
  soundEnabled,
  onSoundEnabledChange,
  onPlayWritingSound,
  onStopWritingSound,
  onPlayBookSound,
  onDreamSaved,
  onClose,
}) => {
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [intro, setIntro] = useState<Intro>(() => reduceMotion || hasAuthHandoff() ? "ready" : "fly");
  const [step, setStep] = useState<Step>(() => hasAuthHandoff() ? "review" : "event");
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? { ...emptyDraft, ...JSON.parse(raw) } : emptyDraft;
    } catch {
      return emptyDraft;
    }
  });
  const [waitingForAuth, setWaitingForAuth] = useState(() => hasAuthHandoff());
  const [saveError, setSaveError] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [visibleOriginal, setVisibleOriginal] = useState("");
  const [visibleResponse, setVisibleResponse] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState<JournalEntry | null>(null);
  const [speechState, setSpeechState] = useState<"idle" | "loading" | "playing">("idle");
  const [speechError, setSpeechError] = useState("");
  const finalizeLock = useRef(false);
  const originalWritten = useRef(false);
  const animationCancel = useRef<() => void>(() => undefined);
  const animationFinish = useRef<(() => void) | null>(null);
  const speechAudio = useRef<HTMLAudioElement | null>(null);
  const speechUrl = useRef<string | null>(null);

  const copy = language === "zh"
    ? {
        eventTitle: "今天发生了什么？",
        eventHint: "从一个具体瞬间开始就好。",
        dreamTitle: "昨晚或今天，有梦想留下吗？",
        dreamHint: "没有也没关系，直接跳过。",
        thanksTitle: "今天有没有什么，让你想认真说一声谢谢？",
        sorryTitle: "今天有没有什么，让你想说一声对不起？",
        optional: "选填",
        skip: "今天没有，跳过",
        next: "继续",
        back: "返回",
        review: "再看一遍今天留下的内容",
        edit: "修改",
        confirm: "确认，写进日记",
        saving: "正在安全保存原文…",
        writing: "羽毛笔正在把你的原话写进今天……",
        thinking: "InsightLoop 正在读完这一页……",
        left: "今天的原话",
        right: "InsightLoop",
        saved: "这一页已经留下来了",
        close: "合上日记本",
        retry: "重新生成回应",
        readResponse: "朗读右页",
        stopReading: "停止朗读",
        generatingVoice: "正在生成声音…",
        voiceProvider: "右页声音由 MiMo 生成，仅在你点击朗读后播放。",
        responseFailed: "你的原话已经安全保存。InsightLoop 暂时没有写完右页，你可以稍后重试；原文不会受影响。",
        skipIntro: "跳过动画",
        skipWriting: "跳过书写动画",
        auth: "保存这一页前，需要先拥有自己的书房。注册后会回到这里，你刚才写的内容不会消失。",
      }
    : {
        eventTitle: "What happened today?",
        eventHint: "Start with one specific moment.",
        dreamTitle: "Any dream you want to keep?",
        dreamHint: "If not, you can skip this.",
        thanksTitle: "Is there anything you sincerely want to thank today?",
        sorryTitle: "Is there anything you want to say sorry to today?",
        optional: "Optional",
        skip: "Nothing today, skip",
        next: "Continue",
        back: "Back",
        review: "Read what you are leaving here today",
        edit: "Edit",
        confirm: "Confirm and write it down",
        saving: "Saving your original words…",
        writing: "The quill is writing your original words…",
        thinking: "InsightLoop is reading this page…",
        left: "Your words today",
        right: "InsightLoop",
        saved: "This page is now part of your journal",
        close: "Close journal",
        retry: "Retry response",
        readResponse: "Read the right page",
        stopReading: "Stop reading",
        generatingVoice: "Generating voice…",
        voiceProvider: "The right-page voice is generated by MiMo and plays only after you request it.",
        responseFailed: "Your original words are safely saved. InsightLoop could not finish the right-hand page yet; you can retry without affecting the saved entry.",
        skipIntro: "Skip animation",
        skipWriting: "Skip writing animation",
        auth: "Before saving this page, create your own study. After sign-in you will return here and nothing you wrote will be lost.",
      };

  useEffect(() => {
    if (step === "response") return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, step]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      setReduceMotion(media.matches);
      if (media.matches) setIntro("ready");
    };
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => () => {
    speechAudio.current?.pause();
    if (speechUrl.current) URL.revokeObjectURL(speechUrl.current);
  }, []);

  const originalText = useMemo(() => {
    const blocks = [
      draft.event.trim() ? `${language === "zh" ? "今日记事" : "Today"}\n${draft.event.trim()}` : "",
      draft.dreams.trim() ? `${language === "zh" ? "梦" : "Dream"}\n${draft.dreams.trim()}` : "",
      draft.gratitude.trim() ? `${language === "zh" ? "谢谢" : "Thank you"}\n${draft.gratitude.trim()}` : "",
      draft.apologyTarget.trim() ? `${language === "zh" ? "对不起" : "Sorry"}\n${draft.apologyTarget.trim()}` : "",
    ].filter(Boolean);
    return blocks.join("\n\n");
  }, [draft, language]);

  const animateText = (
    text: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    durationMs: number,
    done?: () => void,
  ) => {
    if (reduceMotion) {
      setter(text);
      done?.();
      return () => undefined;
    }
    setter("");
    if (!text) {
      done?.();
      return () => undefined;
    }
    const interval = Math.max(8, Math.floor(durationMs / Math.max(text.length, 1)));
    let index = 0;
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + Math.max(1, Math.ceil(text.length / 120)));
      setter(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        done?.();
      }
    }, interval);
    return () => window.clearInterval(timer);
  };

  const animateOriginalWords = async () => {
    setVisibleOriginal("");
    setStep("writing-user");
    const writingDuration = reduceMotion ? 0 : Math.min(5200, Math.max(2800, originalText.length * 24));
    await new Promise<void>((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : 320));
    if (soundEnabled) onPlayWritingSound(writingDuration || 700);
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        animationFinish.current = null;
        animationCancel.current = () => undefined;
        resolve();
      };
      animationFinish.current = finish;
      const cancel = animateText(originalText, setVisibleOriginal, writingDuration, finish);
      if (settled) cancel();
      else animationCancel.current = cancel;
    });
    originalWritten.current = true;
  };

  const skipOriginalWriting = () => {
    animationCancel.current();
    setVisibleOriginal(originalText);
    onStopWritingSound();
    animationFinish.current?.();
  };

  const finalize = async () => {
    if (finalizeLock.current || !currentUser) return;
    finalizeLock.current = true;
    setWaitingForAuth(false);
    setSaveError("");
    setIsSaving(true);
    let persistedEntry: JournalEntry | null = null;

    try {
      const now = new Date();
      const date = formatLocalDate(now);
      const resolvedDreams = resolveDreamText(draft.event, draft.dreams);
      const entry: JournalEntry = {
        id: String(Date.now()),
        createdAt: Date.now(),
        date,
        event: draft.event.trim(),
        reflection: "",
        gratitude: draft.gratitude.trim(),
        selfTalk: "",
        dreams: resolvedDreams,
        apologyTarget: draft.apologyTarget.trim(),
        angelNumbers: "",
        loveTarget: "",
        additionalNotes: "",
        aiResponse: "",
        responseStatus: "pending",
      };

      // Persistence remains the source of truth for saved state. The left-page
      // writing ritual has already run before this permanent-save boundary.
      await onSaveEntry(entry);
      persistedEntry = entry;
      setSavedEntry(entry);
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(AUTH_HANDOFF_KEY);
      if (resolvedDreams) onDreamSaved?.();

      setStep("thinking");

      const history = [...entries]
        .filter((item) => item.date !== date)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 30);

      const response = await generateJournalInsight(
        entry,
        history,
        language,
        currentUser.name || "",
      );

      const completed: JournalEntry = { ...entry, aiResponse: response, responseStatus: "ready" };
      await onUpdateEntry(completed);
      setSavedEntry(completed);
      setAiResponse(response);
      setVisibleResponse("");
      setStep("response");
      if (soundEnabled) onPlayWritingSound(Math.min(4200, Math.max(1800, response.length * 18)));
      animateText(response, setVisibleResponse, Math.min(5000, Math.max(1800, response.length * 20)));
    } catch (error: any) {
      const message = error?.message || (language === "zh" ? "保存失败，请重试。" : "Save failed. Please try again.");
      setSaveError(message);
      if (persistedEntry) {
        const failed: JournalEntry = { ...persistedEntry, responseStatus: "failed" };
        try {
          await onUpdateEntry(failed);
          setSavedEntry(failed);
        } catch (updateError) {
          console.error("V5 response status update failed", updateError);
        }
        setStep("response");
      } else {
        setStep("review");
      }
    } finally {
      finalizeLock.current = false;
      setIsSaving(false);
    }
  };

  const retryResponse = async () => {
    if (!savedEntry || isSaving || finalizeLock.current) return;
    finalizeLock.current = true;
    setIsSaving(true);
    setSaveError("");
    setStep("thinking");
    try {
      const pending = { ...savedEntry, responseStatus: "pending" as const };
      await onUpdateEntry(pending);
      const history = [...entries]
        .filter((item) => item.id !== pending.id && item.date !== pending.date)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 30);
      const response = await generateJournalInsight(pending, history, language, currentUser?.name || "");
      const completed = { ...pending, aiResponse: response, responseStatus: "ready" as const };
      await onUpdateEntry(completed);
      setSavedEntry(completed);
      setAiResponse(response);
      setVisibleResponse("");
      setStep("response");
      animateText(response, setVisibleResponse, Math.min(5000, Math.max(1800, response.length * 20)));
    } catch (error: any) {
      const failed = { ...savedEntry, responseStatus: "failed" as const };
      try { await onUpdateEntry(failed); } catch { /* the original entry remains saved */ }
      setSavedEntry(failed);
      setSaveError(error?.message || copy.responseFailed);
      setStep("response");
    } finally {
      finalizeLock.current = false;
      setIsSaving(false);
    }
  };

  const toggleResponseSpeech = async () => {
    if (speechState === "loading") return;
    if (speechState === "playing") {
      speechAudio.current?.pause();
      if (speechAudio.current) speechAudio.current.currentTime = 0;
      setSpeechState("idle");
      return;
    }
    setSpeechError("");
    try {
      if (!speechAudio.current) {
        setSpeechState("loading");
        const blob = await generateJournalSpeech(aiResponse, language);
        const url = URL.createObjectURL(blob);
        speechUrl.current = url;
        const audio = new Audio(url);
        audio.onended = () => setSpeechState("idle");
        audio.onerror = () => {
          setSpeechState("idle");
          setSpeechError(language === "zh" ? "声音无法播放，请稍后重试。" : "The voice could not be played. Please try again.");
        };
        speechAudio.current = audio;
      }
      await speechAudio.current.play();
      setSpeechState("playing");
    } catch (error: any) {
      setSpeechState("idle");
      setSpeechError(error?.message || (language === "zh" ? "MiMo 暂时无法生成声音。" : "MiMo could not generate the voice right now."));
    }
  };

  useEffect(() => {
    if (currentUser && waitingForAuth) {
      void finalize();
    }
    // finalize intentionally omitted: it is stable enough for this auth-resume gate,
    // and finalizeLock prevents duplicate saves during auth state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, waitingForAuth]);

  const requestSave = async () => {
    if (!draft.event.trim() && !draft.dreams.trim()) {
      setStep("event");
      return;
    }
    if (finalizeLock.current) return;

    finalizeLock.current = true;
    setWaitingForAuth(false);
    setSaveError("");
    setIsSaving(true);
    try {
      if (!originalWritten.current) await animateOriginalWords();
    } finally {
      finalizeLock.current = false;
      setIsSaving(false);
    }

    if (!currentUser) {
      setStep("review");
      if (!persistenceAvailable) {
        setSaveError(language === "zh"
          ? "这个 Preview 还没有配置安全储存。你可以继续浏览和保留当前浏览器中的草稿，但暂时不能注册或永久保存。"
          : "This Preview does not yet have secure storage configured. You can keep this browser draft, but registration and permanent saving are not available yet.");
        return;
      }
      setWaitingForAuth(true);
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      localStorage.setItem(AUTH_HANDOFF_KEY, "pending");
      onRequestAuth();
      return;
    }
    void finalize();
  };

  const setField = (key: keyof Draft, value: string) => {
    originalWritten.current = false;
    setWaitingForAuth(false);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const formPage = () => {
    if (step === "event") {
      return <QuestionPage language={language} title={copy.eventTitle} hint={copy.eventHint} value={draft.event} onChange={(v) => setField("event", v)} required />;
    }
    if (step === "dream") {
      return <QuestionPage language={language} title={copy.dreamTitle} hint={`${copy.dreamHint} · ${copy.optional}`} value={draft.dreams} onChange={(v) => setField("dreams", v)} />;
    }
    if (step === "gratitude") {
      return <QuestionPage language={language} title={copy.thanksTitle} hint={copy.optional} value={draft.gratitude} onChange={(v) => setField("gratitude", v)} />;
    }
    return <QuestionPage language={language} title={copy.sorryTitle} hint={copy.optional} value={draft.apologyTarget} onChange={(v) => setField("apologyTarget", v)} />;
  };

  const next = () => {
    if (step === "event") setStep("dream");
    else if (step === "dream") setStep("gratitude");
    else if (step === "gratitude") setStep("apology");
    else if (step === "apology") setStep("review");
  };

  const back = () => {
    if (step === "dream") setStep("event");
    else if (step === "gratitude") setStep("dream");
    else if (step === "apology") setStep("gratitude");
    else if (step === "review") setStep("apology");
  };

  const editDraft = () => {
    originalWritten.current = false;
    setWaitingForAuth(false);
    localStorage.removeItem(AUTH_HANDOFF_KEY);
    setStep("event");
  };

  if (intro !== "ready") {
    const asset = intro === "fly" ? V5_ASSETS.journalFly : V5_ASSETS.journalOpen;
    return (
      <div className="fixed inset-0 z-[80] bg-[#1d1611] flex items-center justify-center">
        <button onClick={onClose} className="absolute right-4 top-4 z-20 rounded-full bg-black/35 p-2 text-white/80 hover:text-white" aria-label="Close journal">
          <X size={20} />
        </button>
        <button onClick={() => setIntro("ready")} className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs text-white/85 hover:bg-black/50">
          {copy.skipIntro}
        </button>
        <V5AssetVideo
          asset={asset}
          label={intro === "fly" ? "日记本飞向桌面" : "日记本摊开"}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-contain"
          onEnded={() => {
            if (intro === "fly") {
              onPlayBookSound();
              setIntro("open");
            } else {
              setIntro("ready");
            }
          }}
          onAssetUnavailable={() => setIntro(intro === "fly" ? "open" : "ready")}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#241a13]/92 backdrop-blur-md p-3 sm:p-6">
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        <div className="relative w-full overflow-hidden rounded-[28px] border border-[#c7a878]/30 bg-[#e8d4ad] shadow-2xl shadow-black/40">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: V5_ASSETS.journalOpen.poster ? `url(${V5_ASSETS.journalOpen.poster})` : undefined }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,251,232,.72),rgba(192,153,99,.26)_65%,rgba(81,52,30,.24))]" />

          <div className="relative z-10 flex items-center justify-between border-b border-[#8d6b43]/20 px-4 py-3 sm:px-7">
            <div className="font-serif text-sm tracking-[0.12em] text-[#5f4932]">INSIGHTLOOP · JOURNAL</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSoundEnabledChange(!soundEnabled)}
                className="rounded-full p-2 text-[#62492e] hover:bg-[#7a5b38]/10"
                aria-label={soundEnabled ? (language === "zh" ? "关闭环境音和书写声" : "Mute ambience and writing") : (language === "zh" ? "开启环境音和书写声" : "Enable ambience and writing")}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button onClick={onClose} className="rounded-full p-2 text-[#62492e] hover:bg-[#7a5b38]/10" aria-label="Close journal">
                <X size={19} />
              </button>
            </div>
          </div>

          {(step === "event" || step === "dream" || step === "gratitude" || step === "apology") && (
            <div className="relative z-10 mx-auto flex min-h-[610px] max-w-3xl flex-col justify-center px-5 py-10 sm:px-12">
              {formPage()}
              <div className="mt-7 flex items-center justify-between gap-3">
                <button onClick={back} disabled={step === "event"} className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm text-[#73583a] disabled:opacity-0">
                  <ChevronLeft size={17} /> {copy.back}
                </button>
                <div className="flex items-center gap-2">
                  {step !== "event" && (
                    <button onClick={next} className="rounded-full px-4 py-2 text-sm text-[#73583a] hover:bg-[#73583a]/8">
                      {copy.skip}
                    </button>
                  )}
                  <button
                    onClick={next}
                    disabled={step === "event" && !draft.event.trim()}
                    className="inline-flex items-center gap-1 rounded-full bg-[#6b4c2c] px-5 py-2.5 text-sm font-medium text-[#fff8ea] shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copy.next} <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="relative z-10 mx-auto min-h-[610px] max-w-4xl px-5 py-9 sm:px-12">
              <h2 className="mb-6 text-center font-serif text-2xl text-[#4d3825] sm:text-3xl">{copy.review}</h2>
              <PaperText text={originalText} />
              {waitingForAuth && <p className="mt-4 rounded-xl bg-[#fff6df]/60 p-3 text-sm leading-6 text-[#6f5031]">{copy.auth}</p>}
              {saveError && <p className="mt-4 rounded-xl bg-red-50/70 p-3 text-sm text-red-800">{saveError}</p>}
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <button onClick={editDraft} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[#65492f] hover:bg-[#73583a]/8">
                  <Pencil size={16} /> {copy.edit}
                </button>
                <button onClick={() => void requestSave()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full bg-[#66482a] px-6 py-3 text-sm font-medium text-[#fff8e8] shadow-lg disabled:opacity-50">
                  <Check size={17} /> {isSaving ? copy.saving : copy.confirm}
                </button>
              </div>
            </div>
          )}

          {(step === "writing-user" || step === "thinking") && (
            <div className="relative z-10 mx-auto grid min-h-[640px] max-w-5xl grid-cols-1 gap-0 md:grid-cols-2">
              <BookPage title={copy.left} text={step === "writing-user" ? visibleOriginal : originalText} writing={step === "writing-user"} quillVideo={step === "writing-user"} />
              <BookPage title={copy.right} text={step === "thinking" ? copy.thinking : ""} quiet quill={step === "thinking"} />
              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#4a3420]/75 px-4 py-2 text-xs text-[#fff5e6] shadow-lg">
                <span>{step === "writing-user" ? copy.writing : copy.thinking}</span>
                {step === "writing-user" && (
                  <button onClick={skipOriginalWriting} className="rounded-full border border-white/20 px-3 py-1 text-[11px] text-white/90 hover:bg-white/10">
                    {copy.skipWriting}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "response" && (
            <div className="relative z-10 mx-auto grid min-h-[650px] max-w-5xl grid-cols-1 md:grid-cols-2">
              <BookPage title={copy.left} text={originalText} />
              <BookPage
                title={copy.right}
                text={savedEntry?.responseStatus === "failed" ? copy.responseFailed : visibleResponse}
                quill={savedEntry?.responseStatus === "ready" && visibleResponse.length < aiResponse.length}
              />
              <div className="col-span-full flex flex-col items-center gap-3 border-t border-[#876743]/20 px-5 py-5">
                <p className="text-xs tracking-wide text-[#755a3a]">{copy.saved}</p>
                {savedEntry?.responseStatus === "ready" && aiResponse && (
                  <>
                    <button
                      onClick={() => void toggleResponseSpeech()}
                      disabled={speechState === "loading"}
                      className="inline-flex items-center gap-2 rounded-full border border-[#65482c]/25 px-5 py-2.5 text-sm text-[#65482c] disabled:opacity-50"
                    >
                      {speechState === "loading" ? <Loader2 size={16} className="animate-spin" /> : speechState === "playing" ? <Square size={14} /> : <Play size={16} />}
                      {speechState === "loading" ? copy.generatingVoice : speechState === "playing" ? copy.stopReading : copy.readResponse}
                    </button>
                    <p className="max-w-lg text-center text-[11px] leading-5 text-[#846b50]">{copy.voiceProvider}</p>
                    {speechError && <p role="status" className="max-w-lg text-center text-xs text-red-800">{speechError}</p>}
                  </>
                )}
                {savedEntry?.responseStatus === "failed" && (
                  <button onClick={() => void retryResponse()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full border border-[#65482c]/25 px-5 py-2.5 text-sm text-[#65482c] disabled:opacity-50">
                    <RotateCcw size={16} /> {copy.retry}
                  </button>
                )}
                <button onClick={onClose} className="rounded-full bg-[#65482c] px-6 py-2.5 text-sm text-[#fff7e8] shadow-md">
                  {copy.close}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const QuestionPage: React.FC<{
  language: Language;
  title: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}> = ({ language, title, hint, value, onChange, required }) => {
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const recognitionRef = useRef<any>(null);
  const baseValueRef = useRef("");

  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  const toggleSpeech = () => {
    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }

    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechError(language === "zh"
        ? "这个浏览器不支持语音转文字。你仍可继续打字。"
        : "This browser does not support speech-to-text. You can continue typing.");
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    baseValueRef.current = value.trimEnd();
    recognition.lang = language === "zh" ? "zh-CN" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => {
      setSpeechError("");
      setListening(true);
    };
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript || "";
      }
      const spacer = baseValueRef.current && transcript ? " " : "";
      onChange(`${baseValueRef.current}${spacer}${transcript}`);
    };
    recognition.onerror = (event: any) => {
      const denied = event?.error === "not-allowed" || event?.error === "service-not-allowed";
      setSpeechError(denied
        ? (language === "zh" ? "麦克风权限被拒绝；允许权限后可重试。" : "Microphone permission was denied. Allow access and try again.")
        : (language === "zh" ? "语音没有识别成功，请重试或继续打字。" : "Speech was not recognized. Try again or continue typing."));
    };
    recognition.onend = () => setListening(false);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setSpeechError(language === "zh" ? "语音服务暂时无法启动。" : "Speech recognition could not start.");
    }
  };

  return (
  <div>
    <div className="mb-7 text-center">
      <h2 className="font-serif text-2xl leading-relaxed text-[#493521] sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-[#816748]">{hint}</p>
    </div>
    <div className="relative">
      <textarea
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={required ? "…" : ""}
        className="min-h-[250px] w-full resize-none rounded-2xl border border-[#8c6a43]/20 bg-[#fffaf0]/56 px-5 py-5 pb-16 font-serif text-lg leading-8 text-[#493725] outline-none shadow-inner placeholder:text-[#8b755f]/40 focus:border-[#8b6942]/45 focus:bg-[#fffaf0]/72"
      />
      <button
        type="button"
        onClick={toggleSpeech}
        className={`absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs transition ${listening ? "bg-red-900/80 text-white" : "bg-[#6b4c2c]/10 text-[#65482c] hover:bg-[#6b4c2c]/16"}`}
        aria-pressed={listening}
      >
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
        {listening
          ? (language === "zh" ? "停止并检查文字" : "Stop and review")
          : (language === "zh" ? "语音转文字" : "Speech to text")}
      </button>
    </div>
    {speechError && <p role="status" className="mt-2 text-xs text-red-800">{speechError}</p>}
    <p className="mt-2 text-xs text-[#816748]">
      {language === "zh" ? "识别结果只会写入上方文本框；保存前可以修改。" : "The transcript appears above and remains editable before saving."}
    </p>
  </div>
  );
};

const PaperText: React.FC<{ text: string }> = ({ text }) => (
  <div className="whitespace-pre-wrap rounded-2xl border border-[#87643d]/20 bg-[#fffaf0]/58 p-6 font-serif text-base leading-8 text-[#4f3a26] shadow-inner sm:text-lg">
    {text}
  </div>
);

const BookPage: React.FC<{ title: string; text: string; quill?: boolean; quiet?: boolean; writing?: boolean; quillVideo?: boolean }> = ({ title, text, quill, quiet, writing, quillVideo }) => (
  <section className="relative min-h-[560px] overflow-hidden border-[#8a6a45]/20 bg-[#fff9eb]/36 px-6 py-9 md:border-r md:px-9">
    {quillVideo && (
      <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 opacity-70 mix-blend-multiply sm:h-72 sm:w-72" aria-hidden="true">
        <V5AssetVideo
          asset={V5_ASSETS.quillThink}
          label="羽毛笔在书页上写字"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
          style={{ WebkitMaskImage: "radial-gradient(circle at 62% 62%, black 40%, transparent 73%)", maskImage: "radial-gradient(circle at 62% 62%, black 40%, transparent 73%)" }}
        />
      </div>
    )}
    <div className="relative z-10 mb-5 text-center font-serif text-xs tracking-[0.18em] text-[#886c4a]">{title}</div>
    <div className={`relative z-10 whitespace-pre-wrap font-serif text-[15px] leading-8 text-[#4b3827] sm:text-[17px] ${quiet ? "text-center text-[#77624a]" : ""}`}>
      {text}{writing && <span aria-hidden="true" className="ml-0.5 inline-block h-5 w-[2px] translate-y-1 bg-[#6b4b2b]/55 animate-pulse motion-reduce:hidden" />}
    </div>
    {quill && (
      <div className="absolute bottom-9 right-8 animate-[pulse_1.6s_ease-in-out_infinite] rotate-[-16deg] text-[#6b4b2b] drop-shadow-md motion-reduce:animate-none">
        <Feather size={44} strokeWidth={1.35} />
      </div>
    )}
  </section>
);

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default V5JournalBook;
