import React, { useEffect, useState } from "react";
import { CompanionId } from "../types";

export type CompanionAction =
  | "idle-breathe"
  | "welcome"
  | "listening"
  | "voice-listening"
  | "writing"
  | "thinking"
  | "gentle-question"
  | "review-today"
  | "browse-archive"
  | "memory-found"
  | "pattern-found"
  | "soft-sigh"
  | "comfort"
  | "quiet-celebrate"
  | "save-complete"
  | "resting";

export type EggAction = "idle" | "hatch";

interface CompanionMediaProps {
  companion: CompanionId;
  action: CompanionAction;
  className?: string;
  loop?: boolean;
  onEnded?: () => void;
  label?: string;
}

interface EggMediaProps {
  companion: CompanionId;
  action: EggAction;
  className?: string;
  loop?: boolean;
  onEnded?: () => void;
  label?: string;
}

const companionFallback = {
  phoenix: { mark: "✦", color: "from-orange-300 via-amber-300 to-rose-300", name: "凤凰" },
  thunder: { mark: "ϟ", color: "from-sky-300 via-indigo-300 to-violet-300", name: "小雷公" },
} as const;

const previewMascotBase =
  "https://raw.githubusercontent.com/passiongrow88/InsightLoop/058eb4b722937a4191e9b43e44bced9b4db55ed2/public/mascots";

function mascotSource(path: string) {
  const configuredBase = import.meta.env.VITE_MASCOT_BASE_URL?.replace(/\/$/, "");
  if (configuredBase) return `${configuredBase}/${path}`;

  const host = window.location.hostname;
  const sameOrigin =
    host === "insightloop.lol" ||
    host === "www.insightloop.lol" ||
    host === "localhost" ||
    host === "127.0.0.1";
  const base = sameOrigin ? "/mascots" : previewMascotBase;
  return `${base}/${path}`;
}

function AnimationOrFallback({
  source,
  className = "",
  loop = true,
  onEnded,
  label,
  companion,
}: {
  source: string;
  className?: string;
  loop?: boolean;
  onEnded?: () => void;
  label?: string;
  companion: CompanionId;
}) {
  const [available, setAvailable] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const fallback = companionFallback[companion];

  useEffect(() => {
    setAvailable(true);
    setLoaded(false);
  }, [source]);

  useEffect(() => {
    if (loop || !onEnded || !available || !loaded) return;
    const timer = window.setTimeout(onEnded, 5100);
    return () => window.clearTimeout(timer);
  }, [available, loaded, loop, onEnded, source]);

  if (!available) {
    return (
      <div
        aria-label={label || fallback.name}
        className={`relative flex items-center justify-center rounded-[38%] bg-gradient-to-br ${fallback.color} shadow-[0_16px_48px_rgba(82,58,35,.16)] ${className}`}
      >
        <span className="select-none font-serif text-5xl text-white/90 drop-shadow-sm" aria-hidden="true">{fallback.mark}</span>
      </div>
    );
  }

  return (
    <img
      key={source}
      src={source}
      alt={label || fallback.name}
      decoding="async"
      draggable={false}
      aria-label={label || fallback.name}
      className={`object-contain ${className}`}
      onLoad={() => setLoaded(true)}
      onError={() => setAvailable(false)}
    />
  );
}

/**
 * Only transparent animated WebP derivatives belong in public/mascots.
 * Original green-screen MP4s stay outside the web bundle. Animated WebP is
 * used here because browser rendering preserves its alpha channel reliably.
 */
export function CompanionMedia({ companion, action, ...props }: CompanionMediaProps) {
  return (
    <AnimationOrFallback
      companion={companion}
      source={mascotSource(`${companion}/${action}.webp`)}
      {...props}
    />
  );
}

export function EggMedia({ companion, action, ...props }: EggMediaProps) {
  return (
    <AnimationOrFallback
      companion={companion}
      source={mascotSource(`eggs/${companion}-${action}.webp`)}
      {...props}
    />
  );
}
