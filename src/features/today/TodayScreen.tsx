import { useRef, useState } from 'react';
import { weekStart } from '../../lib/dates';
import { useStore } from '../../lib/store';
import type { Level } from '../../lib/types';
import { Cairn } from '../cairn/Cairn';
import { PenMoment } from '../pen/PenMoment';
import { CarveWord } from './CarveWord';
import { LEVEL_LABEL } from './challenges';
import { demoModeEnabled } from './demo';
import { isResting } from './streak';

const LEVELS: Level[] = ['easy', 'medium', 'brave'];
const CATEGORY_LABEL = {
  outside: 'Outside',
  people: 'People',
  unplug: 'Unplug',
  notice: 'Notice',
  body: 'Body',
  create: 'Create',
} as const;

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const shortFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

export function TodayScreen() {
  const { todayEntry, challenge, cairn, growTick, streak, today, data, complete, swap, devFillHistory } = useStore();
  const [level, setLevel] = useState<Level>('easy');
  const [indoor, setIndoor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stone, setStone] = useState<number | null>(null);
  const taps = useRef<number[]>([]);

  const done = todayEntry.done;
  if (done && !todayEntry.pen) return <PenMoment />;
  if (done && todayEntry.pen === 'wrote' && todayEntry.word === undefined) return <CarveWord />;

  const resting = isResting(streak, today);
  const weekStartKey = weekStart(today);
  const thisWeek = Object.entries(data.days)
    .filter(([d, e]) => d >= weekStartKey && e.done)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, e]) => e.done!.level);
  // Carved words, most recent first: the top stone holds the newest word.
  const words = Object.entries(data.days)
    .filter(([, e]) => e.word)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([d, e]) => ({ d, word: e.word as string }));

  // Hidden demo control (only with ?demo): tap the top-left corner five times quickly.
  const devTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1500), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      void devFillHistory();
    }
  };

  const dayLine = dayFmt.format(new Date(today + 'T12:00'));
  const selected = stone !== null ? words[stone] : undefined;

  if (done) {
    return (
      <section className="screen closed" aria-labelledby="today-title">
        {demoModeEnabled() && <button className="dev-button" aria-hidden="true" tabIndex={-1} onClick={devTap} />}
        <Cairn
          cairn={cairn}
          growTick={growTick}
          recent={thisWeek}
          className="today-cairn closed-cairn"
          onStoneTap={(i) => setStone((cur) => (cur === i ? null : i))}
          selectedFromTop={stone}
        />
        <h1 id="today-title" className="center">
          Your stone is placed.
        </h1>
        <p className="center muted serif">Closed until tomorrow.</p>
        <div className="stone-card" role="status" aria-live="polite">
          {stone === null ? null : selected ? (
            <>
              <span className="stone-word">{selected.word}</span>
              <span className="muted small">{shortFmt.format(new Date(selected.d + 'T12:00'))}</span>
            </>
          ) : (
            <span className="muted small">No word on this stone.</span>
          )}
        </div>
        {words.length > 0 && (
          <ul className="visually-hidden">
            {words.slice(0, 8).map((w) => (
              <li key={w.d}>
                {shortFmt.format(new Date(w.d + 'T12:00'))}: {w.word}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section className="screen today" aria-labelledby="today-title">
      {demoModeEnabled() && <button className="dev-button" aria-hidden="true" tabIndex={-1} onClick={devTap} />}
      <p className="day-line">{dayLine}</p>
      <Cairn cairn={cairn} growTick={growTick} recent={thisWeek} className="today-cairn" />
      {resting && <p className="resting">Your cairn stands. Today is enough.</p>}

      <div className="challenge">
        <div className="eyebrow">{CATEGORY_LABEL[challenge.category]}</div>
        <h1 id="today-title">{challenge.title}</h1>
        <p className="level-text" aria-live="polite" key={indoor ? 'indoor' : level}>
          {indoor ? challenge.indoor : challenge[level]}
        </p>
      </div>

      {!indoor && (
        <div className="stones" role="group" aria-label="Choose a level">
          {LEVELS.map((l) => (
            <button key={l} className="stone" aria-pressed={level === l} onClick={() => setLevel(l)}>
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
      )}

      <p className="why">{challenge.why}</p>

      <button
        className="btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await complete(indoor ? 'easy' : level, indoor);
          setBusy(false);
        }}
      >
        Done{indoor ? '' : `, ${LEVEL_LABEL[level]}`}
      </button>

      <div className="links">
        <button className="tertiary" onClick={() => setIndoor((v) => !v)}>
          {indoor ? 'I can go out' : 'Stuck indoors'}
        </button>
        {!todayEntry.swapped && (
          <button className="tertiary" onClick={() => void swap()}>
            Swap once
          </button>
        )}
      </div>
    </section>
  );
}
