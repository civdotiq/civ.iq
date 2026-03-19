# InteractiveDistrictMap - Before/After Flow Comparison

## BEFORE (Broken - Race Condition)

```
┌─────────────────────────────────────────────────────────────┐
│ Component Mount                                             │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Set isClient = true                                         │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├──────────────────┬──────────────────────────┐
               ▼                  ▼                          ▼
┌──────────────────────┐  ┌─────────────────┐  ┌───────────────────┐
│ Map Init Effect      │  │ Data Fetch      │  │ Map Init Effect   │
│ Checks conditions    │  │ Effect Starts   │  │ Waiting...        │
└──────────────────────┘  └─────────┬───────┘  └───────────────────┘
               │                    │                     ▲
               ▼                    ▼                     │
┌──────────────────────┐  ┌─────────────────┐            │
│ CONDITION CHECK:     │  │ Fetch API       │            │
│ !loading? ❌ NO      │  │ /district-map   │            │
│ mapData? ❌ NO       │  └─────────┬───────┘            │
│ BLOCKED!             │            │                     │
└──────────────────────┘            ▼                     │
               │         ┌─────────────────┐              │
               │         │ Data Received   │              │
               │         │ with bbox +     │              │
               │         │ boundaries      │              │
               │         └─────────┬───────┘              │
               │                   ▼                      │
               │         ┌─────────────────────┐          │
               │         │ setMapData(data)    │          │
               │         │ setLoading(false)   │          │
               │         └─────────┬───────────┘          │
               │                   │                      │
               │                   ▼                      │
               │         ┌─────────────────────┐          │
               │         │ Try: if(mapRef &&   │          │
               │         │        data)         │          │
               │         │ mapRef.current = ?   │          │
               └─────────│ ❌ NULL (map never  │──────────┘
                         │    initialized!)     │
                         └─────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │ DEADLOCK            │
                         │ Map init waits for  │
                         │ data, but map never │
                         │ exists to receive   │
                         │ data updates        │
                         └─────────────────────┘
```

## AFTER (Fixed - Proper Sequencing)

```
┌─────────────────────────────────────────────────────────────┐
│ Component Mount                                             │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Set isClient = true                                         │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├──────────────────┬──────────────────────────┐
               ▼                  ▼                          │
┌──────────────────────┐  ┌─────────────────┐              │
│ Map Init Effect      │  │ Data Fetch      │              │
│ Checks conditions    │  │ Effect Starts   │              │
└──────────┬───────────┘  └─────────┬───────┘              │
           │                        │                        │
           ▼                        ▼                        │
┌──────────────────────┐  ┌─────────────────┐              │
│ CONDITION CHECK:     │  │ Fetch API       │              │
│ isClient? ✅ YES     │  │ /district-map   │              │
│ !mapRef? ✅ YES      │  └─────────┬───────┘              │
│ container? ✅ YES    │            │                        │
│ ✅ PROCEED!          │            │                        │
└──────────┬───────────┘            │                        │
           │                        │                        │
           ▼                        │                        │
┌──────────────────────┐            │                        │
│ Import MapLibre GL  │            │                        │
└──────────┬───────────┘            │                        │
           │                        │                        │
           ▼                        │                        │
┌──────────────────────┐            │                        │
│ Create Map Instance │            │                        │
│ mapRef.current = map│            │                        │
└──────────┬───────────┘            │                        │
           │                        │                        │
           ▼                        ▼                        │
┌──────────────────────┐  ┌─────────────────┐              │
│ Register map.on()    │  │ Data Received   │              │
│ 'load' handler       │  │ with bbox +     │              │
└──────────┬───────────┘  │ boundaries      │              │
           │              └─────────┬───────┘              │
           │                        │                        │
           │                        ▼                        │
           │              ┌─────────────────────┐            │
           │              │ setMapData(data)    │            │
           │              │ setLoading(false)   │            │
           │              └─────────┬───────────┘            │
           │                        │                        │
           │                        ▼                        │
           │              ┌─────────────────────┐            │
           │              │ if(mapRef.current)? │            │
           │              │ ✅ YES - exists!    │            │
           │              └─────────┬───────────┘            │
           │                        │                        │
           │                        ▼                        │
           │              ┌─────────────────────┐            │
           │              │ map.loaded()? YES   │            │
           │              └─────────┬───────────┘            │
           │                        │                        │
           ▼                        ▼                        │
┌────────────────────────────────────────────────┐          │
│         TWO PATHS CONVERGE HERE                │          │
│                                                │          │
│  Path A: Map loaded first → call immediately  │          │
│  Path B: Data first → map.once('load')        │          │
└────────────────────┬───────────────────────────┘          │
                     │                                      │
                     ▼                                      │
          ┌─────────────────────┐                          │
          │ updateMapWithData() │                          │
          └─────────┬───────────┘                          │
                    │                                      │
                    ▼                                      │
          ┌─────────────────────┐                          │
          │ Add ZIP marker      │                          │
          └─────────┬───────────┘                          │
                    │                                      │
                    ▼                                      │
          ┌─────────────────────┐                          │
          │ Add district source │                          │
          └─────────┬───────────┘                          │
                    │                                      │
                    ▼                                      │
          ┌─────────────────────┐                          │
          │ Add fill + stroke   │                          │
          │ layers              │                          │
          └─────────┬───────────┘                          │
                    │                                      │
                    ▼                                      │
          ┌─────────────────────┐                          │
          │ map.fitBounds(bbox) │                          │
          │ ✅ Zoom to district!│                          │
          └─────────────────────┘                          │
```

