/**
 * Service Worker for Civic Intel Hub
 * Provides offline functionality, caching, and progressive web app features
 */

// Service Worker Logger - structured logging for debugging
const swLogger = {
  log: (message, ...args) => {
    if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
      // eslint-disable-next-line no-console
      console.log(`[SW] ${message}`, ...args);
    }
  },
  error: (message, ...args) => {
    // Always log errors
    // eslint-disable-next-line no-console
    console.error(`[SW Error] ${message}`, ...args);
  },
  info: (message, ...args) => {
    if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
      // eslint-disable-next-line no-console
      console.info(`[SW Info] ${message}`, ...args);
    }
  },
};

// Add cache versioning with build timestamp to prevent chunk errors
const CACHE_VERSION = '2025-01-09-' + Math.floor(Date.now() / 1000);
const CACHE_NAME = `civic-intel-hub-${CACHE_VERSION}`;
const OFFLINE_CACHE = `civic-intel-hub-offline-${CACHE_VERSION}`;
const API_CACHE = `civic-intel-hub-api-${CACHE_VERSION}`;

// Webpack chunk patterns to clear on update
const WEBPACK_CHUNK_PATTERNS = [
  /_next\/static\/chunks\//,
  /_next\/static\/webpack\//,
  /\.js$/,
  /\.css$/,
];

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/representatives',
  '/manifest.json',
  // Add other static routes as needed
];

// API endpoints to cache
const API_PATTERNS = [
  '/api/representatives',
  '/api/representative/',
  '/api/district-map',
  '/api/state-legislature',
  '/api/state-bills',
];

// Cache expiration times (in milliseconds)
const CACHE_TIMES = {
  STATIC: 24 * 60 * 60 * 1000, // 24 hours
  API: 30 * 60 * 1000, // 30 minutes
  NEWS: 15 * 60 * 1000, // 15 minutes
  IMAGES: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', event => {
  swLogger.log('Installing service worker');

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then(cache => {
        swLogger.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      }),

      // Create offline cache
      caches.open(OFFLINE_CACHE).then(cache => {
        swLogger.log('Creating offline cache');
        return cache.put(
          '/offline',
          new Response(getOfflineHTML(), {
            headers: { 'Content-Type': 'text/html' },
          })
        );
      }),
    ]).then(() => {
      swLogger.log('Installation complete');
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

/**
 * Activate event - clean up old caches and clear webpack chunks
 */
self.addEventListener('activate', event => {
  swLogger.log('Activating service worker');

  event.waitUntil(
    Promise.all([
      // Clean up old version caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete all old caches (different version)
            if (!cacheName.includes(CACHE_VERSION)) {
              swLogger.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Clear webpack chunks to prevent ChunkLoadErrors
      clearWebpackChunks(),

      // Notify clients about cache clearing
      notifyClientsOfUpdate(),
    ]).then(() => {
      swLogger.log('Activation complete, old caches cleared');
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event - handle network requests with caching strategies
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Choose caching strategy based on request type
  if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleStaticRequest(request));
  }
});

/**
 * Handle API requests with network-first strategy and smart caching
 */
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const cacheName = isNewsRequest(request) ? 'news-cache' : API_CACHE;
  const maxAge = isNewsRequest(request) ? CACHE_TIMES.NEWS : CACHE_TIMES.API;

  try {
    // Try network first
    swLogger.log('Fetching from network:', url.pathname);

    const networkResponse = await fetch(request.clone());

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();

      // Add timestamp for cache expiration
      const timestampedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: {
          ...Object.fromEntries(responseToCache.headers),
          'sw-cached-at': Date.now().toString(),
        },
      });

      await cache.put(request, timestampedResponse);
      swLogger.log('Cached API response:', url.pathname);

      return networkResponse;
    }

    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch {
    swLogger.log('Network failed, checking cache:', url.pathname);

    // Try cache as fallback
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const isExpired = cachedAt && Date.now() - parseInt(cachedAt) > maxAge;

      if (!isExpired) {
        swLogger.log('Serving from cache:', url.pathname);
        return cachedResponse;
      } else {
        swLogger.log('Cache expired for:', url.pathname);
        await cache.delete(request);
      }
    }

    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This data is not available offline',
        offline: true,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle image requests with cache-first strategy
 */
async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    swLogger.log('Serving image from cache:', request.url);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      swLogger.log('Cached image:', request.url);
    }
    return networkResponse;
  } catch {
    swLogger.log('Image request failed:', request.url);
    // Return placeholder image for offline
    return new Response('', { status: 404 });
  }
}

/**
 * Handle navigation requests with network-first, cache fallback
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Update cache with fresh content
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch {
    swLogger.log('Navigation request failed, checking cache');

    // Try cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      swLogger.log('Serving navigation from cache');
      return cachedResponse;
    }

    // Return offline page
    swLogger.log('Serving offline page');
    const offlineCache = await caches.open(OFFLINE_CACHE);
    return (
      offlineCache.match('/offline') ||
      new Response(getOfflineHTML(), {
        headers: { 'Content-Type': 'text/html' },
      })
    );
  }
}

/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    swLogger.log('Static request failed:', request.url);
    return new Response('', { status: 404 });
  }
}

/**
 * Message handling for cache management and chunk error recovery
 */
