# Schlaufuchs 🦊

Interaktive Lern-App für Grundschüler: **Mathe, Deutsch und Englisch, Klassen 1–4** (Lehrplan NRW als Standard, alle Bundesländer wählbar).

**Live:** https://saschamoescheit-cpu.github.io/schlaufuchs/

## Was die App kann
- Kinderprofile (Name, Tier, Alter, Klasse, Bundesland) – mehrere Kinder pro Gerät, alles nur lokal gespeichert
- 97 Themen mit unendlich vielen Zufallsaufgaben, Lösungsweg, Bild, Vorlesen (Sprachausgabe) und geprüften YouTube-Erklärvideos
- Lernstand je Thema (Neu → Angefangen → Geübt → Sicher), Schwächen und typische Fehlermuster
- **Fehler-Kiste:** falsch gelöste Aufgaben kommen wieder – in der Runde und später –, bis sie zweimal hintereinander richtig sind
- **Lernzielkontrollen** mit Zeitlimit (Entspannt / Wie in der Schule / Turbo) und Note ab Klasse 3 (Notenschlüssel einstellbar)
- Sicherung als Datei (Export/Import), Web-App zum Installieren („Zum Home-Bildschirm“)

## Entwickeln
```
npm install
npm run dev        # http://localhost:5173
npm test           # Inhalte + Lernlogik
npm run build
npx vite-node scripts/sample.ts m3   # Beispielaufgaben eines Themas ansehen
node qa/tour.mjs http://localhost:5173/ qa/shots   # Klick-Durchlauf mit Bildschirmfotos (cd qa && npm i)
```
Push auf `main` baut und veröffentlicht automatisch (GitHub Pages).
