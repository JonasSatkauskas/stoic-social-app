import { describe, expect, it } from 'vitest';
import { addDays } from '../../lib/dates';
import { CHALLENGES } from './challenges';
import { LINES, lineForDay, MAX_LINE_LENGTH, returnLine } from './lines';

describe('lines to carry', () => {
  it('every category and the return theme have at least two short lines', () => {
    for (const theme of ['outside', 'people', 'unplug', 'notice', 'body', 'create', 'return']) {
      expect(LINES.filter((l) => l.theme === theme && l.text.length <= MAX_LINE_LENGTH).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every line names its author and work', () => {
    for (const l of LINES) {
      expect(l.author.length).toBeGreaterThan(3);
      expect(l.work.length).toBeGreaterThan(5);
    }
  });

  it('the chosen line is always short enough for Today', () => {
    for (let i = 0; i < 40; i++) {
      expect(lineForDay(addDays('2026-11-01', i), 'body').text.length).toBeLessThanOrEqual(MAX_LINE_LENGTH);
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
