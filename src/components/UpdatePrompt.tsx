import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="toast" role="status">
      <span>New version available.</span>
      <button onClick={() => updateServiceWorker(true)}>Refresh</button>
      <button aria-label="Later" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
}
