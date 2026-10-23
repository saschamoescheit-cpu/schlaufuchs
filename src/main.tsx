import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Nur der lateinische Schriftteil (inkl. Umlaute, ß, €, „…“). Kein latin-ext: Die Einzeldateien haben keinen
// unicode-range – sonst überdeckt latin-ext die Grundbuchstaben (Leinwand in Safari zeigte dann Ersatzschrift).
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import './styles.css';
import App from './App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { SpeechHint } from './ui/common';
import { checkMirror, getData, needsMirrorFirst, setChangeHook, updateFromSync } from './data/store';
import { connectStore, startSync, syncSoon } from './data/sync';

// Abgleich zwischen den Geräten: jede Änderung geht ein paar Sekunden später hoch
connectStore(getData, updateFromSync);
setChangeHook(() => syncSoon());
// Liegt der Lernstand im großen Speicher (umgezogen), erst ihn lesen, dann zeigen – sonst sähe die App kurz leer aus
const first = needsMirrorFirst();
// erst den Zweitspeicher prüfen (stellt einen neueren Stand wieder her), dann abgleichen
const mirror = checkMirror().catch(() => undefined);
void mirror.finally(() => void startSync());

const show = () =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
        <SpeechHint />
      </ErrorBoundary>
    </StrictMode>,
  );
if (first) void mirror.finally(show);
else show();
