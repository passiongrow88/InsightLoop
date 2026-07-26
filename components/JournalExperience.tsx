import React, { useEffect, useMemo, useState } from "react";
import type {
  JournalEntry,
  JournalFlowStage,
  Language,
  MascotPreference,
  MascotType,
  PhoenixState,
  User,
} from "../types";
import { generateJournalInsight } from "../services/geminiService";
import {
  createDefaultMascotPreference,
  getMascotPreferences,
  saveMascotPreferences,
} from "../services/mascotPreferences";
import PhoenixAvatar from "./mascot/PhoenixAvatar";

interface JournalExperienceProps {
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void | Promise<void>;
  language: Language;
  currentUser?: User | null;
}

const copy = {
  zh: {
    choose: "选择陪你记录的伙伴",
    phoenix: "火凤凰",
    thunder: "雷龙兽",
    nameMascot: "给它取一个只属于你们的名字",
    nameYou: "它应该怎么称呼你？",
    introTitle: "这是我们一起记录的第一天",
    introBody:
      "我会陪你记下每天发生的事。随着记录越来越多，我也会帮你看见那些反复出现的情绪、关系和选择。",
    begin: "开始今天的记录",
    prompt: "今天发生了什么，仍然停留在你心里？",
    helper: "不用整理好，也不用写得漂亮。先把真实的部分留下来。",
    placeholder: "从今天最想说的一件事开始……",
    continue: "帮我整理今天",
    generating: "正在对照今天和过去的记录……",
    yourEntry: "你今天的记录",
    insight: "我从你的轨迹中看见的",
    save: "保存这一天",
    saved: "已经把今天收进我们的日记里。",
    again: "再记录一件事",
    editName: "重新选择伙伴",
  },
  en: {
    choose: "Choose the companion who will keep your journal",
    phoenix: "Fire Phoenix",
    thunder: "Thunder Dinosaur",
    nameMascot: "Give your companion a name that belongs to you both",
    nameYou: "What should your companion call you?",
    introTitle: "This is our first day recording together",
    introBody:
      "I will help you keep what happened. As our shared history grows, I will also help you notice recurring emotions, relationships, and choices.",
    begin: "Begin today's entry",
    prompt: "What happened today that is still staying with you?",
    helper: "It does not need to be polished. Start with what feels true.",
    placeholder: "Start with the one thing you most want to say……",
    continue: "Help me organize today",
    generating: "Looking across today and your earlier entries……",
    yourEntry: "Your record today",
    insight: "What I notice in your path",
    save: "Save this day",
    saved: "Today is now part of our shared journal.",
    again: "Record another moment",
    editName: "Choose another companion",
  },
};

