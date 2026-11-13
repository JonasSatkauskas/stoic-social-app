import { useRef, useState } from 'react';
import { weekStart } from '../../lib/dates';
import { useStore } from '../../lib/store';
import type { Level } from '../../lib/types';
import { PenMoment } from '../pen/PenMoment';
import { Cairn } from '../cairn/Cairn';
import { LEVEL_LABEL } from './challenges';
import { demoModeEnabled } from './demo';
import { LineToCarry } from './LineToCarry';
import { lineForDay, returnLine } from './lines';
import { currentStreak, isResting } from './streak';

const LEVELS: Level[] = ['easy', 'medium', 'brave'];
const CATEGORY_LABEL = {
  outside: 'Outside',
  people: 'People',
  unplug: 'Unplug',
  notice: 'Notice',
  body: 'Body',
  create: 'Create',
} as const;

export function TodayScreen() {
  const { todayEntry, challenge, cairn, growTick, streak, today, data, complete, swap, devFillHistory } = useStore();
  const [level, setLevel] = useState<Level>('easy');
  const [indoor, setIndoor] = useState(false);
  const [busy, setBusy] = useState(false);
  const taps = useRef<number[]>([]);

  const done = todayEntry.done;
  if (done && !todayEntry.pen) return <PenMoment />;

  const days = currentStreak(streak, today);
  const resting = isResting(streak, today);
  const weekStartKey = weekStart(today);
  const thisWeek = Object.entries(data.days)
    .filter(([d, e]) => d >= weekStartKey && e.done)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, e]) => e.done!.level);

  // Hidden demo control: tap the top-left corner five times quickly to add growth.
  const devTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1500), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      void devFillHistory();
    }
  };

  return (
    <section className={`screen ${done ? 'done-screen' : ''}`} aria-labelledby="today-title">
      {demoModeEnabled() && <button className="dev-button" aria-hidden="true" tabIndex={-1} onClick={devTap} />}
      <Cairn cairn={cairn} growTick={growTick} recent={thisWeek} className={`today-cairn ${done ? 'small' : resting ? 'resting-size' : ''}`} />

      {done ? (
        <div className="done-message">
          <h1 id="today-title">Done. That was yours to do, and you did it.</h1>
          <p className="muted">{todayEntry.pen === 'wrote' ? 'A stone placed, and what you wrote carved into it.' : 'A stone placed today.'}</p>
          <LineToCarry line={lineForDay(today, challenge.category)} />
          <p className="serif">Done for today. See you tomorrow.</p>
        </div>
      ) : (
        <>
          {resting ? (
            <div className="resting">
              <p>Your cairn stands. Today is enough.</p>
              <LineToCarry line={returnLine(today)} compact />
            </div>
          ) : days > 1 ? (
            <p className="resting">{days} days in a row.</p>
          ) : null}

          <div className="challenge">
            <div className="eyebrow">{CATEGORY_LABEL[challenge.category]}</div>
            <h1 id="today-title">{challenge.title}</h1>
            <p className="why">{challenge.why}</p>
          </div>

          {indoor ? (
            <p className="level-text" aria-live="polite">
              {challenge.indoor}
            </p>
          ) : (
            <>
              <div className="stones" role="group" aria-label="Choose a level">
                {LEVELS.map((l) => (
                  <button key={l} className="stone" aria-pressed={level === l} onClick={() => setLevel(l)}>
                    {LEVEL_LABEL[l]}
                  </button>
                ))}
              </div>
              <p className="level-text" aria-live="polite">
                {challenge[level]}
              </p>
            </>
          )}

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

          <div className="links" style={{ marginTop: '0.75rem' }}>
            <button className="link" onClick={() => setIndoor((v) => !v)}>
              {indoor ? 'I can go out' : 'Stuck indoors?'}
            </button>
            {!todayEntry.swapped && (
              <button className="link" onClick={() => void swap()}>
                Swap once
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
