// College Library System - Offline Service Worker
const CACHE_NAME = 'lms-app-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/variables.css',
  '/css/base.css',
  '/css/components.css',
  '/css/pages.css',
  '/js/icons.js',
  '/js/covers.js',
  '/js/confetti.js',
  '/js/i18n.js',
  '/js/charts.js',
  '/js/commandPalette.js',
  '/js/app.js',
  '/js/views/studentHome.js',
  '/js/views/myShelf.js',
  '/js/views/circulation.js',
  '/js/views/booksAdmin.js',
  '/js/views/membersAdmin.js',
  '/js/views/reservations.js',
  '/js/views/finesAdmin.js',
  '/js/views/suggestions.js',
  '/js/views/reportsAdmin.js',
  '/js/views/leaderboard.js',
  '/js/views/settingsAdmin.js',
  '/js/views/kiosk.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests, bypass API routes for live SQLite data
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached shell immediately and update in background
        fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(e.request).catch(() => caches.match('/'));
    })
  );
});
