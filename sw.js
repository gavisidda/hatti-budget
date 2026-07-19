// Finance PWA Service Worker v1.2
const CACHE_NAME = 'finance-pwa-v1.2';
const ASSETS = [
  '/hatti-budget/index.html',
  '/hatti-budget/manifest.json',
  'https://fonts.googleapis.com/css2?family=Baloo+Tamma+2:wght@400;600;700;800&display=swap',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js'
];

// Install — pre-cache core assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache local assets, skip external (may fail offline install)
      return cache.addAll(['/hatti-budget/index.html', '/hatti-budget/manifest.json'])
        .catch(function(err) { console.log('SW: partial cache', err); });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', function(e) {
  // Skip non-GET and Firebase/Firestore API calls
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase.googleapis.com') ||
      url.includes('googleapis.com/identitytoolkit')) return;

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // Cache successful responses for our own assets
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        // Offline — serve from cache
        return caches.match(e.request).then(function(cached) {
          if (cached) return cached;
          // For navigation requests, return the app shell
          if (e.request.mode === 'navigate') {
            return caches.match('/hatti-budget/index.html');
          }
        });
      })
  );
});

// Background sync message
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
