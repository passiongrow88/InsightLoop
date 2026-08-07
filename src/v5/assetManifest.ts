// InsightLoop V5 runtime asset manifest.
//
// Production rule:
// - Final production must serve assets from /public/v5 or an approved public CDN.
// - Private Google Drive is NEVER the production runtime dependency.
//
// Preview rule:
// - The Drive download URLs below are a TEMPORARY founder-preview fallback so the
//   already-approved Seedance assets can be wired into the V5 UI before final CDN
//   ingestion. The first source is always the future local/static production path.

export interface V5VideoAsset {
  local: string;
  previewFallback: string;
  poster?: string;
}

const driveDownload = (id: string) =>
  `https://drive.usercontent.google.com/download?id=${id}&export=download`;

const drivePoster = (id: string, width = 1920) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;

export const V5_ASSETS = {
  studyDesktop: {
    local: "/v5/animations/S01_no-watermark.mp4",
    previewFallback: driveDownload("1CUfbSevQP7oJnzk1sg36bNaFkf9yyXK5"),
    poster: drivePoster("1mx9Sx8mBrB1YTgWKHzwRjc9lx93E_96P", 1920),
  },
  studyMobile: {
    local: "/v5/animations/S02_no-watermark.mp4",
    previewFallback: driveDownload("116Nce0bZl0hSJXWyuix8042CyxcWouK3"),
    poster: drivePoster("1xs-GpX3MQC3X2qumonF11nxUj3OsoVFG", 1200),
  },
  journalFly: {
    local: "/v5/animations/S03_no-watermark.mp4",
    previewFallback: driveDownload("1mKnML0W_fiDNAxB-sENvzuwX-71I8V5P"),
  },
  journalOpen: {
    local: "/v5/animations/S04_no-watermark.mp4",
    previewFallback: driveDownload("1deOgAyRc1KP59izuC1NkXB7S5ZVlGNdA"),
    poster: drivePoster("1PPc-YGbnmGe--WPqIqnHPbX_80vnGS5x", 1600),
  },
  journalTurn: {
    local: "/v5/animations/S05_no-watermark.mp4",
    previewFallback: driveDownload("1M4xCGBbEh3-OM-4TDDbjisP6DeKFhPTb"),
  },
  quillThink: {
    local: "/v5/animations/S06_no-watermark.mp4",
    previewFallback: driveDownload("1JE7vmVxEvpX1x8eoaOzNpIudli5ZEIA7"),
  },
  eggDay7: {
    local: "/v5/animations/S07_no-watermark.mp4",
    previewFallback: driveDownload("1iXN0wCsQj5ldIEzvH7C01mYIF75xuAY8"),
    poster: drivePoster("1By78HzX7XK9TUmA7SEkKchRCXDSlhQtu", 800),
  },
  shipWheelConfirm: {
    local: "/v5/animations/S08_no-watermark.mp4",
    previewFallback: driveDownload("1gUnt1z93v1yj21MC_gHia0Vnhht9e4xt"),
  },
  dreamcatcherReceive: {
    local: "/v5/animations/S09_no-watermark.mp4",
    previewFallback: driveDownload("1rpimKZWKZNe4ovhco6UHyUjsaAwvqEoz"),
  },
  recordPlayerStart: {
    local: "/v5/animations/S10_no-watermark.mp4",
    previewFallback: driveDownload("1yhEwSOsBEagGOZqLmBplJOT6gKa4ro6Y"),
  },
} satisfies Record<string, V5VideoAsset>;

export const V5_ASSET_ARCHIVE = {
  sourceFolder:
    "https://drive.google.com/drive/folders/1ae756-3v4jwJLeWULYvi8XX5C6UQ3qVY",
  noWatermarkFolder:
    "https://drive.google.com/drive/folders/1RIcHb-zNPf_ITuG07D_aceuej_aHeBCJ",
  qcContactSheetId: "15eVu7nu5tcoHkY6E4BXTXdTyZeAP5Aqq",
  sha256Id: "11MB7Cs_V2MifpWHN4sKCf_Mt6pW_dsrU",
} as const;
