const CACHE_NAME = 'Edu.Smartspark-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQI5Rqq0BKpWSjZmm7lxz_mvqXV3t1UdUPrAg&s',
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
