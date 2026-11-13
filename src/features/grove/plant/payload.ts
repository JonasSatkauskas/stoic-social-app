import { addDays, dateKey } from '../../../lib/dates';
import { randomBytes, toB64 } from '../../../lib/crypto';
import { isValidPublicKey } from '../../../lib/friendCrypto';
import type { Completion, Level, TreeState } from '../../../lib/types';
import type { SharedState } from '../friends';

/** Live QR payload. Refreshes every 20 s, accepted for 60 s. */
export const REFRESH_MS = 20_000;
export const MAX_AGE_MS = 60_000;

export interface QrPayload {
  v: 1;
  k: string; // public key, base64 raw P-256
  n: string; // display name
  r: string; // random nonce
  t: number; // timestamp ms
  s: {
    b: number; // branch points
    o: number; // root points
    x: TreeState['visitors'];
    c: [string, string, Level][]; // last 7 days: date, challenge id, level
  };
}

export function makePayload(publicB64: string, shared: SharedState, now = Date.now()): QrPayload {
  const since = addDays(dateKey(new Date(now)), -7);
  return {
    v: 1,
    k: publicB64,
    n: shared.name,
    r: toB64(randomBytes(8)),
    t: now,
    s: {
      b: shared.tree.branch,
      o: shared.tree.root,
      x: shared.tree.visitors,
      c: shared.completions.filter((c) => c.d >= since).map((c) => [c.d, c.id, c.l]),
    },
  };
}

export type ParseResult = { ok: true; payload: QrPayload; shared: SharedState } | { ok: false; reason: string };

const LEVELS: Level[] = ['easy', 'medium', 'brave'];

export function parsePayload(text: string, myPublicB64: string, now = Date.now()): ParseResult {
  let p: QrPayload;
  try {
    p = JSON.parse(text) as QrPayload;
  } catch {
    return { ok: false, reason: 'That is not a Grove code.' };
  }
  if (!p || p.v !== 1 || typeof p.k !== 'string' || typeof p.t !== 'number' || !p.s) {
    return { ok: false, reason: 'That is not a Grove code.' };
  }
  if (!isValidPublicKey(p.k)) return { ok: false, reason: 'That code could not be read. Try again.' };
  if (p.k === myPublicB64) return { ok: false, reason: 'That is your own code.' };
  if (Math.abs(now - p.t) > MAX_AGE_MS) {
    return { ok: false, reason: 'This code has expired. Ask them to show a fresh one, here and now.' };
  }
  const completions: Completion[] = Array.isArray(p.s.c)
    ? p.s.c
        .filter((c) => Array.isArray(c) && typeof c[0] === 'string' && typeof c[1] === 'string' && LEVELS.includes(c[2]))
        .map(([d, id, l]) => ({ d, id, l }))
    : [];
  const shared: SharedState = {
    name: (typeof p.n === 'string' && p.n.trim() ? p.n : 'A friend').slice(0, 24),
    tree: {
      branch: Math.max(0, Number(p.s.b) || 0),
      root: Math.max(0, Number(p.s.o) || 0),
      visitors: typeof p.s.x === 'object' && p.s.x ? p.s.x : {},
    },
    completions,
  };
  return { ok: true, payload: p, shared };
}
