# State Legislator Profile System - Complete Technical Guide

## Issue Summary

After entering an address and clicking on State Representatives tab, state legislators appear correctly. However, clicking on their profile cards results in a 404 error.

**Example URL**: `https://www.civdotiq.org/state-legislature/mi/legislator/b2NkLXBlcnNvbi9kYzZmZjljMC1mMmIxLTQzM2QtYTk2Yi0yOTJjZjA1YmNiNTA`

**Decoded Legislator ID**: `ocd-person/dc6ff9c0-f2b1-433d-a96b-292cf05bcb50`

---

## How the System Works: Complete Data Flow

### 1. **Address Lookup → State Legislators**

**Files**:

- Frontend: Search/results page (displays StateLegislatorCard components)
- API: `/src/app/api/state-legislators-by-address/route.ts`
- Service: `/src/services/state-legislators/address-to-legislators.service.ts`

**What happens**:

1. User enters address
2. Census Geocoder API converts address to state legislative districts
3. OpenStates API v3 fetches legislators for those districts
4. Legislators display as cards in the "State Representatives" tab

### 2. **Profile Card Link Generation**

**File**: `/src/features/representatives/components/StateLegislatorCard.tsx`

**Key code (lines 59-61)**:

```typescript
// Generate profile URL - Base64 encode the ID for URL safety
const base64Id = encodeBase64Url(legislator.id);
const profileUrl = `/state-legislature/${legislator.state.toLowerCase()}/legislator/${base64Id}`;
```

**What happens**:

- Legislator ID from OpenStates: `ocd-person/dc6ff9c0-f2b1-433d-a96b-292cf05bcb50`
- The slash `/` in the ID would break URL routing
- Solution: Base64 encode it → `b2NkLXBlcnNvbi9kYzZmZjljMC1mMmIxLTQzM2QtYTk2Yi0yOTJjZjA1YmNiNTA`
- Link becomes: `/state-legislature/mi/legislator/b2NkLXBlcnNvbi9kYzZmZjljMC1mMmIxLTQzM2QtYTk2Yi0yOTJjZjA1YmNiNTA`

### 3. **Base64 Encoding/Decoding Utility**

**File**: `/src/lib/url-encoding.ts`

**Functions**:

```typescript
encodeBase64Url(str: string): string
// Converts: ocd-person/dc6ff9c0-f2b1-433d-a96b-292cf05bcb50
// To: b2NkLXBlcnNvbi9kYzZmZjljMC1mMmIxLTQzM2QtYTk2Yi0yOTJjZjA1YmNiNTA

decodeBase64Url(str: string): string
// Reverses the process
```

**Why needed**:

- OpenCivic Data (OCD) IDs contain slashes: `ocd-person/[uuid]`
- Slashes break Next.js dynamic routing
- Base64 makes them URL-safe
- Works in both browser (client) and Node.js (server)

### 4. **Profile Page Component**

**File**: `/src/app/(civic)/state-legislature/[state]/legislator/[id]/page.tsx`

**Route**: `/state-legislature/[state]/legislator/[id]`

**Key code (lines 96-98)**:

```typescript
export default async function StateLegislatorPage({ params }: PageProps) {
  const { state, id } = await params;
  const legislatorId = decodeBase64Url(id); // Decode Base64 ID
  const legislator = await getLegislator(state, legislatorId);

  if (!legislator) {
    notFound(); // Returns 404
  }
  // ... render profile
}
```

**What happens**:

1. Next.js extracts `state` (e.g., "mi") and `id` (Base64 encoded) from URL
2. `decodeBase64Url(id)` converts back to original OCD ID
3. Calls `getLegislator()` to fetch data from API
4. If no legislator found → **404 error**

### 5. **API Endpoint**

**File**: `/src/app/api/state-legislature/[state]/legislator/[id]/route.ts`

**Route**: `GET /api/state-legislature/[state]/legislator/[id]`

