# State Legislature ZIP Code Filtering Issue

**Date**: October 28, 2025
**Status**: ⚠️ **LIMITATION IDENTIFIED**

## Problem

User expected to see only their local state legislators when entering ZIP code 48221 (Detroit, MI), but instead received all 110+ Michigan state legislators (38 senators + 72+ representatives).

## Root Cause

OpenStates API v3 does **NOT** support ZIP code filtering directly. The `location` parameter expects **latitude/longitude coordinates**, not ZIP codes.

### API Testing Results

```bash
# Test with location=48221 (ZIP code)
curl "https://v3.openstates.org/people?jurisdiction=mi&location=48221&per_page=5"
# Result: Returns 149 legislators (not properly filtered)

# Expected behavior:
# The API should use lat/long coordinates like:
# location=42.4072,-83.0094 (Detroit coordinates)
```

## Current Behavior

**API Endpoint**: `/api/state-representatives?zip=48221`

**Returns**: ALL Michigan state legislators

- 38 State Senators (districts 1-38)
- 72+ State Representatives (districts 1-110+)
- Sorted by chamber (Senate first) then district number

## Why This Happens

1. **No ZIP-to-State-District Mapping**: We only have congressional district mapping, not state legislative districts
2. **OpenStates Uses Geocoding**: Their API expects `lat,long` coordinates for geographic filtering
3. **Different District Systems**:
   - Congressional districts: 13 in Michigan (federal House of Representatives)
   - State Senate districts: 38 in Michigan
   - State House districts: 110 in Michigan

## Code Changes Made

### Removed Non-Working Location Parameter

**Files Modified**:

1. `src/lib/openstates-api.ts:282-285` - Removed `location?: string` parameter from `getLegislators()`
2. `src/services/core/state-legislature-core.service.ts:238-241` - Removed `location?: string` from `getAllStateLegislators()`
3. `src/app/api/state-representatives/route.ts:193-195` - Removed ZIP code parameter, added comment explaining limitation

### Why Not Use Lat/Long?

While OpenStates supports lat/long filtering, we would need to:

1. Geocode ZIP codes to coordinates (requires external service or mapping data)
2. Update API client to accept and pass coordinates
3. Implement caching for geocoding results

This adds complexity and external dependencies.

## Solution Options

### Option 1: Accept Current Behavior (Easiest)

**Implementation**: Add UI message explaining all state legislators are shown

- **Pros**: No code changes, transparent to users
- **Cons**: Not helpful for users wanting only their local reps

### Option 2: Client-Side Grouping (Medium)

**Implementation**: Group legislators by district in UI, highlight user's likely district based on congressional district overlap

- **Pros**: No geocoding needed, uses existing congressional district data
- **Cons**: Approximate, may not be accurate for all ZIP codes

### Option 3: Implement Geocoding (Complex)

**Implementation**: Add geocoding service to convert ZIP → lat/long, use OpenStates geographic filtering

- **Pros**: Accurate filtering, matches OpenStates API design
- **Cons**: External dependency, rate limiting concerns, additional complexity

### Option 4: Build State Legislative District Mapping (Most Accurate)

**Implementation**: Create ZIP-to-state-district mapping similar to congressional mapping

- **Pros**: No external dependencies, fast lookups, works offline
- **Cons**: Large data file, maintenance burden, accuracy concerns at ZIP boundaries

## Recommended Approach

**Short-term**: Option 1 - Accept current behavior with UI messaging
**Long-term**: Option 4 - Build comprehensive ZIP-to-state-district mapping

### Implementation Steps

#### Phase 1: Immediate (Current)

- ✅ Remove non-working `location` parameter
- ✅ Return all state legislators for the state
- ⚠️ Add UI message: "Showing all Michigan state legislators. ZIP-based filtering coming soon."

#### Phase 2: Enhanced UI (Next)

- Group legislators by chamber in UI
- Add search/filter functionality (by name, district, party)
- Show district boundaries on interactive map

#### Phase 3: Proper Filtering (Future)

- Source state legislative district boundary data (US Census TIGER/Line)
- Build ZIP-to-state-district mapping
- Implement filtering in backend API

## Data Sources for Future Implementation

### State Legislative District Boundaries

- **US Census TIGER/Line**: https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html
- **OpenStates Geo**: https://github.com/openstates/openstates-geo
- **Format**: Shapefiles with district polygons

### ZIP Code Centroids

- **USPS ZIP Code Database**: https://www.unitedstateszipcodes.org/
- **Commercial Services**: SmartyStreets, Geocod.io
- **Free Alternative**: GeoNames (http://www.geonames.org/)

## Technical Notes

### OpenStates API v3 Geographic Filtering

From documentation research:

- Primary method: `lat,long` coordinates
- Endpoint: `/people?jurisdiction={state}&lat={lat}&lon={lon}`
- Returns legislators whose districts contain that geographic point

### Why ZIP Codes Are Imperfect

- ZIP codes are postal delivery routes, not geographic areas
- ZIP codes can span multiple legislative districts
- District boundaries change every 10 years (redistricting)
- Some ZIP codes cross state lines

## Related Files

- `src/lib/openstates-api.ts` - OpenStates API client
- `src/services/core/state-legislature-core.service.ts` - Core service layer
- `src/app/api/state-representatives/route.ts` - Public API endpoint
- `src/lib/data/zip-district-mapping.ts` - Congressional district mapping (reference)

## References

- [OpenStates API v3 Docs](https://docs.openstates.org/api-v3/)
- [US Census TIGER/Line](https://www.census.gov/geographies/mapping-files.html)
- [OpenStates GitHub](https://github.com/openstates)

---

**Status**: ZIP filtering removed (non-functional). All state legislators returned for now.
**Next Step**: Implement UI messaging and grouping to improve user experience.
