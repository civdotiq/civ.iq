# Deployment Guide

Complete guide for deploying the Civic Intel Hub to production environments, including platform-specific configurations, environment setup, and monitoring.

## Table of Contents

- [Overview](#overview)
- [Pre-deployment Checklist](#pre-deployment-checklist)
- [Platform Deployments](#platform-deployments)
- [Environment Configuration](#environment-configuration)
- [Post-deployment Setup](#post-deployment-setup)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Overview

The Civic Intel Hub is designed to be deployed on modern hosting platforms with the following requirements:
- Node.js 18+
- Redis instance for caching
- Environment variables for API keys
- HTTPS support for PWA functionality

### Supported Platforms
- **Vercel** (Recommended for Next.js)
- **Railway** (Full-stack with Redis)
- **Netlify** (With Redis add-on)
- **AWS/Azure/GCP** (Container deployment)
- **Docker** (Self-hosted)

## Pre-deployment Checklist

### 1. API Keys Setup
Ensure you have obtained all required API keys:
- [ ] Congress.gov API key
- [ ] FEC.gov API key  
- [ ] Census.gov API key
- [ ] OpenStates.org API key
- [ ] Sentry DSN (for error tracking)

### 2. Redis Instance
Set up a Redis instance:
- [ ] Redis Cloud (recommended)
- [ ] Railway Redis
- [ ] AWS ElastiCache
- [ ] Azure Cache for Redis
- [ ] Self-hosted Redis

### 3. Build Verification
Test the application locally:
```bash
npm run build
npm run start
```

### 4. Health Check
Verify all services are working:
```bash
curl http://localhost:3000/api/health
```

## Platform Deployments

### Vercel (Recommended)

Vercel provides excellent Next.js support with global CDN and automatic deployments.

#### 1. Install Vercel CLI
```bash
npm i -g vercel
```

#### 2. Deploy to Vercel
```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add CONGRESS_API_KEY
vercel env add FEC_API_KEY
vercel env add CENSUS_API_KEY
vercel env add OPENSTATES_API_KEY
vercel env add REDIS_URL
vercel env add SENTRY_DSN
```

#### 3. Vercel Configuration
Create `vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300, stale-while-revalidate=60"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/service-worker.js",
      "destination": "/sw.js"
    }
  ]
}
```

#### 4. Environment Variables for Vercel
```bash
# Production environment
CONGRESS_API_KEY=your_congress_api_key
FEC_API_KEY=your_fec_api_key
CENSUS_API_KEY=your_census_api_key
OPENSTATES_API_KEY=your_openstates_api_key
REDIS_URL=your_redis_cloud_url
NEXTAUTH_URL=https://your-domain.vercel.app
NODE_ENV=production
SENTRY_DSN=your_sentry_dsn
ENABLE_PERFORMANCE_MONITORING=true
```

### Railway

Railway provides full-stack hosting with built-in Redis support.

#### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

#### 2. Deploy to Railway
```bash
# Login to Railway
railway login

# Link to project
railway link

# Deploy
railway up

# Add Redis service
railway add --name redis

# Set environment variables
railway variables set CONGRESS_API_KEY=your_key
railway variables set REDIS_URL=redis://redis:6379
```

#### 3. Railway Configuration
Create `railway.toml`:
```toml
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"

[[services]]
name = "web"
source = "."

[[services]]
name = "redis"
source = "redis:alpine"

[environments.production]
variables = { NODE_ENV = "production" }
```

### AWS Deployment

Deploy using AWS ECS/Fargate with ElastiCache Redis.

#### 1. Dockerfile
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### 2. AWS ECS Task Definition
```json
{
  "family": "civic-intel-hub",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "civic-intel-hub",
      "image": "your-account.dkr.ecr.region.amazonaws.com/civic-intel-hub:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "CONGRESS_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:civic-intel-hub/congress-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/civic-intel-hub",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

## Environment Configuration

### Production Environment Variables
```bash
# Application Configuration
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
PORT=3000

# Required API Keys
CONGRESS_API_KEY=your_congress_api_key
FEC_API_KEY=your_fec_api_key
CENSUS_API_KEY=your_census_api_key
OPENSTATES_API_KEY=your_openstates_api_key

# Redis Configuration
REDIS_URL=redis://username:password@host:port

# Security & Monitoring
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=production
CORS_ORIGIN=https://your-domain.com

# Performance Configuration
ENABLE_PERFORMANCE_MONITORING=true
CACHE_TTL_MINUTES=30
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# Feature Flags
ENABLE_SERVICE_WORKER=true
ENABLE_NEWS_DEDUPLICATION=true
ENABLE_REQUEST_BATCHING=true
```

### Environment Validation
The application validates all environment variables on startup:
- Required variables are checked for presence
- API keys are validated for format
- Redis connection is tested
- Feature flags are validated

## Post-deployment Setup

### 1. DNS Configuration
Set up your domain with proper DNS records:
```
A record: @ -> your-server-ip
CNAME: www -> your-domain.com
```

### 2. SSL/TLS Certificate
Ensure HTTPS is enabled (required for PWA functionality):
- Vercel: Automatic SSL
- Railway: Automatic SSL
- AWS: Use ACM certificates
- Self-hosted: Use Let's Encrypt

### 3. CDN Configuration
Configure CDN for optimal performance:
- Cache static assets for 1 year
- Cache API responses for 5 minutes
- Enable compression (gzip/brotli)

### 4. Health Check Setup
Configure health checks:
```bash
# Health check endpoint
curl https://your-domain.com/api/health

# Expected response: HTTP 200 with JSON status
```

### 5. Monitoring Setup

#### Sentry Configuration
1. Create Sentry project
2. Add DSN to environment variables
3. Configure error sampling rates
4. Set up performance monitoring

#### Log Monitoring
Set up log aggregation:
- AWS: CloudWatch Logs
- Railway: Built-in logging
- Vercel: Function logs
- Self-hosted: ELK Stack or similar

### 6. Performance Monitoring
Monitor key metrics:
- Response times
- Error rates
- Cache hit ratios
- Memory usage
- Redis performance

## Monitoring & Maintenance

### Health Checks
Regular health monitoring endpoints:
```bash
# Comprehensive health check
GET /api/health

# Quick health check (for load balancers)
HEAD /api/health
```

### Performance Metrics
Monitor these key metrics:
- API response times (<200ms target)
- Cache hit ratio (>80% target)
- Error rate (<1% target)
- Memory usage (<80% target)
- Redis connection status

### Log Analysis
Monitor structured logs for:
- API request patterns
- Error frequency and types
- Performance bottlenecks
- Security anomalies

### Automated Monitoring
Set up alerts for:
- Service downtime
- High error rates
- Performance degradation
- Cache failures
- API rate limit warnings

### Backup Strategy
Regular backups for:
- Environment configuration
- Application code
- Monitoring configurations
- SSL certificates

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failures
```bash
# Check Redis connectivity
redis-cli -u $REDIS_URL ping

# Monitor Redis logs
# Verify network connectivity
# Check authentication credentials
```

#### 2. API Rate Limiting
```bash
# Monitor API usage
curl -I https://your-domain.com/api/representatives?zip=10001

# Check rate limit headers
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

#### 3. Service Worker Issues
```bash
# Verify service worker registration
# Check browser console for errors
# Validate manifest.json
# Ensure HTTPS is enabled
```

#### 4. Performance Issues
```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Monitor memory usage
# Check Redis performance
# Analyze slow query logs
```

### Debug Mode
Enable debug mode for troubleshooting:
```bash
DEBUG=civic-intel:* npm start
LOG_LEVEL=debug npm start
```

### Support Resources
- Health check endpoint: `/api/health`
- Documentation: [Environment Configuration](ENVIRONMENT.md)
- Performance guide: [Performance Optimization](PERFORMANCE.md)
- API reference: [API Documentation](API.md)

For additional deployment support, check the platform-specific documentation and community resources.