// types.ts

export type Language = "zh" | "en";

export type ViewType =
  | "home"
  | "journal"
  | "manifestation"
  | "history"
  | "billing"
  | "member-space"  // âœ… æ–°å¢žï¼šä¼šå‘˜ç©ºé—´
  | "admin";        // âœ… æ–°å¢žï¼šç®¡ç†å‘˜åŽå°

export interface User {
  id?: string;
  email: string;
  name?: string;
  reminderTime?: string;
}

export interface JournalEntry {
  createdAt: number;
  aiResponse?: string;
  responseStatus?: "pending" | "ready" | "failed";
  additionalNotes?: string;
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
  createdAt: number;
  status?: 'active' | 'completed' | 'delayed';
  beneficiaries?: string;
  aiGuidance?: string;
  date?: string;
  id: string;
  goal: string;
  expectedDate: string;
  reason?: string;

  // optional cloud owner
  user_id?: string;
}

// âœ… æ–°å¢žï¼šä¼šå‘˜ç©ºé—´èµ„æºç±»åž‹
export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: 'ebook' | 'video' | 'course' | 'link';
  file_url: string | null;
  thumbnail_url: string | null;
  access_level: 'free' | 'pro' | 'paid';
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

