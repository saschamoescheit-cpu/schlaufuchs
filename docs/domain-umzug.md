# Umzug auf eine eigene Domain (vorbereitet, noch nicht umgestellt)

Stand 22.10.2026. Ziel: `https://www.schlaufuchs.<endung>/` zeigt die Homepage, die App liegt unter `/app/`.
Bis zur Entscheidung läuft alles wie bisher unter `https://saschamoescheit-cpu.github.io/schlaufuchs/`
(Vorschau der Homepage: `…/schlaufuchs/home/`).

## Was schon vorbereitet ist

- Homepage, Datenschutz und Impressum sind eigene Seiten (`home/`, `datenschutz/`, `impressum/`), werden mitgebaut
  (`vite.config.ts → build.rollupOptions.input`) und vom Service Worker nicht durch die App ersetzt
  (`navigateFallbackDenylist`).
- Alle Pfade sind relativ (`base: './'`) – die App läuft unter jedem Unterpfad.
- Die Vorlese-Funktion (`supabase/functions/tts`) erlaubt schon `https://schlaufuchs.*` und `https://www.schlaufuchs.*`.
- Sprungmarken in die App: `…/#anmelden` (Einstellungen mit Konto), `…/#eltern` (Eltern-Bereich).

## Schritte am Umzugstag

1. **Domain kaufen** und beim Anbieter DNS eintragen:
   - `www` → CNAME auf `saschamoescheit-cpu.github.io`
   - Hauptdomain (ohne www) → A-Einträge auf GitHub Pages: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
2. **GitHub:** Repo → Settings → Pages → Custom domain `www.schlaufuchs.<endung>` eintragen, „Enforce HTTPS“ an.
   Zusätzlich die Datei `public/CNAME` mit dem Domainnamen anlegen (sonst geht die Einstellung beim nächsten Deploy verloren).
3. **Aufbau umstellen** (eine Änderung im Repo):
   - App-Einstieg `index.html` nach `app/index.html`, Homepage `home/index.html` nach `index.html`
   - Links der Homepage von `../` auf `app/` anpassen
   - `navigateFallbackDenylist` auf alles außerhalb von `/app/` setzen, Manifest `start_url`/`scope` auf `./app/`
   - Wer die App unter der alten Adresse auf dem Home-Bildschirm hat: alte Adresse leitet weiter (kleine Weiterleitungsseite im alten Repo-Pfad)
4. **Supabase** (Authentication → URL Configuration): neue Adresse als Site URL und unter Redirect URLs
   `https://www.schlaufuchs.<endung>/app/**` eintragen. Die alte Adresse bis zum Ende der Übergangszeit drinlassen.
5. **Google-Anmeldung** (Google Cloud → Anmeldedaten → OAuth-Client): neue Adresse bei „Autorisierte JavaScript-Quellen“.
   Die Weiterleitungs-URI bleibt die von Supabase.
6. **Lernstand mitnehmen:** Der Browser-Speicher hängt an der Adresse. Ohne Konto sieht die App unter der neuen
   Adresse leer aus. Darum vor dem Umzug: Eltern melden sich mit Konto an (dann holt die neue Adresse alles vom Server).
   Die alte Adresse bleibt unverändert erreichbar – nichts wird dort gelöscht.
7. **Impressum und Datenschutz:** Platzhalter füllen, Abschnitt „Bereitstellung“ prüfen.
8. **Homepage:** `og:image` in `home/index.html` auf die neue Adresse umstellen.
