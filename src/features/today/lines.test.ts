import { describe, expect, it } from 'vitest';
import { addDays } from '../../lib/dates';
import { CHALLENGES } from './challenges';
import { LINES, lineForDay, returnLine } from './lines';

describe('lines to carry', () => {
  it('every category and the return theme have lines', () => {
    for (const theme of ['outside', 'people', 'unplug', 'notice', 'body', 'create', 'return']) {
      expect(LINES.filter((l) => l.theme === theme).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('uses the app voice in practice lines', () => {
    for (const l of LINES) {
      expect(l.practice).not.toMatch(/!/);
      expect(l.text.length).toBeLessThan(260);
      expect(l.work.length).toBeGreaterThan(5);
    }
  });

  it('is the same for everyone on a day and matches the challenge theme', () => {
    const c = CHALLENGES[0];
    expect(lineForDay('2026-11-13', c.category)).toBe(lineForDay('2026-11-13', c.category));
    expect(lineForDay('2026-11-13', c.category).theme).toBe(c.category);
    expect(returnLine('2026-11-13').theme).toBe('return');
  });

  it('changes from day to day', () => {
    const seen = new Set(Array.from({ length: 10 }, (_, i) => lineForDay(addDays('2026-11-01', i), 'people').id));
    expect(seen.size).toBeGreaterThan(1);
  });
});
