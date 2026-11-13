import { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';
import { addNote, listNotes, removeNote, type Note } from './notes';

const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function NotesScreen() {
  const { notesDraft, todayEntry, pen, go } = useStore();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [writing, setWriting] = useState(!!notesDraft);
  const [text, setText] = useState(notesDraft?.text ?? '');
  const [prompt] = useState(notesDraft?.prompt);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listNotes()
      .then(setNotes)
      .catch(() => setNotes([]));
  }, []);

  const save = async () => {
    if (!text.trim()) return;
    let note;
    try {
      note = await addNote(text.trim(), prompt);
    } catch {
      setError('This note could not be saved on this device. Nothing was lost; try again.');
      return;
    }
    setError(null);
    setNotes((n) => [note, ...(n ?? [])]);
    setText('');
    setWriting(false);
    // Writing from the pen moment, digitally, still grows roots.
    if (prompt && todayEntry.done && !todayEntry.pen) {
      await pen('wrote');
      go('today');
    }
  };

  if (writing) {
    return (
      <section className="screen" aria-labelledby="note-title">
        <h2 id="note-title" className="visually-hidden">
          New note
        </h2>
        {prompt && <p className="serif" style={{ fontSize: '1.25rem' }}>{prompt}</p>}
        <label htmlFor="note-text" className="visually-hidden">
          Your note
        </label>
        <textarea
          id="note-text"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Write here."
        />
        <p className="field-hint">
          <span>Encrypted on this device.</span>
        </p>
        {error && (
          <p className="small" role="alert" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <div className="space" />
        <button className="btn" disabled={!text.trim()} onClick={() => void save()}>
          Keep it
        </button>
        <div className="links">
          <button
            className="link"
            onClick={() => {
              setWriting(false);
              setText('');
            }}
          >
            Put it away
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen" aria-labelledby="notes-title">
      <h1 id="notes-title">Notes</h1>
      <p className="muted">Paper first. Notes are here when you have no pen. They are encrypted and never leave this device.</p>
      <button className="btn quiet" onClick={() => setWriting(true)}>
        Write a note
      </button>
      <div className="space" />
      {notes === null ? null : notes.length === 0 ? (
        <p className="center muted serif">Nothing here yet. That is fine.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {notes.map((n) => (
            <li key={n.id} className="note">
              <div className="note-meta">
                <time dateTime={new Date(n.createdAt).toISOString()}>{fmt.format(n.createdAt)}</time>
                {confirmDelete === n.id ? (
                  <span>
                    <button
                      className="link"
                      style={{ color: 'var(--danger)' }}
                      onClick={async () => {
                        await removeNote(n.id);
                        setNotes((all) => (all ?? []).filter((x) => x.id !== n.id));
                        setConfirmDelete(null);
                      }}
                    >
                      Delete
                    </button>
                    <button className="link" onClick={() => setConfirmDelete(null)}>
                      Keep
                    </button>
                  </span>
                ) : (
                  <button className="link" aria-label="Delete this note" onClick={() => setConfirmDelete(n.id)}>
                    Remove
                  </button>
                )}
              </div>
              {n.prompt && <p className="small muted serif" style={{ margin: 0 }}>{n.prompt}</p>}
              <p className="note-text">{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
