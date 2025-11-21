# Environment Configuration Documentation

This document provides comprehensive guidance for configuring the Civic Intel Hub environment variables, deployment settings, and operational parameters.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Development Setup](#development-setup)
- [Production Configuration](#production-configuration)
- [Service Configuration](#service-configuration)
- [Security Configuration](#security-configuration)
- [Performance Configuration](#performance-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)

## Environment Variables

### Required Environment Variables

```bash
# API Keys (Required for production)
CONGRESS_API_KEY=your_congress_gov_api_key_here
FEC_API_KEY=your_fec_api_key_here
CENSUS_API_KEY=your_census_api_key_here
OPENSTATES_API_KEY=your_openstates_api_key_here

# Redis Configuration (Required for caching)
REDIS_URL=redis://localhost:6379
# OR for Redis Cloud/hosted solutions:
# REDIS_URL=redis://username:password@host:port

# Application URL (Required for service worker and API calls)
NEXTAUTH_URL=https://your-domain.com
# For development:
# NEXTAUTH_URL=http://localhost:3000
```

### Optional Environment Variables

```bash
# Node.js Configuration
NODE_ENV=production                    # development | production | test
PORT=3000                             # Server port (default: 3000)

# Logging Configuration
LOG_LEVEL=info                        # error | warn | info | debug
LOG_FORMAT=json                       # json | pretty

# Performance Configuration
ENABLE_PERFORMANCE_MONITORING=true    # Enable OpenTelemetry monitoring
CACHE_TTL_MINUTES=30                  # Default cache TTL in minutes
RATE_LIMIT_REQUESTS_PER_MINUTE=100    # Rate limiting threshold

# Feature Flags
ENABLE_SERVICE_WORKER=true            # Enable PWA service worker
ENABLE_NEWS_DEDUPLICATION=true        # Enable intelligent news deduplication
ENABLE_REQUEST_BATCHING=true          # Enable API request batching
ENABLE_LAZY_LOADING=true              # Enable component lazy loading

# Error Tracking (Optional - Sentry)
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0

# Security Configuration
CORS_ORIGIN=https://your-domain.com    # CORS allowed origins
CSP_REPORT_URI=/api/csp-report        # Content Security Policy reporting
```

### Development-Specific Variables

```bash
# Development Environment
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000

# Development Debugging
DEBUG=civic-intel:*                   # Enable debug logging
ENABLE_DEV_TOOLS=true                 # Enable development tools
MOCK_EXTERNAL_APIS=false              # Use real APIs (false) or mocks (true)

# Local Redis (for development)
REDIS_URL=redis://localhost:6379
```

## Development Setup

### 1. Environment File Setup

Create a `.env.local` file in the project root:

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit with your API keys and configuration
# .env.local (this file is gitignored)
CONGRESS_API_KEY=your_key_here
FEC_API_KEY=your_key_here
CENSUS_API_KEY=your_key_here
OPENSTATES_API_KEY=your_key_here
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### 2. Required API Keys

#### Congress.gov API Key

- **URL**: https://api.congress.gov/sign-up/
- **Purpose**: Federal representative data, voting records, bills
- **Rate Limits**: 5,000 requests per hour
- **Required**: Yes

#### FEC API Key

- **URL**: https://api.open.fec.gov/developers/
- **Purpose**: Campaign finance data
- **Rate Limits**: 1,000 requests per hour
- **Required**: Yes

#### Census API Key

- **URL**: https://api.census.gov/data/key_signup.html
- **Purpose**: Geocoding and district mapping
- **Rate Limits**: 500 requests per day (unlimited with key)
- **Required**: Yes

#### OpenStates API Key

- **URL**: https://openstates.org/accounts/profile/
- **Purpose**: State legislature data
- **Rate Limits**: 1,000 requests per hour
- **Required**: Yes

### 3. Redis Setup

#### Local Development (Docker)

```bash
# Run Redis using Docker
docker run -d --name redis-civic -p 6379:6379 redis:alpine

# Or use docker-compose
version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
volumes:
  redis-data:
```

#### Local Development (Homebrew - macOS)

```bash
# Install Redis
brew install redis

# Start Redis
brew services start redis

# Verify connection
redis-cli ping
```

## Production Configuration

### 1. Environment Variables for Production

```bash
# Production .env
NODE_ENV=production
NEXTAUTH_URL=https://civic-intel-hub.vercel.app

# API Keys (store securely)
CONGRESS_API_KEY=${CONGRESS_API_KEY}
FEC_API_KEY=${FEC_API_KEY}
CENSUS_API_KEY=${CENSUS_API_KEY}
OPENSTATES_API_KEY=${OPENSTATES_API_KEY}

# Redis (use hosted Redis)
REDIS_URL=${REDIS_URL}

# Security
CORS_ORIGIN=https://civic-intel-hub.vercel.app
CSP_REPORT_URI=https://civic-intel-hub.vercel.app/api/csp-report

# Monitoring
SENTRY_DSN=${SENTRY_DSN}
SENTRY_ENVIRONMENT=production
ENABLE_PERFORMANCE_MONITORING=true

# Performance
CACHE_TTL_MINUTES=30
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

### 2. Deployment Platforms

#### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add CONGRESS_API_KEY
vercel env add FEC_API_KEY
vercel env add CENSUS_API_KEY
vercel env add OPENSTATES_API_KEY
vercel env add REDIS_URL
```

#### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up

# Set environment variables
railway variables set CONGRESS_API_KEY=your_key
railway variables set REDIS_URL=your_redis_url
```

#### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Service Configuration

### Redis Configuration

#### Redis Cloud (Recommended for Production)

```bash
# Redis Cloud connection string
REDIS_URL=redis://username:password@host:port/database

# With SSL (recommended)
REDIS_URL=rediss://username:password@host:port/database
```

#### Redis Configuration Options

```bash
# Redis connection settings
REDIS_CONNECTION_TIMEOUT=5000         # Connection timeout (ms)
REDIS_COMMAND_TIMEOUT=3000            # Command timeout (ms)
REDIS_RETRY_DELAY_ON_FAILURE=500      # Retry delay (ms)
REDIS_MAX_RETRY_ATTEMPTS=3            # Max retry attempts
```

### External API Configuration

#### Rate Limiting Configuration

```bash
# API rate limits (requests per minute)
CONGRESS_API_RATE_LIMIT=80            # Congress.gov API
FEC_API_RATE_LIMIT=15                 # FEC API
CENSUS_API_RATE_LIMIT=100             # Census API
OPENSTATES_API_RATE_LIMIT=15          # OpenStates API
GDELT_API_RATE_LIMIT=30               # GDELT API
```

#### API Timeout Configuration

```bash
# API timeouts (milliseconds)
CONGRESS_API_TIMEOUT=15000            # Congress.gov API timeout
FEC_API_TIMEOUT=10000                 # FEC API timeout
CENSUS_API_TIMEOUT=8000               # Census API timeout
OPENSTATES_API_TIMEOUT=12000          # OpenStates API timeout
GDELT_API_TIMEOUT=15000               # GDELT API timeout
```

## Security Configuration

### Content Security Policy

```bash
# CSP Configuration
CSP_REPORT_URI=/api/csp-report
CSP_SCRIPT_SRC="'self' 'unsafe-inline' https://vercel.live"
CSP_STYLE_SRC="'self' 'unsafe-inline'"
CSP_IMG_SRC="'self' data: https:"
CSP_CONNECT_SRC="'self' https://api.congress.gov https://api.open.fec.gov"
```

### CORS Configuration

```bash
# CORS settings
CORS_ORIGIN=https://your-domain.com
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-API-Key
```

### Rate Limiting

```bash
# Rate limiting configuration
RATE_LIMIT_REQUESTS_PER_MINUTE=100    # General API rate limit
RATE_LIMIT_WINDOW_MS=60000            # Rate limit window (1 minute)
RATE_LIMIT_SKIP_FAILED_REQUESTS=true  # Don't count failed requests
RATE_LIMIT_TRUST_PROXY=true           # Trust proxy headers
```

## Performance Configuration

### Caching Configuration

```bash
# Cache settings
CACHE_TTL_MINUTES=30                  # Default cache TTL
CACHE_MAX_SIZE_MB=100                 # Max cache size
CACHE_CLEANUP_INTERVAL_MINUTES=10     # Cache cleanup interval

# Specific cache TTLs (minutes)
REPRESENTATIVES_CACHE_TTL=60          # Representative data
NEWS_CACHE_TTL=15                     # News articles
BILLS_CACHE_TTL=30                    # Bill data
VOTES_CACHE_TTL=120                   # Voting records
DISTRICT_MAP_CACHE_TTL=1440           # District boundaries (24 hours)
```

### Bundle Optimization

```bash
# Bundle settings
ENABLE_BUNDLE_ANALYZER=false          # Enable webpack bundle analyzer
ENABLE_COMPRESSION=true               # Enable gzip compression
ENABLE_TREE_SHAKING=true              # Enable tree shaking
CHUNK_SIZE_LIMIT_KB=250               # Chunk size limit
```

### Service Worker Configuration

```bash
# PWA settings
ENABLE_SERVICE_WORKER=true            # Enable service worker
SW_CACHE_NAME=civic-intel-hub-v1      # Service worker cache name
SW_CACHE_STRATEGY=network-first       # Caching strategy
SW_OFFLINE_FALLBACK=true              # Enable offline fallback
```

## Monitoring and Logging

### Logging Configuration

```bash
# Logging settings
LOG_LEVEL=info                        # error | warn | info | debug
LOG_FORMAT=json                       # json | pretty
LOG_INCLUDE_STACK_TRACE=true          # Include stack traces
LOG_MAX_FILES=10                      # Max log files to keep
LOG_MAX_SIZE_MB=50                    # Max log file size

# Structured logging fields
LOG_INCLUDE_TIMESTAMP=true
LOG_INCLUDE_REQUEST_ID=true
LOG_INCLUDE_USER_AGENT=true
LOG_INCLUDE_IP_ADDRESS=false          # Privacy consideration
```

### Error Tracking (Sentry)

```bash
# Sentry configuration
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
SENTRY_SAMPLE_RATE=1.0                # Error sampling rate
SENTRY_TRACES_SAMPLE_RATE=0.1         # Performance sampling rate
SENTRY_DEBUG=false                    # Enable Sentry debugging
```

### Performance Monitoring

```bash
# Performance settings
ENABLE_PERFORMANCE_MONITORING=true    # Enable performance tracking
PERFORMANCE_SAMPLE_RATE=0.1           # Performance sampling rate
SLOW_QUERY_THRESHOLD_MS=1000          # Slow query threshold
MEMORY_USAGE_WARNING_THRESHOLD=80     # Memory usage warning (%)
```

## Feature Flags

### Application Features

```bash
# Feature toggles
ENABLE_NEWS_DEDUPLICATION=true        # Enable news deduplication
ENABLE_REQUEST_BATCHING=true          # Enable API request batching
ENABLE_LAZY_LOADING=true              # Enable component lazy loading
ENABLE_INFINITE_SCROLL=true           # Enable infinite scroll pagination
ENABLE_ADVANCED_SEARCH=true           # Enable advanced search features
ENABLE_ANALYTICS_DASHBOARD=true       # Enable analytics dashboard
ENABLE_STATE_LEGISLATURE=true         # Enable state legislature features
ENABLE_CAMPAIGN_FINANCE=true          # Enable campaign finance data
```

### Experimental Features

```bash
# Experimental features (use with caution)
ENABLE_REALTIME_UPDATES=false         # Enable real-time data updates
ENABLE_PUSH_NOTIFICATIONS=false       # Enable push notifications
ENABLE_OFFLINE_SYNC=false             # Enable offline data synchronization
ENABLE_ADVANCED_ANALYTICS=false       # Enable advanced analytics tracking
```

## Health Check Configuration

### Health Check Endpoints

```bash
# Health check settings
HEALTH_CHECK_TIMEOUT_MS=5000          # Health check timeout
HEALTH_CHECK_EXTERNAL_APIS=true       # Check external API health
HEALTH_CHECK_CACHE=true               # Check cache health
HEALTH_CHECK_MEMORY_THRESHOLD=90      # Memory usage threshold (%)
```

### Monitoring Endpoints

```
GET /api/health                       # Full health check
HEAD /api/health                      # Quick health check
GET /api/metrics                      # Performance metrics (if enabled)
```

## Troubleshooting

### Common Issues

#### 1. Redis Connection Issues

```bash
# Check Redis connection
redis-cli ping

# Verify Redis URL format
REDIS_URL=redis://localhost:6379      # Local
REDIS_URL=redis://user:pass@host:port # Remote

# Enable Redis debug logging
DEBUG=redis:*
```

#### 2. API Key Issues

```bash
# Test Congress API
curl "https://api.congress.gov/v3/member?api_key=YOUR_KEY&limit=1"

# Test FEC API
curl "https://api.open.fec.gov/v1/candidates/?api_key=YOUR_KEY&per_page=1"

# Check API key environment variables
echo $CONGRESS_API_KEY
```

#### 3. Performance Issues

```bash
# Enable performance monitoring
ENABLE_PERFORMANCE_MONITORING=true
LOG_LEVEL=debug

# Check memory usage
# Visit /api/health endpoint for memory statistics

# Enable bundle analyzer
ENABLE_BUNDLE_ANALYZER=true
npm run build
```

#### 4. CORS Issues

```bash
# Set proper CORS origin
CORS_ORIGIN=https://your-domain.com

# For development, allow localhost
CORS_ORIGIN=http://localhost:3000

# Check network tab in browser for CORS errors
```

### Debug Mode

#### Enable Debug Logging

```bash
# Environment variables for debugging
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=civic-intel:*

# Specific debug namespaces
DEBUG=civic-intel:api
DEBUG=civic-intel:cache
DEBUG=civic-intel:validation
```

#### Development Tools

```bash
# Enable development tools
ENABLE_DEV_TOOLS=true
ENABLE_BUNDLE_ANALYZER=true
MOCK_EXTERNAL_APIS=true              # Use mocks instead of real APIs
```

### Performance Optimization

#### Cache Optimization

```bash
# Optimize cache settings
CACHE_TTL_MINUTES=60                 # Increase for less frequent updates
REDIS_CONNECTION_TIMEOUT=3000        # Reduce timeout for faster failover
ENABLE_CACHE_COMPRESSION=true        # Compress cached data
```

#### Bundle Optimization

```bash
# Optimize bundle size
ENABLE_TREE_SHAKING=true
ENABLE_COMPRESSION=true
CHUNK_SIZE_LIMIT_KB=200              # Smaller chunks for better caching
```

## Environment Validation

The application includes built-in environment validation that will check for:

- Required API keys
- Valid Redis connection
- Proper URL formats
- Valid configuration values

If any required environment variables are missing or invalid, the application will:

1. Log detailed error messages
2. Provide guidance on how to fix the issue
3. Use fallback values where possible
4. Gracefully degrade functionality if needed

Check the console output during startup for any environment validation warnings or errors.

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment-specific configurations** for different deployment stages
3. **Rotate API keys regularly** and update environment variables
4. **Use HTTPS** for all external API calls and in production
5. **Enable CORS** only for trusted domains
6. **Set up proper CSP headers** to prevent XSS attacks
7. **Use secure Redis connections** (TLS/SSL) in production
8. **Monitor API usage** to detect unusual patterns
9. **Implement rate limiting** to prevent abuse
10. **Keep dependencies updated** and monitor for security vulnerabilities

For additional security considerations, refer to the main project documentation and follow the latest security best practices for Next.js applications.
