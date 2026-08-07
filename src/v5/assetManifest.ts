// InsightLoop V5 runtime asset manifest.
//
// Production rule:
// - Final production must serve assets from /public/v5 or an approved public CDN.
// - Private Google Drive is NEVER the production runtime dependency.
//
// Preview rule:
// - The Drive download URLs below are a TEMPORARY founder-preview fallback so the
//   founder-approved Seedance assets can be wired into V5 before final CDN ingestion.
// - The local/static path remains first and is the required production destination.

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
    previewFallback: driveDownload("1da8ocmgMvHTKHk08zPdWPyYZy3G8fgBL"),
    poster: drivePoster("1mx9Sx8mBrB1YTgWKHzwRjc9lx93E_96P", 1920),
  },
  studyMobile: {
    local: "/v5/animations/S02_no-watermark.mp4",
    previewFallback: driveDownload("1zCgL6u5kBtSol7MQDJrX_clVg14EndQa"),
    poster: drivePoster("1xs-GpX3MQC3X2qumonF11nxUj3OsoVFG", 1200),
  },
  journalFly: {
    local: "/v5/animations/S03_no-watermark.mp4",
    previewFallback: driveDownload("1_wzak6EeCtJmr28ryckXu723rnbBwTyx"),
  },
  journalOpen: {
    local: "/v5/animations/S04_no-watermark.mp4",
    previewFallback: driveDownload("1xLYbNuCKR9LVAy_hyzsgCA7q74a-3ywc"),
    poster: drivePoster("1PPc-YGbnmGe--WPqIqnHPbX_80vnGS5x", 1600),
  },
  journalTurn: {
    local: "/v5/animations/S05_no-watermark.mp4",
    previewFallback: driveDownload("1iDZCH-khmkVOOd8urrzkgXI09SI9I0wg"),
  },
  quillThink: {
    local: "/v5/animations/S06_no-watermark.mp4",
    previewFallback: driveDownload("1hBAyGmkSZdRG9DOWhq-X3HfvC_pKoLJB"),
  },
  eggDay7: {
    local: "/v5/animations/S07_no-watermark.mp4",
    previewFallback: driveDownload("1OjsN742Jabov9W_eZxXJAmcNiX-Z9KYi"),
    poster: drivePoster("1By78HzX7XK9TUmA7SEkKchRCXDSlhQtu", 800),
  },
  shipWheelConfirm: {
    local: "/v5/animations/S08_no-watermark.mp4",
    previewFallback: driveDownload("1fETGuRqzS3dgt18PQG2bBV4dylS-O-JP"),
  },
  dreamcatcherReceive: {
    local: "/v5/animations/S09_no-watermark.mp4",
    previewFallback: driveDownload("1MQA1IvNYeO2d7XGR10lN1-roQuj2Xvr5"),
  },
  recordPlayerStart: {
    local: "/v5/animations/S10_no-watermark.mp4",
    previewFallback: driveDownload("1Nfz6obrZAkY_F4xS3-oWF9u8eVDcYxCF"),
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
