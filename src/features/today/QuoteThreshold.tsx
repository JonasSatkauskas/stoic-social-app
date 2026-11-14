import { useEffect, useState } from 'react';
import type { Line } from './lines';

const VISIBLE_MS = 60_000;
const FADE_MS = 9_000;

/**
 * The first screen of the day: one quote, copied by hand before it fades.
 * No archive, no favourites, no way back. The notebook is the only library.
 */
export function QuoteThreshold({ line, onCopied, onContinue }: { line: Line; onCopied: () => void; onContinue: () => void }) {
  const [stage, setStage] = useState<'shown' | 'fading' | 'gone'>('shown');

  useEffect(() => {
    const a = window.setTimeout(() => setStage('fading'), VISIBLE_MS);
    const b = window.setTimeout(() => setStage('gone'), VISIBLE_MS + FADE_MS);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  return (
    <main className="threshold" aria-labelledby="threshold-title">
      <p className="threshold-hint" id="threshold-title">
        {stage === 'gone' ? 'It has faded. If you copied it, it lives in your notebook.' : 'Copy it by hand before it fades.'}
      </p>

      <figure className={`threshold-quote ${stage}`} aria-hidden={stage === 'gone'}>
        <blockquote>{line.text}</blockquote>
        <figcaption>
          {line.author}, <cite>{line.work}</cite>
        </figcaption>
        <p className="threshold-practice">{line.practice}</p>
      </figure>

      <div className="threshold-actions">
        <button className="stone stone-primary" onClick={onCopied}>
          I copied it
        </button>
        <button className="tertiary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </main>
  );
}
