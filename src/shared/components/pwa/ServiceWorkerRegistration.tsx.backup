'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logging/logger-client';

interface ServiceWorkerState {
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  isOnline: boolean;
  installing: boolean;
}

export function ServiceWorkerRegistration() {
  const [swState, setSwState] = useState<ServiceWorkerState>({
    registration: null,
    updateAvailable: false,
    isOnline: true,
    installing: false,
  });

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Monitor online/offline status
    function handleOnlineStatus() {
      setSwState(prev => ({ ...prev, isOnline: navigator.onLine }));
    }

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      logger.info('Registering service worker');
      setSwState(prev => ({ ...prev, installing: true }));

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setSwState(prev => ({
        ...prev,
        registration,
        installing: false,
      }));

      logger.info('Service worker registered successfully');

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          logger.info('New service worker installing');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logger.info('New service worker installed, update available');
              setSwState(prev => ({ ...prev, updateAvailable: true }));
            }
          });
        }
      });

      // Handle controlling change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        logger.info('Service worker controller changed, reloading');
        window.location.reload();
      });

      // Send message to service worker for initial setup
      if (registration.active) {
        registration.active.postMessage({
          type: 'GET_CACHE_STATUS',
        });
      }

      // Register for background sync if supported
      if ('sync' in registration) {
        try {
          await (registration.sync as { register: (tag: string) => Promise<void> }).register(
            'background-sync-representatives'
          );
          await (registration.sync as { register: (tag: string) => Promise<void> }).register(
            'background-sync-news'
          );
          logger.info('Background sync registered');
        } catch (error) {
          logger.warn('Background sync registration failed', { error: String(error) });
        }
      }

      // Request persistent storage
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const persistent = await navigator.storage.persist();
        logger.info('Persistent storage status', { persistent });
      }
    } catch (error) {
      logger.error('Service worker registration failed', error as Error);
      setSwState(prev => ({ ...prev, installing: false }));
    }
  };

  const handleUpdateAvailable = () => {
    if (swState.registration?.waiting) {
      swState.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const _clearCache = async () => {
    if (swState.registration) {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = event => {
        if (event.data.success) {
          logger.info('Cache cleared successfully');
          window.location.reload();
        }
      };

      swState.registration.active?.postMessage(
        {
          type: 'CLEAR_CACHE',
        },
        [messageChannel.port2]
      );
    }
  };

  const _getCacheStatus = async () => {
    if (swState.registration) {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = event => {
        logger.info('Cache status', { data: event.data });
      };

      swState.registration.active?.postMessage(
        {
          type: 'GET_CACHE_STATUS',
        },
        [messageChannel.port2]
      );
    }
  };

  const prefetchRoutes = async (routes: string[]) => {
    if (swState.registration) {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = event => {
        if (event.data.success) {
          logger.info('Routes prefetched successfully');
        }
      };

      swState.registration.active?.postMessage(
        {
          type: 'PREFETCH_ROUTES',
          payload: { routes },
        },
        [messageChannel.port2]
      );
    }
  };

  // Prefetch important routes on load
  useEffect(() => {
    if (swState.registration) {
      const importantRoutes = [
        '/representatives',
        '/api/representatives?zip=10001', // Sample ZIP for prefetch
      ];

      // Delay prefetch to not interfere with initial load
      setTimeout(() => {
        prefetchRoutes(importantRoutes);
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swState.registration]);

  // Show update notification if available
  if (swState.updateAvailable) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          right: '20px',
          zIndex: 1000,
          background: '#e11d07',
          color: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        <span>📱 App update available</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleUpdateAvailable}
            style={{
              background: 'white',
              color: '#e11d07',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Update
          </button>
          <button
            onClick={() => setSwState(prev => ({ ...prev, updateAvailable: false }))}
            style={{
              background: 'transparent',
              color: 'white',
              border: '1px solid white',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  // Show offline indicator
  if (!swState.isOnline) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          zIndex: 1001,
          background: '#666',
          color: 'white',
          padding: '8px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: '500',
        }}
      >
        📡 You&apos;re offline. Some features may be limited.
      </div>
    );
  }

  // Show install prompt if installing
  if (swState.installing) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          right: '20px',
          zIndex: 1000,
          background: '#0a9338',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        🔄 Installing app for offline use...
      </div>
    );
  }

  return null;
}

// Export utility functions for use in other components
export const serviceWorkerUtils = {
  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return await navigator.storage.persist();
    }
    return false;
  },

  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return await navigator.storage.estimate();
    }
    return null;
  },

  async checkCacheStatus() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();

      return new Promise(resolve => {
        messageChannel.port1.onmessage = event => {
          resolve(event.data);
        };

        navigator.serviceWorker.controller?.postMessage(
          {
            type: 'GET_CACHE_STATUS',
          },
          [messageChannel.port2]
        );
      });
    }
    return null;
  },

  async clearAppCache() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();

      return new Promise(resolve => {
        messageChannel.port1.onmessage = event => {
          resolve(event.data);
        };

        navigator.serviceWorker.controller?.postMessage(
          {
            type: 'CLEAR_CACHE',
          },
          [messageChannel.port2]
        );
      });
    }
    return null;
  },
};
