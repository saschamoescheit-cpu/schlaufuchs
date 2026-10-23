# Mitteilungen (Push) einrichten

Wie bei GolfOS Rounds: Die App ist fertig. Damit Mitteilungen wirklich ankommen, braucht das Supabase-Projekt
**Schlaufuchs** (gypgaepmlftnqwywupeq) einmalig die Funktion und die Tabellen. Es gibt keinen Schlüssel zum Kopieren:
Das Schlüsselpaar erzeugt die Funktion beim ersten Aufruf selbst.

## 1. Funktion anlegen (5 Minuten)
1. Supabase → Projekt **Schlaufuchs** → **Edge Functions** → **Deploy a new function** → **Via editor**.
2. Name: `schlaufuchs-push`.
3. Den ganzen Inhalt von `supabase/functions/schlaufuchs-push/index.ts` einfügen → **Deploy**.
4. In den Einstellungen der Funktion **Verify JWT** ausschalten. Die Funktion prüft die Anmeldung selbst; der
   15-Minuten-Takt ruft sie ohne Anmeldung auf und darf nur Fälliges verschicken.

## 2. Tabellen und Takt anlegen (1 Minute)
Supabase → **SQL Editor** → den Inhalt von `supabase/schlaufuchs-push.sql` einfügen → **Run**. Mehrfaches Ausführen
schadet nicht.

## 3. Ausprobieren
1. Schlaufuchs auf dem Handy oder iPad öffnen. Auf iPhone/iPad muss die App **vom Home-Bildschirm** geöffnet werden
   (Teilen → Zum Home-Bildschirm); das geht ab iOS 16.4.
2. Einstellungen → mit dem Eltern-Konto angemeldet sein → **🔔 Mitteilungen** → **Mitteilungen auf diesem Gerät**
   einschalten und erlauben.
3. Sofort kommt „Mitteilungen sind an ✓“. Kommt sie nicht, zeigt die Karte den Grund an (z. B. „Auf dem Server noch
   nicht eingerichtet.“).

## Für die ganze Familie
An/aus und die drei Arten gelten für alle Geräte der Familie: Sie stehen im Eltern-Datensatz (`parent.push`) und werden
mit abgeglichen.
- **Auf einem Gerät eingeschaltet:** Jedes andere Gerät, das Mitteilungen schon einmal erlaubt hat, meldet sich beim
  nächsten Öffnen von selbst an (ohne Gruß). Hat ein Gerät noch nie erlaubt, steht in den Einstellungen „In der Familie
  eingeschaltet – auf diesem Gerät noch nicht“ – dort einmal einschalten und erlauben. Das verlangen Apple und die
  Browser; ein Gerät kann das nicht für ein anderes tun.
- **Auf einem Gerät ausgeschaltet:** Die Funktion schickt ab sofort an kein Gerät der Familie mehr etwas – auch an
  Geräte, die seitdem nicht offen waren. Beim nächsten Öffnen melden sie sich ab.
- **Eine Art geändert:** gilt sofort für alle Geräte (die Funktion liest die Arten der Familie).

## Was wann kommt (Uhrzeit des Geräts)
| Art | Wann | Antippen öffnet |
|---|---|---|
| Lern-Erinnerung | 17–20 Uhr, wenn ein Kind heute noch nicht geübt hat, in den letzten 14 Tagen aber schon (einmal am Tag, alle Kinder in einer Mitteilung) | das Kind |
| Klassenarbeit naht | 16–20 Uhr, 3 Tage vor und am Tag vor einer eingetragenen Arbeit | das Kind |
| Vokabelkarten fällig | 15–20 Uhr, wenn mindestens 5 Karten dran sind (einmal am Tag je Kind) | Englisch des Kindes |

## Technik
- **Funktion:** `supabase/functions/schlaufuchs-push/index.ts` (Web Push nach RFC 8291/8292 mit Web Crypto, ohne
  Bibliothek – dieselbe Technik wie `golfos-push`). Aktionen: `key`, `subscribe`, `unsubscribe`, `settings`, `tick`.
- **Tabellen:** `schlaufuchs_push` (je Gerät), `schlaufuchs_push_sent` (schon Geschicktes), `schlaufuchs_push_keys`
  (Absender-Schlüssel). Zeilenschutz an, keine Regeln: Nur die Funktion liest und schreibt. Konto löschen löscht alles.
- **App:** `src/data/push.ts`, `src/ui/PushCard.tsx` (Einstellungen), `public/push-sw.js` (im Service Worker),
  Sprungziele `#kind=<id>` und `#karten=<id>` in `src/App.tsx`.
- **Tests:** `src/data/pushserver.test.ts` (RFC-Beispiel Byte für Byte, Regeln), `src/data/pushfunction.test.ts`
  (die Funktion gegen eine nachgebaute Datenbank, jede Mitteilung entschlüsselt gelesen), `qa/pushnotify.mjs`
  (Browser mit echtem Service Worker; vorher `npm run build`).
