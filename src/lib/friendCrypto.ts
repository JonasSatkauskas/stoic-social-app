/**
 * Friend crypto. Web Crypto only.
 * Identity: ECDH P-256 key pair, private key non-extractable, kept in IndexedDB.
 * Friendship: ECDH shared secret -> HKDF-SHA-256 (salt = SHA-256 of both public
 * keys, sorted) -> mailbox ID (128 bit), AES-GCM key, three check words.
 */
import words from '../data/words.json';
import { fromB64, randomBytes, toB64 } from './crypto';
import { getDB } from './idb';

const enc = new TextEncoder();
const dec = new TextDecoder();
const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const;

export interface Identity {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicB64: string;
}

export async function generateIdentity(): Promise<Identity> {
  const pair = await crypto.subtle.generateKey(ECDH, false, ['deriveBits']);
  const publicB64 = toB64(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { privateKey: pair.privateKey, publicKey: pair.publicKey, publicB64 };
}

let identityPromise: Promise<Identity> | null = null;

export function getIdentity(): Promise<Identity> {
  if (!identityPromise) {
    identityPromise = (async () => {
      const db = await getDB();
      const existing = (await db.get('keys', 'identity')) as Identity | undefined;
      if (existing) return existing;
      const id = await generateIdentity();
      await db.put('keys', id, 'identity');
      return id;
    })();
  }
  return identityPromise;
}

export function isValidPublicKey(b64: string): boolean {
  try {
    const raw = fromB64(b64);
    return raw.length === 65 && raw[0] === 4;
  } catch {
    return false;
  }
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Short stable id for a public key (used locally and inside ciphertext only). */
export async function fingerprint(publicB64: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', fromB64(publicB64));
  return toHex(h).slice(0, 16);
}

export interface Friendship {
  mailboxId: string;
  key: CryptoKey;
  words: [string, string, string];
}

export async function deriveFriendship(
  myPrivate: CryptoKey,
  myPublicB64: string,
  theirPublicB64: string,
): Promise<Friendship> {
  if (!isValidPublicKey(theirPublicB64)) throw new Error('Invalid public key');
  if (myPublicB64 === theirPublicB64) throw new Error('Cannot befriend yourself');
  const theirKey = await crypto.subtle.importKey('raw', fromB64(theirPublicB64), ECDH, false, []);
  const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: theirKey }, myPrivate, 256);

  const [a, b] = [myPublicB64, theirPublicB64].sort();
  const pubs = new Uint8Array([...fromB64(a), ...fromB64(b)]);
  const salt = new Uint8Array(await crypto.subtle.digest('SHA-256', pubs));

  const ikm = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const hkdf = (info: string) => ({ name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode(info) });

  const mailboxBits = await crypto.subtle.deriveBits(hkdf('lpml mailbox v1'), ikm, 128);
  const key = await crypto.subtle.deriveKey(hkdf('lpml key v1'), ikm, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  const wordBytes = new Uint8Array(await crypto.subtle.deriveBits(hkdf('lpml words v1'), ikm, 24));
  const list = words as string[];
  return {
    mailboxId: toHex(mailboxBits),
    key,
    words: [list[wordBytes[0]], list[wordBytes[1]], list[wordBytes[2]]],
  };
}

export interface EncryptedUpdate {
  c: string;
  iv: string;
}

export async function encryptUpdate(key: CryptoKey, value: unknown): Promise<EncryptedUpdate> {
  const iv = randomBytes(12);
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)));
  return { c: toB64(c), iv: toB64(iv) };
}

export async function decryptUpdate<T>(key: CryptoKey, u: EncryptedUpdate): Promise<T> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(u.iv) }, key, fromB64(u.c));
  return JSON.parse(dec.decode(plain)) as T;
}
