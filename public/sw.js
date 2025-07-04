/**
 * Service Worker for Civic Intel Hub
 * Provides offline functionality, caching, and progressive web app features
 */

const CACHE_NAME = 'civic-intel-hub-v1';
const OFFLINE_CACHE = 'civic-intel-hub-offline-v1';
const API_CACHE = 'civic-intel-hub-api-v1';

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
  '/api/state-bills'
];

// Cache expiration times (in milliseconds)
const CACHE_TIMES = {
  STATIC: 24 * 60 * 60 * 1000, // 24 hours
  API: 30 * 60 * 1000, // 30 minutes
  NEWS: 15 * 60 * 1000, // 15 minutes
  IMAGES: 7 * 24 * 60 * 60 * 1000 // 7 days
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      }),
      
      // Create offline cache
      caches.open(OFFLINE_CACHE).then(cache => {
        console.log('[SW] Creating offline cache');
        return cache.put('/offline', new Response(getOfflineHTML(), {
          headers: { 'Content-Type': 'text/html' }
        }));
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName !== CACHE_NAME && 
              cacheName !== OFFLINE_CACHE && 
              cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
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
    console.log('[SW] Fetching from network:', url.pathname);
    
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
          'sw-cached-at': Date.now().toString()
        }
      });
      
      await cache.put(request, timestampedResponse);
      console.log('[SW] Cached API response:', url.pathname);
      
      return networkResponse;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
    
  } catch (error) {
    console.log('[SW] Network failed, checking cache:', url.pathname);
    
    // Try cache as fallback
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const isExpired = cachedAt && (Date.now() - parseInt(cachedAt)) > maxAge;
      
      if (!isExpired) {
        console.log('[SW] Serving from cache:', url.pathname);
        return cachedResponse;
      } else {
        console.log('[SW] Cache expired for:', url.pathname);
        await cache.delete(request);
      }
    }
    
    // Return offline response for API requests
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'This data is not available offline',
      offline: true,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle image requests with cache-first strategy
 */
async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Serving image from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      console.log('[SW] Cached image:', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Image request failed:', request.url);
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
    
  } catch (error) {
    console.log('[SW] Navigation request failed, checking cache');
    
    // Try cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving navigation from cache');
      return cachedResponse;
    }
    
    // Return offline page
    console.log('[SW] Serving offline page');
    const offlineCache = await caches.open(OFFLINE_CACHE);
    return offlineCache.match('/offline') || new Response(getOfflineHTML(), {
      headers: { 'Content-Type': 'text/html' }
    });
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
  } catch (error) {
    console.log('[SW] Static request failed:', request.url);
    return new Response('', { status: 404 });
  }
}

/**
 * Message handling for cache management
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
  console.log('[SW] Background sync triggered:', event.tag);
  
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
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    const url = event.notification.data.url || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// Utility functions

function isAPIRequest(request) {
  return API_PATTERNS.some(pattern => request.url.includes(pattern));
}

function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(request.url);
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
  
  return Promise.all(
    cacheNames.map(name => caches.delete(name))
  );
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
          console.log('[SW] Prefetched:', route);
        }
      } catch (error) {
        console.log('[SW] Prefetch failed:', route, error);
      }
    })
  );
}

async function syncRepresentatives() {
  try {
    console.log('[SW] Syncing representatives data');
    const response = await fetch('/api/representatives?zip=10001');
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put('/api/representatives?zip=10001', response);
    }
  } catch (error) {
    console.log('[SW] Background sync failed:', error);
  }
}

async function syncNewsData() {
  try {
    console.log('[SW] Syncing news data');
    // Sync latest news for cached representatives
    // Implementation would depend on specific requirements
  } catch (error) {
    console.log('[SW] News sync failed:', error);
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

console.log('[SW] Service worker script loaded');