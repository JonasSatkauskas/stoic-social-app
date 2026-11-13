import { describe, expect, it } from 'vitest';
import { generateIdentity } from '../../../lib/friendCrypto';
import { makePayload, parsePayload } from './payload';

const shared = {
  name: 'Ruta',
  cairn: { stones: 5, marks: 2, visitors: { outside: 1 } },
  completions: [
    { d: '2020-01-01', id: 'old', l: 'easy' as const },
    { d: new Date().toISOString().slice(0, 10), id: 'walk-no-phone', l: 'brave' as const },
  ],
};

describe('QR payload', () => {
  it('round trips and keeps only the last 7 days', async () => {
    const [a, b] = await Promise.all([generateIdentity(), generateIdentity()]);
    const text = JSON.stringify(makePayload(a.publicB64, shared));
    const r = parsePayload(text, b.publicB64);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.shared.name).toBe('Ruta');
      expect(r.shared.completions.map((c) => c.id)).not.toContain('old');
    }
  });

  it('rejects codes older than 60 seconds', async () => {
    const [a, b] = await Promise.all([generateIdentity(), generateIdentity()]);
    const text = JSON.stringify(makePayload(a.publicB64, shared, Date.now() - 61_000));
    expect(parsePayload(text, b.publicB64).ok).toBe(false);
  });

  it('rejects your own code and junk', async () => {
    const a = await generateIdentity();
    expect(parsePayload(JSON.stringify(makePayload(a.publicB64, shared)), a.publicB64).ok).toBe(false);
    expect(parsePayload('https://example.com', a.publicB64).ok).toBe(false);
  });

  it('never carries notes or talk text', async () => {
    const a = await generateIdentity();
    const p = makePayload(a.publicB64, shared);
    expect(Object.keys(p).sort()).toEqual(['k', 'n', 'r', 's', 't', 'v']);
    expect(Object.keys(p.s).sort()).toEqual(['b', 'c', 'o', 'x']);
  });
});
