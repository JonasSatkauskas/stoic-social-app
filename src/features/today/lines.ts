import data from '../../data/lines.json';
import { dayNumber } from '../../lib/dates';
import type { Category } from '../../lib/types';

/** A line to carry: a verified public-domain quote plus a practice in our own words. */
export interface Line {
  id: string;
  theme: Category | 'return';
  text: string;
  author: string;
  work: string;
  practice: string;
}

export const LINES = data as Line[];

function pick(theme: Line['theme'], key: string): Line {
  const pool = LINES.filter((l) => l.theme === theme);
  const list = pool.length ? pool : LINES;
  return list[((dayNumber(key) % list.length) + list.length) % list.length];
}

/** Same line for everyone on the same day, matched to the challenge's theme. */
export function lineForDay(key: string, category: Category): Line {
  return pick(category, key);
}

/** For coming back after a gap. */
export function returnLine(key: string): Line {
  return pick('return', key);
}
