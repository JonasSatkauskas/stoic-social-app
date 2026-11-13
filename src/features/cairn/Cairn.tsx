import { useEffect, useMemo, useRef } from 'react';
import type { CairnState, Level } from '../../lib/types';
import { stageFor, STAGES, totalPoints } from './growth';

/* An ink-sketch cairn. Shapes come from a seeded generator, so a cairn keeps
   its character as it grows: later stages only add stones to the same stack.
   Stones come from challenges; carved lines and lichen come from writing. */

const W = 300;
const GROUND = 250;
const CX = W / 2;
const MAX_STONES = 8;

/** Height / width of the compact view used on the Trail. */
export const CAIRN_COMPACT_TOP = 40;
export const CAIRN_RATIO = (GROUND + 14 - CAIRN_COMPACT_TOP) / W;

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

/** A smooth, slightly irregular stone outline, flatter on the bottom. */
function stonePath(cx: number, cy: number, rx: number, ry: number, r: () => number): string {
  const n = 12;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const jitter = 1 + (r() - 0.5) * 0.14;
    let y = Math.sin(a) * ry * jitter;
    if (y > ry * 0.55) y = ry * 0.55 + (y - ry * 0.55) * 0.35; // flat base
    pts.push([cx + Math.cos(a) * rx * jitter, cy + y]);
  }
  const mid = (p: [number, number], q: [number, number]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return d + 'Z';
}

interface Stone {
  i: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot: number;
  d: string;
  shade: string;
  tone: number;
  lines: string[]; // carved inscription lines
}

function buildStack(seed: number, baseBonus: number): Stone[] {
  const r = rng(seed);
  const stones: Stone[] = [];
  let w = 104 + baseBonus;
  let bottom = GROUND + 2;
  let xShift = 0;
  for (let i = 0; i < MAX_STONES; i++) {
    const rx = w / 2;
    const ry = rx * (0.42 + r() * 0.12);
    const cy = bottom - ry * 0.78;
    xShift = (i === 0 ? 0 : xShift * 0.4) + (r() - 0.5) * w * 0.12;
    const cx = CX + xShift;
    const rot = (r() - 0.5) * 8;
    const d = stonePath(cx, cy, rx, ry, r);
    const shade = `M${(cx + rx * 0.15).toFixed(1)} ${(cy + ry * 0.55).toFixed(1)} q ${(rx * 0.4).toFixed(1)} ${(-ry * 0.08).toFixed(1)} ${(rx * 0.62).toFixed(1)} ${(-ry * 0.5).toFixed(1)}`;
    const lineCount = rx > 30 ? 3 : 2;
    const lines: string[] = [];
    for (let k = 0; k < lineCount; k++) {
      const y = cy - ry * 0.25 + k * ry * 0.3;
      const len = rx * (0.75 - k * 0.12) * (0.75 + r() * 0.35);
      const x0 = cx - len / 2 + (r() - 0.5) * 4;
      lines.push(`M${x0.toFixed(1)} ${y.toFixed(1)} q ${(len / 2).toFixed(1)} ${(1.5 + r()).toFixed(1)} ${len.toFixed(1)} 0`);
    }
    stones.push({ i, cx, cy, rx, ry, rot, d, shade, tone: Math.floor(r() * 3), lines });
    bottom = cy - ry * 0.62;
    w = w * (0.8 + r() * 0.07);
  }
  return stones;
}

export interface CairnProps {
  cairn: CairnState;
  /** Different seeds give different cairns (friends). */
  seed?: number;
  growTick?: number;
  /** This week's completions, shown as small stones at the base. */
  recent?: Level[];
  /** Cropped, simpler view for the Trail. */
  compact?: boolean;
  label?: string;
  className?: string;
  /** Position when nested inside another SVG (the Trail). */
  box?: { x: number; y: number; width: number; height: number };
}

export function describeCairn(c: CairnState): string {
  const parts: string[] = [STAGES[stageFor(totalPoints(c))].name];
  if (c.marks > 0) parts.push(c.marks > 10 ? 'deeply inscribed from writing' : 'with lines carved from writing');
  const v = c.visitors;
  if (v.people) parts.push('a bird rests on top');
  if (v.outside) parts.push('moss');
  if (v.notice) parts.push('wildflowers');
  if (v.create) parts.push('a small stack beside it');
  if (v.unplug) parts.push('a bench nearby');
  return parts.join(', ');
}

const PEBBLE_RX: Record<Level, number> = { easy: 5, medium: 7, brave: 9 };

