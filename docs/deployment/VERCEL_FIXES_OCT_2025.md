# Vercel Deployment Fixes - October 2, 2025

## Summary

Analyzed and began fixing critical Vercel deployment issues for civic-intel-hub. The deployment was failing due to serverless incompatibilities and missing environment variables.

## Issues Identified

### 🔴 CRITICAL ISSUES

1. **File System Access in Serverless Functions**
   - **Problem**: 4 API routes use `fs` module which doesn't work in Vercel serverless
   - **Files Affected**:
     - ✅ `/api/district-boundaries/[districtId]/route.ts` - **FIXED**
     - ⚠️ `/api/districts/census-helpers.ts` - NEEDS FIX
     - ⚠️ `/api/congress/119th/stats/route.ts` - NEEDS FIX
     - ⚠️ `/api/district-boundaries/metadata/route.ts` - NEEDS FIX

2. **Missing Environment Variables**
   - **Impact**: 401 errors, API authentication failures
   - **Required in Vercel Dashboard**:
     - `CONGRESS_API_KEY`
     - `FEC_API_KEY`
     - `CENSUS_API_KEY`
     - `OPENSTATES_API_KEY`
     - `REDIS_URL` (for caching)

3. **Localhost References**
   - **Problem**: 29 files still have localhost:3000 hardcoded
   - **Status**: Partially fixed with `getServerBaseUrl()` utility

### 🟡 HIGH PRIORITY ISSUES

4. **Performance Issues**
   - News route: 886 lines (should be <200)
   - Vote cache: 15min TTL (should be 24hr)
   - No Edge runtime on lightweight routes

5. **Missing ISR Configuration**
   - District pages need `revalidate: 86400`
   - Committee pages need `revalidate: 86400`
   - Representative profiles need pre-rendering

## Fixes Implemented

### ✅ District Boundaries API (COMPLETE)

**File**: `src/app/api/district-boundaries/[districtId]/route.ts`

**Changes**:

1. Removed `fs` and `path` imports
2. Changed from filesystem to fetch() for static files
3. Updated `loadManifest()` to fetch from `/data/districts/manifest.json`
4. Updated file reading to fetch from public URLs
5. File size detection via Content-Length header

**Before** (Filesystem - ❌ Serverless Incompatible):

```typescript
import fs from 'fs/promises';
import path from 'path';

const manifestPath = path.join(process.cwd(), 'public/data/districts/manifest.json');
const manifestData = await fs.readFile(manifestPath, 'utf-8');
```

**After** (Fetch - ✅ Serverless Compatible):

```typescript
const manifestUrl = `${baseUrl}/data/districts/manifest.json`;
const response = await fetch(manifestUrl);
const manifest = await response.json();
```

**Testing**:

```bash
# Local test
curl http://localhost:3000/api/district-boundaries/CA-12

# Vercel test (after deployment)
curl https://civiq-4aog.vercel.app/api/district-boundaries/CA-12
```

## Remaining Fixes Needed

### Priority 1: Fix Remaining File System Access (2-3 hours)

1. **Census Helpers** (`/api/districts/census-helpers.ts`)
   - Move Census data to `/public/data/census/`
   - Use fetch() instead of `fs.readFile()`

2. **Congress Stats** (`/api/congress/119th/stats/route.ts`)
   - Move stats data to `/public/data/congress/`
   - Use fetch() instead of `fs.readFile()`

3. **Boundary Metadata** (`/api/district-boundaries/metadata/route.ts`)
   - Use fetch() for metadata files

### Priority 2: Environment Variables (30 min)

Add to Vercel Dashboard → Settings → Environment Variables:

```
CONGRESS_API_KEY=<your_key>
FEC_API_KEY=<your_key>
CENSUS_API_KEY=<your_key>
OPENSTATES_API_KEY=<your_key>
REDIS_URL=<vercel_kv_url>
NEXT_PUBLIC_SITE_URL=https://civiq-4aog.vercel.app
```

### Priority 3: Performance Optimizations (4-6 hours)

1. **Vote Caching** - Update TTL from 15min to 24hr

   ```typescript
   // In /api/representative/[bioguideId]/votes/route.ts
   await unifiedCache.set(cacheKey, enrichedVotes, {
     dataType: 'votes',
     ttl: 24 * 60 * 60 * 1000, // 24 hours (was 15 minutes)
   });
   ```

2. **Edge Runtime** - Add to lightweight routes

   ```typescript
   // In /api/health/route.ts, /api/cache/status/route.ts
   export const runtime = 'edge';
   export const dynamic = 'force-dynamic';
   ```

3. **ISR** - Add to static pages
   ```typescript
   // In districts/[districtId]/page.tsx
   export const revalidate = 86400; // 24 hours
   ```

## Testing Checklist

- [x] District boundaries route fixed
- [ ] All file system access removed
- [ ] Environment variables set
- [ ] Health endpoint returns 200
- [ ] Representative profile loads
- [ ] District maps render
- [ ] News articles display
- [ ] Vote records show

## Deployment Process

1. **Commit fixes**:

   ```bash
   git add .
   git commit -m "fix: resolve Vercel serverless incompatibilities"
   git push origin main
   ```

2. **Set environment variables** in Vercel Dashboard

3. **Monitor deployment**:

   ```bash
   npx vercel logs --follow
   ```

4. **Test endpoints**:
   ```bash
   curl https://civiq-4aog.vercel.app/api/health
   curl https://civiq-4aog.vercel.app/api/representative/K000367
   curl https://civiq-4aog.vercel.app/api/district-boundaries/CA-12
   ```

## Expected Results After All Fixes

- ✅ All API routes return 200 status
- ✅ District maps load successfully
- ✅ Representative profiles render
- ✅ News aggregation works
- ✅ Vote records display
- ✅ Response times: <500ms (cached), <5s (cold)

## Files Modified

- `src/app/api/district-boundaries/[districtId]/route.ts` (file system → fetch)

## Files Still Needing Modification

- `src/app/api/districts/census-helpers.ts`
- `src/app/api/congress/119th/stats/route.ts`
- `src/app/api/district-boundaries/metadata/route.ts`
- `src/app/api/representative/[bioguideId]/votes/route.ts` (cache TTL)
- `src/app/api/health/route.ts` (add edge runtime)
- `src/app/api/cache/status/route.ts` (add edge runtime)
- `src/app/(civic)/districts/[districtId]/page.tsx` (add ISR)
- `src/app/(civic)/committee/[committeeId]/page.tsx` (add ISR)

## Related Documentation

- [VERCEL_OPTIMIZATION_ROADMAP.md](./VERCEL_OPTIMIZATION_ROADMAP.md) - Full optimization plan
- [Vercel Functions Docs](https://vercel.com/docs/functions)
- [Next.js ISR Docs](https://nextjs.org/docs/pages/building-your-application/data-fetching/incremental-static-regeneration)

---

**Status**: Partial fixes implemented (1/4 file system issues resolved)
**Next Session**: Fix remaining file system access in census helpers and congress stats
**Estimated Time to Full Fix**: 6-8 hours
