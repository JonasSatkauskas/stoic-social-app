/**
 * App storage. Everything personal goes through encryptJSON before it touches
 * IndexedDB. The only plain record is the streak.
 */
import { getDB } from './idb';
import { decryptJSON, encryptJSON, getDeviceKey, type Sealed } from './crypto';

export async function loadSecure<T>(id: string): Promise<T | undefined> {
  const db = await getDB();
  const sealed = (await db.get('vault', id)) as Sealed | undefined;
  if (!sealed) return undefined;
  return decryptJSON<T>(await getDeviceKey(), sealed);
}

export async function saveSecure(id: string, value: unknown): Promise<void> {
  const sealed = await encryptJSON(await getDeviceKey(), value);
  const db = await getDB();
  await db.put('vault', sealed, id);
}

export async function deleteSecure(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('vault', id);
}

export async function listSecureIds(prefix: string): Promise<string[]> {
  const db = await getDB();
  const keys = await db.getAllKeys('vault');
  return keys.map(String).filter((k) => k.startsWith(prefix));
}

export interface Streak {
  count: number;
  lastDate: string | null;
}

export async function loadStreak(): Promise<Streak> {
  const db = await getDB();
  return ((await db.get('plain', 'streak')) as Streak | undefined) ?? { count: 0, lastDate: null };
}

export async function saveStreak(s: Streak): Promise<void> {
  const db = await getDB();
  await db.put('plain', s, 'streak');
}

let persistAsked = false;
export async function requestPersistence(): Promise<void> {
  if (persistAsked) return;
  persistAsked = true;
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* not supported */
  }
}

/** Removes everything. Used by "Start fresh" in settings. */
export async function wipeAll(): Promise<void> {
  const db = await getDB();
  await Promise.all(['keys', 'vault', 'plain', 'outbox'].map((s) => db.clear(s)));
}
