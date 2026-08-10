import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronRight, Compass, CreditCard, Headphones, LogIn, MoonStar, Music2, Pause, Play, Repeat2, SkipBack, SkipForward, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { JournalEntry, Language, User } from "../../types";
import { V5_ASSETS } from "../../src/v5/assetManifest";
import { V5_BUILD_INFO } from "../../src/v5/buildInfo";
import { getSupabaseClient } from "../../src/services/supabaseClient";
import V5AssetVideo from "./V5AssetVideo";
import V5JournalBook from "./V5JournalBook";

interface Props {
  language: Language;
  currentUser: User | null;
  entries: JournalEntry[];
  plan: "free" | "pro";
  subscriptionStatus: string | null;
  persistenceAvailable: boolean;
  onRequestAuth: () => void;
  onSaveEntry: (entry: JournalEntry) => Promise<void>;
  onUpdateEntry: (entry: JournalEntry) => Promise<void>;
  onLogout: () => Promise<void>;
}

type Overlay = null | "egg" | "dreams" | "wheel" | "player" | "membership";
type Effect = null | "dream" | "player" | "egg" | "wheel";

const V5StudyShell: React.FC<Props> = ({
  language,
  currentUser,
  entries,
  plan,
  subscriptionStatus,
  persistenceAvailable,
  onRequestAuth,
  onSaveEntry,
  onUpdateEntry,
  onLogout,
}) => {
  const [journalOpen, setJournalOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [effect, setEffect] = useState<Effect>(null);
  const [musicUrl, setMusicUrl] = useState<string>("");
  const [musicName, setMusicName] = useState<string>("");
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicCurrent, setMusicCurrent] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.75);
  const [musicMuted, setMusicMuted] = useState(false);
  const [musicLoop, setMusicLoop] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    if (musicUrl) URL.revokeObjectURL(musicUrl);
  }, [musicUrl]);

  const zh = language === "zh";
  const uniqueRecordDays = useMemo(
    () => new Set(entries.map((entry) => entry.date).filter(Boolean)).size,
    [entries],
  );
  const hatchProgress = Math.min(7, uniqueRecordDays);
  const dreams = useMemo(
    () => entries
      .filter((entry) => (entry.dreams || "").trim())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [entries],
  );

  const openEffect = (next: Exclude<Effect, null>, nextOverlay: Exclude<Overlay, null>) => {
    setEffect(next);
    setOverlay(nextOverlay);
  };

  const effectAsset = effect === "dream"
    ? V5_ASSETS.dreamcatcherReceive
    : effect === "player"
      ? V5_ASSETS.recordPlayerStart
      : effect === "egg"
        ? V5_ASSETS.eggDay7
        : effect === "wheel"
          ? V5_ASSETS.shipWheelConfirm
          : null;

  const chooseLocalMusic = (file?: File) => {
    if (!file) return;
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    const url = URL.createObjectURL(file);
    setMusicUrl(url);
    setMusicName(file.name);
    setMusicPlaying(false);
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio || !musicUrl) return;
    if (audio.paused) {
      await audio.play();
      setMusicPlaying(true);
    } else {
      audio.pause();
      setMusicPlaying(false);
    }
  };

  const seekMusic = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
  };

  const changeVolume = (value: number) => {
    setMusicVolume(value);
    setMusicMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = value;
      audioRef.current.muted = false;
    }
  };

  const openPreviewBilling = async () => {
    if (!currentUser) {
      onRequestAuth();
      return;
    }
    setBillingLoading(true);
    setBillingMessage("");
    try {
      const { data } = await getSupabaseClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error(zh ? "请重新登录后再试。" : "Please sign in again and retry.");
      const response = await fetch(plan === "pro" ? "/api/stripe/create-portal-session" : "/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: "monthly" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.url) throw new Error(payload.error || (zh ? "Preview 结账尚未配置。" : "Preview checkout is not configured."));
      window.location.assign(payload.url);
    } catch (error: any) {
      setBillingMessage(error?.message || (zh ? "Preview 结账暂时不可用。" : "Preview checkout is unavailable."));
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#241a13] text-[#fff8eb]">
      <picture className="absolute inset-0">
        <source media="(max-width: 767px)" srcSet={V5_ASSETS.studyMobile.poster} />
        <img
          src={V5_ASSETS.studyDesktop.poster}
          alt=""
          className="h-full w-full object-cover"
        />
      </picture>

      <div className="absolute inset-0 hidden md:block">
        <V5AssetVideo
          asset={V5_ASSETS.studyDesktop}
          label="InsightLoop 温暖书房"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 md:hidden">
        <V5AssetVideo
          asset={V5_ASSETS.studyMobile}
          label="InsightLoop 手机书房"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />

      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4 sm:p-6">
        <div className="rounded-full bg-[#2a1d14]/35 px-4 py-2 font-serif text-sm tracking-[0.18em] text-[#fff5e6]/90 backdrop-blur-sm">
          INSIGHTLOOP
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOverlay("membership")} className="flex items-center gap-2 rounded-full bg-[#2a1d14]/38 px-3 py-2 text-xs text-[#fff5e6]/90 backdrop-blur-sm transition hover:bg-[#2a1d14]/55 sm:px-3.5">
            <CreditCard size={14} /> <span className="hidden sm:inline">{zh ? "Preview 方案" : "Preview plan"}</span>
          </button>
          <button
            onClick={() => currentUser ? void onLogout() : onRequestAuth()}
            className="flex items-center gap-2 rounded-full bg-[#2a1d14]/38 px-3.5 py-2 text-xs text-[#fff5e6]/90 backdrop-blur-sm transition hover:bg-[#2a1d14]/55"
          >
            {currentUser ? (currentUser.name || currentUser.email || (zh ? "我的书房" : "My study")) : (zh ? "进入自己的书房" : "Enter your study")}
            {!currentUser && <LogIn size={15} />}
          </button>
        </div>
      </header>

      {/* Desktop object hot zones: real objects remain the navigation. */}
      <StudyHotspot className="left-[29%] top-[10%] h-[53%] w-[18%]" label={zh ? "打开日记本" : "Open journal"} onClick={() => setJournalOpen(true)} icon={<BookOpen size={17} />} desktop />
      <StudyHotspot className="left-[51%] top-[10%] h-[37%] w-[10%]" label={zh ? "捕梦网" : "Dreamcatcher"} onClick={() => openEffect("dream", "dreams")} icon={<MoonStar size={17} />} desktop />
      <StudyHotspot className="left-[62%] top-[7%] h-[30%] w-[15%]" label={zh ? "船舵" : "Ship wheel"} onClick={() => setOverlay("wheel")} icon={<Compass size={17} />} desktop />
      <StudyHotspot className="left-[63%] top-[36%] h-[26%] w-[17%]" label={zh ? "老式播放器" : "Record player"} onClick={() => openEffect("player", "player")} icon={<Music2 size={17} />} desktop />
      <StudyHotspot className="left-[8%] top-[55%] h-[27%] w-[17%]" label={zh ? `陪伴兽蛋 ${hatchProgress}/7` : `Companion egg ${hatchProgress}/7`} onClick={() => openEffect("egg", "egg")} icon={<Sparkles size={17} />} desktop />

      {/* Mobile uses a compact object key because the camera crop changes materially. */}
      <nav className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-[#271a12]/52 p-1.5 shadow-xl backdrop-blur-md md:hidden">
        <MobileObjectButton label={zh ? "日记" : "Journal"} icon={<BookOpen size={18} />} onClick={() => setJournalOpen(true)} />
        <MobileObjectButton label={zh ? "梦" : "Dreams"} icon={<MoonStar size={18} />} onClick={() => openEffect("dream", "dreams")} />
        <MobileObjectButton label={zh ? "方向" : "Direction"} icon={<Compass size={18} />} onClick={() => setOverlay("wheel")} />
        <MobileObjectButton label={zh ? "蛋" : "Egg"} icon={<Sparkles size={18} />} onClick={() => openEffect("egg", "egg")} />
        <MobileObjectButton label={zh ? "音乐" : "Music"} icon={<Headphones size={18} />} onClick={() => openEffect("player", "player")} />
      </nav>

      {!currentUser && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 w-[88%] max-w-lg -translate-x-1/2 text-center md:bottom-8">
          <p className="rounded-full bg-[#24170f]/34 px-5 py-2 text-xs leading-5 text-[#fff7e8]/82 backdrop-blur-sm">
            {zh ? "先写下第一段也可以。到保存时再建立自己的书房。" : "You can write first. Create your study only when you save."}
          </p>
        </div>
      )}

      <div
        className="pointer-events-none absolute bottom-3 left-3 z-30 rounded-full bg-black/20 px-2.5 py-1 text-[9px] tracking-wide text-white/50 backdrop-blur-sm"
        title={`${V5_BUILD_INFO.version} · ${V5_BUILD_INFO.commit} · ${V5_BUILD_INFO.builtAt} · ${V5_BUILD_INFO.environment}`}
      >
        {V5_BUILD_INFO.version} · {V5_BUILD_INFO.commit.slice(0, 7)} · {V5_BUILD_INFO.environment}
      </div>

      {journalOpen && (
        <V5JournalBook
          language={language}
          currentUser={currentUser}
          entries={entries}
          persistenceAvailable={persistenceAvailable}
          onRequestAuth={onRequestAuth}
          onSaveEntry={onSaveEntry}
          onUpdateEntry={onUpdateEntry}
          onDreamSaved={() => setEffect("dream")}
          onClose={() => setJournalOpen(false)}
        />
      )}

      {effectAsset && effect && !journalOpen && effect !== "egg" && (
        <div className="fixed inset-0 z-[70] overflow-hidden bg-[#241a13]">
          <V5AssetVideo
            asset={effectAsset}
            label={effect}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
            onEnded={() => setEffect(null)}
            onAssetUnavailable={() => setEffect(null)}
          />
          <button onClick={() => setEffect(null)} className="absolute right-4 top-4 z-20 rounded-full bg-black/40 p-2 text-white/80 hover:text-white" aria-label="Close animation"><X size={18} /></button>
        </div>
      )}

      {effectAsset && effect === "egg" && !journalOpen && (
        <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
          <div className="absolute bottom-[12%] left-[4%] h-[22vw] w-[22vw] max-h-[310px] max-w-[310px] rounded-full bg-amber-200/15 blur-3xl" />
          <V5AssetVideo
            asset={effectAsset}
            label="companion egg"
            autoPlay
            muted
            playsInline
            className="absolute bottom-[7%] left-[1%] w-[34vw] max-w-[440px] object-cover mix-blend-multiply sm:bottom-[4%]"
            style={{ WebkitMaskImage: "radial-gradient(circle, black 44%, transparent 72%)", maskImage: "radial-gradient(circle, black 44%, transparent 72%)" }}
            onEnded={() => setEffect(null)}
            onAssetUnavailable={() => setEffect(null)}
          />
          <button onClick={() => setEffect(null)} className="pointer-events-auto absolute right-4 top-4 z-20 rounded-full bg-black/40 p-2 text-white/80 hover:text-white" aria-label="Close animation"><X size={18} /></button>
        </div>
      )}

      {overlay === "egg" && !effect && (
        <StudyPanel title={zh ? "陪伴兽的蛋" : "Companion egg"} onClose={() => setOverlay(null)}>
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-amber-200/20 bg-amber-300/10 text-3xl shadow-[0_0_45px_rgba(251,191,36,.12)]">🥚</div>
            <p className="font-serif text-xl text-[#fff3de]">{zh ? `${hatchProgress} / 7 个记录日` : `${hatchProgress} / 7 record days`}</p>
            <div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-200/70 transition-all" style={{ width: `${(hatchProgress / 7) * 100}%` }} /></div>
            <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#d7c4aa]">
              {hatchProgress >= 7
                ? (zh ? "你已经留下了足够的不同日子。正式孵化时，InsightLoop 会根据记录给出推荐，但最后由你选择小凤凰或小雷龙。" : "You have enough record days. InsightLoop may recommend a beast, but you choose Phoenix or Thunder Dragon.")
                : (zh ? "同一天可以写很多篇，但每天最多只有一篇计入孵化。它正在安静地记住你回来过的日子。" : "Write as much as you like. Only one entry per day advances hatching.")}
            </p>
          </div>
        </StudyPanel>
      )}

      {overlay === "dreams" && !effect && (
        <StudyPanel title={zh ? "捕梦网里的梦" : "Dreams in the catcher"} onClose={() => setOverlay(null)}>
          {dreams.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#d7c4aa]">{zh ? "这里还没有梦。下一次把梦写进日记，捕梦网会亮一下。" : "No dreams here yet. Save one in your journal and the dreamcatcher will light up."}</p>
          ) : (
            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {dreams.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="mb-2 text-xs tracking-wide text-amber-100/60">{entry.date}</div>
                  <p className="whitespace-pre-wrap font-serif text-sm leading-7 text-[#f2e6d4]">{entry.dreams}</p>
                </article>
              ))}
            </div>
          )}
        </StudyPanel>
      )}

      {overlay === "wheel" && !effect && (
        <StudyPanel title={zh ? "船舵 · 我的方向" : "Ship wheel · My direction"} onClose={() => setOverlay(null)}>
          <div className="mx-auto max-w-lg text-center">
            <Compass size={52} strokeWidth={1.1} className="mx-auto mb-5 text-amber-100/75" />
            <p className="font-serif text-lg leading-8 text-[#f4e7d3]">
              {zh ? "船舵不会替你决定方向。只有当 InsightLoop 从日记里听见一个可能值得追踪的选择时，它才会轻轻亮起，并问你要不要把它放进这里。" : "The wheel never chooses for you. It lights only when InsightLoop hears a possible direction worth tracking and asks for your confirmation."}
            </p>
            <p className="mt-4 text-sm text-[#baa68d]">{zh ? "目前没有由你确认的方向。" : "No direction has been confirmed yet."}</p>
          </div>
        </StudyPanel>
      )}

      {overlay === "player" && !effect && (
        <StudyPanel title={zh ? "老式播放器" : "Record player"} onClose={() => setOverlay(null)}>
          <div className="mx-auto max-w-lg">
            <div className="mb-5 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-2xl border border-white/8 bg-white/5 p-3 text-center text-xs text-[#cbb99f]">
                  <div className="mx-auto mb-2 h-12 w-12 rounded-full border border-amber-100/15 bg-[#17110d] shadow-inner" />
                  {zh ? `书房唱片 ${String(n).padStart(2, "0")}` : `Study record ${String(n).padStart(2, "0")}`}
                  <div className="mt-1 text-[10px] text-[#8f806d]">{zh ? "待版权确认后接入" : "Pending rights check"}</div>
                </div>
              ))}
            </div>

            <label className="block cursor-pointer rounded-2xl border border-dashed border-amber-100/20 bg-white/4 p-4 text-center text-sm text-[#e0cfb6] hover:bg-white/7">
              {zh ? "选择这台设备上的 MP3" : "Choose an MP3 on this device"}
              <input type="file" accept="audio/*,.mp3" className="hidden" onChange={(e) => chooseLocalMusic(e.target.files?.[0])} />
            </label>

            {musicUrl && (
              <div className="mt-4 rounded-2xl bg-black/20 p-4">
                <div className="min-w-0"><div className="truncate text-sm text-[#f3e4cd]">{musicName}</div><div className="text-[10px] text-[#9d8b74]">{zh ? "只在当前设备播放，不上传" : "Plays only on this device; not uploaded"}</div></div>
                <input
                  aria-label={zh ? "播放进度" : "Playback position"}
                  type="range"
                  min={0}
                  max={Math.max(musicDuration, 0)}
                  step={0.1}
                  value={Math.min(musicCurrent, musicDuration || 0)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setMusicCurrent(next);
                    if (audioRef.current) audioRef.current.currentTime = next;
                  }}
                  className="mt-4 w-full accent-amber-200"
                />
                <div className="flex items-center justify-between text-[10px] tabular-nums text-[#9d8b74]"><span>{formatTime(musicCurrent)}</span><span>{formatTime(musicDuration)}</span></div>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <button onClick={() => seekMusic(-10)} className="rounded-full p-2.5 text-amber-50 hover:bg-white/8" aria-label={zh ? "后退 10 秒" : "Back 10 seconds"}><SkipBack size={17} /></button>
                  <button onClick={() => void toggleMusic()} className="rounded-full bg-amber-100/10 p-3 text-amber-50 hover:bg-amber-100/15" aria-label={musicPlaying ? (zh ? "暂停" : "Pause") : (zh ? "播放" : "Play")}>{musicPlaying ? <Pause size={19} /> : <Play size={19} />}</button>
                  <button onClick={() => seekMusic(10)} className="rounded-full p-2.5 text-amber-50 hover:bg-white/8" aria-label={zh ? "前进 10 秒" : "Forward 10 seconds"}><SkipForward size={17} /></button>
                  <button onClick={() => {
                    const next = !musicMuted;
                    setMusicMuted(next);
                    if (audioRef.current) audioRef.current.muted = next;
                  }} className="rounded-full p-2.5 text-amber-50 hover:bg-white/8" aria-label={musicMuted ? (zh ? "取消静音" : "Unmute") : (zh ? "静音" : "Mute")}>{musicMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
                  <input aria-label={zh ? "音量" : "Volume"} type="range" min={0} max={1} step={0.05} value={musicVolume} onChange={(e) => changeVolume(Number(e.target.value))} className="w-20 accent-amber-200" />
                  <button onClick={() => setMusicLoop((value) => !value)} className={`rounded-full p-2.5 hover:bg-white/8 ${musicLoop ? "text-amber-100" : "text-[#806f5d]"}`} aria-pressed={musicLoop} aria-label={zh ? "循环播放" : "Loop playback"}><Repeat2 size={17} /></button>
                </div>
                <audio
                  ref={audioRef}
                  src={musicUrl}
                  loop={musicLoop}
                  onLoadedMetadata={(event) => {
                    const audio = event.currentTarget;
                    audio.volume = musicVolume;
                    setMusicDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
                  }}
                  onTimeUpdate={(event) => setMusicCurrent(event.currentTarget.currentTime)}
                  onPlay={() => setMusicPlaying(true)}
                  onPause={() => setMusicPlaying(false)}
                  onEnded={() => setMusicPlaying(false)}
                />
              </div>
            )}
          </div>
        </StudyPanel>
      )}

      {overlay === "membership" && (
        <StudyPanel title={zh ? "Preview 方案" : "Preview plan"} onClose={() => setOverlay(null)}>
          <div className="mx-auto max-w-lg">
            <div className="rounded-2xl border border-amber-100/15 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs tracking-[0.18em] text-amber-100/55">{zh ? "当前方案" : "CURRENT PLAN"}</p>
                  <p className="mt-2 font-serif text-2xl text-[#fff1dc]">{plan === "pro" ? "Pro" : "Free"}</p>
                </div>
                <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100/80">{subscriptionStatus || "Preview"}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#d7c4aa]">
                {zh ? "免费方案保留完整、有人味的日记回应。未来 Pro 只增加更长记忆、更多深度回顾、语音与报告，不会把基本理解锁在付费墙后。" : "Free keeps the complete humane journal response. Future Pro adds longer memory, more deep reviews, voice, and reports without paywalling basic understanding."}
              </p>
            </div>
            <button onClick={() => void openPreviewBilling()} disabled={billingLoading || !currentUser} className="mt-4 w-full rounded-full bg-[#755333] px-5 py-3 text-sm text-[#fff8e8] shadow-lg disabled:cursor-not-allowed disabled:opacity-45">
              {billingLoading
                ? (zh ? "正在检查 Stripe Test Mode…" : "Checking Stripe Test Mode…")
                : currentUser
                  ? plan === "pro"
                    ? (zh ? "管理 Preview 测试订阅" : "Manage Preview test subscription")
                    : (zh ? "测试 Pro 订阅流程" : "Test Pro subscription flow")
                  : (zh ? "登录后测试订阅" : "Sign in to test subscription")}
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-[#9f8c74]">
              {zh ? "仅允许 Vercel Preview + Stripe Test Mode；不会操作生产订阅或真实收费。正式价格仍待产品决定。" : "Vercel Preview + Stripe Test Mode only. No production subscription or real charge. Final pricing remains undecided."}
            </p>
            {billingMessage && <p role="status" className="mt-3 rounded-xl bg-red-950/25 p-3 text-sm text-red-100/85">{billingMessage}</p>}
          </div>
        </StudyPanel>
      )}
    </main>
  );
};

