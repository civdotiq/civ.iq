# Data Integrity Framework

## 🛡️ Trust but Verify Protocol

This document describes the comprehensive data validation framework implemented to ensure civic data integrity and prevent coordinate system bugs from reaching production.

## Overview

The Data Integrity Framework consists of four main components:

1. **Centralized Geospatial Utilities** - Safe coordinate system conversions
2. **Ground Truth Test Suite** - Comprehensive validation tests
3. **API Integration Testing** - End-to-end validation
4. **CI/CD Quality Gates** - Automated validation pipeline

## Critical Problem Solved

**Issue**: Congressional district data was extracted with a coordinate system bug that placed ALL districts in the wrong hemisphere (negative latitude instead of positive).

**Impact**:

- 100% of district data was geographically incorrect
- San Francisco districts appeared in Argentina coordinates
- Citizens would receive wrong district/representative information
- Democracy-undermining data corruption at scale

**Solution**: Implemented TMS-to-XYZ coordinate conversion with comprehensive validation.

## Architecture

### 1. Geospatial Utilities (`src/lib/geospatial-utils.ts`)

Core utility functions that handle all coordinate system conversions:

```typescript
// Critical function that fixes hemisphere bug
export function convertTMStoXYZ(tmsCoord: TileCoordinate): TileCoordinate {
  const maxTileIndex = Math.pow(2, tmsCoord.z) - 1;
  return {
    x: tmsCoord.x,
    y: maxTileIndex - tmsCoord.y, // Y-axis inversion fix
    z: tmsCoord.z,
  };
}
```

**Key Functions**:

- `convertTMStoXYZ()` - Fixes Y-axis inversion from TMS coordinate system
- `convertTileToWGS84()` - Converts tile coordinates to geographic coordinates
- `validateUSCoordinate()` - Validates coordinates are within US bounds
- `validateAgainstGoldenRecord()` - Compares against known landmarks
- `validateDistrictData()` - Comprehensive district validation

### 2. Golden Records

Known landmark coordinates for validation:

```typescript
export const GOLDEN_COORDINATES = {
  // CA-12: San Francisco Congressional District
  CA12_SAN_FRANCISCO: {
    longitude: -122.44,
    latitude: 37.76,
    tolerance: 0.5, // degrees
  },

  // NY-14: Bronx/Queens Congressional District
  NY14_BRONX_QUEENS: {
    longitude: -73.87,
    latitude: 40.85,
    tolerance: 0.5, // degrees
  },

  // AS-AL: American Samoa At-Large (Southern Hemisphere)
  AS_AL_AMERICAN_SAMOA: {
    longitude: -170.7,
    latitude: -14.3,
    tolerance: 1.0, // degrees
  },
};
```

### 3. Test Suite Architecture

#### Unit Tests (`src/tests/district-data.test.ts`)

- **18 comprehensive tests** covering all utility functions
- Tests TMS coordinate conversion accuracy
- Validates US geographic bounds checking
- Tests golden record comparison logic
- Validates real district files from production data

#### API Integration Tests (`src/tests/district-api.test.ts`)

- End-to-end API endpoint validation
- Tests multiple district ID formats (CA-12, 06-12, 0612)
- Validates all detail levels (simple, standard, full)
- Tests error handling (400, 404 responses)
- Validates CORS, caching, and performance headers

### 4. CI/CD Quality Gates

GitHub Actions workflow (`.github/workflows/data-integrity-checks.yml`) that runs:

1. **TypeScript & ESLint** - Code quality validation
2. **Unit Tests** - Geospatial utility validation
3. **API Integration Tests** - End-to-end validation
4. **District Data Validation** - Batch validation of all districts
5. **Golden Record Checks** - Validates CA-12 and NY-14 coordinates
6. **Security Audit** - Dependency vulnerability scanning
7. **Build Validation** - Production build testing

## Usage

### Running Tests

```bash
# Run all data integrity tests
npm test

# Run specific test suites
npm test src/tests/district-data.test.ts      # Unit tests
npm test src/tests/district-api.test.ts       # Integration tests

# Run with watch mode
npm run test:watch

# Run district data validation
npm run validate-districts
```

### Using Geospatial Utilities

```typescript
import { convertTileToWGS84, CoordinateSystem, validateDistrictData } from '@/lib/geospatial-utils';

// Convert TMS tile coordinates to geographic coordinates
const geoCoord = convertTileToWGS84({ x: 40, y: 157, z: 8 }, CoordinateSystem.TMS);

// Validate district data
const validation = validateDistrictData(districtGeoJSON, '0612');
if (!validation.isValid) {
  console.error('District validation failed:', validation.errors);
}
```

