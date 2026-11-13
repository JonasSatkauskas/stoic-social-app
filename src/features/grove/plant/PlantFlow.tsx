import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getIdentity, type Friendship } from '../../../lib/friendCrypto';
import { useStore } from '../../../lib/store';
import { friendshipWith, plantOrWater, sharedStateFrom, type SharedState } from '../friends';
import { sendState } from '../sync';
import { makePayload, parsePayload, REFRESH_MS } from './payload';

type Step =
  | { name: 'naming' }
  | { name: 'exchange' }
  | { name: 'words'; pub: string; shared: SharedState; friendship: Friendship }
  | { name: 'planted'; friendName: string; watered: boolean }
  | { name: 'mismatch' };

function LiveQr({ publicB64, shared }: { publicB64: string; shared: SharedState }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      if (!canvas.current) return;
      const text = JSON.stringify(makePayload(publicB64, shared));
      void QRCode.toCanvas(canvas.current, text, {
        errorCorrectionLevel: 'L',
        margin: 1,
        width: 480,
        color: { dark: '#2b2a26', light: '#ffffff' },
      });
    };
    draw();
    const id = window.setInterval(draw, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [publicB64, shared]);
  return (
    <div className="qr-ring">
      <canvas ref={canvas} role="img" aria-label="Your live code. It changes every 20 seconds." />
    </div>
  );
}

