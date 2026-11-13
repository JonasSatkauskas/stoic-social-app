import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initInstallCapture } from './lib/install';
import { StoreProvider } from './lib/store';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);

initInstallCapture();

// Trail sync (relay) loads in its own chunk, after the first paint.
window.setTimeout(() => {
  void import('./features/grove/sync').then((m) => m.startGroveSync());
}, 1500);
