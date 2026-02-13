const CACHE_NAME = 'cv-pro-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './data.js',
    './renderer.js',
    './i18n.js',
    './features.js',
    './manifest.json',
    './icons/icon-512.png'
];

// Install Event - Cache Core Assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// Fetch Event - Network First, fallback to Cache
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .then((res) => {
                // Clone response to cache it
                const resClone = res.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, resClone);
                });
                return res;
            })
            .catch(() => {
                return caches.match(e.request);
            })
    );
});
