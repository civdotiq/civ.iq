# Address-to-State-Legislators Integration Guide

**Status**: ✅ Production Ready
**Last Updated**: October 28, 2025
**API Version**: Census Geocoder v1 + OpenStates v3

## Overview

The Address-to-State-Legislators system provides **precise address-based lookup** of state legislators by combining two government APIs in a chain:

1. **U.S. Census Bureau Geocoder** - Converts street addresses to state legislative district boundaries
2. **OpenStates API v3** - Returns real state legislator profiles and contact information

This replaces ZIP-code-based lookup (which is imprecise) with exact address geocoding for accurate state legislative district identification.

## Architecture

### Two-API Chain Flow

```
User Input: Street Address
        ↓
┌──────────────────────────────────────────────┐
│ Census Geocoder API                          │
│ - Geocodes address to lat/lon               │
│ - Extracts state legislative districts:     │
│   • Upper chamber (State Senate)            │
│   • Lower chamber (State House/Assembly)    │
│   • Congressional district (bonus)          │
└──────────────────────────────────────────────┘
        ↓
    District IDs (e.g., "3", "9")
        ↓
┌──────────────────────────────────────────────┐
│ OpenStates API v3                            │
│ - Matches district numbers to legislators   │
│ - Returns full legislator profiles:         │
│   • Name, party, contact info               │
│   • Photo, terms, committee assignments     │
└──────────────────────────────────────────────┘
        ↓
   Matched Legislators
```

### Key Components

```
src/
├── services/
│   ├── geocoding/
│   │   ├── census-geocoder.types.ts      # Census API type definitions
│   │   ├── census-geocoder.service.ts    # Geocoding + district extraction
│   │   └── test-census-geocoder.ts       # Standalone test
│   │
│   └── state-legislators/
│       ├── district-lookup.service.ts           # District → Legislator matching
│       ├── address-to-legislators.service.ts    # Main orchestrator
│       ├── test-address-to-legislators.ts       # Integration test
│       └── test-with-env.ts                     # Test with .env loading
│
└── app/api/
    └── state-legislators-by-address/
        └── route.ts                      # Next.js API endpoint
```

## API Endpoint

### POST `/api/state-legislators-by-address`

**Request Body**:

```json
{
  "street": "100 Renaissance Center",
  "city": "Detroit",
  "state": "MI",
  "zip": "48243" // Optional, improves Census API accuracy
}
```

**Response** (200 OK):

```json
{
  "address": {
    "street": "100 Renaissance Center",
    "city": "Detroit",
    "state": "MI",
    "zip": "48243"
  },
  "matchedAddress": "100 RENAISSANCE CENTER, DETROIT, MI, 48243",
  "coordinates": {
    "lat": 42.328914717192,
    "lon": -83.040769390834
  },
  "districts": {
    "upper": {
      "number": "3",
      "geoid": "26003",
      "name": "State Senate District 3"
    },
    "lower": {
      "number": "9",
      "geoid": "26009",
      "name": "State House District 9"
    },
    "congressional": {
      "number": "13",
      "geoid": "2613",
      "name": "Congressional District 13"
    }
  },
  "legislators": {
    "senator": {
      "id": "ocd-person/1d297b7e-2e51-4e1a-a208-2f5505e9f1f7",
      "name": "Stephanie Chang",
      "firstName": "Stephanie",
      "lastName": "Chang",
      "party": "Democratic",
      "state": "MI",
      "chamber": "upper",
      "district": "3",
      "email": "senschang@senate.michigan.gov",
      "photo_url": "https://senatedems.com/chang/...",
      "isActive": true,
      "terms": [
        {
          "chamber": "upper",
          "district": "3",
          "startYear": "2025",
          "party": "Democratic"
        }
      ]
    },
    "representative": {
      "id": "ocd-person/19b8cf37-0b98-4194-9d2c-db6da3fae35c",
      "name": "Joe Tate",
      "firstName": "Joe",
      "lastName": "Tate",
      "party": "Democratic",
      "state": "MI",
      "chamber": "lower",
      "district": "9",
      "email": "joetate@house.mi.gov",
      "photo_url": "https://housedems.com/...",
      "isActive": true
    }
  },
  "location": {
    "county": "Wayne County",
    "place": "Detroit city"
  },
  "_metadata": {
    "censusResponseTime": 816,
    "openstatesResponseTime": 2193,
    "totalResponseTime": 3009,
    "warnings": [] // Optional array of warning messages
  }
}
```

