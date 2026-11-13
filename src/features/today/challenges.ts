import data from '../../data/challenges.json';
import { dayNumber } from '../../lib/dates';
import type { Challenge, Level } from '../../lib/types';

export const CHALLENGES = data as Challenge[];
const BY_ID = new Map(CHALLENGES.map((c) => [c.id, c]));

export const LEVEL_POINTS: Record<Level, number> = { easy: 1, medium: 2, brave: 3 };
export const LEVEL_LABEL: Record<Level, string> = { easy: 'Easy', medium: 'Medium', brave: 'Brave' };

export function challengeById(id: string): Challenge | undefined {
  return BY_ID.get(id);
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

/** Everyone gets the same challenge on the same date. */
export function challengeForDate(key: string): Challenge {
  return CHALLENGES[mod(dayNumber(key), CHALLENGES.length)];
}

/** The one alternative offered by "swap". Always a different category. */
export function swapForDate(key: string): Challenge {
  return CHALLENGES[mod(dayNumber(key) + 13, CHALLENGES.length)];
}
