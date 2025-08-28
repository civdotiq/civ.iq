# 🚨 EMERGENCY: Complete Representative Data Failure

## CRITICAL ISSUES:

1. ZIP code lookup returns "Representative information not available" for ALL districts
2. Representatives browse page shows "Showing 0 of 0 representatives"
3. Both MI-12 and MI-13 districts have no data (was working before)

## System State:

- ZIP Code: 48221 (Detroit, Michigan)
- Expected: Should show representatives for MI-12 and MI-13
- Actual: Both districts show "Representative information not available"
- Browse page: Shows 0 total representatives (should be 435+ House + 100 Senate)

## Files Missing:

- src/data/representatives/house-members-119.json
- src/data/representatives/senate-members-119.json
- data/final/119th-congress-members.json
- public/data/house-members-119.json
- src/data/mapping/zip-to-district-mapping.json
- data/final/zip-district-mapping.json
- src/app/api/representatives/[id]/route.ts
- src/app/api/representatives/search/route.ts
- src/app/api/districts/[zipCode]/route.ts
- src/app/(civic)/representatives/[zipCode]/page.tsx
- src/services/representativeService.ts
- src/utils/representatives.ts

## Diagnostic Results:

3 critical files found
12 critical files missing

## URGENT CHECKS NEEDED:

### 1. Data Files Integrity

Check if JSON data files contain actual representative data:

- Are the JSON files empty?
- Are they malformed?
- Were they accidentally overwritten?

### 2. API Route Failures

Check API routes for errors:

- /api/representatives - Should return all representatives
- /api/districts/48221 - Should return district info
- Are routes throwing errors?
- Are they returning empty arrays?

### 3. Data Loading Issue

Check how data is loaded:

- Is data being imported correctly?
- Are file paths correct?
- Is there a build/compilation issue?

### 4. Recent Changes

What changed recently that could cause this:

- Were data files moved or deleted?
- Was there a deployment that missed files?
- Did environment variables change?

## IMMEDIATE FIXES NEEDED:

### Fix 1: Restore Data Files

```bash
# Check if data files exist and have content
ls -la data/final/*.json
ls -la src/data/representatives/*.json

# If missing, restore from git
git status data/
git restore data/final/119th-congress-members.json
```

### Fix 2: Rebuild Data

```bash
# Re-run data processing scripts
npm run process-census
npm run migrate:119th
npm run validate:data
```

### Fix 3: Check API Routes

Verify API routes are working:

- GET /api/representatives
- GET /api/districts/48221
- Check for try/catch blocks silently failing

### Fix 4: Emergency Data Recovery

If data is completely lost, we need to:

1. Re-fetch from Congress.gov API
2. Rebuild the local JSON files
3. Ensure proper data structure

## Expected Data Structure:

```json
{
  "members": [
    {
      "bioguideId": "T000481",
      "name": "Rashida Tlaib",
      "state": "MI",
      "district": "12",
      "party": "Democrat"
    },
    {
      "bioguideId": "T000478",
      "name": "Shri Thanedar",
      "state": "MI",
      "district": "13",
      "party": "Democrat"
    }
  ]
}
```

Please investigate and provide immediate fixes to restore representative data!
