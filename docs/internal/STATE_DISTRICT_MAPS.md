# State District Maps - Technical Documentation

**Status**: ✅ WORKING (November 2025)
**Technology**: MapLibre GL JS v4 + PMTiles
**Data Source**: U.S. Census Bureau TIGER/Line 2025
**File Size**: 24 MB (6,793 state legislative districts)

## Overview

State district maps display interactive boundaries for state legislative districts (both upper and lower chambers) using vector tiles streamed via PMTiles format. The implementation uses MapLibre GL JS for client-side rendering with dynamic imports to prevent server-side rendering issues.

## Architecture

### Component Hierarchy

```
StateDistrictBoundaryMapClient.tsx (Client Component, dynamic import wrapper)
  └── StateDistrictBoundaryMap.tsx (Map component with MapLibre GL)
        ├── MapLibre GL Map Instance
        ├── PMTiles Protocol Handler
        └── Census TIGER/Line Vector Tiles
```

### File Locations

- **Component**: `src/features/districts/components/StateDistrictBoundaryMap.tsx`
- **Client Wrapper**: `src/features/districts/components/StateDistrictBoundaryMapClient.tsx`
- **Page**: `src/app/(civic)/state-districts/[state]/[chamber]/[district]/page.tsx`
- **PMTiles File**: `public/data/state_legislative_districts.pmtiles` (24 MB)
- **Metadata**: `public/data/state-districts/state-districts-manifest.json`

## Critical Implementation Details

### 1. Race Condition Fix (November 2025)

**Problem**: Original implementation included PMTiles source in the Map constructor, which prevented the `load` event from firing, causing infinite "Loading..." state.

**Root Cause**: When PMTiles sources are added in the initial Map configuration, MapLibre GL never fires the `load` event because the source isn't ready yet.

**Solution**:

1. Initialize map with **only** OpenStreetMap base tiles in constructor
2. Add PMTiles source **after** map fires `load` event
3. Always render map container div (never use early returns that prevent ref attachment)

**Before (Broken)**:

```typescript
// Map constructor with PMTiles - BLOCKS load event
map.current = new maplibregl.default.Map({
  container: mapContainer,
  style: {
    sources: {
      'state-districts': {
        type: 'vector',
        url: 'pmtiles:///data/state_legislative_districts.pmtiles',
      },
    },
  },
});

// load event NEVER fires - stuck in loading state
map.current.on('load', () => {
  /* Never reaches here */
});
```

**After (Fixed)**:

```typescript
// Map constructor with ONLY OSM tiles
map.current = new maplibregl.default.Map({
  container: mapContainer,
  style: {
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      },
    },
    layers: [{ id: 'osm-background', type: 'raster', source: 'osm' }],
  },
});

// load event DOES fire
map.current.on('load', () => {
  // Add PMTiles source AFTER map is loaded
  map.current.addSource('state-districts', {
    type: 'vector',
    url: 'pmtiles:///data/state_legislative_districts.pmtiles',
  });

  // Add layers using the PMTiles source
  map.current.addLayer({
    /* ... */
  });
});
```

### 2. React Ref Timing Fix (November 2025)

**Problem**: Callback ref was never being invoked because early returns prevented the div from rendering.

**Root Cause**: Component used early returns for loading/error states, which prevented the ref div from ever mounting:

```typescript
// BROKEN PATTERN - Chicken and egg problem
if (loading) {
  return <div>Loading...</div>; // Ref div never reached
}

// This never renders during initial load:
<div ref={setMapContainerRef} />
```

**Solution**: Use **overlay pattern** - always render the map container, show loading/error as absolute-positioned overlays:

```typescript
// FIXED PATTERN - Map container always renders
const mapComponent = (
  <div className="relative">
    {/* Map Container - ALWAYS RENDERS */}
    <div ref={setMapContainerRef} style={{ width: '100%', height: '100%' }} />

    {/* Loading Overlay - conditional overlay on top */}
    {loading && (
      <div className="absolute inset-0 z-[999]">
        <Loader2 />
        <p>Loading district boundaries...</p>
      </div>
    )}

    {/* Error Overlay - conditional overlay on top */}
    {error && (
      <div className="absolute inset-0 z-[999]">
        <p>{error}</p>
      </div>
    )}
  </div>
);

return mapComponent; // No early returns!
```

### 3. Callback Ref Pattern

Uses `useCallback` ref instead of `useRef` to track when DOM element is mounted:

```typescript
const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);

const setMapContainerRef = useCallback((node: HTMLDivElement | null) => {
  if (node) {
    logger.info('Container DOM element attached');
    setMapContainer(node); // Trigger useEffect
  }
}, []);

// In JSX:
<div ref={setMapContainerRef} />
```

**Why**: `useRef` doesn't trigger re-renders when the ref attaches. `useState` + callback ref ensures `useEffect` runs after the DOM element is ready.

### 4. Dynamic Import with SSR Disabled

**Why**: MapLibre GL uses browser-only APIs (canvas, WebGL) that fail during server-side rendering.

**Implementation** (`StateDistrictBoundaryMapClient.tsx`):

```typescript
const StateDistrictBoundaryMap = dynamic(
  () => import('./StateDistrictBoundaryMap'),
  {
    ssr: false, // Prevent server-side rendering
    loading: () => <div>Loading district map...</div>
  }
);
```

## Data Flow

1. **Server Component** (`page.tsx`) fetches legislator and demographic data
2. **Client Component** (`StateDistrictBoundaryMapClient.tsx`) dynamically imports map component
3. **Map Component** initializes when DOM element is ready:
   - Fetches metadata from manifest
   - Creates MapLibre map instance with OSM base
   - Waits for `load` event
   - Adds PMTiles source
   - Adds district layers (fill, outline, neighboring districts)
   - Flies to district centroid

