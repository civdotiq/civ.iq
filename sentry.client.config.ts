import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Configure scope
  beforeSend(event, hint) {
    // Filter out errors we don't want to track
    if (event.exception) {
      const error = hint.originalException
      
      // Don't track AbortError (user navigated away)
      if (error instanceof Error && error.name === 'AbortError') {
        return null
      }
      
      // Don't track network errors for external APIs that are expected to fail sometimes
      if (error instanceof Error && error.message.includes('fetch')) {
        return null
      }
    }
    
    return event
  },

  // Set user context
  beforeSendTransaction(event) {
    // Add custom tags
    event.tags = {
      ...event.tags,
      component: 'civic-intel-hub'
    }
    
    return event
  },

  // Environment-specific configuration
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking
  release: process.env.npm_package_version || '0.1.0',

  // Error filtering
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // Network errors that are expected
    'NetworkError',
    'TypeError: Failed to fetch',
    'TypeError: cancelled',
    // Non-actionable errors
    'Non-Error promise rejection captured',
  ],

  // URL filtering
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    // Firefox extensions  
    /^moz-extension:\/\//i,
    // Safari extensions
    /^safari-web-extension:\/\//i,
  ],
})