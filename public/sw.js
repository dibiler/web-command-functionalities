const CACHE_VERSION = 'pwacommands-v3';
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const BUILD_MANIFEST_URL = '/build/manifest.json';

const APP_SHELL_URLS = ['/', '/offline.html', '/manifest.webmanifest', '/favicon.ico', '/pwa-icon.svg'];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(APP_SHELL_CACHE);
        await cacheUrlsSafely(cache, APP_SHELL_URLS);

        const buildAssets = await getBuildAssetUrls();
        if (buildAssets.length > 0) {
            await cacheUrlsSafely(cache, buildAssets);
        }
    })());
    self.skipWaiting();
});

async function cacheUrlsSafely(cache, urls) {
    await Promise.allSettled(urls.map(async (url) => {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) {
            await cache.put(url, response.clone());
        }
    }));
}

async function getBuildAssetUrls() {
    try {
        const response = await fetch(BUILD_MANIFEST_URL, { cache: 'no-store' });
        if (!response.ok) {
            return [];
        }

        const manifest = await response.json();
        const urls = new Set([BUILD_MANIFEST_URL]);

        Object.values(manifest).forEach((entry) => {
            if (entry.file) {
                urls.add(`/build/${entry.file}`);
            }

            if (Array.isArray(entry.css)) {
                entry.css.forEach((cssFile) => urls.add(`/build/${cssFile}`));
            }

            if (Array.isArray(entry.assets)) {
                entry.assets.forEach((assetFile) => urls.add(`/build/${assetFile}`));
            }
        });

        return Array.from(urls);
    } catch {
        return [];
    }
}

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const networkResponse = await fetch(request);
                if (networkResponse && networkResponse.ok) {
                    const runtimeCache = await caches.open(RUNTIME_CACHE);
                    runtimeCache.put(request, networkResponse.clone());
                }
                return networkResponse;
            } catch {
                const runtimeCached = await caches.match(request);
                if (runtimeCached) {
                    return runtimeCached;
                }

                const appShellCached = await caches.match('/');
                if (appShellCached) {
                    return appShellCached;
                }

                return caches.match('/offline.html');
            }
        })());
        return;
    }

    const url = new URL(request.url);
    const isSameOrigin = url.origin === self.location.origin;
    const isAsset = ['script', 'style', 'image', 'font', 'worker'].includes(request.destination);

    if (isSameOrigin && isAsset) {
        event.respondWith((async () => {
            const cached = await caches.match(request);

            if (cached) {
                return cached;
            }

            const pathnameCached = await caches.match(url.pathname);
            if (pathnameCached) {
                return pathnameCached;
            }

            try {
                const networkResponse = await fetch(request);
                if (networkResponse && networkResponse.ok) {
                    const runtimeCache = await caches.open(RUNTIME_CACHE);
                    runtimeCache.put(request, networkResponse.clone());
                }
                return networkResponse;
            } catch {
                const runtimeFallback = await caches.match(request);
                if (runtimeFallback) {
                    return runtimeFallback;
                }

                const pathFallback = await caches.match(url.pathname);
                if (pathFallback) {
                    return pathFallback;
                }

                return Response.error();
            }
        })());
    }
});
