import { useState } from 'react';
import { useStore } from '../../lib/store';

/** After writing on paper: one optional word for today's stone. */
export function CarveWord() {
  const { carveWord } = useStore();
  const [word, setWord] = useState('');
  const clean = word.trim().split(/\s+/)[0] ?? '';

  return (
    <section className="screen pen" aria-labelledby="carve-title">
      <div className="eyebrow center">Today's stone</div>
      <h1 id="carve-title" className="center">
        Carve one word.
      </h1>
      <p className="center muted">The paper keeps the whole thought. The stone keeps one word.</p>
      <label htmlFor="carve" className="visually-hidden">
        One word
      </label>
      <input
        id="carve"
        type="text"
        className="carve-input"
        maxLength={24}
        autoComplete="off"
        autoCapitalize="none"
        placeholder="patience"
        value={word}
        onChange={(e) => setWord(e.target.value.replace(/\s+/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && clean) void carveWord(clean);
        }}
      />
      <p className="field-hint center-hint">Encrypted on this phone. Never shared.</p>
      <div className="space" />
      <button className="btn" disabled={!clean} onClick={() => void carveWord(clean)}>
        Carve it
      </button>
      <div className="links">
        <button className="tertiary" onClick={() => void carveWord(null)}>
          No word today
        </button>
      </div>
    </section>
  );
}