const JournalExperience: React.FC<JournalExperienceProps> = ({
  entries,
  onAddEntry,
  language,
  currentUser,
}) => {
  const t = copy[language];
  const [preference, setPreference] = useState<MascotPreference | null>(null);
  const [stage, setStage] = useState<JournalFlowStage>("chooseMascot");
  const [mascotType, setMascotType] = useState<MascotType>("phoenix");
  const [mascotName, setMascotName] = useState("");
  const [userDisplayName, setUserDisplayName] = useState(currentUser?.name || "");
  const [entryText, setEntryText] = useState("");
  const [generatedInsight, setGeneratedInsight] = useState("");
  const [pendingEntry, setPendingEntry] = useState<JournalEntry | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = getMascotPreferences(currentUser);
    if (saved) {
      setPreference(saved);
      setMascotType(saved.mascotType);
      setMascotName(saved.mascotName);
      setUserDisplayName(saved.userDisplayName);
      setStage("intro");
    }
  }, [currentUser]);

  const phoenixState = useMemo<PhoenixState>(() => {
    if (stage === "writing") return "writing";
    if (stage === "generating") return "searchingMemory";
    if (stage === "result") return "presenting";
    if (stage === "saved") return "celebrating";
    if (stage === "intro") return "greeting";
    return "idle";
  }, [stage]);

  const activeName = mascotName.trim() || (mascotType === "phoenix" ? "Phoenix" : "Roro");

  const completeOnboarding = () => {
    const displayName = userDisplayName.trim() || currentUser?.name || "朋友";
    const saved = createDefaultMascotPreference(mascotType, activeName, displayName);
    saveMascotPreferences(saved, currentUser);
    setPreference(saved);
    setMascotName(saved.mascotName);
    setUserDisplayName(saved.userDisplayName);
    setStage("intro");
  };

  const generate = async () => {
    if (!entryText.trim()) {
      setError(language === "zh" ? "先留下至少一句真实的记录。" : "Write at least one honest sentence first.");
      return;
    }

    setError("");
    setStage("generating");

    const now = new Date();
    const entry: JournalEntry = {
      id: String(Date.now()),
      createdAt: Date.now(),
      date: now.toISOString().slice(0, 10),
      event: entryText.trim(),
      reflection: "",
      gratitude: "",
      selfTalk: "",
      additionalNotes: "Captured through the Phoenix journal flow",
    };

    try {
      const history = [...entries]
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 30);
      const response = await generateJournalInsight(
        entry,
        history,
        language,
        preference?.userDisplayName || userDisplayName
      );
      const completed = { ...entry, aiResponse: response };
      setPendingEntry(completed);
      setGeneratedInsight(response);
      setStage("result");
    } catch (reason: any) {
      setError(reason?.message || (language === "zh" ? "暂时无法生成觉察。" : "Unable to generate insight right now."));
      setStage("writing");
    }
  };

  const saveEntry = async () => {
    if (!pendingEntry) return;
    await onAddEntry(pendingEntry);
    setStage("saved");
  };

  const restart = () => {
    setEntryText("");
    setPendingEntry(null);
    setGeneratedInsight("");
    setStage("writing");
  };

  const resetMascot = () => {
    setPreference(null);
    setMascotName("");
    setStage("chooseMascot");
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[280px_1fr] md:items-start">
      <PhoenixAvatar
        mascotType={mascotType}
        name={activeName}
        state={phoenixState}
      />

      <main className="min-h-[460px] rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm md:p-9">
        {stage === "chooseMascot" && (
          <section>
            <p className="text-sm font-medium text-orange-600">InsightLoop</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900">{t.choose}</h1>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setMascotType("phoenix");
                  setStage("nameMascot");
                }}
                className="rounded-3xl border border-orange-200 bg-orange-50 p-6 text-left transition hover:-translate-y-0.5 hover:border-orange-300"
              >
                <span className="text-4xl">🔥</span>
                <span className="mt-4 block text-xl font-medium text-stone-900">{t.phoenix}</span>
                <span className="mt-2 block text-sm text-stone-600">温暖、认真、会把日记递给你。</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMascotType("thunderDino");
                  setStage("nameMascot");
                }}
                className="rounded-3xl border border-sky-200 bg-sky-50 p-6 text-left transition hover:-translate-y-0.5 hover:border-sky-300"
              >
                <span className="text-4xl">🌩️</span>
                <span className="mt-4 block text-xl font-medium text-stone-900">{t.thunder}</span>
                <span className="mt-2 block text-sm text-stone-600">圆滚滚、安稳、陪你慢慢说。</span>
              </button>
            </div>
          </section>
        )}

        {stage === "nameMascot" && (
          <section>
            <p className="text-sm font-medium text-orange-600">01</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900">{t.nameMascot}</h1>
            <input
              autoFocus
              value={mascotName}
              onChange={(event) => setMascotName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && mascotName.trim()) setStage("nameUser");
              }}
              className="mt-8 w-full rounded-2xl border border-stone-300 px-4 py-4 text-lg outline-none focus:border-orange-400"
              placeholder={mascotType === "phoenix" ? "例如：小焰、Lumi" : "例如：雷仔、Roro"}
            />
            <button
              type="button"
              disabled={!mascotName.trim()}
              onClick={() => setStage("nameUser")}
              className="mt-4 w-full rounded-2xl bg-orange-500 px-5 py-4 font-medium text-white disabled:opacity-40"
            >
              继续
            </button>
          </section>
        )}

        {stage === "nameUser" && (
          <section>
            <p className="text-sm font-medium text-orange-600">02</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900">{t.nameYou}</h1>
            <p className="mt-3 text-stone-600">“谢谢你给我这个名字。以后，我会这样叫你。”</p>
            <input
              autoFocus
              value={userDisplayName}
              onChange={(event) => setUserDisplayName(event.target.value)}
              className="mt-8 w-full rounded-2xl border border-stone-300 px-4 py-4 text-lg outline-none focus:border-orange-400"
              placeholder="你的名字或昵称"
            />
            <button
              type="button"
              onClick={completeOnboarding}
              className="mt-4 w-full rounded-2xl bg-orange-500 px-5 py-4 font-medium text-white"
            >
              认识彼此
            </button>
          </section>
        )}

        {stage === "intro" && (
          <section>
            <p className="text-sm font-medium text-orange-600">{activeName}</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900">
              {preference?.userDisplayName || userDisplayName}，{t.introTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">{t.introBody}</p>
            <button
              type="button"
              onClick={() => setStage("writing")}
              className="mt-8 rounded-2xl bg-orange-500 px-6 py-4 font-medium text-white"
            >
              {t.begin}
            </button>
            <button
              type="button"
              onClick={resetMascot}
              className="ml-3 mt-8 rounded-2xl border border-stone-300 px-5 py-4 text-stone-600"
            >
              {t.editName}
            </button>
          </section>
        )}

        {stage === "writing" && (
          <section>
            <p className="text-sm font-medium text-orange-600">{activeName} 正在替你守着这一页</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900">{t.prompt}</h1>
            <p className="mt-3 text-stone-600">{t.helper}</p>
            <textarea
              autoFocus
              value={entryText}
              onChange={(event) => setEntryText(event.target.value)}
              className="mt-7 min-h-56 w-full resize-y rounded-3xl border border-stone-300 p-5 text-lg leading-8 outline-none focus:border-orange-400"
              placeholder={t.placeholder}
            />
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generate}
                className="rounded-2xl bg-orange-500 px-6 py-4 font-medium text-white"
              >
                {t.continue}
              </button>
              <button
                type="button"
                disabled
                title="语音转录服务将在下一阶段接入"
                className="rounded-2xl border border-stone-300 px-6 py-4 text-stone-400"
              >
                说给我听 · 待接入
              </button>
            </div>
          </section>
        )}

        {stage === "generating" && (
          <section className="py-16 text-center">
            <p className="text-sm font-medium text-orange-600">{activeName} 正在翻阅共同记录</p>
            <h1 className="mt-3 text-3xl font-semibold text-stone-900">{t.generating}</h1>
            <p className="mt-5 text-stone-500">不是预测，也不是替你下结论。它在寻找重复出现的感受与选择。</p>
          </section>
        )}

        {stage === "result" && pendingEntry && (
          <section>
            <p className="text-sm font-medium text-orange-600">{activeName} 把日记递给你</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900">今天已经整理好了</h1>
            <article className="mt-7 rounded-3xl bg-stone-50 p-5">
              <h2 className="font-medium text-stone-900">{t.yourEntry}</h2>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-stone-700">{pendingEntry.event}</p>
            </article>
            <article className="mt-4 rounded-3xl border border-orange-100 bg-orange-50/60 p-5">
              <h2 className="font-medium text-stone-900">{t.insight}</h2>
              <div className="mt-3 whitespace-pre-wrap leading-8 text-stone-700">{generatedInsight}</div>
            </article>
            <button
              type="button"
              onClick={saveEntry}
              className="mt-6 rounded-2xl bg-orange-500 px-6 py-4 font-medium text-white"
            >
              {t.save}
            </button>
          </section>
        )}

        {stage === "saved" && (
          <section className="py-12 text-center">
            <p className="text-sm font-medium text-orange-600">{activeName}</p>
            <h1 className="mt-3 text-3xl font-semibold text-stone-900">{t.saved}</h1>
            <p className="mt-4 text-stone-600">以后回头看时，这一天会成为识别循环的一部分。</p>
            <button
              type="button"
              onClick={restart}
              className="mt-7 rounded-2xl bg-orange-500 px-6 py-4 font-medium text-white"
            >
              {t.again}
            </button>
          </section>
        )}
      </main>
    </div>
  );
};

export default JournalExperience;
