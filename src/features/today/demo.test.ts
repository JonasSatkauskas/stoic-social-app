import { describe, expect, it } from 'vitest';
import type { AppData } from '../../lib/types';
import { countDemoDays, withoutDemoDays } from './demo';

const at = (key: string) => new Date(key + 'T15:00').getTime();

describe('demo days', () => {
  const data: AppData = {
    days: {
      '2026-11-13': { challengeId: 'a', swapped: false, done: { level: 'easy', indoor: false, at: at('2026-11-13') }, pen: 'wrote' },
      '2026-11-12': { challengeId: 'b', swapped: false, done: { level: 'brave', indoor: false, at: at('2026-11-13') }, pen: 'wrote' },
      '2026-11-11': { challengeId: 'c', swapped: false, done: { level: 'easy', indoor: false, at: at('2026-11-11') }, demo: true },
      '2026-11-10': { challengeId: 'd', swapped: true },
    },
    extra: { branch: 0, root: 0 },
    profile: { name: null },
    createdAt: 0,
  };

  it('finds flagged and back-dated demo days, keeps real ones', () => {
    expect(countDemoDays(data)).toBe(2);
    expect(Object.keys(withoutDemoDays(data).days).sort()).toEqual(['2026-11-10', '2026-11-13']);
  });
});
