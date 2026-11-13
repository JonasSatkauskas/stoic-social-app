export type Level = 'easy' | 'medium' | 'brave';
export type Category = 'outside' | 'people' | 'unplug' | 'notice' | 'body' | 'create';

export interface Challenge {
  id: string;
  title: string;
  category: Category;
  easy: string;
  medium: string;
  brave: string;
  indoor: string;
  why: string;
  pen: string;
}

export interface DayEntry {
  challengeId: string;
  swapped: boolean;
  done?: { level: Level; indoor: boolean; at: number };
  pen?: 'wrote' | 'skipped';
  /** Added by the demo shortcut, not by the user. */
  demo?: boolean;
}

/** What friends may see about a completion: date, challenge id, level. */
export interface Completion {
  d: string;
  id: string;
  l: Level;
}

/** Stones come from challenges, marks (inscriptions) from writing. */
export interface CairnState {
  stones: number;
  marks: number;
  visitors: Partial<Record<Category, number>>;
}

export interface AppData {
  days: Record<string, DayEntry>;
  extra: { stones: number; marks: number };
  profile: { name: string | null };
  createdAt: number;
}
