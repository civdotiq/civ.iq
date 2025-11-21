# Upstash Redis Setup - Current Status

**Date**: October 14, 2025
**Status**: ⚠️ Configured but needs verification

---

## ✅ Completed Steps

### 1. Upstash Account & Database

- ✅ Created Upstash Redis database
- ✅ Instance: `teaching-seahorse-24590.upstash.io`
- ✅ Region: US East
- ✅ Connection URL obtained

### 2. Local Environment Configuration

- ✅ Updated `.env.local` with:
  ```bash
  REDIS_URL=redis://default:AWAOAAIncDJmMjM4ZWExMTk0NDk0N2EzOTM4MDE1YTg0NDg5YWUxZnAyMjQ1OTA@teaching-seahorse-24590.upstash.io:6379
  CRON_SECRET=oF4CsdEUBhQMaNcsG+yYOPmaM1VXQ/Sgc3uCD1ytInM=
  ```
- ✅ Removed old variables: `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`

### 3. Vercel Environment Variables

- ✅ Added `REDIS_URL` to: Production, Preview, Development
- ✅ Added `CRON_SECRET` to: Production
- ✅ Removed old Redis variables from Vercel

### 4. Code Fixes & Deployment

- ✅ Fixed TypeScript error in `DonationSourcesChart.tsx` (added index signature)
- ✅ Committed and pushed to GitHub
- ✅ Vercel auto-deployment triggered

---

## ⚠️ Current Issue: Redis Not Connecting

**Observed Behavior:**

```json
{
  "isConnected": false,
  "redisStatus": "connecting",
  "redundancy": "fallback-only"
}
```

### Possible Causes:

1. **TLS/SSL Issue**: Upstash requires TLS, but the connection string might need `rediss://` (with double 's')
2. **Environment Variable Not Picked Up**: Vercel might be caching old environment
3. **Redis Client Configuration**: May need explicit TLS options in code
4. **Network Issue**: Vercel → Upstash connection blocked

---

## 🔧 Troubleshooting Steps

### Option 1: Try TLS URL Format

Update REDIS_URL to use `rediss://` (note the double 's'):

```bash
# Remove old URL
npx vercel env rm REDIS_URL production --yes

# Add with TLS protocol
echo "rediss://default:AWAOAAIncDJmMjM4ZWExMTk0NDk0N2EzOTM4MDE1YTg0NDg5YWUxZnAyMjQ1OTA@teaching-seahorse-24590.upstash.io:6379" | npx vercel env add REDIS_URL production

# Do same for preview and development
```

### Option 2: Use Upstash REST API Instead

Upstash provides a REST API that works better with serverless:

1. Get REST URL from Upstash dashboard:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

2. Update Redis client to use `@upstash/redis` package:

   ```bash
   npm install @upstash/redis
   ```

3. Update `src/lib/cache/redis-client.ts` to use REST client

### Option 3: Verify Upstash Dashboard

1. Go to: https://console.upstash.io/
2. Check database status (should be "Active")
3. Look at "Details" tab for correct connection strings
4. Check "Logs" tab for connection attempts from Vercel

---

## 📋 Verification Checklist

Run these commands after fixing the connection issue:

### 1. Check Redis Connection

```bash
curl https://www.civdotiq.org/api/cache/status
# Expected: "isConnected": true, "redisStatus": "ready"
```

### 2. Trigger RSS Aggregator

```bash
curl -X POST https://www.civdotiq.org/api/cron/rss-aggregator \
  -H "Authorization: Bearer oF4CsdEUBhQMaNcsG+yYOPmaM1VXQ/Sgc3uCD1ytInM="
# Expected: {"success": true, "totalArticlesStored": 5000+}
```

### 3. Verify Google News

```bash
curl https://www.civdotiq.org/api/representative/K000367/news | grep dataSource
# Expected: "dataSource":"google-news" (NOT "gdelt")
```

---

## 🎯 Recommended Next Steps

1. **Try TLS URL first** (Option 1 above) - quickest fix
2. If that doesn't work, **switch to Upstash REST API** (Option 2) - more reliable for serverless
3. **Check Upstash dashboard** for connection logs

---

## 📝 Your Credentials (Keep Secure!)

```bash
# Upstash Redis URL (TCP with TLS)
redis://default:AWAOAAIncDJmMjM4ZWExMTk0NDk0N2EzOTM4MDE1YTg0NDg5YWUxZnAyMjQ1OTA@teaching-seahorse-24590.upstash.io:6379

# Or try with explicit TLS:
rediss://default:AWAOAAIncDJmMjM4ZWExMTk0NDk0N2EzOTM4MDE1YTg0NDg5YWUxZnAyMjQ1OTA@teaching-seahorse-24590.upstash.io:6379

# Cron Secret
CRON_SECRET=oF4CsdEUBhQMaNcsG+yYOPmaM1VXQ/Sgc3uCD1ytInM=

# Upstash Instance
teaching-seahorse-24590.upstash.io
```

---

## 📚 Resources

- **Upstash Console**: https://console.upstash.io/
- **Upstash Redis Docs**: https://docs.upstash.com/redis
- **Upstash + Vercel Guide**: https://docs.upstash.com/redis/howto/vercelintegration
- **Full Setup Guide**: `docs/deployment/UPSTASH_REDIS_SETUP.md`
- **Quick Reference**: `UPSTASH_QUICK_START.md`

---

## Summary

**What's Working:**

- ✅ Upstash database created
- ✅ Environment variables configured
- ✅ Code deployed successfully
- ✅ Application runs (fallback cache active)

**What Needs Fixing:**

- ❌ Redis connection not establishing
- ❌ Google News RSS not active (still using GDELT fallback)

**Most Likely Solution:**
Try the `rediss://` URL format (Option 1 above), or switch to Upstash REST API (recommended for Vercel serverless).
