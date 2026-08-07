import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Feather, Pencil, Volume2, VolumeX, X } from "lucide-react";
import { JournalEntry, Language, User } from "../../types";
import { generateJournalInsight } from "../../services/geminiService";
import { V5_ASSETS } from "../../src/v5/assetManifest";
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
  onDreamSaved?: () => void;
  onClose: () => void;
}

const DRAFT_KEY = "insightLoop_v5_pending_draft";

const emptyDraft: Draft = { event: "", dreams: "", gratitude: "", apologyTarget: "" };

const V5JournalBook: React.FC<Props> = ({
  language,
  currentUser,
  entries,
  persistenceAvailable,
  onRequestAuth,
  onSaveEntry,
  onDreamSaved,
  onClose,
}) => {
  const [intro, setIntro] = useState<Intro>("fly");
  const [step, setStep] = useState<Step>("event");
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? { ...emptyDraft, ...JSON.parse(raw) } : emptyDraft;
    } catch {
      return emptyDraft;
    }
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [visibleOriginal, setVisibleOriginal] = useState("");
  const [visibleResponse, setVisibleResponse] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const finalizeLock = useRef(false);

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
        writing: "羽毛笔正在把你的原话写进今天……",
        thinking: "InsightLoop 正在读完这一页……",
        left: "今天的原话",
        right: "InsightLoop",
        saved: "这一页已经留下来了",
        close: "合上日记本",
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
        writing: "The quill is writing your original words…",
        thinking: "InsightLoop is reading this page…",
        left: "Your words today",
        right: "InsightLoop",
        saved: "This page is now part of your journal",
        close: "Close journal",
        auth: "Before saving this page, create your own study. After sign-in you will return here and nothing you wrote will be lost.",
      };

  useEffect(() => {
    if (step === "response") return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, step]);

  const originalText = useMemo(() => {
    const blocks = [
      draft.event.trim() ? `${language === "zh" ? "今日记事" : "Today"}\n${draft.event.trim()}` : "",
      draft.dreams.trim() ? `${language === "zh" ? "梦" : "Dream"}\n${draft.dreams.trim()}` : "",
      draft.gratitude.trim() ? `${language === "zh" ? "谢谢" : "Thank you"}\n${draft.gratitude.trim()}` : "",
      draft.apologyTarget.trim() ? `${language === "zh" ? "对不起" : "Sorry"}\n${draft.apologyTarget.trim()}` : "",
    ].filter(Boolean);
    return blocks.join("\n\n");
  }, [draft, language]);

  const playWritingASMR = (durationMs = 1700) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const duration = Math.max(0.4, durationMs / 1000);
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        const scratchPulse = Math.sin(i / 18) * 0.35 + Math.sin(i / 61) * 0.18;
        data[i] = (Math.random() * 2 - 1) * (0.12 + Math.abs(scratchPulse) * 0.12);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1450;
      filter.Q.value = 0.55;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.004, ctx.currentTime + duration);
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
      source.onended = () => ctx.close().catch(() => undefined);
    } catch {
      // Audio is optional; never block the journal if a browser refuses AudioContext.
    }
  };

  const animateText = (
    text: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    durationMs: number,
    done?: () => void,
  ) => {
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

  const finalize = async () => {
    if (finalizeLock.current || !currentUser) return;
    finalizeLock.current = true;
    setWaitingForAuth(false);
    setSaveError("");
    setIsSaving(true);
    setStep("writing-user");
    playWritingASMR(1800);

    await new Promise<void>((resolve) => {
      animateText(originalText, setVisibleOriginal, 1600, resolve);
    });

    setStep("thinking");

    try {
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      const entry: JournalEntry = {
        id: String(Date.now()),
        createdAt: Date.now(),
        date,
        event: draft.event.trim(),
        reflection: "",
        gratitude: draft.gratitude.trim(),
        selfTalk: "",
        dreams: draft.dreams.trim(),
        apologyTarget: draft.apologyTarget.trim(),
        angelNumbers: "",
        loveTarget: "",
        additionalNotes: "",
        aiResponse: "",
      };

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

      const completed = { ...entry, aiResponse: response };
      await onSaveEntry(completed);
      setAiResponse(response);
      setStep("response");
      if (draft.dreams.trim()) onDreamSaved?.();
      localStorage.removeItem(DRAFT_KEY);
      playWritingASMR(Math.min(4200, Math.max(1800, response.length * 18)));
      animateText(response, setVisibleResponse, Math.min(5000, Math.max(1800, response.length * 20)));
    } catch (error: any) {
      setSaveError(error?.message || (language === "zh" ? "保存失败，请重试。" : "Save failed. Please try again."));
      setStep("review");
      finalizeLock.current = false;
    } finally {
      setIsSaving(false);
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

  const requestSave = () => {
    if (!draft.event.trim() && !draft.dreams.trim()) {
      setStep("event");
      return;
    }
    if (!currentUser) {
      if (!persistenceAvailable) {
        setSaveError(language === "zh"
          ? "这个 Preview 还没有配置安全储存。你可以继续浏览和保留当前浏览器中的草稿，但暂时不能注册或永久保存。"
          : "This Preview does not yet have secure storage configured. You can keep this browser draft, but registration and permanent saving are not available yet.");
        return;
      }
      setWaitingForAuth(true);
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      onRequestAuth();
      return;
    }
    void finalize();
  };

  const setField = (key: keyof Draft, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const formPage = () => {
    if (step === "event") {
      return <QuestionPage title={copy.eventTitle} hint={copy.eventHint} value={draft.event} onChange={(v) => setField("event", v)} required />;
    }
    if (step === "dream") {
      return <QuestionPage title={copy.dreamTitle} hint={`${copy.dreamHint} · ${copy.optional}`} value={draft.dreams} onChange={(v) => setField("dreams", v)} />;
    }
    if (step === "gratitude") {
      return <QuestionPage title={copy.thanksTitle} hint={copy.optional} value={draft.gratitude} onChange={(v) => setField("gratitude", v)} />;
    }
    return <QuestionPage title={copy.sorryTitle} hint={copy.optional} value={draft.apologyTarget} onChange={(v) => setField("apologyTarget", v)} />;
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

  if (intro !== "ready") {
    const asset = intro === "fly" ? V5_ASSETS.journalFly : V5_ASSETS.journalOpen;
    return (
      <div className="fixed inset-0 z-[80] bg-[#1d1611] flex items-center justify-center">
        <button onClick={onClose} className="absolute right-4 top-4 z-20 rounded-full bg-black/35 p-2 text-white/80 hover:text-white" aria-label="Close journal">
          <X size={20} />
        </button>
        <V5AssetVideo
          asset={asset}
          label={intro === "fly" ? "日记本飞向桌面" : "日记本摊开"}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-contain"
          onEnded={() => setIntro(intro === "fly" ? "open" : "ready")}
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
                onClick={() => setSoundEnabled((v) => !v)}
                className="rounded-full p-2 text-[#62492e] hover:bg-[#7a5b38]/10"
                aria-label={soundEnabled ? "Mute writing sound" : "Enable writing sound"}
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
                <button onClick={() => setStep("event")} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[#65492f] hover:bg-[#73583a]/8">
                  <Pencil size={16} /> {copy.edit}
                </button>
                <button onClick={requestSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full bg-[#66482a] px-6 py-3 text-sm font-medium text-[#fff8e8] shadow-lg disabled:opacity-50">
                  <Check size={17} /> {copy.confirm}
                </button>
              </div>
            </div>
          )}

          {(step === "writing-user" || step === "thinking") && (
            <div className="relative z-10 mx-auto grid min-h-[640px] max-w-5xl grid-cols-1 gap-0 md:grid-cols-2">
              <BookPage title={copy.left} text={visibleOriginal || originalText} quill={step === "writing-user"} />
              <BookPage title={copy.right} text={step === "thinking" ? copy.thinking : ""} quiet quill={step === "thinking"} />
              <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-[#4a3420]/75 px-4 py-2 text-xs text-[#fff5e6] shadow-lg">
                {step === "writing-user" ? copy.writing : copy.thinking}
              </div>
            </div>
          )}

          {step === "response" && (
            <div className="relative z-10 mx-auto grid min-h-[650px] max-w-5xl grid-cols-1 md:grid-cols-2">
              <BookPage title={copy.left} text={originalText} />
              <BookPage title={copy.right} text={visibleResponse || aiResponse} quill={visibleResponse.length < aiResponse.length} />
              <div className="col-span-full flex flex-col items-center gap-3 border-t border-[#876743]/20 px-5 py-5">
                <p className="text-xs tracking-wide text-[#755a3a]">{copy.saved}</p>
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
  title: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}> = ({ title, hint, value, onChange, required }) => (
  <div>
    <div className="mb-7 text-center">
      <h2 className="font-serif text-2xl leading-relaxed text-[#493521] sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-[#816748]">{hint}</p>
    </div>
    <textarea
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={required ? "…" : ""}
      className="min-h-[250px] w-full resize-none rounded-2xl border border-[#8c6a43]/20 bg-[#fffaf0]/56 px-5 py-5 font-serif text-lg leading-8 text-[#493725] outline-none shadow-inner placeholder:text-[#8b755f]/40 focus:border-[#8b6942]/45 focus:bg-[#fffaf0]/72"
    />
  </div>
);

const PaperText: React.FC<{ text: string }> = ({ text }) => (
  <div className="whitespace-pre-wrap rounded-2xl border border-[#87643d]/20 bg-[#fffaf0]/58 p-6 font-serif text-base leading-8 text-[#4f3a26] shadow-inner sm:text-lg">
    {text}
  </div>
);

const BookPage: React.FC<{ title: string; text: string; quill?: boolean; quiet?: boolean }> = ({ title, text, quill, quiet }) => (
  <section className="relative min-h-[560px] border-[#8a6a45]/20 bg-[#fff9eb]/36 px-6 py-9 md:border-r md:px-9">
    <div className="mb-5 text-center font-serif text-xs tracking-[0.18em] text-[#886c4a]">{title}</div>
    <div className={`whitespace-pre-wrap font-serif text-[15px] leading-8 text-[#4b3827] sm:text-[17px] ${quiet ? "text-center text-[#77624a]" : ""}`}>
      {text}
    </div>
    {quill && (
      <div className="absolute bottom-9 right-8 animate-[pulse_1.6s_ease-in-out_infinite] rotate-[-16deg] text-[#6b4b2b] drop-shadow-md">
        <Feather size={44} strokeWidth={1.35} />
      </div>
    )}
  </section>
);

export default V5JournalBook;
