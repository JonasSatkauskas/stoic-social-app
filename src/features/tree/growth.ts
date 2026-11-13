import { challengeById, LEVEL_POINTS } from '../today/challenges';
import type { AppData, Completion, TreeState } from '../../lib/types';

/** Tune growth here. Stage n begins at STAGES[n].at total points (branch + root). */
export const STAGES = [
  { name: 'Seed', at: 0 },
  { name: 'Sprout', at: 2 },
  { name: 'Sapling', at: 6 },
  { name: 'Young tree', at: 12 },
  { name: 'Leafy tree', at: 19 },
  { name: 'Flowering tree', at: 27 },
  { name: 'Fruit tree', at: 36 },
  { name: 'Big old tree', at: 46 },
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

/** Tree state is derived from the day log, so it can never be lost or shrink. */
export function treeFromData(data: AppData): TreeState {
  const t: TreeState = { branch: data.extra.branch, root: data.extra.root, visitors: {} };
  for (const day of Object.values(data.days)) {
    if (day.done) {
      t.branch += LEVEL_POINTS[day.done.level];
      const c = challengeById(day.challengeId);
      if (c) t.visitors[c.category] = (t.visitors[c.category] ?? 0) + 1;
    }
    if (day.pen === 'wrote') t.root += 1;
  }
  return t;
}

export function totalPoints(t: TreeState): number {
  return t.branch + t.root;
}

export function completionsFromData(data: AppData, sinceKey?: string): Completion[] {
  return Object.entries(data.days)
    .filter(([d, e]) => e.done && (!sinceKey || d >= sinceKey))
    .map(([d, e]) => ({ d, id: e.challengeId, l: e.done!.level }))
    .sort((a, b) => a.d.localeCompare(b.d));
}
