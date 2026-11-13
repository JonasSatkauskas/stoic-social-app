import { lazy, Suspense } from 'react';
import { GroveIcon, NotesIcon, SettingsIcon, TalkIcon, TodayIcon } from './components/Icons';
import { UpdatePrompt } from './components/UpdatePrompt';
import { NotesScreen } from './features/notes/NotesScreen';
import { TalkScreen } from './features/talk/TalkScreen';
import { TodayScreen } from './features/today/TodayScreen';
import { useStore, type Tab } from './lib/store';

// The Grove pulls in QR, camera and relay code; load it only when opened.
const GroveScreen = lazy(() => import('./features/grove/GroveScreen'));
const SettingsScreen = lazy(() => import('./features/settings/SettingsScreen'));

const NAV: { tab: Tab; label: string; Icon: () => React.JSX.Element }[] = [
  { tab: 'today', label: 'Today', Icon: TodayIcon },
  { tab: 'talk', label: 'Talk it out', Icon: TalkIcon },
  { tab: 'grove', label: 'Grove', Icon: GroveIcon },
  { tab: 'notes', label: 'Notes', Icon: NotesIcon },
];

/** Web Crypto, the camera and offline mode only exist on HTTPS (or localhost). */
function InsecureNotice() {
  return (
    <main className="app">
      <section className="screen" aria-labelledby="insecure-title">
        <h1 id="insecure-title">This page needs a secure connection.</h1>
        <p>Everything here is encrypted on your phone, and browsers only allow that over HTTPS.</p>
        <p className="muted">Open the app through its https:// address instead of a plain http:// or network address.</p>
      </section>
    </main>
  );
}

export function App() {
  const { ready, tab, go } = useStore();
  if (!window.isSecureContext || !globalThis.crypto?.subtle) return <InsecureNotice />;
  if (!ready) return <div className="app" aria-busy="true" />;

  return (
    <>
      <main className="app">
        {tab === 'today' && (
          <button className="corner" aria-label="Settings and backup" onClick={() => go('settings')}>
            <SettingsIcon />
          </button>
        )}
        <Suspense fallback={<div className="screen" aria-busy="true" />}>
          {tab === 'today' && <TodayScreen />}
          {tab === 'talk' && <TalkScreen />}
          {tab === 'grove' && <GroveScreen />}
          {tab === 'notes' && <NotesScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </Suspense>
      </main>
      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
          {NAV.map(({ tab: t, label, Icon }) => (
            <button key={t} aria-label={label} title={label} aria-current={tab === t ? 'page' : undefined} onClick={() => go(t)}>
              <Icon />
            </button>
          ))}
        </div>
      </nav>
      <UpdatePrompt />
    </>
  );
}
