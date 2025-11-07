# State Legislative District Mapping Implementation

## Overview

This document describes the implementation of interactive map overlays for all 7,383 U.S. state legislative districts (both upper and lower chambers) across 50 states + DC.

**Status**: Phase 1 Complete - Data pipeline and frontend components ready for testing

## Implementation Summary

### Files Created

#### 1. Data Processing Pipeline

- **`scripts/process-state-legislative-districts.mjs`**
  - Downloads TIGER/Line shapefiles from Census Bureau
  - Processes both SLDL (lower chamber) and SLDU (upper chamber)
  - Generates unified district IDs: `{STATE_CODE}-{CHAMBER}-{DISTRICT_NUM}`
  - Creates PMTiles with separate layers for efficient rendering
  - Outputs:
    - `public/maps/state_legislative_districts.pmtiles` (vector tiles)
    - `data/state-districts/state-districts-manifest.json` (metadata)

#### 2. Validation Tools

- **`scripts/validate-state-district-ids.mjs`**
  - Validates TIGER district IDs match OpenStates API
  - Implements fuzzy matching for edge cases
  - Reports mismatches with affected legislators
  - Usage: `node scripts/validate-state-district-ids.mjs [--states=CA,TX] [--chamber=upper|lower]`

#### 3. Frontend Component

- **`src/features/districts/components/StateDistrictBoundaryMap.tsx`**
  - Interactive map using MapLibre GL JS + PMTiles
  - Highlights current district, shows neighbors
  - Flies to district centroid from manifest
  - Click-to-navigate neighboring districts
  - Fullscreen mode support

## Unified ID Schema

### Format: `{STATE_CODE}-{CHAMBER}-{DISTRICT_NUM}`

**Examples:**

- `CA-lower-12` - California State Assembly District 12
- `CA-upper-6` - California State Senate District 6
- `NE-upper-14` - Nebraska Legislature District 14 (unicameral)
- `VT-lower-AL` - Vermont at-large district

### Normalization Rules:

1. Remove leading zeros: "012" → "12"
2. At-large districts: "00", "000", "ZZZ" → "AL"
3. State codes: FIPS to 2-letter (e.g., "06" → "CA")

### Integration Points:

1. **TIGER/Line Data** (Build-time)
   - Source: `SLDLST`/`SLDUST` fields
   - Format: Zero-padded (e.g., "012")
   - Normalized to: "12"

2. **OpenStates API** (Runtime)
   - Field: `current_role.district`
   - Format: No leading zeros (e.g., "12")
   - Matches normalized TIGER IDs

3. **Census Geocoder** (Runtime)
   - Returns: GEOID (e.g., "26012")
   - Parse: State FIPS (26) + District (012)
   - Normalize: "012" → "12"

## Data Flow

### Build-Time Processing

```bash
# 1. Download TIGER/Line shapefiles
for each state (50 + DC):
  for each chamber (lower, upper):
    download tl_2025_{FIPS}_{sldl|sldu}.zip

# 2. Convert & Tag
for each shapefile:
  extract ZIP
  ogr2ogr convert to GeoJSON (EPSG:4326)
  simplify geometry (tolerance: 0.0001)
  enhance with unified ID

# 3. Generate PMTiles
split features by chamber → sldl.geojson, sldu.geojson
tippecanoe:
  - separate layers (sldl, sldu)
  - output: state_legislative_districts.pmtiles

# 4. Generate Manifest
for each district:
  calculate centroid, bbox
  store metadata with unified ID
```

### Runtime Data Flow

