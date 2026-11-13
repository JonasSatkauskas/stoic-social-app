import { addDays } from '../../lib/dates';
import type { Streak } from '../../lib/db';

/** Streak after completing a challenge on `today`. */
export function bumpStreak(s: Streak, today: string): Streak {
  if (s.lastDate === today) return s;
  if (s.lastDate === addDays(today, -1)) return { count: s.count + 1, lastDate: today };
  return { count: 1, lastDate: today };
}

/** The streak as it stands today. A missed day quietly starts over, nothing more. */
export function currentStreak(s: Streak, today: string): number {
  if (s.lastDate === today || s.lastDate === addDays(today, -1)) return s.count;
  return 0;
}

/** True when the last completion was before yesterday. Shown as "Your cairn stands. Today is enough." */
export function isResting(s: Streak, today: string): boolean {
  return s.lastDate !== null && s.lastDate !== today && s.lastDate !== addDays(today, -1);
}
