# Upstash Redis Setup for Vercel Deployment

## Problem Statement

The current production deployment uses `localhost` Redis configuration:

- `REDIS_HOST=127.0.0.1`
- `REDIS_PORT=6379`

This doesn't work on Vercel's serverless architecture, preventing:

- ✗ Google News RSS caching
- ✗ RSS aggregator cron job functionality
- ✗ Persistent caching across serverless invocations

**Result**: The application falls back to GDELT instead of using Google News RSS feeds.

## Solution: Upstash Redis

Upstash provides serverless Redis that works perfectly with Vercel's edge network.

---

## Step-by-Step Setup Guide

### 1. Create Upstash Account

1. Go to [https://upstash.com/](https://upstash.com/)
2. Click "Sign Up" and authenticate with GitHub (recommended for Vercel integration)
3. Verify your email if required

### 2. Create Redis Database

1. From the Upstash dashboard, click **"Create Database"**
2. Configure your database:
   - **Name**: `civiq-production` (or your preferred name)
   - **Type**: Select **"Regional"** (cheaper, sufficient for our use)
   - **Region**: Choose **"US East (N. Virginia)"** to match Vercel region `iad1`
   - **TLS**: Keep enabled (default)
   - **Eviction**: Select **"noeviction"** (we want to keep cached data)

3. Click **"Create"**

### 3. Get Connection Details

After creating the database, you'll see the connection details:

```
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

You'll also see a **Redis URL** in this format:

```
redis://default:your-password@your-instance.upstash.io:6379
```

**Copy the Redis URL** - this is what we need for `REDIS_URL`.

### 4. Configure Vercel Environment Variables

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to [https://vercel.com/](https://vercel.com/)
2. Select your project (`civiq-4aog`)
3. Go to **Settings** → **Environment Variables**
4. Add/Update the following variables:

| Variable Name | Value                                                         | Environments                     |
| ------------- | ------------------------------------------------------------- | -------------------------------- |
| `REDIS_URL`   | `redis://default:your-password@your-instance.upstash.io:6379` | Production, Preview, Development |
| `CRON_SECRET` | `<generate-random-secret>`                                    | Production only                  |

**To generate CRON_SECRET:**

```bash
# On Linux/Mac
openssl rand -base64 32

# Or use online generator:
# https://www.random.org/passwords/?num=1&len=32&format=plain&rnd=new
```

5. **Remove old variables** (they're now redundant):
   - ❌ Remove `REDIS_HOST`
   - ❌ Remove `REDIS_PORT`
   - ❌ Remove `REDIS_DB`

6. Click **"Save"**

#### Option B: Using Vercel CLI

```bash
# From project root
npx vercel env add REDIS_URL production
# Paste your Redis URL when prompted

npx vercel env add REDIS_URL preview
# Paste the same Redis URL

npx vercel env add REDIS_URL development
# Paste the same Redis URL

# Add CRON_SECRET for production
npx vercel env add CRON_SECRET production
# Paste your generated secret

# Remove old variables
npx vercel env rm REDIS_HOST production
npx vercel env rm REDIS_PORT production
npx vercel env rm REDIS_DB production
```

### 5. Update Local Development Environment

Update your local `.env.local` file:

```bash
# Old configuration - REMOVE THESE
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379
# REDIS_DB=0

# New configuration - ADD THIS
REDIS_URL=redis://default:your-password@your-instance.upstash.io:6379

# Optional: Add for local cron testing
CRON_SECRET=your-generated-secret
```

**Important**: Make sure `.env.local` is in `.gitignore` (it already is).

### 6. Deploy Changes

```bash
# Trigger a new deployment
git commit --allow-empty -m "chore: trigger deployment with Upstash Redis"
git push origin main

# Or use Vercel CLI
npx vercel --prod
```

### 7. Verify Setup

#### A. Check Cache Status API

```bash
# Test cache connectivity
curl https://www.civdotiq.org/api/cache/status

# Expected response:
{
  "cache": {
    "isConnected": true,
    "redisAvailable": true,
    "redisStatus": "ready",
    "fallbackCacheSize": 0
  },
  "timestamp": "2025-10-14T..."
}
```

#### B. Manually Trigger RSS Aggregator

```bash
# Using CRON_SECRET
curl -X POST https://www.civdotiq.org/api/cron/rss-aggregator \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Expected response:
{
  "success": true,
  "message": "RSS aggregation completed successfully",
  "totalRepresentatives": 100,
  "successfulProcessing": 100,
  "totalArticlesStored": 5000,
  ...
}
```

#### C. Test News Endpoint

```bash
# Should now show Google News data
curl https://www.civdotiq.org/api/representative/K000367/news

# Look for:
{
  "dataSource": "google-news",
  "cacheStatus": "RSS news data from Google News feeds",
  ...
}
```

---

## Monitoring & Maintenance

### Upstash Dashboard Metrics

Monitor your Redis usage at [https://console.upstash.com/](https://console.upstash.com/):

- **Commands/sec**: Should see spikes during cron runs
- **Storage**: Should see ~50-100MB for RSS cache
- **Connections**: Should see connection attempts from Vercel

### Vercel Cron Logs

View cron execution logs:

```bash
npx vercel logs --follow | grep rss-aggregator
```

Or in Vercel dashboard:

1. Go to your project
2. Click **"Deployments"** → Select deployment
3. Click **"Functions"** → Find `api/cron/rss-aggregator`

### Cache Health Monitoring

The RSS aggregator tracks feed health in Redis:

- **Key pattern**: `feed_health:*`
- **TTL**: 7 days
- **Metrics**: Tracks consecutive failures, last success, HTTP status

Check feed health programmatically:

```typescript
import { getRedisCache } from '@/lib/cache/redis-client';

const cache = getRedisCache();
const healthKeys = await cache.keys('feed_health:*');
// Check each feed's health status
```

---

## Troubleshooting

### Issue: "Redis connection failed"

**Check**:

1. Verify `REDIS_URL` format is correct
2. Ensure Upstash database is active (not paused)
3. Check Upstash dashboard for connection attempts
4. Verify TLS is enabled (Upstash requires it)

**Test connection**:

```bash
# Using redis-cli
redis-cli -u "redis://default:password@your-instance.upstash.io:6379" PING
# Should return: PONG
```

### Issue: "Cron job returns 401 Unauthorized"

**Fix**: Ensure `CRON_SECRET` is set in Vercel environment variables for Production.

**Note**: Vercel automatically adds `authorization` header to cron requests with this secret.

### Issue: "RSS feeds not updating"

**Check**:

1. Verify cron schedule in `vercel.json`: `"0 6 * * *"` (6 AM daily)
2. Check cron execution in Vercel dashboard
3. Manually trigger cron to test: `POST /api/cron/rss-aggregator`
4. Check Upstash dashboard for write operations

### Issue: "Falls back to GDELT even with Redis"

**Possible causes**:

1. RSS aggregator hasn't run yet (scheduled for 6 AM)
2. Cache TTL expired (1 hour by default)
3. Redis connection issues

**Solution**:

```bash
# Manually trigger RSS aggregator
curl -X POST https://www.civdotiq.org/api/cron/rss-aggregator \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Wait ~30 seconds for processing
# Then test news endpoint
curl https://www.civdotiq.org/api/representative/K000367/news
```

---

## Cost Estimate

### Upstash Free Tier

- **Storage**: 256 MB (plenty for RSS cache)
- **Requests**: 10,000 commands/day
- **Bandwidth**: 200 MB/day

**Our Expected Usage**:

- Storage: ~50-100 MB (RSS articles for 435 representatives)
- Requests: ~1,000-2,000/day (well under limit)
- Cost: **$0/month** (within free tier)

### If We Exceed Free Tier

- **Pay-as-you-go**: $0.20 per 100K commands
- **Estimated**: Still likely $0-5/month

---

## Security Considerations

### ✅ Implemented Security

1. **TLS Encryption**: All Redis connections use TLS
2. **Authentication**: Redis URL includes password
3. **Cron Protection**: `CRON_SECRET` prevents unauthorized aggregator runs
4. **Environment Isolation**: Separate variables for dev/preview/production

### 🔒 Best Practices

1. **Rotate Credentials Periodically**:
   - Generate new Upstash password every 90 days
   - Update Vercel environment variables

2. **Monitor Access**:
   - Check Upstash dashboard for unusual activity
   - Set up Upstash alerts for high usage

3. **Backup Configuration**:
   - Document your Upstash database settings
   - Keep backup of Redis connection URL (encrypted)

---

## Migration Checklist

- [ ] Create Upstash account
- [ ] Create Redis database in US East region
- [ ] Copy Redis URL from Upstash dashboard
- [ ] Generate CRON_SECRET
- [ ] Add `REDIS_URL` to Vercel (Production, Preview, Development)
- [ ] Add `CRON_SECRET` to Vercel (Production only)
- [ ] Remove old `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` variables
- [ ] Update local `.env.local` with new `REDIS_URL`
- [ ] Deploy to Vercel
- [ ] Verify cache status: `/api/cache/status` shows `isConnected: true`
- [ ] Manually trigger RSS aggregator
- [ ] Verify news endpoint returns `dataSource: "google-news"`
- [ ] Monitor Upstash dashboard for activity
- [ ] Document credentials securely

---

## Support Resources

- **Upstash Docs**: https://docs.upstash.com/redis
- **Vercel Cron Docs**: https://vercel.com/docs/cron-jobs
- **Redis Client Docs**: https://github.com/luin/ioredis

---

## Implementation Status

**Current State**: Production uses `localhost` Redis (non-functional)

**After Setup**:

- ✅ Serverless Redis via Upstash
- ✅ Google News RSS caching enabled
- ✅ RSS aggregator cron functional
- ✅ Persistent caching across deployments
- ✅ Improved news quality (Google News > GDELT)

**Expected Impact**:

- News endpoint response time: **3s → 100ms** (cached)
- News source quality: **GDELT → Google News RSS**
- Cache persistence: **None → 1 hour TTL**
