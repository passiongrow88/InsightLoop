export type Language = "zh" | "en";

export type ViewType =
  | "home"
  | "journal"
  | "manifestation"
  | "history"
  | "billing"
  | "member-space"
  | "admin";

export type MascotType = "phoenix" | "thunderDino";

export type PhoenixState =
  | "idle"
  | "greeting"
  | "listening"
  | "writing"
  | "thinking"
  | "searchingMemory"
  | "clarifying"
  | "presenting"
  | "celebrating"
  | "concerned"
  | "error";

export type JournalFlowStage =
  | "chooseMascot"
  | "nameMascot"
  | "nameUser"
  | "intro"
  | "writing"
  | "generating"
  | "result"
  | "saved";

export interface MascotPreference {
  mascotType: MascotType;
  mascotName: string;
  userDisplayName: string;
  onboardingCompletedAt: number;
}

export interface User {
  id?: string;
  email: string;
  name?: string;
  reminderTime?: string;
}

export interface JournalEntry {
  createdAt: number;
  aiResponse?: string;
  insight?: string;
  additionalNotes?: string;
  id: string;
  date: string;
  event: string;
  reflection: string;
  gratitude: string;
  selfTalk: string;
  angelNumbers?: string;
  dreams?: string;
  loveTarget?: string;
  apologyTarget?: string;
  user_id?: string;
}

export interface ManifestationItem {
  createdAt: number;
  status?: "active" | "completed" | "delayed";
  beneficiaries?: string;
  aiGuidance?: string;
  date?: string;
  id: string;
  goal: string;
  expectedDate: string;
  reason?: string;
  user_id?: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: "ebook" | "video" | "course" | "link";
  file_url: string | null;
  thumbnail_url: string | null;
  access_level: "free" | "pro" | "paid";
  price: number | null;
  download_count: number;
  view_count: number;
  author: string | null;
  duration_minutes: number | null;
  file_size_mb: number | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: string;
}