## Validation Results

### Before Framework Implementation

- ❌ **0% success rate** - ALL 1,332 district files failed validation
- ❌ **Wrong hemisphere** - All districts had negative latitude
- ❌ **No quality gates** - Bugs shipped to production undetected

### After Framework Implementation

- ✅ **98.4% success rate** - 1,311/1,332 districts pass validation
- ✅ **Correct coordinates** - All continental US districts have positive latitude
- ✅ **Golden records validated** - CA-12 and NY-14 confirmed accurate
- ✅ **CI/CD protection** - Automated validation prevents regressions

### Sample Results

```
📊 VALIDATION REPORT
════════════════════════════════════════

Total Districts Validated: 1332
✅ Passed: 1311
❌ Failed: 21
Success Rate: 98.4%

📈 METRICS SUMMARY:
──────────────────
Average First Point: [-91.7409, 37.1442]
Districts with negative latitude: 3
```

## Quality Gates

### Required Checks for Pull Requests

All pull requests must pass these checks:

1. ✅ **TypeScript compilation** - No type errors
2. ✅ **ESLint code quality** - No linting issues
3. ✅ **Unit tests** - All 18 tests pass
4. ✅ **Integration tests** - API endpoints validated
5. ✅ **District validation** - >95% success rate required
6. ✅ **Golden record checks** - CA-12 & NY-14 coordinates verified
7. ✅ **Security audit** - No high/critical vulnerabilities

### Automatic Validations

- **Hemisphere Check**: NO districts can have negative latitude in continental US
- **Coordinate Bounds**: All coordinates must be within US geographic bounds
- **Golden Record Match**: CA-12 must match San Francisco, NY-14 must match NYC
- **API Consistency**: Multiple requests return identical data
- **Format Support**: All district ID formats (CA-12, 06-12, 0612) work correctly

## Emergency Procedures

### If Coordinate System Bug Detected

1. **Immediate Response**:

   ```bash
   # Check current data integrity
   npm run validate-districts

   # Run golden record validation
   npm test src/tests/district-data.test.ts
   ```

2. **If Critical Failure Detected**:
   - CI/CD will automatically block deployment
   - Review validation errors in GitHub Actions logs
   - Fix coordinate conversion logic in `src/lib/geospatial-utils.ts`
   - Re-run district extraction with corrected utilities

3. **Recovery Process**:

   ```bash
   # Regenerate all districts with fixed coordinates
   node scripts/complete-district-extraction.js

   # Validate corrected data
   npm run validate-districts

   # Confirm golden records pass
   npm test
   ```

## Maintenance

### Adding New Golden Records

To add validation for a new district:

1. Add golden coordinate to `GOLDEN_COORDINATES` in `geospatial-utils.ts`
2. Add test case in `district-data.test.ts`
3. Add API integration test in `district-api.test.ts`
4. Update CI workflow to include new validation

### Updating Coordinate System Logic

Any changes to coordinate conversion logic must:

1. Update utility functions in `src/lib/geospatial-utils.ts`
2. Add/update unit tests in `src/tests/district-data.test.ts`
3. Verify golden records still pass
4. Run full district validation to confirm no regressions

## Performance

### Test Execution Times

- **Unit tests**: ~1-2 seconds (18 tests)
- **Integration tests**: ~30 seconds (includes API calls)
- **District validation**: ~15 seconds (validates 50 districts)
- **Full CI pipeline**: ~5-8 minutes

### Validation Scale

- **Districts validated**: 1,332 files (444 districts × 3 detail levels)
- **Coordinate points**: ~50,000+ geographic coordinates validated
- **API endpoints**: 15+ endpoint combinations tested
- **Quality checks**: 7 different validation types per PR

## Documentation

- **Framework Overview**: `docs/DATA_INTEGRITY_FRAMEWORK.md` (this file)
- **API Documentation**: `docs/API_REFERENCE.md`
- **Development Guide**: `docs/DEVELOPMENT_GUIDE.md`
- **Troubleshooting**: `docs/TROUBLESHOOTING.md`

## Badge Status

Add this badge to your README.md to show data integrity status:

```markdown
[![Data Integrity](https://github.com/civdotiq/civic-intel-hub/workflows/Data%20Integrity%20Validation/badge.svg)](https://github.com/civdotiq/civic-intel-hub/actions/workflows/data-integrity-checks.yml)
```

---

**The "Trust but Verify" protocol ensures that civic data accuracy is maintained at all times, protecting democratic integrity through automated validation.**
