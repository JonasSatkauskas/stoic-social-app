import { useEffect, useMemo, useRef } from 'react';
import type { TreeState } from '../../lib/types';
import { stageFor, stageProgress, STAGES, totalPoints } from './growth';

/* An ink-sketch tree. The shape comes from a seeded generator, so a tree keeps
   its character as it grows: later stages only reveal more of the same tree. */

const W = 300;
const SOIL = 214;
const BASE_X = W / 2;
const MAX_DEPTH = 6;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Branch {
  id: string;
  depth: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  order: number; // 0..1, reveal order within its depth
  tip: boolean;
}

function buildBranches(seed: number): Branch[] {
  const r = rng(seed);
  const out: Branch[] = [];
  const grow = (id: string, x: number, y: number, angle: number, len: number, depth: number) => {
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    const bend = (r() - 0.5) * len * 0.35;
    const cx = (x + x2) / 2 + Math.cos(angle + Math.PI / 2) * bend;
    const cy = (y + y2) / 2 + Math.sin(angle + Math.PI / 2) * bend;
    const b: Branch = { id, depth, x1: x, y1: y, x2, y2, cx, cy, order: r(), tip: depth === MAX_DEPTH };
    out.push(b);
    if (depth >= MAX_DEPTH) return;
    const kids = depth === 0 ? 3 : r() < 0.35 ? 3 : 2;
    for (let k = 0; k < kids; k++) {
      const spread = kids === 3 ? (k - 1) * 0.55 : (k === 0 ? -1 : 1) * 0.42;
      const a = angle + spread + (r() - 0.5) * 0.35;
      const l = len * (0.66 + r() * 0.14) * (kids === 3 && k === 1 ? 1.05 : 1);
      grow(`${id}.${k}`, x2, y2, a, l, depth + 1);
    }
  };
  grow('t', BASE_X, SOIL, -Math.PI / 2 + (r() - 0.5) * 0.08, 62, 0);
  return out;
}

interface Root {
  id: string;
  d: string;
  i: number;
}

function buildRoots(seed: number, count: number, depth: number): Root[] {
  const r = rng(seed * 7 + 3);
  const roots: Root[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const spread = (Math.floor(i / 2) + 0.6) * (18 + r() * 10) * side;
    const len = depth * (0.65 + r() * 0.35) * (i < 2 ? 1 : 0.8);
    const x2 = BASE_X + spread * 0.9;
    const y2 = SOIL + len;
    const c1x = BASE_X + spread * 0.15;
    const c1y = SOIL + len * 0.35;
    const c2x = BASE_X + spread * 0.85;
    const c2y = SOIL + len * 0.55;
    roots.push({ id: `r${i}`, d: `M${BASE_X} ${SOIL} C${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`, i });
    // small side rootlet
    if (len > 30) {
      const mx = (c2x + x2) / 2;
      const my = (c2y + y2) / 2;
      roots.push({ id: `r${i}s`, d: `M${mx} ${my} q ${side * 10} ${6 + r() * 6} ${side * (16 + r() * 8)} ${10 + r() * 8}`, i });
    }
  }
  return roots;
}

export interface TreeProps {
  tree: TreeState;
  /** Different seeds give different trees (friends). */
  seed?: number;
  growTick?: number;
  /** Hide the roots and soil detail (small trees in the Grove). */
  compact?: boolean;
  label?: string;
  className?: string;
  /** Position when nested inside another SVG (the Grove). */
  box?: { x: number; y: number; width: number; height: number };
}

export function describeTree(tree: TreeState): string {
  const stage = STAGES[stageFor(totalPoints(tree))].name;
  const parts: string[] = [stage];
  if (tree.root > 0) parts.push(tree.root > 10 ? 'with deep roots' : 'with young roots');
  const v = tree.visitors;
  if (v.people) parts.push('a bird visits');
  if (v.unplug) parts.push('a bench stands nearby');
  if (v.notice) parts.push('flowers');
  if (v.create) parts.push('fruit');
  return parts.join(', ');
}

