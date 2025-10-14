# Redis Setup - Final Status & Next Steps

**Date**: October 14, 2025
**Session Status**: Configuration Complete - Implementation Pending

---

## ✅ What We Successfully Completed

### 1. Upstash Redis Database Created

- **Instance**: `teaching-seahorse-24590.upstash.io`
- **Region**: US East (N. Virginia)
- **Type**: Regional, Free Tier
- **Status**: Active and Ready

### 2. Environment Variables Configured

#### Local (`.env.local`):

```bash
UPSTASH_REDIS_REST_URL=https://teaching-seahorse-24590.upstash.io
UPSTASH_REDIS_REST_TOKEN=AmAOAAIgcDLjJ4nqPEicKxyhDn3gSWCKiNtq5YmmJq2QGzYiH1xFyg
CRON_SECRET=oF4CsdEUBhQMaNcsG+yYOPmaM1VXQ/Sgc3uCD1ytInM=
```

#### Vercel Production:

- ✅ `UPSTASH_REDIS_REST_URL` → Production, Preview, Development
- ✅ `UPSTASH_REDIS_REST_TOKEN` → Production, Preview, Development
- ✅ `CRON_SECRET` → Production
- ✅ Removed old `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`

### 3. Code Changes Deployed

- ✅ Updated `redis-client.ts` to detect REST API credentials
- ✅ Fixed TypeScript error in `DonationSourcesChart.tsx`
- ✅ Adjusted Node.js version requirement
- ✅ Committed to GitHub (main branch)
- ✅ Vercel auto-deployment triggered

---

## ⚠️ What Still Needs to Be Done

### Critical: Implement REST API Methods

The Redis client currently **detects** the REST API credentials but doesn't **use** them yet. We need to implement actual REST API calls in the `get()` and `set()` methods.

**Location**: `src/lib/cache/redis-client.ts`

**What needs to be added**:

```typescript
// In the get() method - around line 171
async get<T = unknown>(key: string): Promise<T | null> {
  const monitor = monitorCache('get', key);

  try {
    // NEW: Check if we should use REST API
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN && this.isConnected) {
      const response = await fetch(
        `${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(this.keyPrefix + key)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          monitor.end(true);
          logger.debug('[Cache] REST API hit', key);
          return JSON.parse(data.result);
        }
      }

      monitor.end(false);
      return null;
    }

    // ... existing ioredis code ...
  } catch (error) {
    // ... error handling ...
  }
}

