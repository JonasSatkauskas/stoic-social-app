import { useEffect, useRef, useState } from 'react';
import { addDays, dateKey } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { addNote, listNotes, putNote, removeNote, type Note } from './notes';

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const longFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

function dayTitle(key: string): string {
  const today = dateKey();
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  const d = new Date(key + 'T12:00');
  return key > addDays(today, -7) ? weekdayFmt.format(d) : longFmt.format(d);
}

export function NotesScreen() {
  const { notesDraft, todayEntry, pen, go } = useStore();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [writing, setWriting] = useState(!!notesDraft);
  const [text, setText] = useState(notesDraft?.text ?? '');
  const [prompt] = useState(notesDraft?.prompt);
  const [held, setHeld] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Note | null>(null);
  const press = useRef<number | null>(null);
  const undoTimer = useRef<number | null>(null);
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
    // Writing from the pen moment, digitally, still carves into the cairn.
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
            className="tertiary"
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

  const startPress = (id: string) => {
    cancelPress();
    press.current = window.setTimeout(() => {
      try {
        navigator.vibrate?.(15);
      } catch {
        /* ignore */
      }
      setHeld(id);
    }, 550);
  };
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current);
    press.current = null;
  };

  const letGo = async (n: Note) => {
    await removeNote(n.id);
    setNotes((all) => (all ?? []).filter((x) => x.id !== n.id));
    setHeld(null);
    setRemoved(n);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setRemoved(null), 5000);
  };

  const undo = async () => {
    if (!removed) return;
    await putNote(removed);
    setNotes((all) => [...(all ?? []), removed].sort((a, b) => b.createdAt - a.createdAt));
    setRemoved(null);
  };

  const groups: { key: string; notes: Note[] }[] = [];
  for (const n of notes ?? []) {
    const key = dateKey(new Date(n.createdAt));
    const g = groups[groups.length - 1];
    if (g && g.key === key) g.notes.push(n);
    else groups.push({ key, notes: [n] });
  }

  return (
    <section className="screen" aria-labelledby="notes-title">
      <h1 id="notes-title">Notes</h1>
      <p className="muted">Paper first. Notes are here when you have no pen. They are encrypted and never leave this device.</p>
      <button className="btn quiet" onClick={() => setWriting(true)}>
        Write here instead
      </button>
      <div className="space" />
      {notes === null ? null : notes.length === 0 ? (
        <p className="center muted serif">Nothing here yet. That is fine.</p>
      ) : (
        <>
          <p className="center muted small">Hold a note to let it go.</p>
          {groups.map((g) => (
            <div key={g.key} className="note-day">
              <h2 className="note-day-title">{dayTitle(g.key)}</h2>
              <ul className="note-list">
                {g.notes.map((n) => (
                  <li
                    key={n.id}
                    className={`note ${held === n.id ? 'held' : ''}`}
                    onPointerDown={() => startPress(n.id)}
                    onPointerUp={cancelPress}
                    onPointerLeave={cancelPress}
                    onPointerCancel={cancelPress}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <div className="note-meta">
                      <time dateTime={new Date(n.createdAt).toISOString()}>{timeFmt.format(n.createdAt)}</time>
                      <button className="visually-hidden" onClick={() => setHeld(n.id)}>
                        Options for this note
                      </button>
                    </div>
                    {n.prompt && <p className="small muted serif" style={{ margin: 0 }}>{n.prompt}</p>}
                    <p className="note-text">{n.text}</p>
                    {held === n.id && (
                      <div className="note-actions">
                        <button className="btn quiet small-btn" onClick={() => void letGo(n)}>
                          Let it go
                        </button>
                        <button className="tertiary" onClick={() => setHeld(null)}>
                          Keep
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      {removed && (
        <div className="toast" role="status">
          <p className="toast-text">Let go.</p>
          <div className="toast-actions">
            <button className="toast-go" onClick={() => void undo()}>
              Undo
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
