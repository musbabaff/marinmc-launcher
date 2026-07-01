import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './lib/i18n.ts'; // Initialize i18next
import { authService } from './auth/authService.ts';

// Decrypt stored auth tokens into memory BEFORE the app (and its stores) load,
// so tokens are never kept in plaintext at rest. Then import App dynamically so
// the auth/social stores initialise with a ready, decrypted session.
async function boot() {
  try {
    await authService.hydrateAuth();
  } catch { /* non-fatal — falls back to no session */ }

  const [{ default: App }, { useSettingsStore }] = await Promise.all([
    import('./App.tsx'),
    import('./stores/settingsStore.ts')
  ]);

  const Root = () => {
    React.useEffect(() => {
      useSettingsStore.getState().loadSettings();
    }, []);
    return <App />;
  };

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
}

boot();
