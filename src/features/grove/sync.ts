/**
 * Trail sync. After progress, one encrypted update per friend goes to the
 * relay. Failed posts wait in the outbox (ciphertext only) and retry later.
 */
import { getDB } from '../../lib/idb';
import { encryptUpdate, decryptUpdate, getIdentity, fingerprint } from '../../lib/friendCrypto';
import { fetchUpdates, postUpdate, relayEnabled } from '../../lib/relay';
import { onProgress } from '../../lib/store';
import { normalizeCairn } from '../cairn/growth';
import type { AppData } from '../../lib/types';
import { friendshipWith, listFriends, mergeCompletions, saveFriend, sharedStateFrom, type Friend, type GroveMessage } from './friends';

interface OutboxItem {
  mailboxId: string;
  c: string;
  iv: string;
}

let myFp: Promise<string> | null = null;
function myFingerprint() {
  if (!myFp) myFp = getIdentity().then((i) => fingerprint(i.publicB64));
  return myFp;
}

async function queue(item: OutboxItem) {
  const db = await getDB();
  await db.add('outbox', item);
}

export async function flushOutbox(): Promise<void> {
  if (!relayEnabled || !navigator.onLine) return;
  const db = await getDB();
  const keys = await db.getAllKeys('outbox');
  for (const k of keys) {
    const item = (await db.get('outbox', k)) as OutboxItem | undefined;
    if (!item) continue;
    try {
      await postUpdate(item.mailboxId, { c: item.c, iv: item.iv });
      await db.delete('outbox', k);
    } catch {
      return; // still offline or relay unreachable; try later
    }
  }
}

async function send(friend: Pick<Friend, 'pub'>, msg: GroveMessage) {
  if (!relayEnabled) return;
  const { mailboxId, key } = await friendshipWith(friend.pub);
  const enc = await encryptUpdate(key, msg);
  try {
    if (!navigator.onLine) throw new Error('offline');
    await postUpdate(mailboxId, enc);
  } catch {
    await queue({ mailboxId, ...enc });
  }
}

export async function sendState(data: AppData, friends?: Pick<Friend, 'pub'>[]): Promise<void> {
  const list = friends ?? (await listFriends());
  if (list.length === 0) return;
  const from = await myFingerprint();
  const msg: GroveMessage = { v: 1, kind: 'state', from, ...sharedStateFrom(data) };
  await Promise.all(list.map((f) => send(f, msg).catch(() => undefined)));
}

export async function sendPebble(friend: Friend, d: string): Promise<void> {
  const from = await myFingerprint();
  await send(friend, { v: 1, kind: 'pebble', from, d });
}

/** Fetch and apply new updates for every friend. Returns the updated list. */
export async function pullUpdates(): Promise<Friend[]> {
  const friends = await listFriends();
  if (!relayEnabled || !navigator.onLine) return friends;
  await flushOutbox();
  const me = await myFingerprint();
  return Promise.all(
    friends.map(async (f) => {
      try {
        const { mailboxId, key } = await friendshipWith(f.pub);
        const msgs = await fetchUpdates(mailboxId, f.cursor);
        if (msgs.length === 0) return f;
        let next: Friend = { ...f };
        for (const m of msgs) {
          next.cursor = Math.max(next.cursor, m.t);
          let body: GroveMessage;
          try {
            body = await decryptUpdate<GroveMessage>(key, m);
          } catch {
            continue; // not for us or tampered
          }
          if (body.v !== 1 || body.from === me) continue;
          if (body.kind === 'state') {
            next = {
              ...next,
              name: String(body.name).slice(0, 24),
              cairn: normalizeCairn((body as { cairn?: unknown; tree?: unknown }).cairn ?? (body as { tree?: unknown }).tree),
              completions: mergeCompletions(next.completions, body.completions),
            };
          } else if (body.kind === 'pebble' && !next.pebblesFromThem.includes(body.d)) {
            next.pebblesFromThem = [...next.pebblesFromThem, body.d].slice(-30);
          }
        }
        await saveFriend(next);
        return next;
      } catch {
        return f;
      }
    }),
  );
}

let started = false;
/** Called once at startup: send updates on progress, flush when back online. */
export function startGroveSync(): void {
  if (started) return;
  started = true;
  onProgress((data) => void sendState(data).catch(() => undefined));
  window.addEventListener('online', () => void flushOutbox());
}
