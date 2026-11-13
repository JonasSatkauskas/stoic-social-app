import { deleteSecure, listSecureIds, loadSecure, requestPersistence, saveSecure } from '../../lib/db';
import { randomBytes, toB64 } from '../../lib/crypto';

export interface Note {
  id: string;
  text: string;
  prompt?: string;
  createdAt: number;
}

const PREFIX = 'note:';

export async function listNotes(): Promise<Note[]> {
  const ids = await listSecureIds(PREFIX);
  const notes = await Promise.all(ids.map((id) => loadSecure<Note>(id)));
  return notes.filter((n): n is Note => !!n).sort((a, b) => b.createdAt - a.createdAt);
}

export async function addNote(text: string, prompt?: string): Promise<Note> {
  const note: Note = { id: toB64(randomBytes(9)).replace(/[+/=]/g, ''), text, prompt, createdAt: Date.now() };
  await saveSecure(PREFIX + note.id, note);
  void requestPersistence();
  return note;
}

export async function removeNote(id: string): Promise<void> {
  await deleteSecure(PREFIX + id);
}

export async function putNote(note: Note): Promise<void> {
  await saveSecure(PREFIX + note.id, note);
}
