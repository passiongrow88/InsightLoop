import { useCallback, useEffect, useRef, useState } from "react";
import { V5_AUDIO, V5AudioSources } from "./audioManifest";

export interface AmbientMix {
  enabled: boolean;
  rain: boolean;
  fire: boolean;
  volume: number;
}

const AMBIENT_KEY = "insightLoop:v5:ambient:v2";
const DEFAULT_MIX: AmbientMix = { enabled: false, rain: true, fire: true, volume: 0.35 };

const loadMix = (): AmbientMix => {
  if (typeof window === "undefined") return DEFAULT_MIX;
  try {
    const stored = JSON.parse(localStorage.getItem(AMBIENT_KEY) || "null");
    return {
      // Never autoplay sound on a fresh page load. The visitor must enable it.
      enabled: false,
      rain: typeof stored?.rain === "boolean" ? stored.rain : DEFAULT_MIX.rain,
      fire: typeof stored?.fire === "boolean" ? stored.fire : DEFAULT_MIX.fire,
      volume: typeof stored?.volume === "number" ? Math.min(1, Math.max(0.1, stored.volume)) : DEFAULT_MIX.volume,
    };
  } catch {
    return DEFAULT_MIX;
  }
};

class AmbientAudioEngine {
  private mix: AmbientMix = DEFAULT_MIX;
  private rainAudio: HTMLAudioElement | null = null;
  private fireAudio: HTMLAudioElement | null = null;
  private writingAudio: HTMLAudioElement | null = null;
  private bookAudio: HTMLAudioElement | null = null;
  private writingTimer: number | null = null;
  private writingIndex = 0;

  setMix(next: AmbientMix) {
    this.mix = next;
    if (next.enabled) this.ensureAmbience();
    this.applyMix();
  }

  playWriting(durationMs = 2400) {
    if (!this.mix.enabled) return;
    this.stopWriting();

    const source = V5_AUDIO.quillWriting[this.writingIndex % V5_AUDIO.quillWriting.length];
    this.writingIndex += 1;
    const audio = this.makeAudio(source, true);
    audio.volume = Math.min(1, this.mix.volume * 0.72);
    this.writingAudio = audio;
    void audio.play().catch(() => undefined);
    this.writingTimer = window.setTimeout(() => this.stopWriting(), Math.max(500, durationMs));
  }

  playBookOnTable() {
    if (!this.mix.enabled) return;
    this.bookAudio?.pause();
    const audio = this.makeAudio(V5_AUDIO.bookOnTable, false);
    audio.volume = Math.min(1, this.mix.volume * 0.65);
    this.bookAudio = audio;
    audio.onended = () => {
      if (this.bookAudio === audio) this.bookAudio = null;
    };
    void audio.play().catch(() => undefined);
  }

  private makeAudio(sources: V5AudioSources, loop: boolean) {
    const probe = document.createElement("audio");
    const source = probe.canPlayType('audio/ogg; codecs="opus"') ? sources.opus : sources.aac;
    const audio = new Audio(source);
    audio.preload = "auto";
    audio.loop = loop;
    return audio;
  }

  private ensureAmbience() {
    if (!this.rainAudio) this.rainAudio = this.makeAudio(V5_AUDIO.rain, true);
    if (!this.fireAudio) this.fireAudio = this.makeAudio(V5_AUDIO.fireplace, true);
  }

  private applyMix() {
    if (!this.mix.enabled) {
      this.rainAudio?.pause();
      this.fireAudio?.pause();
      this.stopWriting();
      this.bookAudio?.pause();
      this.bookAudio = null;
      return;
    }

    this.ensureAmbience();
    if (this.rainAudio) {
      this.rainAudio.volume = Math.min(1, this.mix.volume * 0.46);
      this.setPlaying(this.rainAudio, this.mix.rain);
    }
    if (this.fireAudio) {
      this.fireAudio.volume = Math.min(1, this.mix.volume * 0.36);
      this.setPlaying(this.fireAudio, this.mix.fire);
    }
    if (this.writingAudio) this.writingAudio.volume = Math.min(1, this.mix.volume * 0.72);
  }

  private setPlaying(audio: HTMLAudioElement, shouldPlay: boolean) {
    if (shouldPlay) {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }

  private stopWriting() {
    if (this.writingTimer !== null) window.clearTimeout(this.writingTimer);
    this.writingTimer = null;
    if (this.writingAudio) {
      this.writingAudio.pause();
      this.writingAudio.currentTime = 0;
      this.writingAudio = null;
    }
  }

  dispose() {
    this.stopWriting();
    [this.rainAudio, this.fireAudio, this.bookAudio].forEach((audio) => {
      if (!audio) return;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    });
    this.rainAudio = null;
    this.fireAudio = null;
    this.bookAudio = null;
  }
}

export const useAmbientSound = () => {
  const [mix, setMixState] = useState<AmbientMix>(loadMix);
  const mixRef = useRef(mix);
  const engineRef = useRef<AmbientAudioEngine | null>(null);

  if (!engineRef.current && typeof window !== "undefined") engineRef.current = new AmbientAudioEngine();

  const updateMix = useCallback((update: (current: AmbientMix) => AmbientMix) => {
    const next = update(mixRef.current);
    mixRef.current = next;
    setMixState(next);
    localStorage.setItem(AMBIENT_KEY, JSON.stringify({ ...next, enabled: false }));
    engineRef.current?.setMix(next);
  }, []);

  useEffect(() => () => engineRef.current?.dispose(), []);

  return {
    mix,
    setEnabled: useCallback((enabled: boolean) => updateMix((current) => ({ ...current, enabled })), [updateMix]),
    setRain: useCallback((rain: boolean) => updateMix((current) => ({ ...current, rain })), [updateMix]),
    setFire: useCallback((fire: boolean) => updateMix((current) => ({ ...current, fire })), [updateMix]),
    setVolume: useCallback((volume: number) => updateMix((current) => ({ ...current, volume })), [updateMix]),
    playWriting: useCallback((durationMs: number) => engineRef.current?.playWriting(durationMs), []),
    playBookOnTable: useCallback(() => engineRef.current?.playBookOnTable(), []),
  };
};