## PMTiles Configuration

**Source File**: `public/data/state_legislative_districts.pmtiles`

**Generation** (via Tippecanoe):

```bash
tippecanoe \
  -o public/data/state_legislative_districts.pmtiles \
  --force \
  --maximum-zoom=12 \
  --minimum-zoom=0 \
  --base-zoom=6 \
  --drop-densest-as-needed \
  --simplification=10 \
  --coalesce-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --name="State Legislative Districts 2025" \
  --attribution="U.S. Census Bureau" \
  -L sldl:temp/state-districts/sldl.geojson \
  -L sldu:temp/state-districts/sldu.geojson
```

**Layers**:

- `sldl`: State Legislative District Lower (state house)
- `sldu`: State Legislative District Upper (state senate)

**Properties** (each feature):

```json
{
  "id": "CA-lower-19",
  "state_code": "CA",
  "district": "19",
  "chamber": "lower",
  "geoid": "06019",
  "name": "District 19",
  "full_name": "California Assembly District 19"
}
```

## Map Layers

### 1. Neighboring Districts Layer

- **Type**: `line`
- **Filter**: Same state, same chamber, different district
- **Style**: Gray dashed outline (`#9ca3af`, 1px, dash: `[2, 2]`)
- **Interactive**: Click to navigate to neighbor district

### 2. Current District Fill

- **Type**: `fill`
- **Filter**: Exact match on district ID
- **Style**: Blue semi-transparent (`#3b82f6`, 30% opacity)

### 3. Current District Outline

- **Type**: `line`
- **Filter**: Exact match on district ID
- **Style**: Bold blue line (`#1e40af`, 3px)

## Metadata Manifest

**File**: `public/data/state-districts/state-districts-manifest.json`

**Structure**:

```json
{
  "generated": "2025-11-09T...",
  "total_districts": 6793,
  "districts": {
    "CA-lower-19": {
      "centroid": [-122.0123, 37.4567],
      "bbox": [-122.1, 37.4, -121.9, 37.5],
      "name": "District 19",
      "full_name": "California Assembly District 19"
    }
  }
}
```

**Usage**: Loaded to:

- Fly map to district centroid
- Display district name
- Show bounding box for initial viewport

## Interactive Features

1. **Click Neighboring Districts**: Navigates to that district's page
2. **Fullscreen Toggle**: Expand map to full viewport
3. **Hover Cursor**: Changes to pointer over clickable districts
4. **Info Footer**: Shows district name, data source, legend

## Debugging

### Enable Detailed Logging

All map lifecycle events are logged with `[StateDistrictBoundaryMap]` prefix:

```
[INFO] [StateDistrictBoundaryMapClient] Rendering with props
[INFO] [StateDistrictBoundaryMap] Callback ref invoked
[INFO] [StateDistrictBoundaryMap] Container DOM element attached
[INFO] [StateDistrictBoundaryMap] useEffect executing
[INFO] [StateDistrictBoundaryMap] Fetching metadata...
[INFO] [StateDistrictBoundaryMap] Starting map initialization
[INFO] [StateDistrictBoundaryMap] Loading MapLibre and PMTiles libraries...
[INFO] [StateDistrictBoundaryMap] Libraries loaded successfully
[INFO] [StateDistrictBoundaryMap] Creating MapLibre map instance...
[INFO] [StateDistrictBoundaryMap] Map instance created, waiting for load event...
[INFO] [StateDistrictBoundaryMap] Map load event fired!
[INFO] [StateDistrictBoundaryMap] Adding PMTiles source...
[INFO] [StateDistrictBoundaryMap] PMTiles source added successfully
[INFO] [StateDistrictBoundaryMap] Map fully loaded and configured!
```

### Common Issues

**Issue**: Map stuck on "Loading..."

- **Check**: Callback ref logs appear in console
- **Fix**: Ensure map container div always renders (no early returns)

**Issue**: "Failed to load district boundaries"

- **Check**: PMTiles file exists at `/public/data/state_legislative_districts.pmtiles`
- **Check**: Network tab shows PMTiles file loading
- **Fix**: Regenerate PMTiles file with `npm run process:state-districts`

**Issue**: Map loads but no district highlighted

- **Check**: District ID format matches manifest (`STATE-chamber-DISTRICT`)
- **Check**: Metadata contains district ID
- **Fix**: Verify district exists in TIGER/Line data

## Performance

- **Initial Load**: ~2-3 seconds (includes MapLibre + PMTiles library download)
- **Subsequent Loads**: ~500ms (libraries cached)
- **PMTiles Streaming**: Only loads tiles for visible viewport
- **File Size**: 24 MB total, ~100-200 KB per viewport

## Browser Compatibility

- **Chrome/Edge**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support
- **Mobile**: ✅ Touch gestures supported

## Future Optimizations

1. **Reduce max zoom** from 12 to 10 (saves ~30% file size, no visual quality loss)
2. **Pre-cache metadata** in service worker
3. **Add search/autocomplete** for district lookup
4. **Overlay demographic data** on map
5. **Add district comparison mode** (side-by-side)

## Related Documentation

- **Full Map Integration Guide**: `docs/MAP_INTEGRATION_DEBUGGING_GUIDE.md`
- **Federal Districts**: Use GeoJSON instead of PMTiles (435 districts, smaller dataset)
- **Data Processing**: `scripts/process-state-legislative-districts.mjs`

---

**Last Updated**: November 2025
**Debugged By**: Mark Sandford + Claude Code
**Status**: ✅ Production Ready