self.addEventListener('message', event => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      clearCaches(payload?.cacheNames).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;

    case 'CLEAR_WEBPACK_CHUNKS':
      clearWebpackChunks().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;

    case 'HANDLE_CHUNK_ERROR':
      handleChunkErrorRecovery().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;

    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;

    case 'PREFETCH_ROUTES':
      prefetchRoutes(payload?.routes || []).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

/**
 * Background sync for data updates
 */
self.addEventListener('sync', event => {
  swLogger.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync-representatives') {
    event.waitUntil(syncRepresentatives());
  } else if (event.tag === 'background-sync-news') {
    event.waitUntil(syncNewsData());
  }
});

/**
 * Push notification handling
 */
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url,
      timestamp: Date.now(),
    },
    actions: [
      {
        action: 'view',
        title: 'View Details',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    const url = event.notification.data.url || '/';
    event.waitUntil(clients.openWindow(url));
  }
});

// Utility functions

function isAPIRequest(request) {
  return API_PATTERNS.some(pattern => request.url.includes(pattern));
}

function isImageRequest(request) {
  return request.destination === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(request.url);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function isNewsRequest(request) {
  return request.url.includes('/news') || request.url.includes('gdelt');
}

async function clearCaches(cacheNames = []) {
  if (cacheNames.length === 0) {
    cacheNames = await caches.keys();
  }

  return Promise.all(cacheNames.map(name => caches.delete(name)));
}

async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    status[name] = keys.length;
  }

  return status;
}

async function prefetchRoutes(routes) {
  const cache = await caches.open(CACHE_NAME);

  return Promise.all(
    routes.map(async route => {
      try {
        const response = await fetch(route);
        if (response.ok) {
          await cache.put(route, response);
          swLogger.log('Prefetched:', route);
        }
      } catch (error) {
        swLogger.error('Prefetch failed:', route, error);
      }
    })
  );
}

async function syncRepresentatives() {
  try {
    swLogger.log('Syncing representatives data');
    const response = await fetch('/api/representatives?zip=10001');
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put('/api/representatives?zip=10001', response);
    }
  } catch (error) {
    swLogger.error('Background sync failed:', error);
  }
}

async function syncNewsData() {
  try {
    swLogger.log('Syncing news data');
    // Sync latest news for cached representatives
    // Implementation would depend on specific requirements
  } catch (error) {
    swLogger.error('News sync failed:', error);
  }
}

/**
 * Clear webpack chunks from all caches to prevent ChunkLoadErrors
 */
async function clearWebpackChunks() {
  swLogger.log('Clearing webpack chunks to prevent ChunkLoadErrors');

  try {
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      // Delete webpack chunks and Next.js static files
      for (const request of requests) {
        const url = request.url;
        const shouldDelete = WEBPACK_CHUNK_PATTERNS.some(pattern => {
          if (pattern instanceof RegExp) {
            return pattern.test(url);
          }
          return url.includes(pattern);
        });

        if (shouldDelete) {
          await cache.delete(request);
          swLogger.log('Deleted webpack chunk:', url);
        }
      }
    }

    swLogger.log('Webpack chunk cleanup complete');
  } catch (error) {
    swLogger.error('Error clearing webpack chunks:', error);
  }
}

/**
 * Handle chunk error recovery by clearing all caches and notifying clients
 */
async function handleChunkErrorRecovery() {
  swLogger.log('Handling chunk error recovery');

  try {
    // Clear all caches
    await clearCaches();

    // Clear webpack chunks specifically
    await clearWebpackChunks();

    // Notify all clients to reload
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CHUNK_ERROR_RECOVERY',
        action: 'reload',
      });
    });

    swLogger.log('Chunk error recovery complete');
  } catch (error) {
    swLogger.error('Error during chunk error recovery:', error);
  }
}

/**
 * Notify clients about cache updates
 */
async function notifyClientsOfUpdate() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_UPDATED',
        version: CACHE_VERSION,
      });
    });
    swLogger.log('Notified clients of cache update');
  } catch (error) {
    swLogger.error('Error notifying clients:', error);
  }
}

function getOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Civic Intel Hub</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 20px;
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 { margin: 0 0 1rem 0; }
        p { margin: 0 0 2rem 0; opacity: 0.9; }
        .retry-btn {
          background: white;
          color: #667eea;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .retry-btn:hover {
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="offline-icon">📡</div>
      <h1>You're Offline</h1>
      <p>Some features may not be available while you're offline.<br>
         We'll sync your data when you're back online.</p>
      <button class="retry-btn" onclick="window.location.reload()">
        Try Again
      </button>
    </body>
    </html>
  `;
}

swLogger.log('Service worker script loaded');