**Error Responses**:

```json
// 400 Bad Request - Invalid address format
{
  "error": "Invalid address",
  "errors": [
    "Street address is required",
    "State must be a 2-letter abbreviation (e.g., \"MI\")"
  ]
}

// 500 Internal Server Error - Address not found
{
  "error": "Lookup failed",
  "message": "Address not found. Please verify the address is correct."
}

// 500 Internal Server Error - No districts found
{
  "error": "Lookup failed",
  "message": "No state legislative districts found for this address"
}
```

### GET `/api/state-legislators-by-address`

**Query Parameters**:

- `street` (required): Street address
- `city` (required): City name
- `state` (required): 2-letter state abbreviation
- `zip` (optional): ZIP code

**Example**:

```
GET /api/state-legislators-by-address?street=100%20Renaissance%20Center&city=Detroit&state=MI&zip=48243
```

Returns same response format as POST endpoint.

## Implementation Details

### Census Geocoder Service

**File**: `src/services/geocoding/census-geocoder.service.ts`

**Key Functions**:

```typescript
class CensusGeocoderService {
  static async geocodeAddress(request: CensusGeocodeRequest): Promise<ParsedDistrictInfo> {
    // 1. Normalize address
    // 2. Check cache (7-day TTL)
    // 3. Call Census API
    // 4. Parse districts from geographies
    // 5. Cache result
  }

  private static parseGEOID(geoid: string): DistrictGEOID {
    // "26003" → { stateFips: "26", districtNumber: "3" }
  }
}
```

**Critical Bug Fix**: Census API geography keys use **plural** "Districts" not singular:

```typescript
// ❌ WRONG - Returns null
geographies['2024 State Legislative District - Upper'];

// ✅ CORRECT - Returns data
geographies['2024 State Legislative Districts - Upper']; // Note the 's'
```

**Caching Strategy**:

- **TTL**: 7 days (604,800 seconds)
- **Key Format**: `census:geocode:{normalizedAddress}`
- **Rationale**: District boundaries rarely change

### District Lookup Service

**File**: `src/services/state-legislators/district-lookup.service.ts`

**Key Functions**:

```typescript
class DistrictLookupService {
  static async findLegislatorsByDistrict(
    request: DistrictLookupRequest
  ): Promise<DistrictLookupResult> {
    // 1. Fetch all state legislators from OpenStates
    // 2. Find senator in upper chamber
    // 3. Find representative in lower chamber
    // 4. Return matched legislators
  }

  private static normalizeDistrictNumber(district: string): string {
    // "003" → "3"
    // "District 9" → "9"
    // "At-Large" → "0"
  }
}
```

**District Matching Logic**:

- Normalizes both Census and OpenStates district numbers
- Handles leading zeros ("003" → "3")
- Supports at-large districts ("At-Large" → "0")

### Address-to-Legislators Orchestrator

**File**: `src/services/state-legislators/address-to-legislators.service.ts`

**Main Flow**:

```typescript
class AddressToLegislatorsService {
  static async findLegislatorsByAddress(
    request: AddressLookupRequest
  ): Promise<AddressLookupResponse> {
    // Step 1: Geocode via Census
    const districtInfo = await censusGeocoder.geocodeAddress(request);

    // Step 2: Find legislators via OpenStates
    const legislators = await districtLookup.findLegislatorsByDistrict({
      state: request.state,
      upperDistrict: districtInfo.upperDistrict?.number,
      lowerDistrict: districtInfo.lowerDistrict?.number,
    });

    // Step 3: Build comprehensive response
    return { ...districtInfo, legislators };
  }
}
```

