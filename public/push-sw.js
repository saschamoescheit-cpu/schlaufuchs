// Schlaufuchs-Mitteilungen im Service Worker (Sascha 23.10.2026, wie bei GolfOS Rounds) – vom erzeugten Service Worker
// geladen (vite.config.ts, workbox importScripts). Zeigt, was die Funktion schlaufuchs-push schickt, und öffnet beim
// Antippen die App an der richtigen Stelle: „#kind=<id>“ (dieses Kind), „#karten=<id>“ (seine Vokabelkarten).
self.addEventListener('push', (event) => {
  let note = { title: 'Schlaufuchs', body: '', tag: 'schlaufuchs', url: './' };
  try {
    note = { ...note, ...event.data.json() };
  } catch {
    if (event.data) note.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(note.title, {
      body: note.body,
      tag: note.tag,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { url: note.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const app = open.find((c) => c.url.startsWith(self.registration.scope) && !/\/(home|datenschutz|impressum)\//.test(c.url));
      if (app) {
        // die App ist offen: dort hinspringen (die App folgt der Stelle in der Adresse)
        try {
          await app.focus();
          return await app.navigate(url);
        } catch {
          /* noch nicht von diesem Worker gesteuert – neu öffnen */
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
