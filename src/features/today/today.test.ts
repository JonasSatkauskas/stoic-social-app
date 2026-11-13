import { describe, expect, it } from 'vitest';
import { addDays, dayNumber, weekStart } from '../../lib/dates';
import type { AppData } from '../../lib/types';
import { cairnFromData, normalizeCairn, stageFor, STAGES } from '../cairn/growth';
import { CHALLENGES, challengeForDate, swapForDate } from './challenges';
import { bumpStreak, currentStreak, isResting } from './streak';

describe('dates', () => {
  it('adds days across months', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('day numbers increase by one per day', () => {
    expect(dayNumber('2026-11-14') - dayNumber('2026-11-13')).toBe(1);
  });
  it('week starts on Monday', () => {
    expect(weekStart('2026-11-13')).toBe('2026-11-09');
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
  });
});

describe('challenges', () => {
  it('has 30 complete challenges', () => {
    expect(CHALLENGES).toHaveLength(30);
    for (const c of CHALLENGES) {
      for (const f of ['title', 'easy', 'medium', 'brave', 'indoor', 'why', 'pen'] as const) {
        expect(c[f].length).toBeGreaterThan(5);
        expect(c[f]).not.toMatch(/!/);
      }
    }
  });
  it('same date gives same challenge, next date a different one', () => {
    expect(challengeForDate('2026-11-13').id).toBe(challengeForDate('2026-11-13').id);
    expect(challengeForDate('2026-11-14').id).not.toBe(challengeForDate('2026-11-13').id);
  });
  it('swap offers a different category', () => {
    for (let i = 0; i < 30; i++) {
      const d = addDays('2026-11-01', i);
      expect(swapForDate(d).category).not.toBe(challengeForDate(d).category);
    }
  });
});

describe('streak', () => {
  it('counts consecutive days', () => {
    let s = { count: 0, lastDate: null as string | null };
    s = bumpStreak(s, '2026-11-10');
    s = bumpStreak(s, '2026-11-11');
    s = bumpStreak(s, '2026-11-11');
    expect(s.count).toBe(2);
    expect(currentStreak(s, '2026-11-12')).toBe(2);
  });
  it('starts over quietly after a gap and marks the cairn as standing quietly', () => {
    const s = { count: 5, lastDate: '2026-11-08' };
    expect(currentStreak(s, '2026-11-12')).toBe(0);
    expect(isResting(s, '2026-11-12')).toBe(true);
    expect(bumpStreak(s, '2026-11-12').count).toBe(1);
  });
});

describe('cairn growth', () => {
  const base: AppData = { days: {}, extra: { stones: 0, marks: 0 }, profile: { name: null }, createdAt: 0 };
  it('stones from challenges, marks from writing', () => {
    const data: AppData = {
      ...base,
      days: {
        '2026-11-10': { challengeId: 'walk-no-phone', swapped: false, done: { level: 'brave', indoor: false, at: 0 }, pen: 'wrote' },
        '2026-11-11': { challengeId: 'ask-a-question', swapped: false, done: { level: 'easy', indoor: false, at: 0 }, pen: 'skipped' },
      },
    };
    const t = cairnFromData(data);
    expect(t.stones).toBe(4);
    expect(t.marks).toBe(1);
    expect(t.visitors).toEqual({ outside: 1, people: 1 });
  });
  it('reads the older tree format', () => {
    expect(normalizeCairn({ branch: 5, root: 2, visitors: { body: 1 } })).toEqual({ stones: 5, marks: 2, visitors: { body: 1 } });
  });
  it('has 8 stages and never goes backwards', () => {
    expect(STAGES).toHaveLength(8);
    let prev = 0;
    for (let p = 0; p < 80; p++) {
      expect(stageFor(p)).toBeGreaterThanOrEqual(prev);
      prev = stageFor(p);
    }
    expect(prev).toBe(7);
  });
});
