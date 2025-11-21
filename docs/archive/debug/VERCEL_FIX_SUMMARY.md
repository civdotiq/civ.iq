# Vercel Deployment Fix - Summary

**Date**: October 3, 2025
**Deployment URL**: https://www.civdotiq.org
**Issue**: Routing and data loading failures on Vercel production

## 🔴 Problems Identified

1. **Client-side API URLs were relative** - `TabsEnhanced.tsx` used relative URLs like `/api/representative/...` which worked locally but failed on Vercel due to incorrect base URL resolution
2. **Missing NEXT_PUBLIC_APP_URL usage** - Client-side code didn't leverage the environment variable for API calls
3. **No error boundaries or detailed logging** - API call failures had no visibility
4. **Dynamic routes lacked proper configuration** - Missing runtime exports and revalidation strategies
5. **Middleware potentially blocking requests** - Edge runtime middleware running on all routes including APIs

## ✅ Solutions Implemented

### 1. Fixed Client-Side Data Fetching (`TabsEnhanced.tsx`)

**File**: `src/app/(civic)/representative/[bioguideId]/TabsEnhanced.tsx`

**Changes**:

- Added `getBaseUrl()` helper function that:
  - Prioritizes `process.env.NEXT_PUBLIC_APP_URL` (Vercel production)
  - Falls back to `window.location.origin` (local development)
- Updated all API fetch URLs to use full URLs: `${baseUrl}/api/...`
- Added enhanced error logging with detailed context:
  ```typescript
  console.error('❌ API failed:', {
    url,
    status,
    statusText,
    errorBody,
    baseUrl,
    bioguideId,
  });
  ```
- Added 30-second timeout to prevent hanging requests

**Lines Changed**: 423-586

### 2. Enhanced Dynamic Route Configuration (`page.tsx`)

**File**: `src/app/(civic)/representative/[bioguideId]/page.tsx`

**Changes**:

- Added `export const runtime = 'nodejs'` - ensures Node.js runtime on Vercel
- Added `export const revalidate = 3600` - ISR with 1-hour revalidation
- Kept `export const dynamic = 'force-dynamic'` for dynamic rendering

**Lines Changed**: 14-16

### 3. Created Diagnostic API Route

**File**: `src/app/api/debug/route.ts` (NEW)

**Features**:

- Tests all critical endpoints (representative, votes, bills, finance)
- Reports environment variables status
- Measures response times
- Returns detailed recommendations
- Configured in `vercel.json` with 512MB memory and 30s timeout

**Usage**: `GET /api/debug`

### 4. Created Test Page for Vercel Validation

**File**: `src/app/test-vercel/page.tsx` (NEW)

**Features**:

- Interactive test suite for all API endpoints
- Real-time pass/fail indicators
- Response time measurements
- Data validation checks
- Troubleshooting recommendations
- Environment info display

**Usage**: Visit `/test-vercel` on production

### 5. Updated Vercel Configuration

**File**: `vercel.json`

**Changes**:

- Added debug route configuration:
  ```json
  "src/app/api/debug/route.ts": {
    "memory": 512,
    "maxDuration": 30
  }
  ```

## 📋 Deployment Checklist

Before deploying to Vercel, ensure:

- [ ] `NEXT_PUBLIC_APP_URL=https://www.civdotiq.org` is set in Vercel environment variables
- [ ] All API keys are configured:
  - [ ] `CONGRESS_API_KEY`
  - [ ] `FEC_API_KEY`
  - [ ] `CENSUS_API_KEY`
  - [ ] `OPENSTATES_API_KEY`
- [ ] Run local build test: `npm run build`
- [ ] All TypeScript checks pass: `npm run type-check`

## 🧪 Testing After Deployment

### 1. Run Diagnostic API

```bash
curl https://www.civdotiq.org/api/debug | jq '.success, .summary'
```

Expected: `success: true` and `allApisWorking: true`

### 2. Visit Test Page

Navigate to: https://www.civdotiq.org/test-vercel

Run all tests and verify:

- ✅ All endpoints return 200
- ✅ All endpoints return data
- ✅ Response times < 5 seconds

### 3. Manual Representative Profile Test

Visit: https://www.civdotiq.org/representative/S000033 (Bernie Sanders)

Verify:

- Page loads without 404
- Tabs (Bills, Votes, Finance) populate with data
- No console errors in browser DevTools

## 🔑 Critical Environment Variables

### Production (Vercel)

```bash
NEXT_PUBLIC_APP_URL=https://www.civdotiq.org
CONGRESS_API_KEY=[your key]
FEC_API_KEY=[your key]
CENSUS_API_KEY=[your key]
```

### Local Development

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

(or omit - will use `window.location.origin`)

## 🐛 Troubleshooting Guide

### If representative pages return 404:

1. Check Vercel function logs for errors
2. Verify `NEXT_PUBLIC_APP_URL` is set correctly
3. Check if dynamic route is being statically generated (should not be with `force-dynamic`)

### If tabs don't populate:

1. Open browser DevTools console
2. Look for API fetch errors with full context
3. Check if URLs are correct (should be full URLs, not relative)
4. Verify API keys are set in Vercel

### If API responses are slow:

1. Check `/api/debug` for response times
2. Increase `maxDuration` in `vercel.json` if needed
3. Review function logs for timeout errors

## 📊 Files Modified

| File                                                           | Changes                                     | Purpose                         |
| -------------------------------------------------------------- | ------------------------------------------- | ------------------------------- |
| `src/app/(civic)/representative/[bioguideId]/TabsEnhanced.tsx` | Added base URL resolution, enhanced logging | Fix client-side API calls       |
| `src/app/(civic)/representative/[bioguideId]/page.tsx`         | Added runtime and revalidate exports        | Proper Vercel serverless config |
| `src/app/api/debug/route.ts`                                   | **NEW**                                     | Diagnostic endpoint             |
| `src/app/test-vercel/page.tsx`                                 | **NEW**                                     | Test suite page                 |
| `vercel.json`                                                  | Added debug route config                    | Vercel function optimization    |

## 🎯 Expected Outcomes

After deployment:

1. **All representative profile pages load** - No 404 errors
2. **All tabs populate with data** - Bills, Votes, Finance show real data
3. **Consistent behavior** - Production matches local development
4. **Detailed error logging** - Easy debugging via browser console and Vercel logs
5. **Performance monitoring** - Response times visible in logs and test page

## 📝 Next Steps

1. Deploy to Vercel: `git push origin main` or `vercel --prod`
2. Wait for deployment to complete
3. Run `/api/debug` to verify all systems
4. Visit `/test-vercel` to run full test suite
5. Test representative profiles manually
6. Monitor Vercel function logs for any errors

## 🔗 Related Documentation

- Vercel Serverless Functions: https://vercel.com/docs/functions/serverless-functions
- Next.js Dynamic Routes: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
- Next.js Runtime Configuration: https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes

---

**Status**: ✅ All fixes implemented and tested locally
**Ready for Deployment**: Yes
**Estimated Fix Impact**: High - Should resolve all routing and data loading issues
