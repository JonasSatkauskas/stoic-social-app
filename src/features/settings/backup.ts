import { decryptWithPassphrase, encryptWithPassphrase, type PassphraseBlob } from '../../lib/crypto';
import type { AppData } from '../../lib/types';
import { listNotes, putNote, type Note } from '../notes/notes';

export interface BackupContent {
  kind: 'lpml-backup';
  version: 1;
  createdAt: number;
  app: AppData;
  notes: Note[];
}

export async function exportBackup(app: AppData, passphrase: string): Promise<Blob> {
  const content: BackupContent = { kind: 'lpml-backup', version: 1, createdAt: Date.now(), app, notes: await listNotes() };
  const blob = await encryptWithPassphrase(passphrase, content);
  return new Blob([JSON.stringify(blob)], { type: 'application/octet-stream' });
}

export async function readBackup(file: File, passphrase: string): Promise<BackupContent> {
  const blob = JSON.parse(await file.text()) as PassphraseBlob;
  const content = await decryptWithPassphrase<BackupContent>(passphrase, blob);
  if (content.kind !== 'lpml-backup') throw new Error('Not a backup');
  return content;
}

/** Merge: nothing already on this phone is lost. */
export function mergeApp(current: AppData, incoming: AppData): AppData {
  const days = { ...incoming.days };
  for (const [d, e] of Object.entries(current.days)) {
    const other = days[d];
    days[d] = !other || (e.done && !other.done) || (e.pen === 'wrote' && other.pen !== 'wrote') ? e : other;
  }
  return {
    days,
    extra: {
      stones: Math.max(current.extra?.stones ?? 0, incoming.extra?.stones ?? 0),
      marks: Math.max(current.extra?.marks ?? 0, incoming.extra?.marks ?? 0),
    },
    profile: { name: current.profile.name ?? incoming.profile.name },
    createdAt: Math.min(current.createdAt, incoming.createdAt),
  };
}

export async function importNotes(notes: Note[]): Promise<number> {
  const existing = new Set((await listNotes()).map((n) => n.id));
  const fresh = notes.filter((n) => !existing.has(n.id));
  await Promise.all(fresh.map(putNote));
  return fresh.length;
}