**Key code (lines 27-46)**:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const { state, id } = await params;
  const legislatorId = decodeBase64Url(id); // Decode Base64 ID

  // Use StateLegislatureCoreService for direct access
  const legislator = await StateLegislatureCoreService.getStateLegislatorById(
    state.toUpperCase(),
    legislatorId
  );

  if (!legislator) {
    return NextResponse.json(
      { success: false, error: 'State legislator not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, legislator }, { status: 200 });
}
```

**What happens**:

1. Receives Base64-encoded ID from URL
2. Decodes it back to OCD format
3. Calls core service to fetch legislator data
4. Returns 404 if not found

### 6. **Core Service (Data Fetching)**

**File**: `/src/services/core/state-legislature-core.service.ts`

**Method**: `getStateLegislatorById(state: string, legislatorId: string)`

**Key code (lines 364-387)**:

```typescript
static async getStateLegislatorById(state: string, legislatorId: string): Promise<EnhancedStateLegislator | null> {
  // Check cache first
  const cached = await govCache.get<EnhancedStateLegislator>(cacheKey);
  if (cached) {
    return cached;
  }

  // Get all legislators and find specific one
  const allLegislators = await this.getAllStateLegislators(state);
  const legislator = allLegislators.find(leg => leg.id === legislatorId);

  if (legislator) {
    // Cache individual legislator
    await govCache.set(cacheKey, legislator, { ttl: 3600000 });
    return legislator;
  }

  return null; // Not found
}
```

**What happens**:

1. Checks cache for individual legislator
2. If not cached, fetches ALL legislators for the state from OpenStates API
3. Searches the list for matching ID
4. Caches result for 60 minutes
5. Returns `null` if not found → triggers 404

---

## Why You're Getting a 404: Possible Causes

### Theory 1: State Mismatch in Data Flow

**Hypothesis**: Legislator data from address lookup uses different state format than profile lookup

**Check**:

```javascript
// In StateLegislatorCard, state is lowercased:
const profileUrl = `/state-legislature/${legislator.state.toLowerCase()}/legislator/${base64Id}`;

// In API route, state is uppercased:
const legislator = await StateLegislatureCoreService.getStateLegislatorById(
  state.toUpperCase(),
  legislatorId
);
```

**Test**:

- Verify that `legislator.state` from address lookup returns "MI" or "mi"
- Verify that the URL constructed is `/state-legislature/mi/...` not `/state-legislature/MI/...`

### Theory 2: Legislator ID Format Mismatch

**Hypothesis**: The legislator ID stored during address lookup differs from what's expected during profile lookup

**Check**:

- Are all legislator IDs in OpenCivic Data format (`ocd-person/[uuid]`)?
- Could some legislators have different ID formats?

**Test**:

```bash
# On production, check what ID format is actually returned:
curl 'https://www.civdotiq.org/api/state-legislators-by-address?address=...' | jq '.data.legislators[].id'
```

### Theory 3: Cache/Build Issue (Production vs. Local)

**Hypothesis**: Production build may have stale cached routes or mismatched builds

**Check**:

- Is the production deployment using the latest code?
- Are all dynamic routes properly built?
- Is Next.js ISR/SSG causing issues?

**Test**:

- Check if `dynamic = 'force-dynamic'` is set in API route (it is at line 18)
- Verify production logs show the decoded legislator ID
- Test if clearing production cache fixes the issue

### Theory 4: Base64 Encoding/Decoding Issue

**Hypothesis**: Server-side and client-side Base64 implementations might differ

**Check**:

```typescript
// Server uses Buffer.from():
return Buffer.from(str, 'base64url').toString();

// Client uses atob():
return atob(base64);
```

**Test**:

- Manually decode the production URL's Base64 ID
- Compare with what the API receives
- Check production server logs for the decoded ID value

### Theory 5: OpenStates API Data Inconsistency

**Hypothesis**: The legislator exists in one OpenStates API call but not another

**Check**:

- Address lookup uses district-based query
- Profile lookup fetches ALL legislators then filters by ID
- These might return different datasets

**Test**:

```bash
# Fetch all MI legislators and check if the ID exists:
curl 'https://v3.openstates.org/people?jurisdiction=Michigan&per_page=500' \
  -H "X-API-Key: YOUR_KEY" | jq '.results[] | select(.id == "ocd-person/dc6ff9c0-f2b1-433d-a96b-292cf05bcb50")'
```

---

## Debugging Steps for Your Friend

### Step 1: Verify the Legislator ID in Address Response

```bash
# Test the address-to-legislators endpoint:
curl 'https://www.civdotiq.org/api/state-legislators-by-address?address=YOUR_ADDRESS_HERE' \
  | jq '.data.legislators[] | {id: .id, name: .name, state: .state}'
```

**Expected output**:

```json
{
  "id": "ocd-person/dc6ff9c0-f2b1-433d-a96b-292cf05bcb50",
  "name": "...",
  "state": "MI"
}
```

### Step 2: Manually Test the Profile API

```bash
# Decode the Base64 ID:
echo "b2NkLXBlcnNvbi9kYzZmZjljMC1mMmIxLTQzM2QtYTk2Yi0yOTJjZjA1YmNiNTA" | base64 -d
# Output: ocd-person/dc6ff9c0-f2b1-433d-a96b-292cf05bcb50

# Test the API with Base64-encoded ID:
curl 'https://www.civdotiq.org/api/state-legislature/mi/legislator/b2NkLXBlcnNvbi9kYzZmZjljMC1mMmIxLTQzM2QtYTk2Yi0yOTJjZjA1YmNiNTA'
```

**Expected**: Should return legislator data or specific error message

### Step 3: Check Production Server Logs

Add temporary logging to see what's happening:

**In `/src/app/api/state-legislature/[state]/legislator/[id]/route.ts`** (around line 28):

```typescript
const legislatorId = decodeBase64Url(id);
console.log('=== DEBUG: Profile API Request ===');
console.log('Encoded ID:', id);
console.log('Decoded ID:', legislatorId);
console.log('State:', state.toUpperCase());
```

**In `/src/services/core/state-legislature-core.service.ts`** (around line 386):

```typescript
const legislator = allLegislators.find(leg => leg.id === legislatorId);
console.log('=== DEBUG: Core Service Lookup ===');
console.log('Looking for ID:', legislatorId);
console.log('Total legislators:', allLegislators.length);
console.log(
  'All IDs:',
  allLegislators.map(l => l.id)
);
console.log('Found:', !!legislator);
```

Redeploy and check production logs (Vercel logs if using Vercel).

### Step 4: Verify OpenStates API Response

```bash
# Check if Michigan legislators include your target ID:
curl 'https://v3.openstates.org/people?jurisdiction=Michigan&per_page=500' \
  -H "X-API-Key: YOUR_OPENSTATES_KEY" \
  | jq '.results[].id' | grep "dc6ff9c0-f2b1-433d-a96b-292cf05bcb50"
```

### Step 5: Test Locally

```bash
# Start local dev server:
npm run dev

# Test the full flow:
# 1. Enter address
# 2. Click on state legislator card
# 3. Check browser DevTools → Network tab
# 4. Look for failed API requests
# 5. Check server console for errors
```

---

## Key Files Reference

| File                                                                  | Purpose                                     | Key Methods                                            |
| --------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| `/src/features/representatives/components/StateLegislatorCard.tsx`    | Renders legislator cards with profile links | `encodeBase64Url()` for URL generation                 |
| `/src/app/(civic)/state-legislature/[state]/legislator/[id]/page.tsx` | Profile page component                      | `decodeBase64Url()`, `getLegislator()`                 |
| `/src/app/api/state-legislature/[state]/legislator/[id]/route.ts`     | API endpoint for legislator data            | `decodeBase64Url()`, calls core service                |
| `/src/services/core/state-legislature-core.service.ts`                | Core data fetching logic                    | `getStateLegislatorById()`, `getAllStateLegislators()` |
| `/src/lib/url-encoding.ts`                                            | Base64 encoding utilities                   | `encodeBase64Url()`, `decodeBase64Url()`               |
| `/src/lib/openstates-api.ts`                                          | OpenStates API client                       | `getLegislators()`                                     |
| `/src/services/cache.ts`                                              | Caching layer                               | `govCache.get()`, `govCache.set()`                     |

---

## Environment Variables Required

```bash
# .env.local
OPENSTATES_API_KEY=your_key_here

# Production (Vercel)
NEXT_PUBLIC_BASE_URL=https://www.civdotiq.org
```

---

## Expected Behavior

1. ✅ Address lookup returns state legislators with OCD IDs
2. ✅ StateLegislatorCard displays with clickable link
3. ✅ Link contains Base64-encoded OCD ID
4. ✅ Profile page decodes ID and fetches from API
5. ✅ API decodes ID and queries core service
6. ✅ Core service fetches from OpenStates and returns data
7. ✅ Profile displays with legislator information

## Current Behavior

1. ✅ Address lookup returns state legislators
2. ✅ StateLegislatorCard displays
3. ✅ Link generated correctly
4. ❌ **404 Error** when clicking profile link

---

## 🎯 **ROOT CAUSE IDENTIFIED & FIXED**

### **The Bug**

In `/src/app/(civic)/state-legislature/[state]/legislator/[id]/page.tsx`, the code was:

```typescript
// ❌ WRONG - Decoding the ID and passing decoded version
const { state, id } = await params;
const legislatorId = decodeBase64Url(id); // Decodes: "b2Nk..." → "ocd-person/..."
const legislator = await getLegislator(state, legislatorId); // ❌ Passes decoded ID!
```

The `getLegislator` function constructs a URL like:

```typescript
const url = `${baseUrl}/api/state-legislature/${state}/legislator/${id}`;
// Becomes: /api/state-legislature/mi/legislator/ocd-person/dc6ff9c0-...
```

**Problem**: The slash in `ocd-person/` breaks Next.js dynamic routing! It interprets this as:

- `[state] = "mi"`
- `[id] = "ocd-person"`
- Extra unmatched segment: `dc6ff9c0-f2b1-433d-a96b-292cf05bcb50`

This doesn't match the route pattern `[state]/legislator/[id]`, causing a 404.

### **The Fix**

Pass the **Base64-encoded ID** to `getLegislator` (not the decoded version):

```typescript
// ✅ CORRECT - Pass Base64 ID (API route will decode it)
const { state, id } = await params;
const legislator = await getLegislator(state, id); // ✅ Passes Base64 ID!
```

Now the URL is correctly constructed:

```
/api/state-legislature/mi/legislator/b2NkLXBlcnNvbi9kYzZmZjljMC1mMmIxLTQzM2QtYTk2Yi0yOTJjZjA1YmNiNTA
```

The API route receives the Base64 ID and decodes it internally.

### **Changes Made**

**File**: `/src/app/(civic)/state-legislature/[state]/legislator/[id]/page.tsx`

1. **Line 63** (in `generateMetadata`): Changed `getLegislator(state, legislatorId)` → `getLegislator(state, id)`
2. **Line 98** (in `StateLegislatorPage`): Changed `getLegislator(state, legislatorId)` → `getLegislator(state, id)`
3. **Line 101**: Moved `decodeBase64Url(id)` inside the error block (only decode for logging)

### **Why This Works**

The data flow is now correct:

1. ✅ Page receives Base64 `id` from URL params
2. ✅ Page passes Base64 `id` to `getLegislator()`
3. ✅ `getLegislator()` constructs clean URL: `/api/.../legislator/b2NkLX...`
4. ✅ Next.js routing works correctly
5. ✅ API route receives Base64 `id`
6. ✅ API route decodes to OCD format and queries service
7. ✅ Profile displays successfully

---

## Testing the Fix

### Local Testing:

```bash
npm run type-check  # ✅ Passes
npm run dev         # Start dev server
# Navigate to address search → Click state legislator → Should work!
```

### Production Testing:

1. Commit and push the fix
2. Deploy to Vercel
3. Test the same URL that was 404ing:
   `https://www.civdotiq.org/state-legislature/mi/legislator/b2NkLXBlcnNvbi9kYzZmZjljMC1mMmIxLTQzM2QtYTk2Yi0yOTJjZjA1YmNiNTA`
4. Should now display the legislator profile correctly!

---

## Debugging Steps (No Longer Needed)

The previous debugging steps were designed to identify this exact issue. The fix has been applied, so debug logging is no longer necessary unless the issue persists after deployment.
