# Map Integration & District Boundary System - Technical Debugging Guide

**Generated:** 2025-11-09
**Purpose:** Comprehensive technical context for debugging state district map loading issues
**Issue:** State district maps stuck on "Loading district boundaries..." message

---

## Table of Contents

1. [System Overview](#system-overview)
2. [State District Map Integration (BROKEN)](#state-district-map-integration-broken)
3. [Federal District Map Integration (WORKING)](#federal-district-map-integration-working)
4. [Data Architecture](#data-architecture)
5. [Known Issues & Debugging Paths](#known-issues--debugging-paths)
6. [File Reference](#file-reference)

---

## System Overview

CIV.IQ uses **MapLibre GL JS** for interactive map rendering with two distinct boundary mapping systems:

### Technology Stack

- **Map Renderer:** MapLibre GL JS v4 (client-side only, dynamically loaded)
- **Vector Tiles:** PMTiles format for efficient streaming
- **Data Source (State):** U.S. Census Bureau TIGER/Line Shapefiles 2025
- **Data Source (Federal):** U.S. Census TIGER API (live) + static GeoJSON files
- **Framework:** Next.js 15 with React Server Components + Client Components
- **SSR Handling:** Dynamic imports with `ssr: false` to prevent server-side rendering

### Key Architectural Differences

| Feature            | State Districts                 | Federal Districts          |
| ------------------ | ------------------------------- | -------------------------- |
| **Data Format**    | PMTiles (vector tiles)          | Live API + Static GeoJSON  |
| **File Size**      | 24 MB (single file)             | Individual JSON files      |
| **Chambers**       | Upper + Lower (6,793 districts) | House only (435 districts) |
| **Loading Method** | Client-side PMTiles protocol    | Fetch API calls            |
| **Metadata**       | Centralized manifest JSON       | Calculated on-the-fly      |
| **Interactivity**  | Click neighboring districts     | View only                  |

---

## State District Map Integration (BROKEN)

### URL Pattern

```
/state-districts/[state]/[chamber]/[district]
Example: /state-districts/CA/lower/12
```

### Component Architecture

#### 1. Page Component (Server Component)

**File:** `src/app/(civic)/state-districts/[state]/[chamber]/[district]/page.tsx`

```typescript
// Key responsibilities:
// - Fetch legislator data from OpenStates API
// - Fetch demographics from Census API
// - Render map component (delegated to client)

// Line 146-151: Map rendering call
<StateDistrictBoundaryMap
  stateCode={stateCode}       // e.g., "CA"
  chamber={chamber}           // "upper" | "lower"
  district={district}         // e.g., "12"
  height={500}
/>
```

#### 2. Client Wrapper (Client Component)

**File:** `src/features/districts/components/StateDistrictBoundaryMapClient.tsx`

```typescript
// Purpose: Bypass Next.js SSR restrictions
// Uses dynamic() with ssr: false to prevent server-side rendering

const StateDistrictBoundaryMap = dynamic(
  () => import('./StateDistrictBoundaryMap'),
  {
    ssr: false,
    loading: () => (
      <Loader2 className="h-8 w-8 animate-spin" />
      <p>Loading district map...</p>  // ← USER SEES THIS FOREVER
    )
  }
);
```

**CRITICAL:** The "Loading district map..." message is from this wrapper. If user sees this stuck, the actual map component is **never successfully loaded**.

#### 3. Map Component (Client Component)

**File:** `src/features/districts/components/StateDistrictBoundaryMap.tsx`

**Initialization Flow:**

```typescript
// Step 1: Client-side check (Lines 60-63)
useEffect(() => {
  setIsClient(true); // Ensures we're on browser
}, []);

// Step 2: Build district ID (Lines 230)
const districtId = `${stateCode}-${chamber}-${district}`;
// Example: "CA-lower-12"

// Step 3: Fetch metadata manifest (Lines 236-251)
const response = await fetch('/data/state-districts/state-districts-manifest.json');
const manifest = await response.json();
const districtData = manifest.districts[districtId];

// Step 4: Initialize MapLibre (Lines 65-224)
const [maplibregl, pmtiles] = await Promise.all([import('maplibre-gl'), import('pmtiles')]);

// Step 5: Register PMTiles protocol (Lines 83-84)
const protocol = new pmtiles.Protocol();
maplibregl.default.addProtocol('pmtiles', protocol.tile);

// Step 6: Create map with PMTiles source (Lines 90-120)
map.current = new maplibregl.default.Map({
  container: mapContainer.current,
  style: {
    version: 8,
    sources: {
      'state-districts': {
        type: 'vector',
        url: 'pmtiles:///data/state_legislative_districts.pmtiles',
        // ⚠️ CRITICAL: This file must exist at public/data/state_legislative_districts.pmtiles
      },
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      },
    },
    layers: [{ id: 'osm-background', type: 'raster', source: 'osm' }],
  },
  center: [-98.5795, 39.8283], // US center default
  zoom: 4,
});

// Step 7: On map load, add district layers (Lines 122-209)
map.current.on('load', () => {
  // Determine layer (sldl = lower, sldu = upper)
  const layerName = chamber === 'lower' ? 'sldl' : 'sldu';

  // Add neighboring districts (light gray)
  map.current.addLayer({
    id: 'neighboring-districts',
    type: 'line',
    source: 'state-districts',
    'source-layer': layerName, // ⚠️ Must match PMTiles layer name
    filter: ['all', ['==', ['get', 'state_code'], stateCode], ['!=', ['get', 'id'], districtId]],
    paint: { 'line-color': '#9ca3af', 'line-width': 1 },
  });

  // Add current district (blue fill + outline)
  map.current.addLayer({
    id: 'district-fill',
    type: 'fill',
    source: 'state-districts',
    'source-layer': layerName,
    filter: ['==', ['get', 'id'], districtId],
    paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.3 },
  });

  // Fly to district centroid
  if (districtMetadata?.centroid) {
    map.current.flyTo({
      center: districtMetadata.centroid, // [lon, lat]
      zoom: 9,
    });
  }

  setLoading(false); // ← THIS MUST HAPPEN for map to show
});

// Step 8: Error handling (Lines 211-216)
map.current.on('error', e => {
  logger.error('Map error', e.error);
  setError('Failed to load map');
  setLoading(false);
});
```

### Data Files Required

#### 1. PMTiles File (24 MB)

**Location:** `public/data/state_legislative_districts.pmtiles`
**Generated by:** `scripts/process-state-legislative-districts.mjs`
**Format:** PMTiles v3 (vector tile archive)
**Contents:**

- Layer `sldl`: Lower chamber districts (4,838 districts)
- Layer `sldu`: Upper chamber districts (1,955 districts)
- Each feature has properties: `id`, `state_code`, `district_num`, `name`, `geoid`

**To regenerate:**

```bash
node scripts/process-state-legislative-districts.mjs
# Downloads Census TIGER/Line shapefiles for all 51 states
# Processes with ogr2ogr to GeoJSON
# Compiles with tippecanoe to PMTiles
# Takes ~30 minutes, downloads ~500 MB
```

#### 2. Metadata Manifest

**Location:** `public/data/state-districts/state-districts-manifest.json`
**Generated by:** Same script as above
**Format:** JSON
**Structure:**

```json
{
  "version": "1.0",
  "generated": "2025-11-07T01:14:49.553Z",
  "summary": {
    "total_districts": 6793,
    "states": 51,
    "chambers": { "lower": 4838, "upper": 1955 }
  },
  "districts": {
    "CA-lower-12": {
      "id": "CA-lower-12",
      "state_code": "CA",
      "state_fips": "06",
      "state_name": "California",
      "chamber": "lower",
      "district_num": "12",
      "name": "CA-lower-12",
      "full_name": "California State Assembly District 12",
      "geoid": "06012",
      "centroid": [-122.4194, 37.7749], // [lon, lat]
      "bbox": [-122.5, 37.7, -122.3, 37.85] // [minLon, minLat, maxLon, maxLat]
    }
  }
}
```

### State-Specific Debugging Checkpoints

**Checkpoint 1: Files Exist**

```bash
ls -lh public/data/state_legislative_districts.pmtiles
# Should show: 24M file

ls -lh public/data/state-districts/state-districts-manifest.json
# Should exist
```

**Checkpoint 2: Browser Network Tab**

- Check for `state_legislative_districts.pmtiles` request
- Should be Status 200
- Content-Type: `application/octet-stream` or `application/vnd.pmtiles`
- Size: ~24 MB

**Checkpoint 3: Browser Console**
Look for these log messages (from `logger.info()` calls):

```
🗺️ Map container element: [object HTMLDivElement]
⏳ Attempting to initialize MapLibre map...
✅ MapLibre map successfully initialized
MapLibre map loaded and ready for district data
```

If you see:

```
Map error: [error object]
```

Then the PMTiles source failed to load.

**Checkpoint 4: MapLibre GL Errors**
Common errors:

- `Error: Failed to fetch PMTiles` → File doesn't exist or wrong path
- `Error: Invalid PMTiles` → File corrupted
- `Error: Unknown source layer "sldl"` → PMTiles doesn't have expected layers
- `Error: Network error` → CORS issue (shouldn't happen on same domain)

**Checkpoint 5: Metadata Lookup**
Open browser console and run:

```javascript
fetch('/data/state-districts/state-districts-manifest.json')
  .then(r => r.json())
  .then(d => console.log(d.districts['CA-lower-12']));
// Should show district metadata or undefined if not found
```

---

## Federal District Map Integration (WORKING)

### URL Pattern

```
/districts/[districtId]
Example: /districts/MI-12
```

### Component Architecture

#### 1. Page Component (Client Component)

**File:** `src/app/(civic)/districts/[districtId]/page.tsx`

```typescript
// Line 20-30: Dynamic import of map component
const DistrictMap = dynamic(
  () => import('@/features/districts/components/DistrictMap'),
  {
    ssr: false,
    loading: () => <div>Loading district map...</div>
  }
);

// Line 226: Render map
<DistrictMap state={district.state} district={district.number} />
```

#### 2. Map Component (Client Component)

**File:** `src/features/districts/components/DistrictMap.tsx`

**Data Fetching Strategy (Lines 333-518):**

```typescript
// Federal districts use DIFFERENT approach:
// 1. For at-large districts (00) or Senate (S prefix): Use state boundary
// 2. For regular House districts: Fetch live from Census TIGER API

const paddedDistrict = district.padStart(2, '0'); // "3" → "03"
const isAtLarge = paddedDistrict === '00';

if (isAtLarge) {
  // Option A: Static state boundary file
  const response = await fetch(`/data/states/standard/${state}.json`);
  const boundary = await response.json();
  setGeoJsonData(boundary); // Simple GeoJSON Feature
} else {
  // Option B: Live Census TIGER API
  const stateFips = stateFipsMap[state]; // MI → "26"
  const whereClause = `STATE='${stateFips}' AND CD119='${paddedDistrict}'`;
  const tigerUrl = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=${encodeURIComponent(whereClause)}&outFields=*&outSR=4326&f=geojson`;

  const response = await fetch(tigerUrl);
  const data = await response.json();
  const boundary = data.features[0]; // Extract first feature
  setGeoJsonData(boundary);
}
```

**Map Rendering (Lines 54-193):**

```typescript
// Initialize MapLibre with OpenStreetMap base tiles
const map = new maplibregl.Map({
  container: mapContainer.current,
  style: {
    version: 8,
    sources: {
      'base-tiles': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#e3f2fd' } },
      { id: 'base-map', type: 'raster', source: 'base-tiles' },
    ],
  },
  center: STATE_CENTERS[state] || [-98.5795, 39.8283],
  zoom: 7,
});

// When GeoJSON data loads, add district layers (Lines 196-331)
map.addSource('district-boundary', {
  type: 'geojson',
  data: geoJsonData, // ← Simple GeoJSON, not PMTiles
});

map.addLayer({
  id: 'district-fill',
  type: 'fill',
  source: 'district-boundary',
  paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.3 },
});

map.addLayer({
  id: 'district-stroke',
  type: 'line',
  source: 'district-boundary',
  paint: { 'line-color': '#1E40AF', 'line-width': 3 },
});

// Fit map to district bounds
map.fitBounds(
  [
    [minLng, minLat],
    [maxLng, maxLat],
  ],
  { padding: 50 }
);
```

### Key Differences from State Districts

| Aspect           | Federal (Working)                   | State (Broken)                          |
| ---------------- | ----------------------------------- | --------------------------------------- |
| **Data Source**  | Live Census API + Static files      | Single PMTiles file                     |
| **Complexity**   | Simple GeoJSON features             | Vector tile protocol                    |
| **Dependencies** | None (built-in fetch)               | PMTiles library + protocol registration |
| **File Size**    | ~10-500 KB per district             | 24 MB for all districts                 |
| **Loading**      | Sequential (fetch → parse → render) | Streaming (tiles load as you zoom)      |
| **Failure Mode** | Shows error message                 | Stuck on loading spinner                |

---

## Data Architecture

### State Districts PMTiles Generation

**Script:** `scripts/process-state-legislative-districts.mjs`

**Process Flow:**

```
1. Download Census TIGER/Line Shapefiles (51 states × 2 chambers = 102 files)
   ├─ Source: https://www2.census.gov/geo/tiger/TIGER2025/SLDL/
   └─ Source: https://www2.census.gov/geo/tiger/TIGER2025/SLDU/

2. Convert Shapefiles to GeoJSON (ogr2ogr)
   ├─ Input: tl_2025_01_sldl.shp (Alabama lower)
   └─ Output: temp/state-districts/sldl.geojson

3. Combine all GeoJSON into single file
   ├─ Lower chamber: temp/state-districts/sldl.geojson (4,838 features)
   └─ Upper chamber: temp/state-districts/sldu.geojson (1,955 features)

4. Generate PMTiles with tippecanoe
   ├─ Command: tippecanoe -o state_legislative_districts.pmtiles \
   │            --maximum-zoom=12 --minimum-zoom=0 --base-zoom=6 \
   │            --drop-densest-as-needed --simplification=10 \
   │            -L sldl:temp/state-districts/sldl.geojson \
   │            -L sldu:temp/state-districts/sldu.geojson
   └─ Output: public/data/state_legislative_districts.pmtiles (24 MB)

5. Generate metadata manifest
   ├─ Calculate centroids for each district
   ├─ Calculate bounding boxes
   └─ Output: public/data/state-districts/state-districts-manifest.json
```

**PMTiles Layer Structure:**

```
state_legislative_districts.pmtiles
├─ Layer: sldl (State Legislative District - Lower)
│  ├─ Zoom levels: 0-12
│  ├─ Features: 4,838 districts
│  └─ Properties per feature:
│     ├─ id: "CA-lower-12"
│     ├─ state_code: "CA"
│     ├─ state_fips: "06"
│     ├─ district_num: "12"
│     ├─ name: "CA-lower-12"
│     ├─ full_name: "California State Assembly District 12"
│     └─ geoid: "06012"
│
└─ Layer: sldu (State Legislative District - Upper)
   ├─ Zoom levels: 0-12
   ├─ Features: 1,955 districts
   └─ Properties: (same structure as sldl)
```

### Federal Districts Data

**Static Files:**

- `public/data/states/standard/{STATE}.json` - State boundary GeoJSON files
- Example: `public/data/states/standard/MI.json`

**Live API:**

- Census TIGER Web Service
- URL: `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query`
- Format: GeoJSON
- Query: `where=STATE='26' AND CD119='03'` (Michigan District 3, 119th Congress)

---

## Known Issues & Debugging Paths

### Issue: "Loading district boundaries..." Stuck Forever

**Symptom:** Map component never renders, spinner never stops

**Root Causes (in order of likelihood):**

#### 1. PMTiles File Missing or Corrupted

**Check:**

```bash
ls -lh public/data/state_legislative_districts.pmtiles
# Should be exactly 24 MB (25,165,824 bytes)

# Verify file integrity (if you have pmtiles CLI)
pmtiles show public/data/state_legislative_districts.pmtiles
# Should show metadata with layers "sldl" and "sldu"
```

**Fix:**

```bash
# Regenerate PMTiles
node scripts/process-state-legislative-districts.mjs

# Or download from production/backup if available
```

#### 2. PMTiles Protocol Not Registered

**Check:** Browser console for errors like:

```
Error: Unknown protocol: pmtiles
```

**Debug:** Add logging to `StateDistrictBoundaryMap.tsx` line 84:

```typescript
const protocol = new pmtiles.Protocol();
console.log('PMTiles protocol created:', protocol);
maplibregl.default.addProtocol('pmtiles', protocol.tile);
console.log('PMTiles protocol registered');
```

**Fix:** Ensure `pmtiles` library is installed:

```bash
npm list pmtiles
# Should show: pmtiles@3.x.x

# If missing:
npm install pmtiles
```

#### 3. MapLibre GL Not Loading

**Check:** Browser console for import errors:

```
Error: Failed to load module 'maplibre-gl'
```

**Debug:** Add logging to line 71:

```typescript
const [maplibregl, pmtiles] = await Promise.all([import('maplibre-gl'), import('pmtiles')]);
console.log('MapLibre GL loaded:', maplibregl);
console.log('PMTiles loaded:', pmtiles);
```

**Fix:**

```bash
npm list maplibre-gl
# Should show: maplibre-gl@4.x.x

npm install maplibre-gl
```

#### 4. CSS Not Loading

**Symptom:** Map loads but appears broken/blank

**Check:** Browser DevTools → Network → Filter CSS:

- Look for `maplibre-gl.css` request
- Should be Status 200

**Debug:** Line 74-80 adds CSS dynamically:

```typescript
if (typeof document !== 'undefined' && !document.getElementById('maplibre-css')) {
  const link = document.createElement('link');
  link.id = 'maplibre-css';
  link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
  console.log('Adding MapLibre CSS:', link.href);
  document.head.appendChild(link);
}
```

#### 5. District ID Not Found in Manifest

**Check:** Open browser console:

```javascript
const districtId = 'CA-lower-12'; // Change to your test case
fetch('/data/state-districts/state-districts-manifest.json')
  .then(r => r.json())
  .then(m => {
    console.log('District found:', m.districts[districtId]);
    console.log('Total districts:', Object.keys(m.districts).length);
  });
```

**Symptom:** Map loads but doesn't fly to district, no highlighting

**Fix:** Verify district ID format matches manifest keys exactly

#### 6. PMTiles Layer Name Mismatch

**Symptom:** Map loads, OSM tiles visible, but no district boundaries

**Check:** Lines 87 and 130 must use correct layer name:

```typescript
const layerName = chamber === 'lower' ? 'sldl' : 'sldu';
```

**Debug:** Verify PMTiles has these exact layer names:

```bash
pmtiles show public/data/state_legislative_districts.pmtiles | grep -A 5 "layers"
# Should show: sldl, sldu
```

#### 7. MapLibre GL Map Event Never Fires

**Symptom:** Map container renders but `on('load')` callback never executes

**Check:** Add timeout logging:

```typescript
map.current.on('load', () => {
  console.log('✅ Map loaded!');
  setLoading(false);
});

// Add timeout check
setTimeout(() => {
  if (loading) {
    console.error('⚠️ Map load timeout - never fired load event');
  }
}, 10000); // 10 seconds
```

**Common Causes:**

- Network timeout loading OSM tiles
- PMTiles file blocked by browser security
- JavaScript error in map initialization

#### 8. Manifest Fetch Fails

**Symptom:** Map loads but throws error about missing metadata

**Check:** Browser Network tab:

```
Request: /data/state-districts/state-districts-manifest.json
Status: 404 (not found)
```

**Fix:**

```bash
# Verify manifest exists
ls -lh public/data/state-districts/state-districts-manifest.json

# Regenerate if missing
node scripts/process-state-legislative-districts.mjs
```

### Debugging Tools

#### Browser Console Commands

```javascript
// 1. Check if MapLibre GL is loaded globally
console.log(window.maplibregl);

// 2. Inspect map instance (if available)
// (Open React DevTools → Components → find StateDistrictBoundaryMap)

// 3. Check PMTiles protocol registration
console.log(window.maplibregl?.getRTLTextPluginStatus?.());

// 4. Test manifest loading
fetch('/data/state-districts/state-districts-manifest.json')
  .then(r => r.json())
  .then(data => {
    console.log('Manifest loaded:', data.summary);
    console.log('Sample district:', Object.values(data.districts)[0]);
  })
  .catch(err => console.error('Manifest error:', err));

// 5. Test PMTiles file accessibility
fetch('/data/state_legislative_districts.pmtiles', { method: 'HEAD' })
  .then(r => console.log('PMTiles accessible:', r.ok, r.headers.get('content-length')))
  .catch(err => console.error('PMTiles error:', err));
```

#### Network Debugging

**Expected Requests (in order):**

1. **MapLibre GL CSS**
   - URL: `https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css`
   - Status: 200
   - Type: CSS

2. **Manifest JSON**
   - URL: `/data/state-districts/state-districts-manifest.json`
   - Status: 200
   - Type: JSON
   - Size: ~500 KB

3. **PMTiles File** (initial metadata)
   - URL: `/data/state_legislative_districts.pmtiles`
   - Status: 200 (or 206 Partial Content)
   - Type: `application/octet-stream`
   - Size: First ~16 KB (header)

4. **OSM Tiles** (multiple)
   - URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
   - Status: 200
   - Type: PNG
   - Multiple requests as you zoom/pan

5. **PMTiles Tiles** (as needed)
   - URL: `/data/state_legislative_districts.pmtiles` (with Range headers)
   - Status: 206 Partial Content
   - Multiple requests for different tile ranges

**If you see:**

- **404 on manifest:** Run regeneration script
- **404 on PMTiles:** Run regeneration script
- **CORS error on PMTiles:** Check server headers (shouldn't happen on same origin)
- **Timeout on OSM tiles:** Network issue, try different OSM server
- **No PMTiles tile requests:** Map loaded but layers not added (check `source-layer` property)

---

## File Reference

### State District Files

**Pages:**

- `src/app/(civic)/state-districts/[state]/[chamber]/[district]/page.tsx` - Server component page

**Components:**

- `src/features/districts/components/StateDistrictBoundaryMapClient.tsx` - Client wrapper (dynamic import)
- `src/features/districts/components/StateDistrictBoundaryMap.tsx` - Main map component

**Data:**

- `public/data/state_legislative_districts.pmtiles` - Vector tile file (24 MB)
- `public/data/state-districts/state-districts-manifest.json` - Metadata (~500 KB)

**Scripts:**

- `scripts/process-state-legislative-districts.mjs` - Data generation script

**Docs:**

- `docs/STATE_DISTRICT_MAPPING_IMPLEMENTATION.md` - Implementation notes
- `docs/PMTILES_OPTIMIZATION_REPORT.md` - PMTiles optimization details

### Federal District Files

**Pages:**

- `src/app/(civic)/districts/[districtId]/page.tsx` - Client component page

**Components:**

- `src/features/districts/components/DistrictMap.tsx` - Main map component
- `src/features/districts/components/RealDistrictBoundaryMap.tsx` - Alternative implementation

**Data:**

- `public/data/states/standard/*.json` - State boundary GeoJSON files
- `public/data/districts/*.json` - Individual district files (if any)

**Services:**

- External: Census TIGER Web Service API (live data)

---

## Quick Diagnostic Checklist

**Run these checks in order:**

- [ ] 1. Files exist:

  ```bash
  ls -lh public/data/state_legislative_districts.pmtiles
  ls -lh public/data/state-districts/state-districts-manifest.json
  ```

- [ ] 2. Dev server running:

  ```bash
  npm run dev
  # Should show: Ready on http://localhost:3000
  ```

- [ ] 3. Navigate to test URL:

  ```
  http://localhost:3000/state-districts/CA/lower/12
  ```

- [ ] 4. Open Browser DevTools → Console
  - [ ] No red errors
  - [ ] See MapLibre initialization logs
  - [ ] See "Map loaded" message

- [ ] 5. Check Network tab:
  - [ ] Manifest JSON loaded (200)
  - [ ] PMTiles file loaded (200 or 206)
  - [ ] OSM tiles loading (200)
  - [ ] No 404 errors

- [ ] 6. If still broken, add debug logging:

  ```typescript
  // In StateDistrictBoundaryMap.tsx, line 66
  console.log('🔍 Initializing map with:', { districtId, districtMetadata });

  // Line 84
  console.log('✅ PMTiles protocol registered');

  // Line 122
  console.log('✅ Map load event fired');
  ```

- [ ] 7. Compare with working federal district:

  ```
  http://localhost:3000/districts/MI-12
  # Should load immediately
  ```

- [ ] 8. If federal works but state doesn't:
  - **Issue is PMTiles-specific**
  - Check PMTiles library version
  - Check PMTiles file integrity
  - Verify protocol registration

---

## Contact & Support

**Project:** CIV.IQ (civic-intel-hub)
**Repository:** [GitHub URL if applicable]
**Documentation:** `docs/` directory in project root
**Issue Tracking:** GitHub Issues

For additional debugging assistance, provide:

1. Browser console logs (full output)
2. Network tab screenshot showing PMTiles request
3. React DevTools component tree screenshot
4. `npm list` output for maplibre-gl and pmtiles

---

**END OF DEBUGGING GUIDE**