**Error Handling**:

- Maps Census errors to user-friendly messages
- Tracks warnings for missing legislators
- Comprehensive validation before API calls

## Special Cases

### Nebraska Unicameral Legislature

Nebraska has only an **upper chamber** (State Senate), no lower chamber:

```json
{
  "districts": {
    "upper": { "number": "28", "name": "State Senate District 28" },
    "lower": null // Nebraska has no House
  },
  "legislators": {
    "senator": { "name": "...", "district": "28" },
    "representative": null
  }
}
```

### Washington, DC

DC has **wards** for local government but no traditional state legislature:

```json
{
  "districts": {
    "upper": null, // DC has no state senate
    "lower": null, // DC has no state house
    "congressional": { "number": "98", "name": "Delegate (Non-voting)" }
  },
  "legislators": {
    "senator": null,
    "representative": null
  },
  "_metadata": {
    "warnings": ["No state legislative districts found (expected for DC)"]
  }
}
```

### Vacant Seats

If a district has no current legislator (due to resignation, death, or pending special election):

```json
{
  "legislators": {
    "senator": { "name": "...", "district": "3" },
    "representative": null // Seat currently vacant
  },
  "_metadata": {
    "warnings": ["No state representative found for district 9"]
  }
}
```

## Testing

### Unit Tests

**Census Geocoder Test**:

```bash
npx tsx src/services/geocoding/test-census-geocoder.ts
```

**Integration Test**:

```bash
npx tsx src/services/state-legislators/test-address-to-legislators.ts
```

**Test Addresses**:

1. **Detroit, MI** (100 Renaissance Center) - Bicameral, both chambers
2. **Lincoln, NE** (1445 K Street) - Unicameral, upper only
3. **Washington, DC** (1600 Pennsylvania Ave) - Special case, no state legislature

### API Testing

**via curl**:

```bash
curl -X POST http://localhost:3000/api/state-legislators-by-address \
  -H "Content-Type: application/json" \
  -d '{
    "street": "100 Renaissance Center",
    "city": "Detroit",
    "state": "MI",
    "zip": "48243"
  }'
```

**via HTTP Client**:

```typescript
const response = await fetch('/api/state-legislators-by-address', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    street: '100 Renaissance Center',
    city: 'Detroit',
    state: 'MI',
    zip: '48243',
  }),
});

const data = await response.json();
console.log('Senator:', data.legislators.senator?.name);
console.log('Representative:', data.legislators.representative?.name);
```

## Performance

### Typical Response Times

- **Census Geocoding**: 300-800ms
- **OpenStates Lookup**: 1,500-2,500ms (depending on cache)
- **Total**: ~3 seconds average

### Caching Strategy

**Census Geocoder**:

- **TTL**: 7 days
- **Hit Rate**: High (addresses rarely change districts)
- **Storage**: Unified cache (Redis + fallback)

**OpenStates Data**:

- **TTL**: 1 hour (via `StateLegislatureCoreService`)
- **Hit Rate**: Very high (all MI lookups use same data)
- **Storage**: Unified cache

### Optimization Opportunities

1. **Pre-warm Cache**: Pre-load popular addresses/districts
2. **Parallel API Calls**: Census and OpenStates could theoretically run in parallel if we pre-fetch all state legislators
3. **CDN Caching**: Static district boundaries could be cached at CDN edge

## Security & Privacy

### Data Sources

- ✅ **U.S. Census Bureau**: Official government API, no authentication required
- ✅ **OpenStates**: Authenticated via `X-API-KEY` header, official public API
- ✅ **No Third-Party Services**: Direct government API access only

### User Privacy

