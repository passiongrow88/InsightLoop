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
  "https://raw.githubusercontent.com/passiongrow88/InsightLoop/9151601c789a02db9ae3638e3bf411e1c65be130/public/mascots";

function mascotSource(path: string) {
  const configuredBase = import.meta.env.VITE_MASCOT_BASE_URL?.replace(/\/$/, "");
  if (configuredBase) return `${configuredBase}/${path}`;

  // Keep the real production domain self-contained. Preview deployments load
  // the same immutable media commit from GitHub so the Vercel source upload
  // stays below its 4 MB connector limit.
  const host = window.location.hostname;
  const base = host === "insightloop.lol" || host === "www.insightloop.lol"
    ? "/mascots"
    : previewMascotBase;
  return `${base}/${path}`;
}

function VideoOrFallback({
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
  const fallback = companionFallback[companion];

  useEffect(() => setAvailable(true), [source]);

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
    <video
      key={source}
      autoPlay
      muted
      playsInline
      loop={loop}
      preload="metadata"
      aria-label={label || fallback.name}
      className={`object-contain ${className}`}
      onEnded={onEnded}
      onError={() => setAvailable(false)}
    >
      <source src={source} type="video/webm" />
    </video>
  );
}

/**
 * Only transparent WebM derivatives belong in public/mascots. Original MP4s
 * stay outside the web bundle. The visual fallback is intentional: it avoids
 * pretending that a state animation is present when an asset fails to load.
 */
export function CompanionMedia({ companion, action, ...props }: CompanionMediaProps) {
  return (
    <VideoOrFallback
      companion={companion}
      source={mascotSource(`${companion}/${action}.webm`)}
      {...props}
    />
  );
}

export function EggMedia({ companion, action, ...props }: EggMediaProps) {
  return (
    <VideoOrFallback
      companion={companion}
      source={mascotSource(`eggs/${companion}-${action}.webm`)}
      {...props}
    />
  );
}
