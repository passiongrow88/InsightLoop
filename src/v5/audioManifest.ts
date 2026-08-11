export interface V5AudioSources {
  opus: string;
  aac: string;
}

const sources = (name: string): V5AudioSources => ({
  opus: `/v5/audio/${name}.ogg`,
  aac: `/v5/audio/${name}.m4a`,
});

export const V5_AUDIO = {
  rain: sources("rain"),
  fireplace: sources("fireplace"),
  quillWriting: [
    sources("quill-writing-01"),
    sources("quill-writing-02"),
    sources("quill-writing-03"),
  ],
  bookOnTable: sources("book-on-table"),
} as const;

export const V5_AUDIO_PROVENANCE = {
  source: "Founder-provided WAV uploads",
  receivedAt: "2026-08-11",
  previewUse: "Founder supplied for InsightLoop V5 Preview implementation",
  productionRelease: "Production/public distribution rights evidence remains to be documented before production release",
  processing: "Silence trim, loop crossfade, true-peak limiting, loudness balancing, 48 kHz master processing, OGG Opus, and AAC fallback encoding",
} as const;
