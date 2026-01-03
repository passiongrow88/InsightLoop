// types.ts

export type Language = "zh" | "en";

export type ViewType =
  | "home"
  | "journal"
  | "manifestation"
  | "history"
  | "billing";

export interface User {
  email: string;
  name?: string;
  reminderTime?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  event: string;
  reflection: string;
  gratitude: string;
  selfTalk: string;

  // optional fields used in your gemini prompt
  angelNumbers?: string;
  dreams?: string;
  loveTarget?: string;
  apologyTarget?: string;

  // optional cloud owner
  user_id?: string;
}

export interface ManifestationItem {
  id: string;
  goal: string;
  expectedDate: string;
  reason?: string;

  // optional cloud owner
  user_id?: string;
}
