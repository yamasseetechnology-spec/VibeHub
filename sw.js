const CACHE_NAME = 'vibehub-v1';
const urlsToCache = [
  './',
  './index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('Cache install failed:', err);
      })
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url || '';
  // Do not handle chrome-extension requests via service worker (let browser handle)
  if (url.startsWith('chrome-extension://')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          var responseToCache = response.clone();
          // Only cache http(s) requests
          const reqUrl = event.request.url || '';
          if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) {
            try {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                })
                .catch(err => console.warn('Cache put failed:', err));
            } catch (e) {
              console.warn('Cache operation error', e);
            }
          }
          return response;
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