const StudyHotspot: React.FC<{ className: string; label: string; icon: React.ReactNode; onClick: () => void; desktop?: boolean }> = ({ className, label, icon, onClick, desktop }) => (
  <button
    onClick={onClick}
    className={`group absolute z-20 ${desktop ? "hidden md:block" : ""} ${className}`}
    aria-label={label}
  >
    <span className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/0 bg-[#20150e]/0 px-3 py-2 text-xs text-transparent transition-all duration-300 group-hover:border-white/12 group-hover:bg-[#20150e]/55 group-hover:text-[#fff4df] group-focus-visible:border-white/15 group-focus-visible:bg-[#20150e]/65 group-focus-visible:text-[#fff4df]">
      {icon}{label}<ChevronRight size={13} />
    </span>
  </button>
);

const MobileObjectButton: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void }> = ({ label, icon, onClick }) => (
  <button onClick={onClick} className="flex min-w-[52px] flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[#f8ead5] hover:bg-white/8" aria-label={label}>
    {icon}<span className="text-[9px]">{label}</span>
  </button>
);

const StudyPanel: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-2xl rounded-[28px] border border-[#e8cfaa]/15 bg-[#2a2018]/96 p-6 shadow-2xl sm:p-8">
      <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-[#cfb99e] hover:bg-white/5 hover:text-white" aria-label="Close"><X size={18} /></button>
      <h2 className="mb-7 pr-10 font-serif text-2xl text-[#fff0d8]">{title}</h2>
      {children}
    </section>
  </div>
);

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
};

export default V5StudyShell;
