import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string };

// base './' – die App läuft unter jedem GitHub-Pages-Unterpfad.
export default defineConfig({
  base: './',
  // Stand der App (Datum/Uhrzeit des Builds) – zeigt im Überblick „Lernstand suchen“, welche Version läuft
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
  // Homepage und Rechtliches als eigene, schlanke Seiten neben der App (Vorschau unter …/home/)
  build: {
    rollupOptions: {
      input: { main: 'index.html', home: 'home/index.html', datenschutz: 'datenschutz/index.html', impressum: 'impressum/index.html' },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'logo.svg'],
      manifest: {
        name: 'Schlaufuchs',
        short_name: 'Schlaufuchs',
        description: 'Lern-App für Grundschüler: Mathe, Deutsch, Englisch',
        lang: 'de',
        theme_color: '#FFF8EF',
        background_color: '#FFF8EF',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Mitteilungen: angezeigt und geöffnet von public/push-sw.js (Sascha 23.10.2026, wie bei GolfOS Rounds)
        importScripts: ['push-sw.js'],
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Homepage-Seiten nicht durch die App ersetzen
        navigateFallbackDenylist: [/\/home\//, /\/datenschutz\//, /\/impressum\//],
        runtimeCaching: [
          {
            // Vorschaubilder der Erklärvideos
            urlPattern: /^https:\/\/i\.ytimg\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'video-thumbs', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // Cloud-Stimme: gehörte Sätze bleiben auf dem Gerät (auch offline, spart Abrufe)
            urlPattern: /\/functions\/v1\/tts\?/,
            handler: 'CacheFirst',
            options: { cacheName: 'tts', expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    }),
  ],
});
