import "./types";

declare module "./types" {
  interface JournalEntry {
    createdAt: number;
    additionalNotes?: string;
    aiResponse?: string;
  }

  interface ManifestationItem {
    createdAt: number;
    status?: "active" | "completed" | "delayed";
    beneficiaries?: string;
    aiGuidance?: string;
  }
}
