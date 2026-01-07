// types.ts

export type Language = "zh" | "en";

export type ViewType =
  | "home"
  | "journal"
  | "manifestation"
  | "history"
  | "billing"
  | "member-space"  // ✅ 新增：会员空间
  | "admin";        // ✅ 新增：管理员后台

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

// ✅ 新增：会员空间资源类型
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