function Scanner({ active, onResult }: { active: boolean; onResult: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const cb = useRef(onResult);
  cb.current = onResult;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !video.current) return;
    const scanner = new QrScanner(video.current, (r) => cb.current(r.data), {
      preferredCamera: 'environment',
      maxScansPerSecond: 8,
      returnDetailedScanResult: true,
    });
    scanner.start().catch(() => setError('The camera is not available. Allow camera access and try again.'));
    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [active]);

  return (
    <>
      <video ref={video} className="camera" muted playsInline aria-label="Camera" />
      {error && (
        <p className="small" style={{ position: 'absolute', color: '#eee', padding: '1rem', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </>
  );
}

function PlantingAnimation() {
  return (
    <svg className="planting" viewBox="0 0 200 160" aria-hidden="true">
      <line className="soil" x1="20" y1="120" x2="180" y2="120" />
      <ellipse className="seed-drop" cx="100" cy="116" rx="6" ry="4" />
      <path className="sapling" pathLength={1} d="M100 120 C 98 100, 102 86, 100 66" />
      <path className="sapling-leaf" d="M100 80 q -16 -10 -24 2 q 12 6 24 -2" />
      <path className="sapling-leaf" d="M100 72 q 16 -12 24 -2 q -12 8 -24 2" />
    </svg>
  );
}

export function PlantFlow({ onDone }: { onDone: () => void }) {
  const { data, setName, addExtra } = useStore();
  const [step, setStep] = useState<Step>(data.profile.name ? { name: 'exchange' } : { name: 'naming' });
  const [nameInput, setNameInput] = useState('');
  const [me, setMe] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [scanned, setScanned] = useState<{ pub: string; shared: SharedState } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const shared = useMemo(() => sharedStateFrom(data, 7), [data]);
  const busy = useRef(false);

  useEffect(() => {
    void getIdentity().then((i) => setMe(i.publicB64));
  }, []);

  const onScan = async (text: string) => {
    if (busy.current || !me) return;
    const r = parsePayload(text, me);
    if (!r.ok) {
      setMessage(r.reason);
      return;
    }
    busy.current = true;
    setScanned({ pub: r.payload.k, shared: r.shared });
    setMessage(null);
    try {
      navigator.vibrate?.(40);
    } catch {
      /* ignore */
    }
    setFlipped(false); // let them scan me now
    busy.current = false;
  };

  const toWords = async () => {
    if (!scanned) return;
    const friendship = await friendshipWith(scanned.pub);
    setStep({ name: 'words', pub: scanned.pub, shared: scanned.shared, friendship });
  };

  if (step.name === 'naming') {
    return (
      <section className="screen" aria-labelledby="name-title">
        <h1 id="name-title">What should friends call you?</h1>
        <p className="muted">Only people you plant a tree with will see it.</p>
        <label htmlFor="display-name" className="visually-hidden">
          Your name
        </label>
        <input
          id="display-name"
          type="text"
          autoFocus
          maxLength={24}
          autoComplete="given-name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
        />
        <div className="space" />
        <button
          className="btn"
          disabled={!nameInput.trim()}
          onClick={async () => {
            await setName(nameInput);
            setStep({ name: 'exchange' });
          }}
        >
          Continue
        </button>
        <div className="links">
          <button className="link" onClick={onDone}>
            Not now
          </button>
        </div>
      </section>
    );
  }

  if (step.name === 'words') {
    return (
      <section className="screen" aria-labelledby="words-title">
        <h1 id="words-title" className="center">
          Read your words out loud.
        </h1>
        <p className="words" aria-label={`Your words: ${step.friendship.words.join(', ')}`}>
          {step.friendship.words.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </p>
        <p className="center muted">Do they match?</p>
        <div className="stones" role="group" aria-label="Do the words match">
          <button
            className="stone"
            onClick={async () => {
              const { friend, watered } = await plantOrWater(step.pub, step.shared);
              if (watered) await addExtra(1, 0);
              void sendState(data, [friend]).catch(() => undefined);
              setStep({ name: 'planted', friendName: friend.name, watered });
            }}
          >
            They match
          </button>
          <button className="stone" onClick={() => setStep({ name: 'mismatch' })}>
            They don't
          </button>
        </div>
      </section>
    );
  }

  if (step.name === 'planted') {
    return (
      <section className="screen center" aria-labelledby="planted-title">
        <PlantingAnimation />
        <h1 id="planted-title">{step.watered ? 'Watered. You met again today.' : 'Planted. You met in person today.'}</h1>
        <p className="muted">{step.friendName} is in your grove now.</p>
        <div className="space" />
        <button className="btn" onClick={onDone}>
          Back to the grove
        </button>
      </section>
    );
  }

  if (step.name === 'mismatch') {
    return (
      <section className="screen" aria-labelledby="mismatch-title">
        <h1 id="mismatch-title">Nothing was planted.</h1>
        <p>The words did not match, so one of the codes was not the one in front of you. Try again, face to face.</p>
        <div className="space" />
        <button
          className="btn"
          onClick={() => {
            setScanned(null);
            setFlipped(false);
            setStep({ name: 'exchange' });
          }}
        >
          Try again
        </button>
        <div className="links">
          <button className="link" onClick={onDone}>
            Back to the grove
          </button>
        </div>
      </section>
    );
  }

  // exchange
  return (
    <section className="screen" aria-labelledby="plant-title">
      <h1 id="plant-title" className="center">
        {flipped ? 'Scan theirs.' : scanned ? 'Now let them scan you.' : 'Show yours. Then scan theirs.'}
      </h1>
      <div className={`flip ${flipped ? 'flipped' : ''}`}>
        <div className="flip-inner">
          <div className="flip-face front" aria-hidden={flipped}>
            {me ? <LiveQr publicB64={me} shared={shared} /> : null}
          </div>
          <div className="flip-face back" aria-hidden={!flipped}>
            <Scanner active={flipped} onResult={(t) => void onScan(t)} />
          </div>
        </div>
      </div>
      {message && (
        <p className="center small" role="status" style={{ color: 'var(--danger)' }}>
          {message}
        </p>
      )}
      {scanned && !flipped ? (
        <>
          <p className="center muted small">You scanned {scanned.shared.name}. When they have scanned you too:</p>
          <button className="btn" onClick={() => void toWords()}>
            Check our words
          </button>
        </>
      ) : (
        <button
          className="btn quiet"
          onClick={() => {
            setMessage(null);
            setFlipped((f) => !f);
          }}
        >
          {flipped ? 'Show my code' : 'Scan theirs'}
        </button>
      )}
      <div className="links">
        <button className="link" onClick={onDone}>
          Not now
        </button>
      </div>
      <p className="center muted small">Codes change every 20 seconds and only work in person.</p>
    </section>
  );
}
