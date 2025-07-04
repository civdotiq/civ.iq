import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Configure scope for server-side
  beforeSend(event, hint) {
    // Add server-side context
    if (event.request) {
      // Sanitize sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['x-api-key']
        delete event.request.headers['cookie']
      }
    }

    // Filter out errors we don't want to track
    if (event.exception) {
      const error = hint.originalException
      
      // Don't track external API timeouts in production
      if (error instanceof Error && error.message.includes('timeout') && process.env.NODE_ENV === 'production') {
        return null
      }
    }
    
    return event
  },

  // Add custom context
  beforeSendTransaction(event) {
    event.tags = {
      ...event.tags,
      component: 'civic-intel-hub-server'
    }
    
    return event
  },

  // Environment-specific configuration
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking
  release: process.env.npm_package_version || '0.1.0',

  // Server-specific error filtering
  ignoreErrors: [
    // Expected API errors
    'Congress API is currently unavailable',
    'Census geocoding service unavailable',
    'FEC API service unavailable',
    // Expected validation errors
    'Validation failed',
    // Rate limiting (these are operational, not errors)
    'Rate limit exceeded',
  ],

  // Integration configuration
  integrations: [
    // Add HTTP integration for tracing
    Sentry.httpIntegration({
      tracing: {
        ignoreIncomingRequests: (url) => {
          // Don't trace health checks
          return url.includes('/health') || url.includes('/api/health')
        },
        ignoreOutgoingRequests: (url) => {
          // Don't trace internal requests
          return url.includes('localhost') || url.includes('127.0.0.1')
        }
      }
    }),
  ],

  // Performance monitoring
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
})