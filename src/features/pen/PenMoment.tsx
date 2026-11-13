import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../lib/store';

const MINUTES = [2, 5, 10];

type Phase = { name: 'choose' } | { name: 'timing'; minutes: number; start: number } | { name: 'finished' };

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
  const [now, setNow] = useState(Date.now());
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (phase.name !== 'timing') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    navigator.wakeLock
      ?.request('screen')
      .then((w) => (wakeLock.current = w))
      .catch(() => undefined);
    return () => {
      window.clearInterval(id);
      void wakeLock.current?.release().catch(() => undefined);
      wakeLock.current = null;
    };
  }, [phase.name]);

  const elapsed = phase.name === 'timing' ? now - phase.start : 0;
  const total = phase.name === 'timing' ? phase.minutes * 60_000 : 1;
  const progress = Math.min(1, elapsed / total);

  useEffect(() => {
    if (phase.name === 'timing' && progress >= 1) {
      signalTimeUp();
      setPhase({ name: 'finished' });
    }
  }, [phase.name, progress]);

  const wrote = () => void pen('wrote');

  if (phase.name === 'timing') {
    const left = Math.max(0, Math.ceil((total - elapsed) / 60_000));
    return (
      <section className="screen pen" aria-label="Writing time">
        <p className="center serif" style={{ fontSize: '1.35rem' }}>
          Put your phone face down. We'll wait.
        </p>
        <InkLine progress={progress} />
        <p className="center muted small" aria-live="off">
          {left <= 1 ? 'Less than a minute left' : `About ${left} minutes left`}
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
          <p className="center muted">Grab a pen and paper.</p>
          <div className="stones" role="group" aria-label="Writing time">
            {MINUTES.map((m) => (
              <button key={m} className="stone" onClick={() => setPhase({ name: 'timing', minutes: m, start: Date.now() })}>
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
        <button className="link" onClick={() => void pen('skipped')}>
          Not today
        </button>
        <button className="link" onClick={() => go('notes', { prompt: challenge.pen })}>
          No paper nearby?
        </button>
      </div>
      <p className="center muted small">Your words stay on paper. The app never asks what you wrote.</p>
    </section>
  );
}
