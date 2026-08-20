const CACHE_NAME = 'expenditrack-v1';
const RUNTIME_CACHE = 'expenditrack-runtime';
// Derived from the SW's own registration scope rather than hardcoded root
// paths — this file is a static public/ asset with no build-time templating,
// so it has no way to know the app is served from a GitHub Pages subpath
// (e.g. "/Expenditrack1/") otherwise. self.registration.scope always
// reflects wherever this worker actually got registered.
const SCOPE = self.registration.scope;
const ASSETS_TO_CACHE = [
  SCOPE,
  `${SCOPE}index.html`,
  `${SCOPE}favicon.svg`,
  `${SCOPE}manifest.json`
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching essential assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external URLs
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // Network first for API calls
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/rest/')) {
    event.respondWith(networkFirst(request));
  }
  // Cache first for static assets
  else if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
  // Network first with cache fallback for everything else
  else {
    event.respondWith(networkFirstWithCacheFallback(request));
  }
});

// Network first strategy
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (!response || response.status !== 200 || response.type === 'error') {
        return response;
      }
      const responseToCache = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => {
        cache.put(request, responseToCache);
      });
      return response;
    })
    .catch(() => {
      return caches.match(request);
    });
}

// Cache first strategy
function cacheFirst(request) {
  return caches.match(request).then((response) => {
    return response || fetch(request).then((response) => {
      if (!response || response.status !== 200) {
        return response;
      }
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseToCache);
      });
      return response;
    });
  });
}

// Network first with cache fallback
function networkFirstWithCacheFallback(request) {
  return fetch(request)
    .then((response) => {
      if (!response || response.status !== 200) {
        return response;
      }
      const responseToCache = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => {
        cache.put(request, responseToCache);
      });
      return response;
    })
    .catch(() => {
      return caches.match(request).then((response) => {
        return response || new Response('Offline - content not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
    });
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  return /\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/.test(pathname);
}

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(RUNTIME_CACHE);
  }
});