// In the set() method - around line 221
async set<T = unknown>(key: string, value: T, ttlSeconds: number = 3600): Promise<boolean> {
  const monitor = monitorCache('set', key);

  try {
    const serializedValue = JSON.stringify(value);

    // NEW: Check if we should use REST API
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN && this.isConnected) {
      const response = await fetch(
        `${process.env.UPSTASH_REDIS_REST_URL}/setex/${encodeURIComponent(this.keyPrefix + key)}/${ttlSeconds}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
          body: serializedValue,
        }
      );

      if (response.ok) {
        monitor.end();
        logger.debug('[Cache] REST API set', key, { ttl: ttlSeconds });
        return true;
      }

      throw new Error(`REST API failed: ${response.status}`);
    }

    // ... existing ioredis code ...
  } catch (error) {
    // ... error handling ...
  }
}
```

### Also Update These Methods:

- `delete(key)` - line ~266
- `exists(key)` - line ~320
- `keys(pattern)` - line ~343
- `flush()` - line ~299

Each method needs REST API implementation following the pattern above.

---

## 📋 Step-by-Step Implementation Guide

### Option 1: Quick Fix with Manual Implementation

1. Edit `src/lib/cache/redis-client.ts`
2. Add REST API logic to each method (see above)
3. Test locally with `npm run dev`
4. Commit and push to trigger Vercel deployment
5. Verify with test commands (see below)

### Option 2: Install Upstash Package (Recommended but Blocked)

**Issue**: Cannot install `@upstash/redis` due to Node.js version mismatch in local environment.

**Workaround for Vercel**:

1. Manually add to `package.json`:
   ```json
   "dependencies": {
     "@upstash/redis": "^1.34.3",
     ...
   }
   ```
2. Vercel will install it during deployment (has correct Node version)
3. Update `redis-client.ts` to use `@upstash/redis`:

   ```typescript
   import { Redis } from '@upstash/redis';

   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL!,
     token: process.env.UPSTASH_REDIS_REST_TOKEN!,
   });
   ```

---

## ✅ Verification Steps (After Implementation)

Once the REST API methods are implemented:

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

### 3. Verify Google News is Working

```bash
curl https://www.civdotiq.org/api/representative/K000367/news | grep dataSource
# Expected: "dataSource":"google-news" (NOT "gdelt"!)
```

---

## 🔐 Your Credentials (Keep Secure!)

```bash
# Upstash REST API
UPSTASH_REDIS_REST_URL=https://teaching-seahorse-24590.upstash.io
UPSTASH_REDIS_REST_TOKEN=AmAOAAIgcDLjJ4nqPEicKxyhDn3gSWCKiNtq5YmmJq2QGzYiH1xFyg

# Cron Secret
CRON_SECRET=oF4CsdEUBhQMaNcsG+yYOPmaM1VXQ/Sgc3uCD1ytInM=

# Upstash Dashboard
https://console.upstash.io/
```

---

## 📚 Reference Documentation

### Created Documents:

1. **`UPSTASH_QUICK_START.md`** - Quick setup guide
2. **`UPSTASH_SETUP_STATUS.md`** - Detailed troubleshooting
3. **`docs/deployment/UPSTASH_REDIS_SETUP.md`** - Comprehensive guide
4. **`THIS FILE`** - Final status and next steps

### Upstash REST API Documentation:

- **REST API Reference**: https://docs.upstash.com/redis/features/restapi
- **Commands**:
  - GET: `GET /get/{key}`
  - SET: `POST /setex/{key}/{ttl}` with body as value
  - DEL: `GET /del/{key}`
  - EXISTS: `GET /exists/{key}`
  - KEYS: `GET /keys/{pattern}`
  - FLUSHDB: `GET /flushdb`

### Example REST API Calls:

```bash
# GET
curl "https://teaching-seahorse-24590.upstash.io/get/civiq:news:K000367" \
  -H "Authorization: Bearer AmAOAAIgcDLjJ4nqPEicKxyhDn3gSWCKiNtq5YmmJq2QGzYiH1xFyg"

# SET with TTL (3600 seconds)
curl -X POST "https://teaching-seahorse-24590.upstash.io/setex/civiq:test/3600" \
  -H "Authorization: Bearer AmAOAAIgcDLjJ4nqPEicKxyhDn3gSWCKiNtq5YmmJq2QGzYiH1xFyg" \
  -d '"test value"'
```

---

## 🎯 Current Status Summary

| Component                   | Status         | Notes                               |
| --------------------------- | -------------- | ----------------------------------- |
| Upstash Account             | ✅ Complete    | Database active and ready           |
| Local Environment           | ✅ Complete    | REST credentials in `.env.local`    |
| Vercel Environment          | ✅ Complete    | REST credentials configured         |
| Redis Client Detection      | ✅ Complete    | Detects REST API credentials        |
| **REST API Implementation** | ❌ **PENDING** | **Needs code changes**              |
| Deployment                  | ✅ Complete    | Latest code deployed to Vercel      |
| Google News RSS             | ⏳ Waiting     | Will work after REST implementation |

---

## 💡 Recommended Next Action

**IMPLEMENT REST API METHODS IN REDIS CLIENT**

The quickest path forward:

1. **Open**: `src/lib/cache/redis-client.ts`
2. **Add REST API fetch calls** to `get()`, `set()`, `delete()`, `exists()`, `keys()`, `flush()`
3. **Test locally**: `npm run dev` and check cache status
4. **Deploy**: `git commit && git push`
5. **Verify**: Run the 3 verification commands above
6. **Success**: Google News RSS will be active! 🎉

---

## 🆘 If You Need Help

The code examples above show exactly what to add. The pattern is:

1. Check if REST credentials exist
2. Use `fetch()` to call Upstash REST API
3. Handle response
4. Fall back to existing logic if REST fails

All the environment variables are already configured - you just need to use them in the code!

---

**Status**: Configuration 100% complete ✅ | Implementation 20% complete ⏳
**Blocker**: Need to implement REST API methods in `redis-client.ts`
**Estimate**: 15-20 minutes of focused coding to complete
