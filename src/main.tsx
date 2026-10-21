import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import './styles.css';
import App from './App';
import { getData, setChangeHook, updateFromSync } from './data/store';
import { connectStore, startSync, syncSoon } from './data/sync';

// Abgleich zwischen den Geräten: jede Änderung geht ein paar Sekunden später hoch
connectStore(getData, updateFromSync);
setChangeHook(() => syncSoon());
void startSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