## Key Differences

### BEFORE (Broken)

- ❌ Map init dependency: `[isClient, mapData, loading]`
- ❌ Circular dependency: Map waits for data, data needs map
- ❌ No map 'load' event handler
- ❌ Race condition between map creation and data arrival
- ❌ Result: Map never initializes, stays at USA zoom level

### AFTER (Fixed)

- ✅ Map init dependency: `[isClient]` only
- ✅ Map initializes immediately when client-side
- ✅ map.on('load') handler waits for tiles
- ✅ Data fetch checks map.loaded() status
- ✅ Handles both timing scenarios (map first OR data first)
- ✅ Result: Map zooms to district with boundaries visible

## Timing Scenarios Handled

### Scenario 1: Map Loads Before Data Arrives

```
1. Map init starts
2. Map created
3. map.on('load') registered → waits
4. Data arrives
5. Checks: mapRef exists? ✅  map.loaded()? ✅
6. Calls updateMapWithData() immediately
7. fitBounds executes → zoom to district
```

### Scenario 2: Data Arrives Before Map Loads

```
1. Map init starts + Data fetch starts (parallel)
2. Data arrives first
3. Checks: mapRef exists? ✅  map.loaded()? ❌
4. Registers map.once('load', updateMapWithData)
5. Map finishes loading → fires 'load' event
6. updateMapWithData() executes
7. fitBounds executes → zoom to district
```

### Scenario 3: Map Loads AND Data Arrives Before Either Effect Runs

```
1. Map init starts
2. Map created
3. map.on('load') registered with mapData check
4. Map loads → checks if(mapData) ✅
5. Calls updateMapWithData()
6. fitBounds executes → zoom to district
```

## Debug Console Output (Expected)

```
[MapLibre Debug] Component rendering with zipCode: 48221 district: MI-13
[MapLibre Debug] Map init useEffect running
[MapLibre Debug] Starting MapLibre initialization...
[MapLibre Debug] MapLibre GL imported successfully
[MapLibre Debug] Fetching map data for ZIP: 48221 district: MI-13
[MapLibre Debug] Map data received: {hasBbox: true, hasBoundary: true, bbox: {...}}
[MapLibre Debug] Map exists, updating with data
[MapLibre Debug] Map not loaded yet, waiting for load event
[MapLibre Debug] Map loaded, checking for mapData...
[MapLibre Debug] updateMapWithData called
[MapLibre Debug] Map reference exists, map loaded: true
[MapLibre Debug] Adding ZIP marker at: {lat: 42.315, lng: -83.148}
[MapLibre Debug] Boundary for layer congressional: true
[MapLibre Debug] Adding district boundary source
[MapLibre Debug] Adding fill layer with color: #e11d07
[MapLibre Debug] Adding stroke layer
[MapLibre Debug] Fitting map to bounds: {minLat: 42.169, maxLat: 42.461, minLng: -83.557, maxLng: -82.740}
[MapLibre Debug] fitBounds called successfully
```

---

**Resolution**: Removed circular dependencies, added proper map load event handling, and implemented dual-path logic to handle all timing scenarios.
