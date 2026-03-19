# Multi-District ZIP Code Feature

## Overview

The Multi-District ZIP Code feature enables users to search for representatives using ZIP codes that span multiple congressional districts. When a ZIP code crosses district boundaries, the system presents users with a selection prompt to choose their specific district, ensuring accurate representative information.

## Features

- **Automatic Detection**: Identifies ZIP codes that span multiple congressional districts
- **Interactive Selection**: Presents users with district options when multiple districts are found
- **Address Resolution**: Allows users to enter their street address for precise district determination
- **Universal Compatibility**: Works with all 435 congressional districts across all 50 states
- **At-Large District Support**: Properly handles single at-large districts in states like Alaska and Delaware

## Technical Implementation

### Core Components

1. **RepresentativesClient.tsx**: Main component handling multi-district logic and state management
2. **AddressPrompt**: Modal component for district selection
3. **DistrictHeader**: Displays district information and demographics
4. **Multi-District API**: Backend service for ZIP code to district mapping

### Key Functions

#### District Normalization

```typescript
const normalizeDistrict = (d: string | null | undefined): string | number => {
  // Handle null, undefined, and common at-large string formats
  if (!d || d === 'AL' || d === 'At-Large' || d === '00' || d === '0') {
    return 'AT_LARGE';
  }

  // Handle numeric districts like "2" or "02"
  const parsed = parseInt(d, 10);

  // If parsing fails, fallback to original string
  // Special case: if parsed is 0, treat as at-large
  if (isNaN(parsed)) {
    return d;
  }
  return parsed === 0 ? 'AT_LARGE' : parsed;
};
```

This function ensures consistent comparison between different district format representations:

- Numeric districts: "2", "02" → normalized to integer `2`
- At-large districts: "0", "00", "AL", "At-Large", null → normalized to `"AT_LARGE"`
- Unknown formats: fallback to original string

#### Representative Filtering

```typescript
// Filter by selected district when one is chosen
if (searchState.selectedDistrictInfo) {
  const selectedDistrict = searchState.selectedDistrictInfo;
  filtered = filtered.filter(
    rep =>
      rep.chamber === 'Senate' || // Always include Senators
      (rep.chamber === 'House' &&
        rep.state === selectedDistrict.state &&
        normalizeDistrict(rep.district) === normalizeDistrict(selectedDistrict.district))
  );
}
```

## API Endpoints

### Multi-District Detection

```
GET /api/representatives-multi-district?zip=29223
```

Response for multi-district ZIP:

```json
{
  "success": true,
  "zipCode": "29223",
  "isMultiDistrict": true,
  "districts": [
    {
      "state": "SC",
      "district": "02",
      "primary": true,
      "confidence": "high"
    },
    {
      "state": "SC",
      "district": "06",
      "primary": false,
      "confidence": "high"
    }
  ],
  "representatives": [...],
  "warnings": ["This ZIP code spans 2 congressional districts..."]
}
```

### District-Specific Representatives

```
GET /api/representatives-multi-district?zip=29223&district=SC-02
```

Returns only representatives for the specified district plus senators.

## User Experience Flow

### Single District ZIP Code

1. User enters ZIP code (e.g., "10001")
2. System automatically shows representatives for that district
3. DistrictHeader displays district information
4. Representative list shows House rep + 2 Senators

### Multi-District ZIP Code

1. User enters ZIP code (e.g., "29223")
2. System detects multiple districts (SC-02, SC-06)
3. AddressPrompt modal appears with options:
   - Manual district selection buttons
   - Street address input for automatic detection
4. User selects district (e.g., SC-02)
5. DistrictHeader shows ZIP code with selected district context
6. Representative list filters to show only SC-02 House rep + 2 Senators

### At-Large State ZIP Code

1. User enters ZIP code (e.g., "99501" in Alaska)
2. System shows single at-large representative + 2 Senators
3. No selection prompt needed

## Supported District Formats

The system handles various district identifier formats found across different government APIs:

- **Standard numeric**: "1", "2", "7", "34"
- **Zero-padded**: "01", "02", "07"
- **At-large variations**: "0", "00", "AL", "At-Large", null

## Testing

### Test Cases Covered

1. **Multi-district ZIPs**:
   - ZIP 29223 (SC-02, SC-06)
   - ZIP 90017 (CA-34, CA-37)

2. **Single-district ZIPs**:
   - ZIP 10001 (NY-12)
   - ZIP 29650 (SC-04)

3. **At-large states**:
   - ZIP 99501 (Alaska)
   - ZIP 19901 (Delaware)

4. **Edge cases**:
   - Invalid ZIP codes
   - Network failures
   - Malformed API responses

### Manual Testing Steps

1. Navigate to `/representatives`
2. Test various ZIP codes:
   ```
   29223 → Should show district selection
   99501 → Should show Alaska at-large
   10001 → Should show single NY district
   ```
3. Verify district selection works correctly
4. Confirm representative filtering after selection
5. Test address input functionality

## Error Handling

- **Invalid ZIP codes**: Clear error messages
- **Network failures**: Graceful fallback with retry options
- **No representatives found**: Appropriate messaging
- **Malformed data**: Defensive programming with fallbacks

## Performance Considerations

- **Caching**: ZIP code lookups cached for 30 minutes
- **Lazy loading**: District data fetched only when needed
- **Debouncing**: Address input debounced to reduce API calls
- **Normalization**: Efficient district comparison with minimal overhead

## Browser Compatibility

- Modern browsers with ES6 support
- React 18 compatibility
- Mobile-responsive design
- Accessibility (WCAG 2.1 AA compliance)

## Data Sources

- **Congress.gov API**: Official congressional data
- **Census Bureau**: District demographic information
- **ZIP-District Mapping**: Comprehensive ZIP to district database
- **FEC**: Campaign finance data integration

## Future Enhancements

- Real-time district boundary updates
- Enhanced demographic visualizations
- Historical district change tracking
- Integration with local election data

## Development Notes

- Uses React hooks for state management
- TypeScript strict mode enabled
- Comprehensive error boundaries
- Performance monitoring via telemetry
- Full test coverage required for production
