import { useEffect, useRef, useState } from "react";

export interface AmbientMix {
  enabled: boolean;
  rain: boolean;
  fire: boolean;
  volume: number;
}

const AMBIENT_KEY = "insightLoop:v5:ambient:v1";
const DEFAULT_MIX: AmbientMix = { enabled: false, rain: true, fire: true, volume: 0.35 };

type BrowserAudioContext = AudioContext & { resume: () => Promise<void> };

const loadMix = (): AmbientMix => {
  try {
    const stored = JSON.parse(localStorage.getItem(AMBIENT_KEY) || "null");
    return {
      enabled: false,
      rain: typeof stored?.rain === "boolean" ? stored.rain : DEFAULT_MIX.rain,
      fire: typeof stored?.fire === "boolean" ? stored.fire : DEFAULT_MIX.fire,
      volume: typeof stored?.volume === "number" ? Math.min(1, Math.max(0, stored.volume)) : DEFAULT_MIX.volume,
    };
  } catch {
    return DEFAULT_MIX;
  }
};

class AmbientAudioEngine {
  private context: BrowserAudioContext | null = null;
  private master: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private fireGain: GainNode | null = null;
  private sources: AudioBufferSourceNode[] = [];
  private rainTimer: number | null = null;
  private fireTimer: number | null = null;
  private mix: AmbientMix = DEFAULT_MIX;

  setMix(next: AmbientMix) {
    this.mix = next;
    if (next.enabled) this.ensureStarted();
    this.applyMix();
  }

  playWriting(durationMs = 2400) {
    if (!this.mix.enabled) return;
    this.ensureStarted();
    if (!this.context || !this.master) return;
    const context = this.context;
    const duration = Math.max(0.5, durationMs / 1000);
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const paperGrain = Math.sin(i / 17) * 0.34 + Math.sin(i / 53) * 0.2;
      const stroke = 0.42 + 0.58 * Math.abs(Math.sin(i / 1050));
      data[i] = (Math.random() * 2 - 1) * (0.08 + Math.abs(paperGrain) * 0.1) * stroke;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1550;
    filter.Q.value = 0.65;
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.008, context.currentTime + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
  }

  private ensureStarted() {
    if (!this.context) this.buildGraph();
    if (this.context?.state === "suspended") void this.context.resume().catch(() => undefined);
  }

  private buildGraph() {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const context = new AudioCtx() as BrowserAudioContext;
    const master = context.createGain();
    const rainGain = context.createGain();
    const fireGain = context.createGain();
    master.gain.value = 0;
    rainGain.gain.value = 0;
    fireGain.gain.value = 0;
    rainGain.connect(master);
    fireGain.connect(master);
    master.connect(context.destination);

    const rainSource = context.createBufferSource();
    rainSource.buffer = this.makeNoiseBuffer(context, "white");
    rainSource.loop = true;
    const rainHigh = context.createBiquadFilter();
    const rainLow = context.createBiquadFilter();
    rainHigh.type = "highpass";
    rainHigh.frequency.value = 1150;
    rainLow.type = "lowpass";
    rainLow.frequency.value = 7200;
    rainSource.connect(rainHigh).connect(rainLow).connect(rainGain);

    const fireSource = context.createBufferSource();
    fireSource.buffer = this.makeNoiseBuffer(context, "brown");
    fireSource.loop = true;
    const fireLow = context.createBiquadFilter();
    fireLow.type = "lowpass";
    fireLow.frequency.value = 520;
    fireLow.Q.value = 0.7;
    fireSource.connect(fireLow).connect(fireGain);

    rainSource.start();
    fireSource.start();
    this.context = context;
    this.master = master;
    this.rainGain = rainGain;
    this.fireGain = fireGain;
    this.sources = [rainSource, fireSource];
    this.scheduleRaindrop();
    this.scheduleCrackle();
  }

  private makeNoiseBuffer(context: AudioContext, color: "white" | "brown") {
    const length = context.sampleRate * 4;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (color === "brown") {
        last = (last + 0.018 * white) / 1.018;
        data[i] = last * 2.7;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  private applyMix() {
    if (!this.context || !this.master || !this.rainGain || !this.fireGain) return;
    const now = this.context.currentTime;
    const target = this.mix.enabled ? 0.22 * this.mix.volume : 0.0001;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(Math.max(0.0001, target), now, 0.22);
    this.rainGain.gain.setTargetAtTime(this.mix.rain ? 0.32 : 0.0001, now, 0.2);
    this.fireGain.gain.setTargetAtTime(this.mix.fire ? 0.38 : 0.0001, now, 0.2);
  }

  private scheduleRaindrop() {
    this.rainTimer = window.setTimeout(() => {
      if (this.context && this.master && this.mix.enabled && this.mix.rain) {
        const now = this.context.currentTime;
        const tone = this.context.createOscillator();
        const gain = this.context.createGain();
        tone.type = "sine";
        tone.frequency.setValueAtTime(2300 + Math.random() * 2600, now);
        tone.frequency.exponentialRampToValueAtTime(1250 + Math.random() * 500, now + 0.07);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.016 + Math.random() * 0.015, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        tone.connect(gain).connect(this.master);
        tone.start(now);
        tone.stop(now + 0.12);
      }
      this.scheduleRaindrop();
    }, 420 + Math.random() * 1250);
  }

  private scheduleCrackle() {
    this.fireTimer = window.setTimeout(() => {
      if (this.context && this.master && this.mix.enabled && this.mix.fire) {
        const duration = 0.035 + Math.random() * 0.065;
        const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) {
          const fade = 1 - i / data.length;
          data[i] = (Math.random() * 2 - 1) * fade * fade;
        }
        const source = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();
        source.buffer = buffer;
        filter.type = "bandpass";
        filter.frequency.value = 650 + Math.random() * 1500;
        filter.Q.value = 0.8;
        gain.gain.value = 0.035 + Math.random() * 0.035;
        source.connect(filter).connect(gain).connect(this.master);
        source.start();
      }
      this.scheduleCrackle();
    }, 700 + Math.random() * 2100);
  }

  dispose() {
    if (this.rainTimer !== null) window.clearTimeout(this.rainTimer);
    if (this.fireTimer !== null) window.clearTimeout(this.fireTimer);
    this.sources.forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    void this.context?.close().catch(() => undefined);
    this.context = null;
    this.sources = [];
  }
}

export const useAmbientSound = () => {
  const [mix, setMixState] = useState<AmbientMix>(loadMix);
  const engineRef = useRef<AmbientAudioEngine | null>(null);

  if (!engineRef.current && typeof window !== "undefined") engineRef.current = new AmbientAudioEngine();

  const updateMix = (next: AmbientMix) => {
    setMixState(next);
    localStorage.setItem(AMBIENT_KEY, JSON.stringify({ ...next, enabled: false }));
    engineRef.current?.setMix(next);
  };

  useEffect(() => () => engineRef.current?.dispose(), []);

  return {
    mix,
    setEnabled: (enabled: boolean) => updateMix({ ...mix, enabled }),
    setRain: (rain: boolean) => updateMix({ ...mix, rain }),
    setFire: (fire: boolean) => updateMix({ ...mix, fire }),
    setVolume: (volume: number) => updateMix({ ...mix, volume }),
    playWriting: (durationMs: number) => engineRef.current?.playWriting(durationMs),
  };
};
