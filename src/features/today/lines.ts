import data from '../../data/lines.json';
import { dayNumber } from '../../lib/dates';
import type { Category } from '../../lib/types';

/** A verified public-domain quote shown under the day's challenge. */
export interface Line {
  id: string;
  theme: Category | 'return';
  text: string;
  author: string;
  work: string;
}

export const LINES = data as Line[];

/** Only short lines sit under a challenge, so Today fits on one screen. */
export const MAX_LINE_LENGTH = 110;

function pick(theme: Line['theme'], key: string): Line {
  const short = LINES.filter((l) => l.text.length <= MAX_LINE_LENGTH);
  const pool = short.filter((l) => l.theme === theme);
  const list = pool.length ? pool : short;
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
