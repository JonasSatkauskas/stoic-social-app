import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../lib/store';
import { advance, isFaceDown, orientationAvailable } from './faceDown';

const MINUTES = [2, 5, 10];

type Phase =
  | { name: 'choose' }
  | { name: 'starting' }
  | { name: 'timing'; minutes: number; faceDownMode: boolean }
  | { name: 'finished' };

function signalTimeUp() {
  try {
    navigator.vibrate?.([180, 120, 180]);
  } catch {
    /* not supported */
  }
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 528;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 2.3);
    osc.onended = () => void ctx.close();
  } catch {
    /* no audio */
  }
}

/** A hand-drawn line that slowly inks across the screen as time passes. */
function InkLine({ progress }: { progress: number }) {
  const d = 'M4 22 C 40 14, 70 30, 110 21 S 180 14, 220 23 S 290 30, 336 20';
  return (
    <svg className="ink-line" viewBox="0 0 340 40" preserveAspectRatio="none" aria-hidden="true">
      <path className="track" d={d} />
      <path d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />
    </svg>
  );
}

export function PenMoment() {
  const { challenge, pen, go } = useStore();
  const [phase, setPhase] = useState<Phase>({ name: 'choose' });
  const [, setTick] = useState(0);
  const clock = useRef({ elapsed: 0, since: null as number | null });
  const [down, setDown] = useState(false);
  const [everDown, setEverDown] = useState(false);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const timing = phase.name === 'timing' ? phase : null;
  const running = !!timing && (!timing.faceDownMode || down);

  // Listen to orientation while timing in face-down mode.
  useEffect(() => {
    if (!timing?.faceDownMode) return;
    const onEvent = (e: DeviceOrientationEvent) => {
      const fd = isFaceDown(e.beta, e.gamma);
      setDown(fd);
      if (fd) setEverDown(true);
    };
    window.addEventListener('deviceorientation', onEvent);
    return () => window.removeEventListener('deviceorientation', onEvent);
  }, [timing?.faceDownMode]);

  // Start or pause the clock when running changes.
  useEffect(() => {
    if (!timing) return;
    clock.current = advance(clock.current, running, Date.now());
  }, [running, timing]);

  // Tick and keep the screen awake while timing.
  useEffect(() => {
    if (!timing) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    navigator.wakeLock
      ?.request('screen')
      .then((w) => (wakeLock.current = w))
      .catch(() => undefined);
    return () => {
      window.clearInterval(id);
      void wakeLock.current?.release().catch(() => undefined);
      wakeLock.current = null;
    };
  }, [timing]);

  const c = clock.current;
  const elapsed = c.since !== null ? c.elapsed + (Date.now() - c.since) : c.elapsed;
  const total = timing ? timing.minutes * 60_000 : 1;
  const progress = Math.min(1, elapsed / total);

  useEffect(() => {
    if (timing && progress >= 1) {
      signalTimeUp();
      setPhase({ name: 'finished' });
    }
  }, [timing, progress]);

  const start = async (minutes: number) => {
    setPhase({ name: 'starting' });
    const faceDownMode = await orientationAvailable();
    clock.current = { elapsed: 0, since: null };
    setDown(false);
    setEverDown(false);
    setPhase({ name: 'timing', minutes, faceDownMode });
  };

  const wrote = () => void pen('wrote');

  if (timing) {
    const left = Math.max(0, Math.ceil((total - elapsed) / 60_000));
    let message = 'Put your phone face down. We will wait.';
    if (timing.faceDownMode && !down) message = everDown ? 'Paused. Your page is waiting.' : 'Turn your phone face down to start.';
    return (
      <section className="screen pen" aria-label="Writing time">
        <p className="center serif" style={{ fontSize: '1.35rem' }} role="status">
          {message}
        </p>
        <InkLine progress={progress} />
        <p className="center muted small" aria-live="off">
          {timing.faceDownMode ? 'The line only moves while the phone lies face down. ' : ''}
          {left <= 1 ? 'Less than a minute left.' : `About ${left} minutes left.`}
        </p>
        <div className="space" />
        <button className="btn quiet" onClick={wrote}>
          I wrote it
        </button>
      </section>
    );
  }

  return (
    <section className="screen pen" aria-labelledby="pen-prompt">
      <div className="eyebrow center">The pen moment</div>
      {phase.name === 'finished' ? (
        <>
          <p className="prompt" id="pen-prompt" role="status">
            Time. Finish your sentence, then put the pen down.
          </p>
          <InkLine progress={1} />
        </>
      ) : (
        <>
          <p className="prompt" id="pen-prompt">
            {challenge.pen}
          </p>
          <p className="center muted">Grab a pen and paper. Then choose your time and put the phone face down.</p>
          <div className="stones" role="group" aria-label="Writing time">
            {MINUTES.map((m) => (
              <button key={m} className="stone" disabled={phase.name === 'starting'} onClick={() => void start(m)}>
                {m} min
              </button>
            ))}
          </div>
        </>
      )}
      <button className="btn" onClick={wrote}>
        I wrote it
      </button>
      <div className="links" style={{ marginTop: '0.5rem' }}>
        <button className="tertiary" onClick={() => void pen('skipped')}>
          Not today
        </button>
        <button className="tertiary" onClick={() => go('notes', { prompt: challenge.pen })}>
          No paper nearby?
        </button>
      </div>
      <p className="center muted small">Your words stay on paper. The app never asks what you wrote.</p>
    </section>
  );
}
