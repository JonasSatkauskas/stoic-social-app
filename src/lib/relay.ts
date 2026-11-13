/**
 * Firestore as a blind relay. Only ciphertext is ever posted:
 *   boxes/{mailboxId}/msgs/{auto} = { c, iv, t, exp }
 * No Auth, no names, no plain text. Uses the REST-based "lite" SDK.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  type Firestore,
} from 'firebase/firestore/lite';
import type { EncryptedUpdate } from './friendCrypto';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const relayEnabled = !!(config.apiKey && config.projectId);
const TTL_MS = 30 * 86_400_000;

let db: Firestore | null = null;
function store(): Firestore {
  if (!relayEnabled) throw new Error('Relay not configured');
  if (!db) {
    const app: FirebaseApp = initializeApp(config);
    db = getFirestore(app);
  }
  return db;
}

function assertMailbox(id: string) {
  if (!/^[0-9a-f]{32}$/.test(id)) throw new Error('Bad mailbox id');
}

export async function postUpdate(mailboxId: string, u: EncryptedUpdate): Promise<void> {
  assertMailbox(mailboxId);
  await addDoc(collection(store(), 'boxes', mailboxId, 'msgs'), {
    c: u.c,
    iv: u.iv,
    t: serverTimestamp(),
    exp: Timestamp.fromMillis(Date.now() + TTL_MS),
  });
}

export interface RelayMessage extends EncryptedUpdate {
  t: number;
}

export async function fetchUpdates(mailboxId: string, sinceMs: number): Promise<RelayMessage[]> {
  assertMailbox(mailboxId);
  const q = query(collection(store(), 'boxes', mailboxId, 'msgs'), where('t', '>', Timestamp.fromMillis(sinceMs)), orderBy('t'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data() as { c: string; iv: string; t: Timestamp };
    return { c: x.c, iv: x.iv, t: x.t.toMillis() };
  });
}
