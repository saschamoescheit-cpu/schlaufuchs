import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Nur lateinische Schriftteile (inkl. Umlaute, ß, „…“) – spart beim Offline-Vorladen Hebräisch/Kyrillisch/Vietnamesisch
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-ext-400.css';
import '@fontsource/fredoka/latin-ext-500.css';
import '@fontsource/fredoka/latin-ext-600.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-ext-400.css';
import '@fontsource/nunito/latin-ext-700.css';
import './styles.css';
import App from './App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { getData, setChangeHook, updateFromSync } from './data/store';
import { connectStore, startSync, syncSoon } from './data/sync';

// Abgleich zwischen den Geräten: jede Änderung geht ein paar Sekunden später hoch
connectStore(getData, updateFromSync);
setChangeHook(() => syncSoon());
void startSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
