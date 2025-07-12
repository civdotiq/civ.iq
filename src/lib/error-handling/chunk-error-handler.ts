/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

/**
 * Global ChunkLoadError handler for webpack chunk loading failures
 * Automatically clears cache and reloads the page when chunk errors occur
 */

interface ChunkErrorDetails {
  error: Error;
  timestamp: number;
  url?: string;
  userAgent: string;
  pathname: string;
}

class ChunkErrorHandler {
  private static instance: ChunkErrorHandler;
  private errorCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000;
  private isHandling = false;

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.setupServiceWorkerMessageListener();
  }

  public static getInstance(): ChunkErrorHandler {
    if (!ChunkErrorHandler.instance) {
      ChunkErrorHandler.instance = new ChunkErrorHandler();
    }
    return ChunkErrorHandler.instance;
  }

  /**
   * Setup global error handlers for unhandled errors and promise rejections
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      if (this.isChunkLoadError(event.error)) {
        event.preventDefault();
        this.handleChunkError({
          error: event.error,
          timestamp: Date.now(),
          url: event.filename,
          userAgent: navigator.userAgent,
          pathname: window.location.pathname
        });
      }
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isChunkLoadError(event.reason)) {
        event.preventDefault();
        this.handleChunkError({
          error: event.reason,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          pathname: window.location.pathname
        });
      }
    });
  }

  /**
   * Setup service worker message listener for chunk error recovery
   */
  private setupServiceWorkerMessageListener(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, action } = event.data;

        if (type === 'CHUNK_ERROR_RECOVERY' && action === 'reload') {
          console.log('[CIV.IQ-CHUNK] Service worker initiated reload for chunk error');
          window.location.reload();
        }

        if (type === 'CACHE_UPDATED') {
          console.log('[CIV.IQ-CHUNK] Service worker cache updated:', event.data.version);
        }
      });
    }
  }

  /**
   * Check if an error is a chunk loading error
   */
  private isChunkLoadError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || '';
    const errorStack = error.stack || '';

    return (
      errorMessage.includes('ChunkLoadError') ||
      errorMessage.includes('__webpack_require__.f.j') ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('failed to import') ||
      errorStack.includes('ChunkLoadError') ||
      errorStack.includes('__webpack_require__') ||
      error.name === 'ChunkLoadError' ||
      false
    );
  }

  /**
   * Handle chunk loading errors with automatic recovery
   */
  private async handleChunkError(details: ChunkErrorDetails): Promise<void> {
    if (this.isHandling) {
      console.log('[CIV.IQ-CHUNK] Already handling chunk error, skipping');
      return;
    }

    this.isHandling = true;
    this.errorCount++;

    console.error('[CIV.IQ-CHUNK] ChunkLoadError detected:', {
      count: this.errorCount,
      maxRetries: this.maxRetries,
      ...details
    });

    // Log error for monitoring
    this.logChunkError(details);

    // If we've exceeded max retries, show user-friendly error
    if (this.errorCount > this.maxRetries) {
      this.showMaxRetriesError();
      return;
    }

    try {
      // Clear all caches
      await this.clearAllCaches();

      // Wait a moment before reloading
      await this.delay(this.retryDelay);

      // Show loading indicator
      this.showReloadingIndicator();

      // Reload the page
      window.location.reload();

    } catch (error) {
      console.error('[CIV.IQ-CHUNK] Error during chunk error recovery:', error);
      this.isHandling = false;
    }
  }

  /**
   * Clear all browser caches
   */
  private async clearAllCaches(): Promise<void> {
    try {
      console.log('[CIV.IQ-CHUNK] Clearing all caches');

      // Clear Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[CIV.IQ-CHUNK] Cleared Cache API caches');
      }

      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      console.log('[CIV.IQ-CHUNK] Cleared localStorage and sessionStorage');

      // Unregister service worker if needed
      if ('serviceWorker' in navigator) {
        // Send message to service worker to handle chunk error
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          registration.active.postMessage({
            type: 'HANDLE_CHUNK_ERROR'
          });
        }
      }

    } catch (error) {
      console.error('[CIV.IQ-CHUNK] Error clearing caches:', error);
    }
  }

  /**
   * Show a user-friendly loading indicator during reload
   */
  private showReloadingIndicator(): void {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'chunk-error-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    `;

    // Create content
    const content = document.createElement('div');
    content.style.cssText = `
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      color: #333;
      max-width: 400px;
    `;

    content.innerHTML = `
      <div style="margin-bottom: 1rem;">
        <svg style="width: 48px; height: 48px; animation: spin 1s linear infinite; color: #3ea2d4;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
      </div>
      <h3 style="margin: 0 0 0.5rem 0; color: #3ea2d4;">Updating Application</h3>
      <p style="margin: 0; color: #666; font-size: 14px;">
        Loading the latest version. This will only take a moment.
      </p>
    `;

    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }

  /**
   * Show error when max retries exceeded
   */
  private showMaxRetriesError(): void {
    const message = `
      The application encountered multiple loading errors. 
      Please refresh the page manually or contact support if the problem persists.
    `;

    // Try to show in a nice modal, fall back to alert
    try {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      `;

      overlay.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; text-align: center;">
          <h3 style="color: #e11d07; margin: 0 0 1rem 0;">Connection Issue</h3>
          <p style="margin: 0 0 1.5rem 0; color: #666;">${message}</p>
          <button onclick="window.location.reload()" 
                  style="background: #3ea2d4; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer;">
            Refresh Page
          </button>
        </div>
      `;

      document.body.appendChild(overlay);
    } catch {
      alert(message);
    }
  }

  /**
   * Log chunk error for monitoring and debugging
   */
  private logChunkError(details: ChunkErrorDetails): void {
    const errorData = {
      type: 'ChunkLoadError',
      count: this.errorCount,
      maxRetries: this.maxRetries,
      timestamp: details.timestamp,
      pathname: details.pathname,
      userAgent: details.userAgent,
      error: {
        message: details.error.message,
        stack: details.error.stack,
        name: details.error.name
      }
    };

    // Log to console
    console.error('[CIV.IQ-CHUNK] Error details:', errorData);

    // Send to monitoring service if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(details.error, {
        tags: {
          errorType: 'ChunkLoadError',
          errorCount: this.errorCount
        },
        extra: errorData
      });
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset error count (useful for testing)
   */
  public reset(): void {
    this.errorCount = 0;
    this.isHandling = false;
  }

  /**
   * Get current error count
   */
  public getErrorCount(): number {
    return this.errorCount;
  }
}

// Initialize the global chunk error handler
export function initializeChunkErrorHandler(): ChunkErrorHandler {
  return ChunkErrorHandler.getInstance();
}

// Export for testing
export { ChunkErrorHandler };