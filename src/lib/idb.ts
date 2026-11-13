import { openDB, type IDBPDatabase } from 'idb';

/**
 * Single IndexedDB database.
 * - "keys":   CryptoKey objects (non-extractable where possible). Never plain text.
 * - "vault":  encrypted records { iv, data } only.
 * - "plain":  the streak only (allowed by CLAUDE.md), nothing personal.
 * - "outbox": ciphertext waiting to be posted to the relay.
 */
export const DB_NAME = 'lpml';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('keys');
        db.createObjectStore('vault');
        db.createObjectStore('plain');
        db.createObjectStore('outbox', { autoIncrement: true });
      },
    });
  }
  return dbPromise;
}
