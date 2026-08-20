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

// Keep the checked-in /public/v5 bundle as the default. Preview deployments
// that cannot upload the large media bundle can point at an immutable CDN
// copy with VITE_V5_ASSET_BASE, without changing production behavior.
const assetBase = ((import.meta.env.VITE_V5_ASSET_BASE as string) || "/v5").replace(/\/$/, "");
const asset = (path: string) => `${assetBase}/${path}`;
const poster = (id: string) => asset(`posters/${id}.webp`);

export const V5_ASSETS = {
  studyDesktop: {
    local: asset("animations/S01_no-watermark.mp4"),
    poster: poster("S01"),
  },
  studyMobile: {
    local: asset("animations/S02_no-watermark.mp4"),
    poster: poster("S02"),
  },
  journalFly: {
    local: asset("animations/S03_no-watermark.mp4"),
    poster: poster("S03"),
  },
  journalOpen: {
    local: asset("animations/S04_no-watermark.mp4"),
    poster: poster("S04"),
  },
  journalTurn: {
    local: asset("animations/S05_no-watermark.mp4"),
    poster: poster("S05"),
  },
  quillThink: {
    local: asset("animations/S06_no-watermark.mp4"),
    poster: poster("S06"),
  },
  eggDay7: {
    local: asset("animations/S07_no-watermark.mp4"),
    poster: poster("S07"),
  },
  shipWheelConfirm: {
    local: asset("animations/S08_no-watermark.mp4"),
    poster: poster("S08"),
  },
  dreamcatcherReceive: {
    local: asset("animations/S09_no-watermark.mp4"),
    poster: poster("S09"),
  },
  recordPlayerStart: {
    local: asset("animations/S10_no-watermark.mp4"),
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
