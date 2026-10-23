# Schlaufuchs 🦊

Interaktive Lern-App für Grundschüler: **Mathe, Deutsch und Englisch, Klassen 1–4** (Lehrplan NRW als Standard, alle Bundesländer wählbar). Kostenlos, ohne Werbung.

**Live:** https://saschamoescheit-cpu.github.io/schlaufuchs/ · **Homepage (Vorschau):** https://saschamoescheit-cpu.github.io/schlaufuchs/home/

## Was die App kann
- Kinderprofile (Name, Tier, Alter, Klasse, Bundesland) – mehrere Kinder pro Gerät
- rund 180 Themen mit Zufallsaufgaben in drei Stufen, Lösungsweg, Erklärung mit Bild, Beispiel und geprüften YouTube-Erklärvideos, Vorlesen
- Lernstand je Thema, Schwächen und typische Fehlermuster
- **Fehler-Kiste:** falsch gelöste Aufgaben kommen wieder, bis sie zweimal hintereinander richtig sind
- **Tests** mit Zeitlimit und Note (Notenschlüssel einstellbar), als Arbeitsblatt druckbar (Hör-Aufgaben mit Vorlese-Blatt für Erwachsene); Klassenarbeiten eintragen mit Wiederholungsplan
- **Englisch-Vokabeltrainer:** Wortfelder wählen, gemischt üben, **Vokabelkarten** (Karteikasten mit 5 Fächern, Wiederholung nach 1/3/7/14/30 Tagen; Englisch oder Deutsch vorne, selbst schreiben oder nur hören), **Buchstabier-Diktat**, Vokabeltest
- **Blitzrunde** (60 Sekunden, Rekord je Thema)
- **Eltern-Bereich** mit PIN: Lernzeit, Lernziele, Tests, Karteikasten, Wochenbericht, Lernstand drucken
- **Konto (optional):** Abgleich zwischen Geräten über Supabase (EU); ohne Konto bleibt alles auf dem Gerät (localStorage + Kopie in IndexedDB)
- **Vorlesen:** Cloud-Stimme (Supabase-Funktion `tts` → Google Text-to-Speech, auch im Stummmodus von iPhone/iPad), sonst Gerätestimme
- Web-App zum Installieren („Zum Home-Bildschirm“), funktioniert offline

## Entwickeln
```
npm install
npm run dev        # http://localhost:5173
npm test           # Inhalte, Lernlogik, Abgleich
npm run build
npx vite-node scripts/sample3.ts m3 2 3   # Beispielaufgaben (Präfix, Stufe, Anzahl)
npx vite-node scripts/scan.ts             # generierte Texte nach typischen Fehlern durchsuchen
npx vite-node scripts/giveaway.ts         # Aufgaben, deren Text die Lösung verrät
npx vite-node scripts/variety.ts 30       # Themen mit der geringsten Abwechslung
node qa/tour.mjs http://localhost:5173/   # Klick-Durchlauf mit Bildschirmfotos (cd qa && npm i)
```
Weitere Prüfskripte: `scripts/longest.ts` (Lösung an der Länge erkennbar?), `scripts/solutions.ts` (Lösungswege).
Inhalts-Schutztests in `src/content/*.test.ts`: keine Lösung im Aufgabentext, Antwortlängen ausgewogen, gleicher Aufgaben-Schlüssel = gleiche Antwort, Vorlesetexte ≤ 400 Zeichen und englische Sätze nicht mit deutscher Stimme, jedes Thema mit Erklärvideo. QA-Klickskripte: `qa/*.mjs` (je Datei oben ein Kommentar, was sie prüft).

Push auf `main` baut und veröffentlicht automatisch (GitHub Pages). Domain-Umzug: siehe `docs/domain-umzug.md`.
