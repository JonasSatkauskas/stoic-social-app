import { challengeById, LEVEL_POINTS } from '../today/challenges';
import type { AppData, CairnState, Completion } from '../../lib/types';

/** Tune growth here. Stage n begins at STAGES[n].at total points (stones + marks). */
export const STAGES = [
  { name: 'A single stone', at: 0 },
  { name: 'Two stones', at: 2 },
  { name: 'A small stack', at: 6 },
  { name: 'A marker', at: 12 },
  { name: 'A waymarker', at: 19 },
  { name: 'A tall cairn', at: 27 },
  { name: 'A trail cairn', at: 36 },
  { name: 'A great cairn', at: 46 },
] as const;

export function stageFor(points: number): number {
  let s = 0;
  for (let i = 0; i < STAGES.length; i++) if (points >= STAGES[i].at) s = i;
  return s;
}

/** Progress (0..1) toward the next stage. */
export function stageProgress(points: number): number {
  const s = stageFor(points);
  if (s === STAGES.length - 1) return 1;
  return (points - STAGES[s].at) / (STAGES[s + 1].at - STAGES[s].at);
}

/** The cairn is derived from the day log, so it can never be lost or shrink. */
export function cairnFromData(data: AppData): CairnState {
  const t: CairnState = { stones: data.extra?.stones ?? 0, marks: data.extra?.marks ?? 0, visitors: {} };
  for (const day of Object.values(data.days)) {
    if (day.done) {
      t.stones += LEVEL_POINTS[day.done.level];
      const c = challengeById(day.challengeId);
      if (c) t.visitors[c.category] = (t.visitors[c.category] ?? 0) + 1;
    }
    if (day.pen === 'wrote') t.marks += 1;
  }
  return t;
}

export function totalPoints(t: CairnState): number {
  return t.stones + t.marks;
}

/** Reads a cairn from stored or received data, including the older tree format. */
export function normalizeCairn(x: unknown): CairnState {
  const o = (x ?? {}) as { stones?: number; marks?: number; branch?: number; root?: number; visitors?: CairnState['visitors'] };
  return {
    stones: Math.max(0, Number(o.stones ?? o.branch) || 0),
    marks: Math.max(0, Number(o.marks ?? o.root) || 0),
    visitors: typeof o.visitors === 'object' && o.visitors ? o.visitors : {},
  };
}

export function completionsFromData(data: AppData, sinceKey?: string): Completion[] {
  return Object.entries(data.days)
    .filter(([d, e]) => e.done && (!sinceKey || d >= sinceKey))
    .map(([d, e]) => ({ d, id: e.challengeId, l: e.done!.level }))
    .sort((a, b) => a.d.localeCompare(b.d));
}
