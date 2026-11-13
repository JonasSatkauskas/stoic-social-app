import { describe, expect, it } from 'vitest';
import type { AppData } from '../../lib/types';
import { mergeApp } from './backup';

const base = (days: AppData['days']): AppData => ({ days, extra: { branch: 0, root: 0 }, profile: { name: null }, createdAt: 1 });

describe('mergeApp', () => {
  it('keeps days from both and prefers completed ones', () => {
    const cur = base({ '2026-11-10': { challengeId: 'a', swapped: false } });
    const inc = base({
      '2026-11-10': { challengeId: 'a', swapped: false, done: { level: 'brave', indoor: false, at: 1 } },
      '2026-11-09': { challengeId: 'b', swapped: false, done: { level: 'easy', indoor: false, at: 1 } },
    });
    const m = mergeApp(cur, inc);
    expect(Object.keys(m.days).sort()).toEqual(['2026-11-09', '2026-11-10']);
    expect(m.days['2026-11-10'].done?.level).toBe('brave');
  });
});
