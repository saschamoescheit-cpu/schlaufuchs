// Fehlergrenze: Stürzt ein Bildschirm ab, sieht das Kind statt einer weißen Seite den Fuchs und kommt zurück zur Startseite.
// Der Lernstand liegt im Speicher (data/store) und bleibt unberührt.
import { Component, Fragment, type ReactNode } from 'react';
import { Fox } from './common';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; n: number }> {
  state = { error: null as Error | null, n: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Schlaufuchs-Fehler:', error);
  }

  render() {
    const { error, n } = this.state;
    if (error)
      return (
        <div role="main" className="app full">
          <div className="stack center" style={{ paddingTop: 60 }}>
            <div>
              <Fox size={120} mood="think" />
            </div>
            <h1>Hoppla!</h1>
            <p>Da ist etwas schiefgelaufen. Keine Sorge – dein Lernstand ist sicher.</p>
            <button className="btn ok block" onClick={() => this.setState((s) => ({ error: null, n: s.n + 1 }))}>
              Zur Startseite
            </button>
            <button className="btn ghost block" onClick={() => location.reload()}>
              Neu laden
            </button>
            <details className="small muted" style={{ textAlign: 'left' }}>
              <summary>Für Erwachsene: Fehlermeldung</summary>
              {error.message}
            </details>
          </div>
        </div>
      );
    // neuer Schlüssel nach „Zur Startseite“ → App startet frisch (Navigation zurückgesetzt)
    return <Fragment key={n}>{this.props.children}</Fragment>;
  }
}
