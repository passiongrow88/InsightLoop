import React, { useState } from "react";
import { ArrowRight, Check, Feather, ShieldCheck, Sparkles } from "lucide-react";
import { CompanionId, Language } from "../types";
import { CompanionMedia, EggMedia } from "./CompanionMedia";

type Step = "choose" | "egg" | "hatch" | "name";

interface CompanionOnboardingProps {
  language: Language;
  onComplete: (companion: CompanionId, name: string) => Promise<void>;
}

const copy = {
  zh: {
    eyebrow: "第一位同行者",
    title: "有两枚蛋，正在等你。",
    subtitle: "选择的不是测试结果，也不是一种更好的自己。只是在此刻，选一位你愿意一起慢慢长大的伙伴。",
    phoenix: "凤凰",
    phoenixTrait: "温暖、好奇、会在你想重新开始时轻轻点亮一盏灯。",
    thunder: "小雷公",
    thunderTrait: "安静、敏锐、会陪你把混乱的事一件件看清楚。",
    choose: "带走这枚蛋",
    eggTitle: "这枚蛋记住了你。",
    eggBody: "不用急着证明什么。等你准备好，它会在你的第一段回响里醒来。",
    hatch: "让它醒来",
    hatchTitle: "一束微光，正在回应你。",
    hatchBody: "这一刻只会发生一次。",
    nameTitle: "替它取一个名字吧。",
    nameBody: "名字可以是你最熟悉的一句话、一个人，或一个还没说出口的愿望。先认真取名；伙伴不会在日常使用中被随意替换。",
    nameLabel: "伙伴的名字",
    namePlaceholder: "例如：小焰、阿雷、晨光…",
    enter: "一起走进第一段回响",
    saving: "正在把相遇收好…",
    selected: "已选择",
  },
  en: {
    eyebrow: "Your first companion",
    title: "Two eggs are waiting for you.",
    subtitle: "This is not a test or a better version of you. Choose the companion you would like to grow with, slowly.",
    phoenix: "Phoenix",
    phoenixTrait: "Warm and curious; it lights a small lamp when you want to begin again.",
    thunder: "Thunder Dragon",
    thunderTrait: "Quiet and perceptive; it helps you look at tangled things one by one.",
    choose: "Choose this egg",
    eggTitle: "This egg remembers you.",
    eggBody: "There is nothing to prove. When you are ready, it will wake inside your first echo.",
    hatch: "Let it wake",
    hatchTitle: "A small light is answering you.",
    hatchBody: "This moment happens only once.",
    nameTitle: "Give your companion a name.",
    nameBody: "It can be a familiar phrase, a person, or a wish you have not said aloud. Choose it with care; companions are not casually replaced during daily use.",
    nameLabel: "Companion name",
    namePlaceholder: "For example: Ember, Ray, Dawn…",
    enter: "Enter my first echo",
    saving: "Keeping this meeting safe…",
    selected: "Selected",
  },
} as const;

