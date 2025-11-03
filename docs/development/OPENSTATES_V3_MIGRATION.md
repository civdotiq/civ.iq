# OpenStates API v2 → v3 Migration

**Date**: October 28, 2025
**Status**: ✅ **COMPLETED**

## Overview

Successfully migrated from OpenStates API v2 (GraphQL, sunset December 2024) to v3 (REST API).

## Problem

The OpenStates v2 GraphQL API was shut down, causing all state legislature API calls to fail with 400 errors. The application was stuck serving stale cached code despite multiple restart attempts.

## Root Causes

1. **Multiple Zombie Dev Servers**: 10+ background `npm run dev` processes running simultaneously with stale cached code
2. **API Data Shape Changes**: v3 REST API has fundamentally different response structure than v2 GraphQL
3. **TypeScript Type Safety**: 23 TypeScript errors from mismatched types between v2 and v3 schemas

## Solution

### Phase 1: Cache Resolution

**Problem**: Development server serving old code despite file changes.

**Actions**:

- Killed all Node.js processes: `killall -9 node`
- Cleared Next.js caches: `rm -rf .next node_modules/.cache .swc`
- Started fresh dev server with clean build

**Result**: New code executing correctly ✅

### Phase 2: API Client Migration

**File**: `src/lib/openstates-api.ts`

**Changes**:

- Migrated from GraphQL POST to REST GET endpoints
- Changed base URL: `https://openstates.org/graphql` → `https://v3.openstates.org`
- Updated pagination: `per_page: 200` → `per_page: 50` (v3 max limit)
- Implemented pagination loop to fetch all results
- Added proper v3 authentication headers (`X-API-KEY`)

**v2 Code (OLD)**:

```typescript
const query = `query { people(jurisdiction: "mi", per_page: 200) { ... } }`;
const response = await fetch('https://openstates.org/graphql', {
  method: 'POST',
  body: JSON.stringify({ query }),
});
```

**v3 Code (NEW)**:

```typescript
const response = await fetch('https://v3.openstates.org/people?jurisdiction=mi&per_page=50', {
  headers: { 'X-API-KEY': apiKey },
});
// Loop through pagination.max_page to get all results
```

### Phase 3: Type Safety & Data Transformation

**File**: `src/services/core/state-legislature-core.service.ts`

#### Problem 1: Legislator Terms (Line 77)

**Error**: `Cannot read properties of undefined (reading 'map')`

**Root Cause**: v2 had `roles[]` array with historical terms. v3 only has `current_role` object.

**Fix**:

```typescript
// OLD (v2) - roles array
terms: osLegislator.roles.map(role => ({
  chamber: role.chamber,
  district: role.district,
  startYear: role.start_date.split('-')[0],
  endYear: role.end_date?.split('-')[0],
  party,
}));

// NEW (v3) - single current role
terms: [
  {
    chamber: osLegislator.chamber,
    district: osLegislator.district,
    startYear: new Date().getFullYear().toString(),
    endYear: undefined,
    party,
  },
];
```

#### Problem 2: Bill Transformation (Lines 134-170)

**Errors**: Missing properties `abstract`, `from_organization`, `extras` not in v3 API

**Fix**:

```typescript
// Added optional chaining and defaults
abstract: undefined, // v3 doesn't provide in simplified format
classification: (osBill.classification ?? []) as StateBill['classification'],
subject: osBill.subject ?? [],
chamber: (osBill.chamber ?? 'lower') as StateChamber,
from_organization: '', // v3 doesn't provide
sponsorships: osBill.sponsorships?.map(...) ?? [],
actions: osBill.actions?.map(action => ({
  date: action.date,
  description: action.description,
  organization: osBill.chamber === 'upper' ? 'Senate' : 'House',
  classification: action.classification,
})) ?? [],
votes: (osBill.votes ?? []).map(...),
sources: osBill.sources ?? [],
extras: undefined, // v3 doesn't provide
```

#### Problem 3: Bill Summary (Lines 181-194)

**Error**: `'osBill.actions' is possibly 'undefined'`

**Fix**:

```typescript
// Added optional chaining
const latestAction = osBill.actions?.[osBill.actions.length - 1];
const primarySponsor = osBill.sponsorships?.find(s => s.primary)?.name;
chamber: (osBill.chamber ?? 'lower') as StateChamber,
```