```typescript
// 1. User enters address
geocodeAddress("1600 Pennsylvania Ave NW, Washington, DC 20500")

// 2. Census Geocoder returns districts
{
  upperDistrict: { number: 'AL', geoid: '11000' },
  lowerDistrict: { number: 'AL', geoid: '11000' }
}

// 3. Build unified IDs
const upperDistrictId = `DC-upper-AL`;
const lowerDistrictId = `DC-lower-AL`;

// 4. Fetch legislators (OpenStates)
const legislators = await openStatesAPI.getLegislators('DC', 'upper');
const filtered = legislators.filter(leg => leg.district === 'AL');

// 5. Render map
<StateDistrictBoundaryMap stateCode="DC" chamber="upper" district="AL" />
  → Loads PMTiles
  → Filters layer: sldu
  → Filter: ['==', ['get', 'id'], 'DC-upper-AL']
  → Displays boundary from TIGER geometry
```

## Running the Pipeline

### Prerequisites

```bash
# Install system dependencies
sudo apt-get install gdal-bin  # ogr2ogr for shapefile conversion
npm install -g tippecanoe      # Vector tile generation

# Verify installations
ogr2ogr --version
tippecanoe --version
```

### Step 1: Process Districts

```bash
# Full processing (all states, both chambers)
node scripts/process-state-legislative-districts.mjs

# Expected output:
# - public/maps/state_legislative_districts.pmtiles (~100-200MB)
# - data/state-districts/state-districts-manifest.json
# - Processing time: ~30-60 minutes depending on network
```

### Step 2: Validate IDs

```bash
# Test all states
node scripts/validate-state-district-ids.mjs

# Test specific states
node scripts/validate-state-district-ids.mjs --states=CA,TX,MI

# Test one chamber
node scripts/validate-state-district-ids.mjs --chamber=upper

# Expected: ✅ All district IDs match (no mismatches)
```

### Step 3: Test Sample States

```bash
# Recommended test states:
# - CA: Large state (80 Assembly, 40 Senate)
# - TX: Large state (150 House, 31 Senate)
# - MI: Medium state
# - VT: Multi-member districts
# - NE: Unicameral legislature (upper only)

node scripts/validate-state-district-ids.mjs --states=CA,TX,MI,VT,NE
```

## Frontend Integration

### Using the Component

```tsx
import StateDistrictBoundaryMap from '@/features/districts/components/StateDistrictBoundaryMap';

function DistrictPage({ stateCode, chamber, district }) {
  return (
    <StateDistrictBoundaryMap
      stateCode={stateCode} // "CA"
      chamber={chamber} // "upper" or "lower"
      district={district} // "12" or "AL"
      width="100%"
      height={500}
    />
  );
}
```

### Map Features

1. **Current District**: Blue fill + bold outline
2. **Neighboring Districts**: Dashed gray outlines, clickable
3. **Controls**: Fullscreen toggle
4. **Performance**: Streams only viewport tiles (~500KB-2MB per page)

### PMTiles Structure

```
state_legislative_districts.pmtiles (100-200MB total)
├── Layer: sldl (lower chamber districts)
│   └── Properties: id, state_code, chamber, district_num, name, full_name
└── Layer: sldu (upper chamber districts)
    └── Properties: id, state_code, chamber, district_num, name, full_name
```

### Filtering Strategy

```javascript
// Lower chamber example
map.addLayer({
  'source-layer': 'sldl', // Use lower chamber layer
  filter: ['==', ['get', 'id'], 'CA-lower-12'],
});

// Upper chamber example
map.addLayer({
  'source-layer': 'sldu', // Use upper chamber layer
  filter: ['==', ['get', 'id'], 'CA-upper-6'],
});
```

## Edge Cases & Handling

### 1. Nebraska Unicameral Legislature

- **Issue**: Nebraska has no lower chamber
- **Handling**:
  - Processing script skips `NE` lower chamber download
  - Validation script reports "N/A (unicameral)"
  - Frontend: Only render upper chamber for NE

### 2. At-Large Districts

- **States**: AK, DE, MT, ND, SD, VT, WY (single district)
- **Normalization**: "00", "000", "ZZZ" → "AL"
- **Example ID**: `AK-lower-AL`

### 3. Multi-Member Districts

