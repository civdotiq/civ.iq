# Upstash Redis Setup - Quick Start

## 🎯 Problem

Production uses `localhost` Redis which doesn't work on Vercel → Falls back to GDELT instead of Google News RSS.

## ✅ Solution

Set up Upstash serverless Redis (free tier, 5 minutes)

---

## Quick Setup (5 Steps)

### 1️⃣ Create Upstash Database

- Go to: https://upstash.com/ → Sign up with GitHub
- Create database:
  - **Name**: `civiq-production`
  - **Region**: US East (N. Virginia)
  - **Type**: Regional
- Copy the **Redis URL**: `redis://default:PASSWORD@....upstash.io:6379`

### 2️⃣ Generate Cron Secret

```bash
openssl rand -base64 32
```

### 3️⃣ Update Vercel Environment Variables

**Go to**: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

**Add**:
| Variable | Value | Environment |
|----------|-------|-------------|
| `REDIS_URL` | `redis://default:...` | Production, Preview, Development |
| `CRON_SECRET` | `<your-secret>` | Production |

**Remove**:

- ❌ `REDIS_HOST`
- ❌ `REDIS_PORT`
- ❌ `REDIS_DB`

### 4️⃣ Update Local `.env.local`

```bash
# Remove old variables
REDIS_HOST=...  # DELETE THIS
REDIS_PORT=...  # DELETE THIS
REDIS_DB=...    # DELETE THIS

# Add new
REDIS_URL=redis://default:PASSWORD@....upstash.io:6379
CRON_SECRET=your-generated-secret
```

### 5️⃣ Deploy

```bash
git push origin main
# Vercel will auto-deploy
```

---

## Verification (3 Steps)

### ✅ Check 1: Cache Status

```bash
curl https://www.civdotiq.org/api/cache/status

# Should show:
# "isConnected": true
# "redisStatus": "ready"
```

### ✅ Check 2: Trigger RSS Aggregator

```bash
curl -X POST https://www.civdotiq.org/api/cron/rss-aggregator \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Should show:
# "success": true
# "totalArticlesStored": 5000+
```

### ✅ Check 3: Verify Google News

```bash
curl https://www.civdotiq.org/api/representative/K000367/news

# Should show:
# "dataSource": "google-news"  ← Not "gdelt"!
# "cacheStatus": "RSS news data from Google News feeds"
```

---

## Automated Setup Script

```bash
# Run from project root
./scripts/setup-upstash-redis.sh
```

This script will:

1. Guide you through Upstash setup
2. Update `.env.local`
3. Configure Vercel environment variables
4. Deploy to production

---

## Cost

**Free Tier** (sufficient for our needs):

- 256 MB storage
- 10,000 commands/day
- 200 MB bandwidth/day

**Our usage**: ~50 MB, ~1-2K commands/day → **$0/month**

---

## Troubleshooting

### Issue: Still seeing `"dataSource": "gdelt"`

**Cause**: RSS aggregator hasn't run yet or cache expired

**Fix**:

```bash
# Manually trigger aggregator
curl -X POST https://www.civdotiq.org/api/cron/rss-aggregator \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Wait 30 seconds, then test again
```

### Issue: Cron returns 401 Unauthorized

**Fix**: Make sure `CRON_SECRET` is set in Vercel Production environment

### Issue: Redis connection failed

**Fix**:

1. Check `REDIS_URL` format is correct
2. Verify Upstash database is active (not paused)
3. Check Upstash dashboard for connection logs

---

## Documentation

- **Full Setup Guide**: `docs/deployment/UPSTASH_REDIS_SETUP.md`
- **Upstash Docs**: https://docs.upstash.com/redis
- **Vercel Cron Docs**: https://vercel.com/docs/cron-jobs

---

## Support

Questions? Check:

1. Full documentation in `docs/deployment/UPSTASH_REDIS_SETUP.md`
2. Upstash dashboard for Redis logs
3. Vercel deployment logs for cron execution
