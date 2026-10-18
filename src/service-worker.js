/// <reference types="@sveltejs/kit" />
import { immutable, assets, prerendered } from '$app/manifest';
import { version } from '$app/env';

const CACHE_NAME = `scanai-cache-v${version}`;
const OFFLINE_URL = '/offline';

// Static assets to pre-cache during installation
const PRECACHE_ASSETS = [...(immutable || []), ...(assets || []), ...(prerendered || []), OFFLINE_URL];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(async (cache) => {
			try {
				await cache.addAll(PRECACHE_ASSETS);
			} catch (err) {
				console.warn('[SW] Some assets failed to precache during install:', err);
			}
		})
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE_NAME) {
					console.log('[SW] Purging outdated cache:', key);
					await caches.delete(key);
				}
			}
		})
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;

	// Only handle HTTP/HTTPS GET requests
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	// CRITICAL PRIVACY & SECURITY RULES:
	// 1. NEVER cache any /api/ requests (auth, private conversations, GridFS images, user data)
	// 2. Bypass service worker completely for API calls
	if (url.pathname.startsWith('/api/')) {
		return;
	}

	// 3. For navigation requests (pages): Network-first, fallback to /offline
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					// Don't cache error pages or redirects
					return response;
				})
				.catch(async () => {
					const cache = await caches.open(CACHE_NAME);
					const cachedOffline = await cache.match(OFFLINE_URL);
					return cachedOffline || new Response('Offline - No connection available', {
						status: 503,
						headers: { 'Content-Type': 'text/plain' }
					});
				})
		);
		return;
	}

	// 4. For static versioned assets (Vite bundle chunks & static files): Cache-first
	const isPrecached = PRECACHE_ASSETS.some((asset) => url.pathname === asset || url.pathname.endsWith(asset));

	if (isPrecached || url.pathname.startsWith('/_app/immutable/')) {
		event.respondWith(
			caches.match(request).then((cachedResponse) => {
				if (cachedResponse) {
					return cachedResponse;
				}
				return fetch(request).then((networkResponse) => {
					if (networkResponse && networkResponse.status === 200) {
						const clone = networkResponse.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return networkResponse;
				});
			})
		);
		return;
	}

	// 5. Default network-first for other GET requests
	event.respondWith(
		fetch(request).catch(async () => {
			const cached = await caches.match(request);
			return cached;
		})
	);
});

// Message listener for manual update triggers
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});