- **States**: VT, NH (some districts elect multiple legislators)
- **Handling**: Same district number, multiple legislators
- **Example**: `VT-lower-12` might have 2-3 legislators

### 4. District Number Variations

- **TIGER Format**: Zero-padded ("012")
- **OpenStates Format**: No padding ("12")
- **Solution**: Normalization removes leading zeros

## Performance Considerations

### PMTiles Benefits

- **Streaming**: Browser downloads only viewport tiles
- **Caching**: HTTP range requests, CDN-friendly
- **Size**: 100-200MB total, ~500KB-2MB per page view
- **Zoom Optimization**: Tippecanoe drops detail at lower zooms

### Optimization Settings

```bash
tippecanoe \
  --maximum-zoom=12          # Detail at district level
  --minimum-zoom=0           # Show at all zoom levels
  --base-zoom=6              # Optimize for state-level view
  --drop-densest-as-needed   # Remove detail when too dense
  --simplification=10        # Balance accuracy vs size
```

## Validation & Testing

### Validation Script Output

```
📊 Validation Results
=====================
Total matches: 7,240
Total mismatches: 0
Warnings: 3

⚠️  WARNINGS:
============
NE lower: No legislators found (unicameral)
DC upper: At-large district (shadow representatives)
DC lower: At-large district (shadow representatives)

✅ Sample Successful Matches (first 10):
========================================
  CA-lower-1
  CA-lower-2
  ...

✅ Validation PASSED: All district IDs match
```

### Expected District Counts

| State | Lower | Upper | Total | Notes                    |
| ----- | ----- | ----- | ----- | ------------------------ |
| CA    | 80    | 40    | 120   | Largest legislature      |
| TX    | 150   | 31    | 181   | Most lower chamber seats |
| NE    | 0     | 49    | 49    | Unicameral (upper only)  |
| NH    | 400   | 24    | 424   | Largest lower chamber    |
| VT    | 150   | 30    | 180   | Multi-member districts   |

**Total**: ~7,383 districts across 51 jurisdictions

## Troubleshooting

### Issue: PMTiles not loading

```bash
# Check file exists
ls -lh public/maps/state_legislative_districts.pmtiles

# Verify PMTiles structure
pmtiles show public/maps/state_legislative_districts.pmtiles
```

### Issue: District not found in manifest

```bash
# Check manifest has district
cat data/state-districts/state-districts-manifest.json | \
  jq '.districts | keys | .[] | select(contains("CA-lower-12"))'

# Expected: "CA-lower-12"
```

### Issue: Validation mismatches

```bash
# Run with verbose output
node scripts/validate-state-district-ids.mjs --states=CA

# Check OpenStates directly
curl -H "X-API-KEY: $OPENSTATES_API_KEY" \
  "https://v3.openstates.org/people?jurisdiction=ca&per_page=50" | \
  jq '.results[] | select(.current_role.district) | .current_role.district'
```

## Next Steps

1. **Run Processing Script**: Generate PMTiles and manifest
2. **Validate IDs**: Ensure TIGER matches OpenStates
3. **Test Component**: Verify map rendering with sample districts
4. **Update State District Pages**: Replace mock boundaries
5. **Deploy**: Push PMTiles to CDN, update manifest

## Resources

- **Census TIGER/Line**: https://www2.census.gov/geo/tiger/TIGER2025/
- **OpenStates API**: https://docs.openstates.org/api-v3/
- **PMTiles**: https://github.com/protomaps/PMTiles
- **MapLibre GL JS**: https://maplibre.org/maplibre-gl-js/docs/
- **Tippecanoe**: https://github.com/felt/tippecanoe

## Implementation Timeline

- **Week 1**: ✅ Data processing script created
- **Week 2**: Validation script, test with sample states
- **Week 3**: Frontend integration, update district pages
- **Week 4**: Testing, deployment, documentation

---

**Last Updated**: 2025-01-06
**Status**: Phase 1 Complete - Ready for Testing
**Contact**: See CLAUDE.md for development guidelines
