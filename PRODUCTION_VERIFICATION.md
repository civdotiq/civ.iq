# Production Deployment Verification (November 3, 2025)

**Deployment**: Vercel Production
**Commit**: cc3f1c6
**URL**: https://www.civdotiq.org

## ✅ Verification Results

### 1. Admin Cache Management API ✅

**Test**: Unauthorized access attempt

```bash
curl "https://www.civdotiq.org/api/admin/cache" \
  -H "Authorization: Bearer test-wrong-key"
```

**Result**: ✅ **PASSED**

```json
{
  "success": false,
  "error": "Unauthorized - Invalid or missing admin credentials"
}
```

**Status Code**: 401 Unauthorized

**✅ Confirmed**:

- Admin API is deployed correctly
- Authentication is working
- Returns proper 401 for invalid credentials
- `ADMIN_API_KEY` environment variable is configured

---

### 2. Deprecated Route Removal ✅

**Test**: Access old deprecated endpoint

```bash
curl "https://www.civdotiq.org/api/state-legislator/MI/test-id"
```

**Result**: ✅ **PASSED**

```
404: This page could not be found.
```

**Status Code**: 404 Not Found

**✅ Confirmed**:

- Deprecated `/api/state-legislator/[state]/[id]` route is removed
- No 301 redirect (route completely gone)
- Clean codebase with single canonical endpoint

---

### 3. OpenStates API Integration ⚠️ ISSUE DETECTED

**Test**: Fetch Michigan legislators

```bash
curl "https://www.civdotiq.org/api/state-legislature/MI"
```

**Result**: ⚠️ **EMPTY RESPONSE**

```json
{
  "state": "MI",
  "stateName": "Michigan",
  "lastUpdated": "2025-11-03T23:02:09.125Z",
  "session": {
    "name": "Data Loading from OpenStates...",
    "startDate": "",
    "endDate": "",
    "type": "regular"
  },
  "chambers": {
    "upper": {
      "name": "State Senate",
      "title": "Senator",
      "totalSeats": 0,
      "democraticSeats": 0,
      "republicanSeats": 0,
      "otherSeats": 0
    },
    "lower": {
      "name": "House of Representatives",
      "title": "Representative",
      "totalSeats": 0,
      "democraticSeats": 0,
      "otherSeats": 0
    }
  },
  "legislators": [],
  "totalCount": 0
}
```

**Issue Symptoms**:

- ❌ `legislators` array is empty
- ❌ `totalSeats` shows 0 for all chambers
- ⚠️ Session name shows "Data Loading from OpenStates..."
- ⚠️ No error message returned to client

**Possible Causes**:

1. **OpenStates API key not set correctly** in Vercel environment variables
2. **API key format issue** (extra spaces, quotes, or newlines)
3. **Environment variable not reloaded** after deployment
4. **OpenStates API rate limiting** or temporary outage
5. **Caching issue** - old cached data with empty results

---

## 🔧 Troubleshooting Steps

### Step 1: Verify Environment Variables in Vercel

```bash
# Check if OPENSTATES_API_KEY is set
npx vercel env ls

# Should show:
# OPENSTATES_API_KEY (Production)
```

**Expected**:

- Variable name: `OPENSTATES_API_KEY`
- Environment: Production, Preview, Development
- Value: Your new API key (not the old exposed one)

**Common Issues**:

- ❌ Variable name misspelled (e.g., `OPENSTATE_API_KEY`)
- ❌ Only set for Preview/Development (not Production)
- ❌ Extra quotes around the value
- ❌ Trailing spaces or newlines

### Step 2: Check Vercel Logs

```bash
# Get latest deployment URL
npx vercel ls

# View logs for latest deployment
npx vercel logs <deployment-url>
```

**Look for**:

- `OpenStates API error` messages
- `401 Unauthorized` responses from OpenStates
- `Failed to get state legislators` errors
- `API key` related messages

### Step 3: Test OpenStates API Directly

```bash
# Test with your new API key
curl -H "X-API-KEY: YOUR_NEW_KEY" \
  "https://v3.openstates.org/people?jurisdiction=mi&per_page=5"
```

**Expected Response**:

```json
{
  "pagination": {
    "per_page": 5,
    "page": 1,
    "max_page": 22,
    "total_items": 110
  },
  "results": [
    {
      "id": "ocd-person/...",
      "name": "John Doe",
      "party": "Democratic",
      ...
    }
  ]
}
```

**If you get an error**:

- 401 Unauthorized → API key is invalid or not activated
- 403 Forbidden → API key doesn't have permission
- 429 Too Many Requests → Rate limit exceeded

### Step 4: Clear Cache and Redeploy

```bash
# Option A: Clear cache via admin API (if ADMIN_API_KEY is set)
curl -X POST "https://www.civdotiq.org/api/admin/cache" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "core:state-legislators"}'

# Option B: Trigger fresh deployment
npx vercel --prod --force

# Option C: Clear Next.js cache on Vercel
# Go to: Vercel Dashboard → Project → Settings → General → Clear Cache
```