export function Cairn({ cairn, seed = 7, growTick = 0, recent = [], compact = false, label, className, box }: CairnProps) {
  const points = totalPoints(cairn);
  const stage = stageFor(points);
  const v = cairn.visitors;
  const baseBonus = Math.min(18, (v.body ?? 0) * 2);
  const stack = useMemo(() => buildStack(seed, baseBonus), [seed, baseBonus]);
  const count = Math.min(MAX_STONES, stage + 1);
  const stones = stack.slice(0, count);
  const top = stones[stones.length - 1];

  // Writing: carved lines on stones from the bottom up, then lichen.
  const inscribed = Math.min(count, Math.ceil(cairn.marks / 2));
  const lichen = Math.min(14, Math.max(0, cairn.marks - count * 2));

  // Bigger stones read better while the cairn is small.
  const scale = [1.5, 1.42, 1.32, 1.22, 1.14, 1.08, 1.03, 1][stage];

  const r = rng(seed * 31 + 5);
  const lichenDots = Array.from({ length: lichen }, (_, k) => {
    const s = stones[k % count];
    return { x: s.cx + (r() - 0.5) * s.rx * 1.2, y: s.cy - s.ry * (0.1 + r() * 0.35), rr: 1.6 + r() * 1.6 };
  });
  const moss = Math.min(6, v.outside ?? 0);
  const flowers = Math.min(5, v.notice ?? 0);
  const birds = Math.min(2, Math.ceil((v.people ?? 0) / 3));
  const companion = (v.create ?? 0) >= 4 ? 3 : (v.create ?? 0) >= 1 ? 2 : 0;
  const companionStones = useMemo(() => {
    const rr = rng(seed * 17 + 11);
    const out: string[] = [];
    let bottom = GROUND + 1;
    let w = 30;
    for (let i = 0; i < 3; i++) {
      const ry = w * 0.24;
      const cy = bottom - ry * 0.8;
      out.push(stonePath(64 + (rr() - 0.5) * 4, cy, w / 2, ry, rr));
      bottom = cy - ry * 0.6;
      w *= 0.78;
    }
    return out;
  }, [seed]);

  // Animate what is new since the last growth.
  const prev = useRef<{ count: number; inscribed: number; tick: number } | null>(null);
  const grew = prev.current !== null && prev.current.tick !== growTick;
  const isNewStone = (i: number) => grew && prev.current !== null && i >= prev.current.count;
  const isNewLine = (i: number) => grew && prev.current !== null && i >= prev.current.inscribed;
  useEffect(() => {
    prev.current = { count, inscribed, tick: growTick };
  });

  const pebbles = compact ? [] : recent.slice(-7);
  const vb = compact ? `0 ${CAIRN_COMPACT_TOP} ${W} ${GROUND + 14 - CAIRN_COMPACT_TOP}` : `0 0 ${W} 290`;

  return (
    <svg className={`cairn ${className ?? ''}`} viewBox={vb} {...box} role="img" aria-label={label ?? `Your cairn: ${describeCairn(cairn)}.`}>
      <line x1={compact ? 70 : 24} y1={GROUND} x2={compact ? 230 : 276} y2={GROUND} className="ground" />

      <g transform={`translate(${CX} ${GROUND}) scale(${scale}) translate(${-CX} ${-GROUND})`}>
        {companion > 0 && (
          <g className="companion">
            {companionStones.slice(0, companion).map((d, i) => (
              <path key={i} d={d} className={`stone tone-${i % 3}`} />
            ))}
          </g>
        )}

        {stones.map((s) => (
          <g key={s.i} className={isNewStone(s.i) ? 'drop-in' : ''} style={isNewStone(s.i) ? { animationDelay: `${(s.i - (prev.current?.count ?? 0)) * 0.25}s` } : undefined}>
            <g transform={`rotate(${s.rot.toFixed(1)} ${s.cx.toFixed(1)} ${s.cy.toFixed(1)})`}>
              <path d={s.d} className={`stone tone-${s.tone}`} />
              <path d={s.shade} className="shade" />
              {s.i < inscribed &&
                s.lines.map((l, k) => <path key={k} d={l} className={`carve ${isNewLine(s.i) ? 'draw-in' : ''}`} pathLength={1} />)}
            </g>
          </g>
        ))}

        <g className="lichen">
          {lichenDots.map((p, k) => (
            <circle key={k} cx={p.x} cy={p.y} r={p.rr} />
          ))}
        </g>

        <g className="moss">
          {Array.from({ length: moss }, (_, k) => {
            const side = k % 2 === 0 ? -1 : 1;
            const s = stones[Math.min(count - 1, Math.floor(k / 2))];
            const x = s.cx + side * s.rx * 0.8;
            const y = s.cy + s.ry * 0.45;
            return <path key={k} d={`M${x - 6} ${y} q 3 -6 6 -1 q 3 -6 6 1`} />;
          })}
        </g>

        {birds > 0 && top && (
          <g className="bird">
            {(() => {
              const bx = top.cx + 2;
              const by = top.cy - top.ry * 0.85 - 5;
              return (
                <>
                  <ellipse cx={bx} cy={by} rx={7} ry={4.6} />
                  <circle cx={bx + 6} cy={by - 4.5} r={3.2} />
                  <path d={`M${bx + 9} ${by - 5} l 3.5 1`} className="bird-line" />
                  <path d={`M${bx - 6} ${by - 1} l -6 -3`} className="bird-line" />
                  <path d={`M${bx - 1} ${by + 4} v 3 M${bx + 2} ${by + 4} v 3`} className="bird-line" />
                </>
              );
            })()}
            {birds > 1 && <path d={`M${top.cx - 40} ${top.cy - 40} q 6 -7 12 0 q 6 -7 12 0`} className="bird-line" />}
          </g>
        )}
      </g>

      {!compact && (
        <>
          <g className="flowers">
            {Array.from({ length: flowers }, (_, k) => {
              const x = 92 - k * 9 + (k % 2) * 3;
              return (
                <g key={k}>
                  <path d={`M${x} ${GROUND} q 1 -8 0 -14`} className="stem" />
                  <circle cx={x} cy={GROUND - 15} r={2.6} />
                </g>
              );
            })}
          </g>
          <g className="pebbles">
            {pebbles.map((l, k) => {
              const side = k % 2 === 0 ? 1 : -1;
              const x = CX + side * (66 + Math.floor(k / 2) * 17);
              return <ellipse key={k} cx={x} cy={GROUND + 6 + (k % 3)} rx={PEBBLE_RX[l]} ry={PEBBLE_RX[l] * 0.55} className="pebble" />;
            })}
          </g>
          {(v.unplug ?? 0) > 0 && (
            <g className="bench" aria-hidden="true">
              <path d={`M222 ${GROUND - 12} h34 M225 ${GROUND - 12} v12 M253 ${GROUND - 12} v12 M222 ${GROUND - 20} h34`} />
            </g>
          )}
        </>
      )}
    </svg>
  );
}
