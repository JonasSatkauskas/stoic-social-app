import { useEffect, useRef, useState } from 'react';
import { addDays } from '../../lib/dates';
import { canPromptInstall, isIOS, isStandalone, onInstallChange, promptInstall } from '../../lib/install';
import { useStore } from '../../lib/store';
import { challengeForDate } from '../today/challenges';
import { countDemoDays } from '../today/demo';
import { exportBackup, importNotes, mergeApp, readBackup } from './backup';

type Panel = null | 'export' | 'import' | 'name';

function PenSheet({ from }: { from: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="print-only sheet">
      <h1>Pen sheet</h1>
      {days.map((d) => {
        const c = challengeForDate(d);
        return (
          <div className="sheet-day" key={d}>
            <h3>
              {fmt.format(new Date(d + 'T12:00'))}: {c.title}
            </h3>
            <p>{c.pen}</p>
            <div className="sheet-lines" />
          </div>
        );
      })}
    </div>
  );
}

export default function SettingsScreen() {
  const { data, today, replaceData, setName, go, removeDemoDays, resetCairn } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const demoDays = countDemoDays(data);
  const [panel, setPanel] = useState<Panel>(null);
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [nameInput, setNameInput] = useState(data.profile.name ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [canInstall, setCanInstall] = useState(canPromptInstall());
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const off = onInstallChange(() => setCanInstall(canPromptInstall()));
    return () => void off();
  }, []);

  const open = (p: Panel) => {
    setPanel(p);
    setPass1('');
    setPass2('');
    setStatus(null);
  };

  const doExport = async () => {
    setWorking(true);
    try {
      const blob = await exportBackup(data, pass1);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `less-phone-backup-${today}.lpml`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus('Backup saved. Keep the file and the passphrase in different places.');
      setPass1('');
      setPass2('');
    } finally {
      setWorking(false);
    }
  };

  const doImport = async () => {
    const f = file.current?.files?.[0];
    if (!f) return setStatus('Choose a backup file first.');
    setWorking(true);
    try {
      const content = await readBackup(f, pass1);
      await replaceData(mergeApp(data, content.app));
      const n = await importNotes(content.notes);
      setStatus(`Restored. ${n === 0 ? 'No new notes.' : n === 1 ? 'One note added.' : `${n} notes added.`}`);
      setPass1('');
    } catch {
      setStatus('That did not open. Check the passphrase and the file.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="screen" aria-labelledby="settings-title">
      <h1 id="settings-title">This phone</h1>
      <p className="muted">Everything lives here, encrypted. No account, no cloud copy.</p>

      <hr className="rule" />

      {/* Install */}
      {!isStandalone() && (
        <>
          <h2>Keep it on your home screen</h2>
          {canInstall ? (
            <button className="btn quiet" onClick={() => void promptInstall()}>
              Install app
            </button>
          ) : isIOS() ? (
            <ol className="help-list">
              <li>Open this page in Safari.</li>
              <li>Tap Share, the square with an arrow.</li>
              <li>Choose Add to Home Screen.</li>
            </ol>
          ) : (
            <p className="muted">Use your browser menu and choose Install app or Add to Home Screen.</p>
          )}
          <hr className="rule" />
        </>
      )}

      {demoDays > 0 && (
        <>
          <h2>Demo days</h2>
          <p className="muted">
            {demoDays === 1 ? 'One day was' : `${demoDays} days were`} added by the demo shortcut. Remove them to see only your own growth.
          </p>
          <button className="btn quiet" onClick={() => void removeDemoDays()}>
            Remove demo days
          </button>
          <hr className="rule" />
        </>
      )}

      {/* Pen sheet */}
      <h2>Pen sheet</h2>
      <p className="muted">The next seven challenges and their pen prompts on one page, with room to write.</p>
      <button className="btn quiet" onClick={() => window.print()}>
        Print this week's pen sheet
      </button>

      <hr className="rule" />

      {/* Backup */}
      <h2>Backup</h2>
      <p className="muted">
        Your days, cairn and notes, locked with a passphrase you choose. If you lose the passphrase, the backup cannot be opened by
        anyone, including you. Friends are not in the backup: they live in this phone's keys, so you meet them again in person.
      </p>
      {panel === 'export' ? (
        <div>
          <label htmlFor="p1" className="small muted">
            Passphrase
          </label>
          <input id="p1" type="password" autoComplete="new-password" value={pass1} onChange={(e) => setPass1(e.target.value)} />
          <div style={{ height: 12 }} />
          <label htmlFor="p2" className="small muted">
            Once more
          </label>
          <input id="p2" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
          {pass2 && pass1 !== pass2 && (
            <p className="small" style={{ color: 'var(--danger)' }}>
              The two do not match yet.
            </p>
          )}
          <div style={{ height: 16 }} />
          <button className="btn" disabled={working || pass1.length < 8 || pass1 !== pass2} onClick={() => void doExport()}>
            {working ? 'Locking...' : 'Save backup file'}
          </button>
          <p className="small muted center">At least 8 characters. A short sentence works well.</p>
        </div>
      ) : panel === 'import' ? (
        <div>
          <input ref={file} type="file" accept=".lpml,application/octet-stream" aria-label="Backup file" />
          <div style={{ height: 12 }} />
          <label htmlFor="p3" className="small muted">
            Passphrase
          </label>
          <input id="p3" type="password" autoComplete="current-password" value={pass1} onChange={(e) => setPass1(e.target.value)} />
          <div style={{ height: 16 }} />
          <button className="btn" disabled={working || !pass1} onClick={() => void doImport()}>
            {working ? 'Opening...' : 'Restore'}
          </button>
        </div>
      ) : (
        <div className="stones">
          <button className="stone" onClick={() => open('export')}>
            Save
          </button>
          <button className="stone" onClick={() => open('import')}>
            Restore
          </button>
        </div>
      )}
      {status && (
        <p className="center small" role="status" style={{ marginTop: '0.75rem' }}>
          {status}
        </p>
      )}

      <hr className="rule" />

      {/* Name */}
      <h2>Your name on the trail</h2>
      {panel === 'name' ? (
        <div>
          <label htmlFor="nm" className="visually-hidden">
            Your name
          </label>
          <input id="nm" type="text" maxLength={24} value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
          <div style={{ height: 16 }} />
          <button
            className="btn quiet"
            disabled={!nameInput.trim()}
            onClick={async () => {
              await setName(nameInput);
              setPanel(null);
            }}
          >
            Keep this name
          </button>
        </div>
      ) : (
        <p>
          {data.profile.name ?? 'Not set yet.'}{' '}
          <button className="tertiary" onClick={() => open('name')}>
            Change
          </button>
        </p>
      )}
      <p className="small muted">Friends see your name, your cairn, and which challenges you did. Never your notes, your talks or your writing.</p>

      <hr className="rule" />

      <h2>Start my cairn again</h2>
      <p className="muted">Clears your days, your cairn and your streak on this phone. Notes, friends and your name stay.</p>
      {resetDone ? (
        <p className="center small" role="status">
          Your cairn is a single stone again.
        </p>
      ) : confirmReset ? (
        <div className="stones" role="group" aria-label="Start the cairn again?">
          <button
            className="stone"
            onClick={async () => {
              await resetCairn();
              setConfirmReset(false);
              setResetDone(true);
            }}
          >
            Start again
          </button>
          <button className="stone" onClick={() => setConfirmReset(false)}>
            Keep it
          </button>
        </div>
      ) : (
        <button className="btn quiet" onClick={() => setConfirmReset(true)}>
          Start my cairn again
        </button>
      )}

      <hr className="rule" />

      <h2>About</h2>
      <p className="small muted">
        Pen prompts draw on Stoic practice and on the self-observation and responsibility exercises of Janette Rainwater, described in
        our own words. Quotes are from public-domain translations. The Talk screen is a reflection partner, not a therapist.
      </p>

      <div className="links">
        <button className="tertiary" onClick={() => go('today')}>
          Back to today
        </button>
      </div>

      <PenSheet from={today} />
    </section>
  );
}