- **No PII Storage**: Addresses not permanently stored
- **Cache Keys**: Normalized addresses used as cache keys (transient)
- **No Tracking**: No user identification or tracking
- **Rate Limiting**: Consider implementing per-IP rate limits

### API Key Management

**Required Environment Variables**:

```bash
# .env.local
OPENSTATES_API_KEY=your-key-here  # Required for OpenStates
# Census API requires no key
```

**Security Best Practices**:

- ✅ API keys in environment variables only
- ✅ Never commit `.env.local` to git
- ✅ Use Vercel Environment Variables in production

## Troubleshooting

### "Address not found"

**Problem**: Census API returns no matches

**Solutions**:

1. Verify address format (e.g., "123 Main St" not "123 Main Street")
2. Include ZIP code for better accuracy
3. Try alternative address formats (abbreviate street types)

### "No districts found"

**Problem**: Census API returns address but no legislative districts

**Possible Causes**:

- Address in US territory (Puerto Rico, Guam, etc.)
- Address in Washington, DC (expected - no state legislature)
- Very new address not yet in Census geocoder

### "No legislators found"

**Problem**: Districts found but OpenStates returns no legislators

**Possible Causes**:

- Vacant seat (resignation, death, pending election)
- Very recent election (OpenStates data not updated yet)
- OpenStates API key invalid/expired

### TypeScript Errors on Import

**Problem**: `Cannot find module '@/services/state-legislators/address-to-legislators.service'`

**Solution**: Restart Next.js dev server to pick up new service files:

```bash
# Kill all dev servers
pkill -f "next dev"

# Clear .next cache
rm -rf .next

# Restart
npm run dev
```

## Migration Guide

### From ZIP-Based to Address-Based Lookup

**Before** (ZIP-based, imprecise):

```typescript
// ❌ OLD: Returns ALL legislators in ZIP, not specific to address
const response = await fetch('/api/state-representatives?zip=48221');
```

**After** (Address-based, precise):

```typescript
// ✅ NEW: Returns exact legislators for specific address
const response = await fetch('/api/state-legislators-by-address', {
  method: 'POST',
  body: JSON.stringify({
    street: '100 Renaissance Center',
    city: 'Detroit',
    state: 'MI',
    zip: '48243',
  }),
});
```

### Integration Checklist

- [ ] Update frontend forms to collect full street address (not just ZIP)
- [ ] Update API calls to use new `/api/state-legislators-by-address` endpoint
- [ ] Handle `null` values for vacant seats
- [ ] Display warnings from `_metadata.warnings` array
- [ ] Show geocoded coordinates on map (optional)
- [ ] Handle special cases (Nebraska, DC, territories)

## Future Enhancements

### Potential Improvements

1. **Reverse Geocoding**: Given lat/lon, find legislators
2. **Bulk Address Lookup**: Accept array of addresses, return legislators
3. **Address Autocomplete**: Integrate Google Places or Census address suggestions
4. **Historical Lookup**: "Who represented this address in 2020?"
5. **Frontend Components**: Pre-built React components for address input

### API Expansion

**Additional Data Points**:

- Local government officials (city council, mayor)
- School board members (via district boundaries)
- Federal representatives (already have congressional district)

---

## Quick Start Example

```typescript
// Example: Full address lookup
import { addressToLegislators } from '@/services/state-legislators/address-to-legislators.service';

async function findMyLegislators() {
  const result = await addressToLegislators.findByAddress({
    street: '100 Renaissance Center',
    city: 'Detroit',
    state: 'MI',
    zip: '48243',
  });

  console.log('Your State Senator:', result.legislators.senator?.name);
  console.log('Your State Rep:', result.legislators.representative?.name);
  console.log('District:', result.districts.upper?.name);
}
```

## References

- **U.S. Census Geocoder API**: https://geocoding.geo.census.gov/geocoder/
- **OpenStates API v3**: https://docs.openstates.org/api-v3/
- **State Legislative Districts**: https://www.census.gov/programs-surveys/geography/guidance/geo-areas/state-legis-dist.html