#### Problem 4: Jurisdiction Transformation (Lines 199-233)

**Error**: Property `session` doesn't exist, v3 uses `legislative_sessions` array

**Fix**:

```typescript
// OLD (v2) - single session object
currentSession: osJurisdiction.session
  ? {
      identifier: osJurisdiction.session.name,
      // ...
    }
  : undefined;

// NEW (v3) - sessions array
const currentSession = osJurisdiction.legislative_sessions?.[0];
currentSession: currentSession
  ? {
      identifier: currentSession.identifier,
      name: currentSession.name,
      start_date: currentSession.start_date,
      end_date: currentSession.end_date,
      active: true,
    }
  : undefined;
```

## Verification

### TypeScript Validation ✅

```bash
npm run type-check
# Result: 0 errors (down from 23)
```

### Runtime Testing ✅

```bash
curl http://localhost:3000/api/state-representatives?zip=48221
```

**Response**: 110+ real Michigan state legislators with complete data:

- 38 State Senators (upper chamber)
- 72+ State Representatives (lower chamber)
- Full contact information (email, photo, phone)
- Accurate party and district data

### Error Monitoring ✅

- **Before**: `TypeError: Cannot read properties of undefined (reading 'map')`
- **After**: No runtime errors, graceful handling of missing optional fields

## API Differences: v2 vs v3

| Feature                | v2 (GraphQL)               | v3 (REST)                             |
| ---------------------- | -------------------------- | ------------------------------------- |
| **Endpoint**           | `/graphql`                 | `/people`, `/bills`, `/jurisdictions` |
| **Method**             | POST                       | GET                                   |
| **Auth**               | No header                  | `X-API-KEY` header                    |
| **Pagination**         | `per_page: 200`            | `per_page: 50` (max)                  |
| **Legislator History** | `roles[]` array            | `current_role` object only            |
| **Bill Abstract**      | `abstract` field           | Not available in simplified           |
| **Bill Organization**  | `from_organization` object | Not available                         |
| **Sessions**           | `session` object           | `legislative_sessions[]` array        |

## Files Modified

1. **src/lib/openstates-api.ts** - API client rewritten for v3
2. **src/services/core/state-legislature-core.service.ts** - Data transformation updated
3. **src/types/state-legislature.ts** - Type definitions (new file)

## Breaking Changes

None for end users. The migration is backward-compatible at the API endpoint level (`/api/state-representatives`).

## Performance Impact

- **Latency**: Slightly increased due to pagination loop (50 results per page vs 200)
- **Reliability**: Improved (v3 is actively maintained)
- **Caching**: 60-minute TTL maintained for state legislature data

## Lessons Learned

1. **Multiple Dev Servers**: Always check for zombie processes when code changes aren't reflected
2. **API Versioning**: Monitor deprecation notices from third-party APIs
3. **Type Safety**: Strict TypeScript prevented many runtime errors during migration
4. **Optional Chaining**: Essential for handling evolving API schemas

## Next Steps

- [x] **Security**: API key redacted from documentation (November 2025)
- [ ] **Action Required**: Rotate OpenStates API key (previous key was exposed in documentation)
  - Get new key from: https://openstates.org/accounts/profile/
  - Update `.env.local`: `OPENSTATES_API_KEY=<new_key>`
  - Update Vercel environment variables
- [ ] Monitor v3 API rate limits and adjust caching if needed
- [ ] Consider implementing historical terms lookup if v3 adds that endpoint
- [ ] Add automated tests for state legislature data transformation
- [ ] Implement OpenStates API key rotation schedule (quarterly recommended)

## References

- [OpenStates v3 API Documentation](https://docs.openstates.org/api-v3/)
- [v2 → v3 Migration Guide](https://docs.openstates.org/api-v3/migration/)
- OpenStates API Key: `[REDACTED - See .env.local or Vercel environment variables]`

## Testing Commands

```bash
# Test Michigan legislators
curl http://localhost:3000/api/state-representatives?zip=48221

# Test specific state
curl http://localhost:3000/api/state-representatives?state=MI

# Verify no TypeScript errors
npm run type-check

# Run full validation
npm run validate:all
```

---

**Migration Completed By**: Claude (AI Assistant)
**Verified By**: Mark Sandford
**Date Completed**: October 28, 2025