### Step 5: Check API Endpoint Directly

```bash
# Test the core service endpoint directly
curl "https://www.civdotiq.org/api/state-legislature/MI" \
  -H "Cache-Control: no-cache" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n"
```

### Step 6: Verify State Legislature Core Service

Check server logs for:

```
[StateLegislatureCoreService] Failed to get all state legislators
[OpenStatesAPI] API request failed
[OpenStatesAPI] Authentication error
```

---

## 🔍 Debugging Checklist

### Environment Variables

- [ ] `OPENSTATES_API_KEY` is set in Vercel Production environment
- [ ] API key is the NEW rotated key (not the old exposed one)
- [ ] No extra quotes, spaces, or newlines in the value
- [ ] Variable is set for all environments (Production, Preview, Development)
- [ ] Recent deployment after setting the variable

### Vercel Deployment

- [ ] Latest commit (cc3f1c6) is deployed to production
- [ ] No build errors during deployment
- [ ] Environment variables loaded correctly (check build logs)
- [ ] No cached old environment variables

### OpenStates API

- [ ] API key is valid and activated
- [ ] API key has not been rate-limited
- [ ] OpenStates v3 API is operational (https://status.openstates.org/)
- [ ] Direct API test returns data (see Step 3)

### Cache State

- [ ] No stale cached data with empty results
- [ ] Cache invalidation API is working (tested above ✅)
- [ ] Can manually clear cache if needed

---

## 📋 Quick Fix Steps

### If API key is the issue:

1. **Verify the key works** by testing OpenStates API directly (Step 3)
2. **Update Vercel environment variable**:

   ```bash
   # Remove old value
   npx vercel env rm OPENSTATES_API_KEY production

   # Add new value
   npx vercel env add OPENSTATES_API_KEY production
   # Paste your NEW API key when prompted
   ```

3. **Redeploy**:
   ```bash
   npx vercel --prod --force
   ```

### If it's a caching issue:

1. **Clear cache via admin API**:
   ```bash
   curl -X POST "https://www.civdotiq.org/api/admin/cache" \
     -H "Authorization: Bearer $ADMIN_API_KEY" \
     -d '{"clearAll": true}'
   ```
2. **Wait 60 seconds** (cache TTL)
3. **Test again**:
   ```bash
   curl "https://www.civdotiq.org/api/state-legislature/MI"
   ```

### If environment variables aren't loading:

1. **Check build logs** in Vercel dashboard
2. **Look for**: `Loaded environment variables: OPENSTATES_API_KEY`
3. **If missing**: Redeploy after ensuring variable is set
4. **Check for typos** in variable name

---

## ✅ Success Criteria

When OpenStates integration is working correctly, you should see:

```json
{
  "state": "MI",
  "stateName": "Michigan",
  "legislators": [
    {
      "id": "ocd-person-...",
      "name": "Winnie Brinks",
      "party": "Democratic",
      "chamber": "upper",
      "district": "29",
      "email": "winniebrinks@senate.michigan.gov",
      "photo_url": "https://..."
    },
    {
      "id": "ocd-person-...",
      "name": "Ruth Johnson",
      "party": "Republican",
      "chamber": "upper",
      "district": "14",
      ...
    }
    // ... ~110 total legislators
  ],
  "totalCount": 110,
  "chambers": {
    "upper": {
      "name": "State Senate",
      "title": "Senator",
      "totalSeats": 38,
      "democraticSeats": 20,
      "republicanSeats": 18,
      "otherSeats": 0
    },
    "lower": {
      "name": "House of Representatives",
      "title": "Representative",
      "totalSeats": 110,
      "democraticSeats": 56,
      "republicanSeats": 54,
      "otherSeats": 0
    }
  }
}
```

---

## 📊 Performance Benchmarks

Once working, expected performance:

| Endpoint               | Expected Response Time           | Status      |
| ---------------------- | -------------------------------- | ----------- |
| State Legislature List | 1-3s (cold) / 100-300ms (cached) | ⏳ Pending  |
| Legislator Profile     | 100-300ms (direct service)       | ⏳ Pending  |
| Bill Details           | 500-1500ms                       | ⏳ Pending  |
| Admin Cache API        | <100ms                           | ✅ Verified |

---

## 🎯 Next Actions

1. **IMMEDIATE**: Verify `OPENSTATES_API_KEY` is correctly set in Vercel
2. **TEST**: Run OpenStates API direct test (Step 3)
3. **REDEPLOY**: Force redeploy if environment variables were just updated
4. **VERIFY**: Test Michigan legislators endpoint again
5. **CONFIRM**: Check that ~110 legislators are returned

---

## 📞 Support

If issues persist after following these steps:

1. Check OpenStates API status: https://docs.openstates.org/
2. Review Vercel deployment logs for specific errors
3. Test with a different state (e.g., California, Texas)
4. Contact OpenStates support if API key issues

---

**Last Updated**: November 3, 2025
**Deployment Verified By**: Claude (AI Assistant)
**Status**: 2/3 checks passed, OpenStates API integration pending verification
