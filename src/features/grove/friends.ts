import { addDays, dateKey, daysBetween } from '../../lib/dates';
import { deleteSecure, listSecureIds, loadSecure, saveSecure } from '../../lib/db';
import { deriveFriendship, fingerprint, getIdentity, type Friendship } from '../../lib/friendCrypto';
import type { AppData, CairnState, Completion } from '../../lib/types';
import { cairnFromData, completionsFromData, normalizeCairn } from '../cairn/growth';

/** Exactly what a friend may know about you. Nothing else is ever shared. */
export interface SharedState {
  name: string;
  cairn: CairnState;
  completions: Completion[];
}

export interface Friend extends SharedState {
  fp: string;
  pub: string;
  plantedAt: string;
  metAt: string;
  /** Relay cursor (server time, ms) */
  cursor: number;
  pebblesFromThem: string[];
  pebbleSentOn: string | null;
}

export type GroveMessage =
  | ({ v: 1; kind: 'state'; from: string } & SharedState)
  | { v: 1; kind: 'pebble'; from: string; d: string };

const PREFIX = 'friend:';

export function sharedStateFrom(data: AppData, days = 60): SharedState {
  return {
    name: data.profile.name ?? 'A friend',
    cairn: cairnFromData(data),
    completions: completionsFromData(data, addDays(dateKey(), -days)),
  };
}

export async function listFriends(): Promise<Friend[]> {
  const ids = await listSecureIds(PREFIX);
  const all = await Promise.all(ids.map((id) => loadSecure<Friend>(id)));
  return all.filter((f): f is Friend => !!f).map(migrateFriend);
}

/** Friends saved before the cairn kept a tree (branch, root). */
function migrateFriend(f: Friend): Friend {
  const old = f as Friend & { tree?: unknown };
  if (f.cairn && !old.tree) return f;
  const { tree, ...rest } = old;
  return { ...rest, cairn: normalizeCairn(f.cairn ?? tree) };
}

export function saveFriend(f: Friend): Promise<void> {
  return saveSecure(PREFIX + f.fp, f);
}

export async function letGo(fp: string): Promise<void> {
  friendshipCache.delete(fp);
  await deleteSecure(PREFIX + fp);
}

const friendshipCache = new Map<string, Promise<Friendship>>();

/** Mailbox, key and words are re-derived from the public keys, never stored. */
export function friendshipWith(pub: string): Promise<Friendship> {
  let p = friendshipCache.get(pub);
  if (!p) {
    p = getIdentity().then((me) => deriveFriendship(me.privateKey, me.publicB64, pub));
    friendshipCache.set(pub, p);
  }
  return p;
}

export function mergeCompletions(a: Completion[], b: Completion[]): Completion[] {
  const byDate = new Map<string, Completion>();
  for (const c of [...a, ...b]) byDate.set(c.d, c);
  return [...byDate.values()].sort((x, y) => x.d.localeCompare(y.d)).slice(-120);
}

export async function plantOrWater(pub: string, shared: SharedState): Promise<{ friend: Friend; watered: boolean }> {
  const fp = await fingerprint(pub);
  const today = dateKey();
  const existing = await loadSecure<Friend>(PREFIX + fp);
  const friend: Friend = existing
    ? {
        ...existing,
        name: shared.name,
        cairn: shared.cairn,
        completions: mergeCompletions(existing.completions, shared.completions),
        metAt: today,
      }
    : {
        fp,
        pub,
        ...shared,
        plantedAt: today,
        metAt: today,
        cursor: Date.now() - 60_000,
        pebblesFromThem: [],
        pebbleSentOn: null,
      };
  await saveFriend(friend);
  return { friend, watered: !!existing && existing.metAt !== today };
}

export function daysSinceMet(f: Friend, today = dateKey()): number {
  return Math.max(0, daysBetween(f.metAt, today));
}

export function metText(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function doneToday(f: Pick<Friend, 'completions'>, today = dateKey()): Completion | undefined {
  return f.completions.find((c) => c.d === today);
}

export function markWords(marks: number): string {
  if (marks === 0) return 'No lines carved yet.';
  if (marks < 5) return 'A few lines carved from writing.';
  if (marks < 15) return 'Steady lines carved from writing.';
  return 'Deeply inscribed from writing.';
}
