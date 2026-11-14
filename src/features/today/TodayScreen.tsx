import { useRef, useState } from 'react';
import { addDays, weekStart } from '../../lib/dates';
import { useStore } from '../../lib/store';
import type { Category, Level } from '../../lib/types';
import { Cairn } from '../cairn/Cairn';
import { PenMoment } from '../pen/PenMoment';
import { challengeById, challengeForDate, LEVEL_LABEL } from './challenges';
import { demoModeEnabled } from './demo';
import { lineForDay, returnLine } from './lines';
import { isResting } from './streak';

const LEVELS: Level[] = ['easy', 'medium', 'brave'];

const CATEGORY_LABEL: Record<Category, string> = {
  outside: 'Outside',
  people: 'People',
  unplug: 'Unplug',
  notice: 'Notice',
  body: 'Body',
  create: 'Create',
};

const TOMORROW: Record<Category, string> = {
  outside: 'something outside',
  people: 'something with people',
  unplug: 'time away from the screen',
  notice: 'something to notice',
  body: 'something for your body',
  create: 'something to make with your hands',
};

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

  const resting = isResting(streak, today);
  const weekStartKey = weekStart(today);
  const thisWeek = Object.entries(data.days)
    .filter(([d, e]) => d >= weekStartKey && e.done)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, e]) => e.done!.level);

  // Hidden demo control (only with ?demo): tap the top-left corner five times quickly.
  const devTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1500), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      void devFillHistory();
    }
  };
  const devButton = demoModeEnabled() && <button className="dev-button" aria-hidden="true" tabIndex={-1} onClick={devTap} />;

  if (done) {
    // Each stone, from the top, is a day you did a challenge: the newest on top.
    const doneDays = Object.entries(data.days)
      .filter(([, e]) => e.done)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([d, e]) => ({ d, id: e.challengeId, l: e.done!.level }));
    const shown = (stone !== null ? doneDays[stone] : undefined) ?? doneDays[0];
    const shownTitle = shown ? (challengeById(shown.id)?.title ?? challenge.title) : challenge.title;
    const isToday = !shown || shown.d === today;
    const tomorrow = challengeForDate(addDays(today, 1)).category;

    return (
      <section className="screen closed" aria-labelledby="today-title">
        {devButton}
        <Cairn
          cairn={cairn}
          growTick={growTick}
          recent={thisWeek}
          className="today-cairn closed-cairn"
          onStoneTap={(i) => setStone((cur) => (cur === i ? null : i))}
          selectedFromTop={stone}
        />
        <div className="closed-card" role="status" aria-live="polite">
          <div className="eyebrow">{isToday ? 'Today' : shortFmt.format(new Date(shown!.d + 'T12:00'))}</div>
          <h1 id="today-title">{shownTitle}</h1>
          <p className="muted">{LEVEL_LABEL[shown ? shown.l : done.level]}</p>
        </div>
        {isToday && <p className="center serif">Done. That was yours to do, and you did it.</p>}
        <p className="center muted small">Closed until tomorrow. Tomorrow: {TOMORROW[tomorrow]}.</p>
        <p className="center muted small">Tap a stone to see the day it marks.</p>
      </section>
    );
  }

  const line = resting ? returnLine(today) : lineForDay(today, challenge.category);

  return (
    <section className="screen today" aria-labelledby="today-title">
      {devButton}
      <p className="day-line">{dayFmt.format(new Date(today + 'T12:00'))}</p>
      <Cairn cairn={cairn} growTick={growTick} recent={thisWeek} className="today-cairn" />
      {resting && <p className="resting">Your cairn stands. Today is enough.</p>}

      <div className="challenge">
        <div className="eyebrow">{CATEGORY_LABEL[challenge.category]}</div>
        <h1 id="today-title">{challenge.title}</h1>
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

      <p className="level-text" aria-live="polite" key={indoor ? 'indoor' : level}>
        {indoor ? challenge.indoor : challenge[level]}
      </p>

      <figure className="day-quote">
        <blockquote>{line.text}</blockquote>
        <figcaption>{line.author}</figcaption>
      </figure>

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
