import { useState } from 'react';
import { addDays, dateKey, weekStart } from '../../lib/dates';
import { useStore } from '../../lib/store';
import type { Category, Completion } from '../../lib/types';
import { challengeById, LEVEL_LABEL } from '../today/challenges';
import { daysSinceMet, doneToday, metText, rootWords, type Friend } from './friends';

export const CATEGORY_COLOR: Record<Category, string> = {
  outside: '#6b7d3c',
  people: '#b9823a',
  unplug: '#5f7480',
  notice: '#8c6d8f',
  body: '#a4583f',
  create: '#4f7a6a',
};

const WEEKS = 8;
const C = 180;
const R0 = 46;
const RING = 15;
const THICK = { easy: 0.45, medium: 0.72, brave: 1 } as const;

function sector(r1: number, r2: number, a1: number, a2: number): string {
  const p = (r: number, a: number) => `${C + r * Math.cos(a)} ${C + r * Math.sin(a)}`;
  return `M${p(r1, a1)} L${p(r2, a1)} A${r2} ${r2} 0 0 1 ${p(r2, a2)} L${p(r1, a2)} A${r1} ${r1} 0 0 0 ${p(r1, a1)} Z`;
}

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

export function TrunkView({ friend, onBack, onPebble }: { friend: Friend; onBack: () => void; onPebble: () => void }) {
  const { data, today } = useStore();
  const [selected, setSelected] = useState<Completion | null>(null);
  const byDate = new Map(friend.completions.map((c) => [c.d, c]));
  const thisWeek = weekStart(today);
  const todayDone = doneToday(friend, today);
  const met = daysSinceMet(friend, today);
  const pebbleToday = friend.pebbleSentOn === dateKey();

  const segments: { key: string; d: string; path: string; c?: Completion }[] = [];
  for (let w = 0; w < WEEKS; w++) {
    const start = addDays(thisWeek, -7 * w);
    const r1 = R0 + w * RING + 1;
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      if (d > today) continue;
      const a1 = -Math.PI / 2 + (i * 2 * Math.PI) / 7 + 0.02;
      const a2 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / 7 - 0.02;
      const c = byDate.get(d);
      const r2 = r1 + (RING - 2) * (c ? THICK[c.l] : 1);
      segments.push({ key: d, d, path: sector(r1, r2, a1, a2), c });
    }
  }

  const ch = selected ? challengeById(selected.id) : undefined;
  const bothDid = selected ? data.days[selected.d]?.done && data.days[selected.d]?.challengeId === selected.id : false;
  const recent = [...friend.completions].reverse().slice(0, 7);

  return (
    <section className="screen trunk" aria-labelledby="trunk-title">
      <h1 id="trunk-title" className="center">
        {friend.name}
      </h1>
      <svg viewBox="0 0 360 360" role="img" aria-label={`Trunk of ${friend.name}. Each ring is a week, each segment a day.`}>
        {Array.from({ length: WEEKS + 1 }, (_, w) => (
          <circle key={w} className="ring" cx={C} cy={C} r={R0 + w * RING} />
        ))}
        <circle className="bark" cx={C} cy={C} r={R0 + WEEKS * RING + 4} />
        {segments.map((s) =>
          s.c ? (
            <path
              key={s.key}
              d={s.path}
              className={`segment ${selected?.d === s.d ? 'selected' : ''}`}
              style={{ fill: CATEGORY_COLOR[challengeById(s.c.id)?.category ?? 'outside'] }}
              onClick={() => setSelected(s.c!)}
              aria-hidden="true"
            />
          ) : null,
        )}
        <text x={C} y={C - 4} textAnchor="middle" className="serif" style={{ fontSize: 12, fill: 'var(--ink)' }}>
          {todayDone ? 'Done today' : 'Resting today'}
        </text>
        {todayDone && (
          <text x={C} y={C + 13} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--stone)' }}>
            {LEVEL_LABEL[todayDone.l]}
          </text>
        )}
      </svg>

      <div className="legend" aria-hidden="true">
        {(Object.keys(CATEGORY_COLOR) as Category[]).map((k) => (
          <span key={k} style={{ ['--c' as string]: CATEGORY_COLOR[k] }}>
            {k}
          </span>
        ))}
      </div>

      {selected && ch && (
        <div className="card" role="status">
          <div className="eyebrow">{dayFmt.format(new Date(selected.d + 'T12:00'))}</div>
          <p className="serif" style={{ fontSize: '1.2rem', margin: 0 }}>
            {ch.title}
          </p>
          <p className="muted" style={{ margin: '0.2rem 0 0' }}>
            {LEVEL_LABEL[selected.l]}
            {bothDid ? '. You did this one too.' : ''}
          </p>
        </div>
      )}

      <ul className="visually-hidden">
        {recent.map((c) => (
          <li key={c.d}>
            {c.d}: {challengeById(c.id)?.title ?? c.id}, {LEVEL_LABEL[c.l]}
          </li>
        ))}
      </ul>

      <p className="center serif">{rootWords(friend.tree.root)}</p>
      <p className="center" style={{ marginBottom: 0 }}>
        Last met in person: {metText(met)}.
      </p>
      {met > 0 && <p className="center muted">Meet again to water this friendship.</p>}
      <div className="space" />
      <button className="btn quiet" disabled={pebbleToday} onClick={onPebble}>
        {pebbleToday ? 'You left a pebble today' : 'Leave a pebble'}
      </button>
      <div className="links">
        <button className="link" onClick={onBack}>
          Back to the grove
        </button>
      </div>
    </section>
  );
}
