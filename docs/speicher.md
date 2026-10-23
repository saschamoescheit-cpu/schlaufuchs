# Speicher auf dem Gerät

Stand: Nachtlauf 23.10.2026. Code: `src/data/store.ts`, `src/data/mirror.ts`.

## Wo der Lernstand liegt
- **Normal:** in `localStorage` (Schlüssel `schlaufuchs:v1`, sofort lesbar beim Start) und zusätzlich als Kopie in
  IndexedDB (Datenbank `schlaufuchs`, Eintrag `app`).
- **Umgezogen:** Ist der Lernstand größer als 1 Mio. Zeichen (`MOVE_AT`) oder ist `localStorage` voll, zieht er ganz
  nach IndexedDB um. In `localStorage` steht dann nur noch ein Verweis `{"moved":"indexeddb","at":…}`. So bleibt dort
  Platz für Anmeldung, Abgleich und Einstellungen (alle zusammen nur wenige KB).

`localStorage` fasst je Seite nur etwa 5 MB (Safari rechnet in UTF-16, also eher 2,5 Mio. Zeichen). IndexedDB hat
Hunderte MB.

## Regeln (nie etwas verlieren)
1. Umgezogen wird erst, wenn IndexedDB **genau diesen Stand** hat: schreiben, nachlesen, vergleichen. Kam inzwischen
   eine neue Antwort dazu, wird nicht umgezogen (nächster Versuch bei der nächsten Änderung).
2. Nach dem Umzug liest die App beim Start **zuerst IndexedDB** und zeigt erst dann etwas (`needsMirrorFirst` in
   `main.tsx`) – sie sieht nie kurz „leer“ aus.
3. Ein **Lesefehler** von IndexedDB (kommt in Safari vor) gilt nicht als „leer“: drei Versuche, sonst wird nichts
   geschrieben und die App sagt „Lernstand gerade nicht lesbar – bitte neu öffnen“.
4. Klappt das Schreiben in IndexedDB nicht mehr, geht der ganze Stand **zurück nach `localStorage`**.
5. Ein unlesbarer Stand wird als `unlesbar:<Zeit>` aufgehoben, nie überschrieben.

## Prüfen
- `src/data/storemove.test.ts` – Umzug, Neustart, Ausfall, Lesefehler, Wettlauf (nachgebildetes IndexedDB).
- `qa/storage-move.mjs` – echter Browser (WebKit): drei Kinder mit vollem Verlauf, Umzug, Neuladen, weiter üben.
- `qa/mirror.mjs`, `qa/storage-full.mjs` – Zweitspeicher und Hinweis bei vollem Speicher.

## Zum Verlauf
Der Verlauf (jede Antwort) wird je Kind auf dem Gerät auf die letzten 6000 Antworten begrenzt (`LOG_MAX`). Mit
Anmeldung bleiben ältere Tage in der Cloud erhalten (der Abgleich löscht sie dort nicht). Mit IndexedDB wäre Platz für
deutlich mehr – das ist eine offene Entscheidung (Rechenaufwand bei jeder Antwort steigt mit).
