/**
 * Device encryption (AES-GCM, non-extractable key) and passphrase encryption
 * for backups (PBKDF2-SHA-256, 600 000 iterations). Web Crypto only.
 */
import { getDB } from './idb';

export interface Sealed {
  iv: Uint8Array;
  data: ArrayBuffer;
}

export const PBKDF2_ITERATIONS = 600_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

export function generateDeviceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

let deviceKeyPromise: Promise<CryptoKey> | null = null;

/** Loads the device key from IndexedDB, creating it on first use. */
export function getDeviceKey(): Promise<CryptoKey> {
  if (!deviceKeyPromise) {
    deviceKeyPromise = (async () => {
      const db = await getDB();
      const existing = (await db.get('keys', 'device')) as CryptoKey | undefined;
      if (existing) return existing;
      const key = await generateDeviceKey();
      await db.put('keys', key, 'device');
      return key;
    })();
  }
  return deviceKeyPromise;
}

export async function encryptJSON(key: CryptoKey, value: unknown): Promise<Sealed> {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)));
  return { iv, data };
}

export async function decryptJSON<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  const iv = new Uint8Array(sealed.iv);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, sealed.data);
  return JSON.parse(dec.decode(plain)) as T;
}

/* ---------- Passphrase encryption (backups) ---------- */

export interface PassphraseBlob {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}

async function passphraseKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptWithPassphrase(
  passphrase: string,
  value: unknown,
  iterations = PBKDF2_ITERATIONS,
): Promise<PassphraseBlob> {
  const salt = randomBytes(16);
  const key = await passphraseKey(passphrase, salt, iterations);
  const { iv, data } = await encryptJSON(key, value);
  return { v: 1, kdf: 'PBKDF2-SHA256', iter: iterations, salt: toB64(salt), iv: toB64(iv), ct: toB64(data) };
}

export async function decryptWithPassphrase<T>(passphrase: string, blob: PassphraseBlob): Promise<T> {
  if (blob.v !== 1 || blob.kdf !== 'PBKDF2-SHA256') throw new Error('Unknown backup format');
  const key = await passphraseKey(passphrase, fromB64(blob.salt), blob.iter);
  return decryptJSON<T>(key, { iv: fromB64(blob.iv), data: fromB64(blob.ct).buffer });
}