export function Tree({ tree, seed = 7, growTick = 0, compact = false, label, className, box }: TreeProps) {
  const points = totalPoints(tree);
  const stage = stageFor(points);
  const progress = stageProgress(points);
  const branches = useMemo(() => buildBranches(seed), [seed]);
  const v = tree.visitors;

  // Which branches are visible: depth < full, plus a share of the next depth.
  const fullDepth = Math.max(0, stage - 2); // stage 2 shows the trunk only
  const visible = stage < 2 ? [] : branches.filter((b) => b.depth <= fullDepth || (b.depth === fullDepth + 1 && b.order < progress * 0.9));
  const scale = [0.4, 0.45, 0.5, 0.62, 0.74, 0.85, 0.93, 1][stage];
  const trunkW = 5 + Math.min(6, (v.body ?? 0) * 0.5) + stage * 0.6;

  const parents = new Set(visible.map((b) => b.id.slice(0, b.id.lastIndexOf('.'))));
  const tips = visible.filter((b) => !parents.has(b.id));
  const leafy = stage >= 3;
  const leavesPerTip = leafy ? 1 + Math.min(2, Math.floor((v.outside ?? 0) / 3)) + (stage >= 4 ? 1 : 0) : 0;
  const flowerCount = stage >= 5 ? 4 + Math.min(8, v.notice ?? 0) : Math.min(4, v.notice ?? 0) * (stage >= 3 ? 1 : 0);
  const fruitCount = stage >= 6 ? 3 + Math.min(6, v.create ?? 0) : stage >= 4 ? Math.min(3, v.create ?? 0) : 0;
  const birdCount = stage >= 3 ? Math.min(3, Math.ceil((v.people ?? 0) / 3)) : 0;
  const bench = (v.unplug ?? 0) > 0 && stage >= 2;

  const rootCount = tree.root === 0 ? (stage >= 1 ? 1 : 0) : Math.min(9, 1 + tree.root);
  const rootDepth = Math.min(80, 8 + tree.root * 5);
  const roots = useMemo(() => buildRoots(seed, rootCount, rootDepth), [seed, rootCount, rootDepth]);

  // Mark elements that appeared since the last render as "new" so they can draw in.
  const seen = useRef<Set<string> | null>(null);
  const lastTick = useRef(growTick);
  const isNew = (id: string) => seen.current !== null && lastTick.current !== growTick && !seen.current.has(id);
  useEffect(() => {
    seen.current = new Set([...visible.map((b) => b.id), ...roots.map((r) => r.id), 'leaves']);
    lastTick.current = growTick;
  });

  const r = rng(seed * 13 + 1);
  const leafSpots: { x: number; y: number; rot: number; k: string }[] = [];
  tips.forEach((t, i) => {
    for (let k = 0; k < leavesPerTip; k++) {
      leafSpots.push({
        x: t.x2 + (r() - 0.5) * 16,
        y: t.y2 + (r() - 0.6) * 14,
        rot: r() * 180,
        k: `${i}-${k}`,
      });
    }
  });
  const pickTips = (n: number, offset: number) =>
    tips.length === 0 ? [] : Array.from({ length: n }, (_, i) => tips[(i * 7 + offset) % tips.length]);

  const vbTop = compact ? 0 : 0;
  const vbH = compact ? SOIL + 12 : 300;

  return (
    <svg
      className={`tree ${className ?? ''}`}
      viewBox={`0 ${vbTop} ${W} ${vbH}`}
      {...box}
      role="img"
      aria-label={label ?? `Your tree: ${describeTree(tree)}.`}
    >
      {/* soil */}
      <line x1={compact ? 90 : 30} y1={SOIL} x2={compact ? 210 : 270} y2={SOIL} className="soil" />
      {!compact && (
        <g className="grass">
          <path d={`M60 ${SOIL} l3 -6 M66 ${SOIL} l-2 -5 M232 ${SOIL} l2 -6 M238 ${SOIL} l-3 -4`} />
        </g>
      )}

      {/* roots grow from writing */}
      {!compact && (
        <g className="roots">
          {roots.map((rt) => (
            <path key={rt.id} d={rt.d} pathLength={1} className={isNew(rt.id) ? 'draw-in' : ''} />
          ))}
        </g>
      )}

      {/* seed and sprout */}
      {stage === 0 && <ellipse cx={BASE_X} cy={SOIL - 4} rx={7} ry={4.5} className="seed" />}
      {stage === 1 && (
        <g className="sprout">
          <path d={`M${BASE_X} ${SOIL} q -2 -14 1 -26`} className="stem" />
          <path d={`M${BASE_X + 1} ${SOIL - 24} q -12 -6 -16 2 q 8 4 16 -2`} className="leaf" />
          <path d={`M${BASE_X + 1} ${SOIL - 20} q 12 -8 17 -1 q -8 6 -17 1`} className="leaf" />
        </g>
      )}

      {stage >= 2 && (
        <g transform={`translate(${BASE_X} ${SOIL}) scale(${scale}) translate(${-BASE_X} ${-SOIL})`}>
          <g className="branches">
            {visible.map((b) => (
              <path
                key={b.id}
                d={`M${b.x1} ${b.y1} Q${b.cx} ${b.cy} ${b.x2} ${b.y2}`}
                strokeWidth={Math.max(1, trunkW * Math.pow(0.62, b.depth))}
                pathLength={1}
                className={isNew(b.id) ? 'draw-in' : ''}
              />
            ))}
          </g>
          <g className={`leaves ${isNew('leaves') ? 'fade-in' : ''}`}>
            {leafSpots.map((l) => (
              <ellipse key={l.k} cx={l.x} cy={l.y} rx={7} ry={3.6} transform={`rotate(${l.rot} ${l.x} ${l.y})`} />
            ))}
          </g>
          <g className="flowers">
            {pickTips(flowerCount, 1).map((t, i) => (
              <circle key={i} cx={t.x2 + ((i % 3) - 1) * 6} cy={t.y2 - 5 - (i % 2) * 4} r={3.2} />
            ))}
          </g>
          <g className="fruit">
            {pickTips(fruitCount, 4).map((t, i) => (
              <circle key={i} cx={t.x2 + ((i % 2) * 2 - 1) * 5} cy={t.y2 + 7} r={4} />
            ))}
          </g>
          <g className="birds">
            {pickTips(birdCount, 2).map((t, i) => (
              <path key={i} d={`M${t.x2 - 12} ${t.y2 - 12} q6 -7 12 0 q6 -7 12 0`} />
            ))}
          </g>
        </g>
      )}

      {bench && !compact && (
        <g className="bench" aria-hidden="true">
          <path d={`M206 ${SOIL - 12} h34 M209 ${SOIL - 12} v12 M237 ${SOIL - 12} v12 M206 ${SOIL - 20} h34`} />
        </g>
      )}
    </svg>
  );
}
