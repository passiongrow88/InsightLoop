// InsightLoop V5 runtime asset manifest.
//
// Runtime rule:
// - Approved V5 assets are served from /public/v5.
// - Private Google Drive is archive/source provenance only, never a browser runtime
//   dependency. Drive download URLs redirect unauthenticated video requests to the
//   Google login page and therefore cannot be used as a reliable <video> source.

export interface V5VideoAsset {
  local: string;
  previewFallback?: string;
  poster?: string;
}

const poster = (id: string) => `/v5/posters/${id}.webp`;

export const V5_ASSETS = {
  studyDesktop: {
    local: "/v5/animations/S01_no-watermark.mp4",
    poster: poster("S01"),
  },
  studyMobile: {
    local: "/v5/animations/S02_no-watermark.mp4",
    poster: poster("S02"),
  },
  journalFly: {
    local: "/v5/animations/S03_no-watermark.mp4",
    poster: poster("S03"),
  },
  journalOpen: {
    local: "/v5/animations/S04_no-watermark.mp4",
    poster: poster("S04"),
  },
  journalTurn: {
    local: "/v5/animations/S05_no-watermark.mp4",
    poster: poster("S05"),
  },
  quillThink: {
    local: "/v5/animations/S06_no-watermark.mp4",
    poster: poster("S06"),
  },
  eggDay7: {
    local: "/v5/animations/S07_no-watermark.mp4",
    poster: poster("S07"),
  },
  shipWheelConfirm: {
    local: "/v5/animations/S08_no-watermark.mp4",
    poster: poster("S08"),
  },
  dreamcatcherReceive: {
    local: "/v5/animations/S09_no-watermark.mp4",
    poster: poster("S09"),
  },
  recordPlayerStart: {
    local: "/v5/animations/S10_no-watermark.mp4",
    poster: poster("S10"),
  },
} satisfies Record<string, V5VideoAsset>;

export const V5_ASSET_ARCHIVE = {
  sourceFolder:
    "https://drive.google.com/drive/folders/1ae756-3v4jwJLeWULYvi8XX5C6UQ3qVY",
  finalNoWatermarkFolder:
    "https://drive.google.com/drive/folders/1ae756-3v4jwJLeWULYvi8XX5C6UQ3qVY",
  qcContactSheetId: "1GO5sWLEl4FCNhQWCP6X9NrpB0RoNE8VX",
  sha256Id: "1du3FOclnGyILm63cPfrQ1-c1pGMQFo5B",
  finalZipId: "1K31ckHPiAq2Kf6HHmWSMA6fFozyXgCtN",
} as const;
