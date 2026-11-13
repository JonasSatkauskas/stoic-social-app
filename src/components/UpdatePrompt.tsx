import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="toast" role="status">
      <p className="toast-text">A new version is ready.</p>
      <div className="toast-actions">
        <button className="toast-later" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
        <button className="toast-go" onClick={() => updateServiceWorker(true)}>
          Refresh
        </button>
      </div>
    </div>
  );
}