export default function CompanionOnboarding({ language, onComplete }: CompanionOnboardingProps) {
  const t = copy[language];
  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<CompanionId | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const select = (companion: CompanionId) => {
    setSelected(companion);
    setStep("egg");
  };

  const complete = async () => {
    if (!selected || !name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await onComplete(selected, name.trim());
    } catch {
      setError(language === "zh" ? "暂时没能保存这次相遇。请确认网络后重试。" : "We could not save this meeting. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const companionLabel = selected === "phoenix" ? t.phoenix : t.thunder;

  return (
    <main className="min-h-screen overflow-hidden bg-[#fffcf6] px-4 py-10 text-stone-700 sm:px-6">
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-80 [background:radial-gradient(circle_at_18%_20%,rgba(254,215,170,.52),transparent_27%),radial-gradient(circle_at_82%_75%,rgba(196,181,253,.34),transparent_30%)]" />
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col items-center justify-center text-center">
        {step === "choose" && (
          <>
            <p className="text-xs font-medium tracking-[0.28em] text-stone-400">{t.eyebrow}</p>
            <h1 className="mt-4 font-serif text-3xl leading-tight text-stone-800 sm:text-5xl">{t.title}</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-stone-500 sm:text-base">{t.subtitle}</p>
            <div className="mt-10 grid w-full max-w-3xl gap-5 md:grid-cols-2">
              <ChoiceCard
                title={t.phoenix}
                trait={t.phoenixTrait}
                companion="phoenix"
                button={t.choose}
                selected={selected === "phoenix"}
                selectedLabel={t.selected}
                onChoose={() => select("phoenix")}
              />
              <ChoiceCard
                title={t.thunder}
                trait={t.thunderTrait}
                companion="thunder"
                button={t.choose}
                selected={selected === "thunder"}
                selectedLabel={t.selected}
                onChoose={() => select("thunder")}
              />
            </div>
          </>
        )}

        {step === "egg" && selected && (
          <RitualFrame title={t.eggTitle} body={t.eggBody}>
            <EggMedia companion={selected} action="idle" className="h-64 w-64 sm:h-80 sm:w-80" label={`${companionLabel} ${t.eggTitle}`} />
            <button className="ritual-primary" onClick={() => setStep("hatch")}>
              <Sparkles size={16} /> {t.hatch}
            </button>
          </RitualFrame>
        )}

        {step === "hatch" && selected && (
          <RitualFrame title={t.hatchTitle} body={t.hatchBody}>
            <EggMedia
              companion={selected}
              action="hatch"
              loop={false}
              onEnded={() => setStep("name")}
              className="h-64 w-64 sm:h-80 sm:w-80"
              label={`${companionLabel} hatch`}
            />
            <button className="ritual-secondary" onClick={() => setStep("name")}>{language === "zh" ? "继续" : "Continue"}</button>
          </RitualFrame>
        )}

        {step === "name" && selected && (
          <RitualFrame title={t.nameTitle} body={t.nameBody}>
            <CompanionMedia companion={selected} action="welcome" className="h-52 w-52 sm:h-64 sm:w-64" label={companionLabel} />
            <label className="mt-2 block w-full max-w-sm text-left text-xs font-medium tracking-wide text-stone-500">
              {t.nameLabel}
              <input
                autoFocus
                maxLength={24}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void complete(); }}
                placeholder={t.namePlaceholder}
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-base text-stone-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              />
            </label>
            <button className="ritual-primary mt-5 disabled:cursor-not-allowed disabled:opacity-45" disabled={!name.trim() || saving} onClick={() => void complete()}>
              {saving ? <Sparkles size={16} className="animate-pulse" /> : <ArrowRight size={16} />}
              {saving ? t.saving : t.enter}
            </button>
            {error && <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>}
          </RitualFrame>
        )}
      </section>
    </main>
  );
}

function ChoiceCard({ title, trait, companion, button, selected, selectedLabel, onChoose }: {
  title: string;
  trait: string;
  companion: CompanionId;
  button: string;
  selected: boolean;
  selectedLabel: string;
  onChoose: () => void;
}) {
  const icon = companion === "phoenix" ? <Feather size={17} /> : <ShieldCheck size={17} />;
  return (
    <article className="group flex min-h-[360px] flex-col items-center rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-[0_18px_54px_rgba(104,78,45,.08)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_62px_rgba(104,78,45,.14)]">
      <EggMedia companion={companion} action="idle" className="h-44 w-44 transition duration-500 group-hover:scale-105" label={title} />
      <h2 className="mt-2 font-serif text-2xl text-stone-800">{title}</h2>
      <p className="mt-3 max-w-xs text-sm leading-6 text-stone-500">{trait}</p>
      <button className="ritual-secondary mt-auto" onClick={onChoose}>
        {selected ? <Check size={16} /> : icon} {selected ? selectedLabel : button}
      </button>
    </article>
  );
}

function RitualFrame({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center rounded-[2.25rem] border border-white/90 bg-white/70 px-6 py-9 shadow-[0_24px_70px_rgba(104,78,45,.10)] backdrop-blur sm:px-12">
      <h1 className="font-serif text-3xl text-stone-800 sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-md text-sm leading-7 text-stone-500">{body}</p>
      <div className="my-4 flex flex-col items-center">{children}</div>
    </div>
  );
}
