export type Language = 'en' | 'zh';

export type ViewType = 'home' | 'journal' | 'manifestation' | 'history';

export interface User {
  email: string;
  name: string;
  password?: string; // stored locally for simulation
  reminderTime?: string; // HH:MM format for daily reminder
}

export interface JournalEntry {
  id: string;
  date: string;
  // Mandatory
  event: string;
  gratitude: string;
  reflection: string;
  selfTalk: string;
  // Optional
  angelNumbers?: string;
  specialEvents?: string;
  dreams?: string;
  loveTarget?: string;
  apologyTarget?: string;
  additionalNotes?: string; // For post-insight additions
  
  // System Generated
  aiResponse?: string;
  createdAt: number;
}

export interface ManifestationItem {
  id: string;
  date: string;
  // Mandatory
  goal: string;
  expectedDate: string;
  // Optional
  reason?: string;
  beneficiaries?: string;
  
  // Status
  status: 'active' | 'completed' | 'delayed';
  notes?: string; // User reflection on progress
  aiGuidance?: string;
  createdAt: number;
}

export interface InsightLoopResponse {
  energyAnchor: string;
  awarenessSummary: string;
  patterns: string;
  choicePoint: string;
  universeMessage: string;
  invitation: string;
}