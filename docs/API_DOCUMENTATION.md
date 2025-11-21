# CIV.IQ ZIP Code Mapping API Documentation

## Overview

The CIV.IQ ZIP Code Mapping API provides comprehensive access to congressional district information for all 39,363 ZIP codes in the United States. This API supports both standard single-district lookups and enhanced multi-district ZIP code handling for the 119th Congress (2025-2027).

## Base URL

```
https://your-domain.com/api
```

## Authentication

No authentication is required for public API endpoints. All endpoints are subject to rate limiting to ensure fair usage.

## Rate Limiting

- **Requests per minute**: 100 requests
- **Burst capacity**: 200 requests
- **Rate limit headers**: Included in all responses

## API Endpoints

### 1. Representatives Lookup

Get representative information for a ZIP code.

**Endpoint**: `GET /api/representatives`

**Parameters**:

- `zip` (required): 5-digit ZIP code

**Example Request**:

```bash
curl "https://your-domain.com/api/representatives?zip=48221"
```

**Example Response**:

```json
{
  "success": true,
  "representatives": [
    {
      "bioguideId": "R000572",
      "name": "Mike Rogers",
      "party": "Republican",
      "state": "MI",
      "district": "12",
      "chamber": "House",
      "title": "Representative",
      "phone": "(202) 225-4872",
      "website": "https://mikerogers.house.gov",
      "contactInfo": {
        "phone": "(202) 225-4872",
        "website": "https://mikerogers.house.gov",
        "office": "2112 Rayburn House Office Building"
      }
    },
    {
      "bioguideId": "S000770",
      "name": "Debbie Stabenow",
      "party": "Democrat",
      "state": "MI",
      "chamber": "Senate",
      "title": "Senator",
      "phone": "(202) 224-4822",
      "website": "https://stabenow.senate.gov",
      "contactInfo": {
        "phone": "(202) 224-4822",
        "website": "https://stabenow.senate.gov",
        "office": "731 Hart Senate Office Building"
      }
    }
  ],
  "metadata": {
    "timestamp": "2025-01-15T12:00:00Z",
    "zipCode": "48221",
    "dataQuality": "high",
    "dataSource": "congress-legislators + census",
    "cacheable": true,
    "freshness": "Retrieved in 145ms",
    "validationScore": 95,
    "validationStatus": "excellent"
  }
}
```

### 2. Multi-District Representatives Lookup

Enhanced endpoint for ZIP codes that span multiple congressional districts.

**Endpoint**: `GET /api/representatives-multi-district`

**Parameters**:

- `zip` (required): 5-digit ZIP code
- `district` (optional): Preferred district selection

**Example Request**:

```bash
curl "https://your-domain.com/api/representatives-multi-district?zip=01007"
```

**Example Response**:

```json
{
  "success": true,
  "zipCode": "01007",
  "isMultiDistrict": true,
  "districts": [
    {
      "state": "MA",
      "district": "01",
      "primary": true,
      "confidence": "high"
    },
    {
      "state": "MA",
      "district": "02",
      "primary": false,
      "confidence": "high"
    }
  ],
  "primaryDistrict": {
    "state": "MA",
    "district": "01",
    "primary": true,
    "confidence": "high"
  },
  "representatives": [
    {
      "bioguideId": "N000015",
      "name": "Richard Neal",
      "party": "Democrat",
      "state": "MA",
      "district": "01",
      "chamber": "House",
      "title": "Representative",
      "phone": "(202) 225-5601",
      "website": "https://neal.house.gov",
      "contactInfo": {
        "phone": "(202) 225-5601",
        "website": "https://neal.house.gov",
        "office": "2309 Rayburn House Office Building"
      }
    }
  ],
  "warnings": ["This ZIP code spans 2 congressional districts. Results show the primary district."],
  "metadata": {
    "timestamp": "2025-01-15T12:00:00Z",
    "dataSource": "comprehensive-mapping",
    "totalDistricts": 2,
    "lookupMethod": "comprehensive",
    "processingTime": 3.2,
    "coverage": {
      "zipFound": true,
      "representativesFound": true,
      "dataQuality": "excellent"
    }
  }
}
```

### 3. District Information

Get detailed information about a specific congressional district.

**Endpoint**: `GET /api/districts/{state}-{district}`

**Parameters**:

- `state` (required): 2-letter state code
- `district` (required): 2-digit district number (use "00" for at-large)

**Example Request**:

```bash
curl "https://your-domain.com/api/districts/MI-12"
```

**Example Response**:

```json
{
  "success": true,
  "district": {
    "state": "MI",
    "district": "12",
    "name": "Michigan's 12th Congressional District",
    "representative": {
      "bioguideId": "R000572",
      "name": "Mike Rogers",
      "party": "Republican"
    },
    "demographics": {
      "population": 775341,
      "medianIncome": 52000,
      "urbanRural": "Mixed"
    },
    "zipCodes": ["48221", "48222", "48223", "48224"]
  },
  "metadata": {
    "timestamp": "2025-01-15T12:00:00Z",
    "dataSource": "census + congress-legislators",
    "dataQuality": "high"
  }
}
```

### 4. Health Check

Check API health and performance metrics.

**Endpoint**: `GET /api/health`

**Example Request**:

```bash
curl "https://your-domain.com/api/health"
```

**Example Response**:

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "metrics": {
    "totalRequests": 150000,
    "averageResponseTime": 0.5,
    "errorRate": 0.001,
    "cacheHitRate": 0.85
  },
  "services": {
    "database": "healthy",
    "census-api": "healthy",
    "congress-legislators": "healthy"
  }
}
```

## Response Format

All API responses follow a consistent structure:

```json
{
  "success": boolean,
  "data": { ... },
  "metadata": {
    "timestamp": "ISO 8601 timestamp",
    "dataQuality": "high|medium|low|unavailable",
    "dataSource": "string",
    "cacheable": boolean,
    "processingTime": "milliseconds"
  },
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

## Error Handling

### HTTP Status Codes

- **200**: Success
- **400**: Bad Request - Invalid parameters
- **404**: Not Found - ZIP code or district not found
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error
- **503**: Service Unavailable - Temporary service issues

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ZIP_CODE",
    "message": "ZIP code must be 5 digits (e.g., 10001)",
    "details": {
      "provided": "1234",
      "expected": "5-digit format"
    }
  },
  "metadata": {
    "timestamp": "2025-01-15T12:00:00Z",
    "dataQuality": "unavailable",
    "dataSource": "validation-error"
  }
}
```

### Common Error Codes

- `MISSING_ZIP_CODE`: ZIP code parameter is required
- `INVALID_ZIP_CODE`: ZIP code format is invalid
- `DISTRICT_NOT_FOUND`: Congressional district not found
- `REPRESENTATIVES_DATA_UNAVAILABLE`: Representative data temporarily unavailable
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_SERVER_ERROR`: Unexpected server error

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Basic ZIP code lookup
async function lookupRepresentatives(zipCode) {
  try {
    const response = await axios.get(`https://your-domain.com/api/representatives?zip=${zipCode}`);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data?.error?.message || error.message);
    throw error;
  }
}

// Multi-district lookup
async function lookupMultiDistrict(zipCode) {
  try {
    const response = await axios.get(
      `https://your-domain.com/api/representatives-multi-district?zip=${zipCode}`
    );

    if (response.data.isMultiDistrict) {
      console.log(`ZIP ${zipCode} spans ${response.data.districts.length} districts`);
      console.log('Primary district:', response.data.primaryDistrict);
    }

    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data?.error?.message || error.message);
    throw error;
  }
}

// Usage examples
lookupRepresentatives('48221').then(data => {
  console.log('Representatives:', data.representatives);
});

lookupMultiDistrict('01007').then(data => {
  console.log('Multi-district info:', data);
});
```

### Python

```python
import requests

class CiviqAPI:
    def __init__(self, base_url="https://your-domain.com/api"):
        self.base_url = base_url
        self.session = requests.Session()

    def lookup_representatives(self, zip_code):
        """Look up representatives for a ZIP code."""
        url = f"{self.base_url}/representatives"
        params = {"zip": zip_code}

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_data = response.json() if response.content else {}
            raise Exception(f"API Error: {error_data.get('error', {}).get('message', str(e))}")

    def lookup_multi_district(self, zip_code):
        """Look up multi-district information for a ZIP code."""
        url = f"{self.base_url}/representatives-multi-district"
        params = {"zip": zip_code}

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_data = response.json() if response.content else {}
            raise Exception(f"API Error: {error_data.get('error', {}).get('message', str(e))}")

# Usage examples
api = CiviqAPI()

# Standard lookup
try:
    data = api.lookup_representatives("48221")
    print(f"Found {len(data['representatives'])} representatives")
    for rep in data['representatives']:
        print(f"- {rep['name']} ({rep['party']}) - {rep['chamber']}")
except Exception as e:
    print(f"Error: {e}")

# Multi-district lookup
try:
    data = api.lookup_multi_district("01007")
    if data['isMultiDistrict']:
        print(f"ZIP spans {len(data['districts'])} districts")
        print(f"Primary district: {data['primaryDistrict']['state']}-{data['primaryDistrict']['district']}")
except Exception as e:
    print(f"Error: {e}")
```

### cURL Examples

```bash
# Basic representative lookup
curl -X GET "https://your-domain.com/api/representatives?zip=48221" \
  -H "Accept: application/json"

# Multi-district lookup with pretty formatting
curl -X GET "https://your-domain.com/api/representatives-multi-district?zip=01007" \
  -H "Accept: application/json" | jq '.'

# Health check
curl -X GET "https://your-domain.com/api/health" \
  -H "Accept: application/json"

# Error handling example
curl -X GET "https://your-domain.com/api/representatives?zip=invalid" \
  -H "Accept: application/json" \
  -w "HTTP Status: %{http_code}\n"
```

## Special Cases

### Multi-District ZIP Codes

Some ZIP codes span multiple congressional districts. The API handles these cases by:

1. **Primary District**: Identified based on population distribution
2. **All Districts**: Complete list of all districts the ZIP code spans
3. **Warnings**: Clear indication of multi-district status

**Example**:

```json
{
  "isMultiDistrict": true,
  "districts": [
    { "state": "MA", "district": "01", "primary": true },
    { "state": "MA", "district": "02", "primary": false }
  ],
  "warnings": ["This ZIP code spans 2 congressional districts."]
}
```

### Territories

U.S. territories have non-voting delegates in Congress:

**Supported Territories**:

- **GU**: Guam
- **PR**: Puerto Rico
- **VI**: U.S. Virgin Islands
- **AS**: American Samoa
- **MP**: Northern Mariana Islands

**Example**:

```json
{
  "representatives": [
    {
      "name": "Jenniffer González-Colón",
      "state": "PR",
      "district": "00",
      "chamber": "House",
      "title": "Delegate (Non-voting)"
    }
  ],
  "warnings": ["This territory has non-voting representation in Congress."]
}
```

### District of Columbia

Washington D.C. has a non-voting delegate:

**Example**:

```json
{
  "representatives": [
    {
      "name": "Eleanor Holmes Norton",
      "state": "DC",
      "district": "00",
      "chamber": "House",
      "title": "Delegate (Non-voting)"
    }
  ],
  "warnings": ["District of Columbia has non-voting representation in Congress."]
}
```

### At-Large Districts

Some states have only one representative for the entire state:

**At-Large States**: AK, DE, MT, ND, SD, VT, WY

**Example**:

```json
{
  "representatives": [
    {
      "name": "Ryan Zinke",
      "state": "MT",
      "district": "00",
      "chamber": "House",
      "title": "Representative (At-Large)"
    }
  ]
}
```

## Performance Considerations

### Response Times

- **Standard API**: < 500ms typical response time
- **Multi-District API**: < 500ms typical response time
- **Cached responses**: < 100ms typical response time

### Caching

- ZIP code lookups are cached for 24 hours
- Representative information is cached for 6 hours
- District information is cached for 1 week

### Rate Limiting

- Implement exponential backoff for rate-limited requests
- Use the `Retry-After` header for rate limit recovery
- Consider caching responses locally to reduce API calls

## Testing

### Test ZIP Codes

Use these ZIP codes for testing different scenarios:

```javascript
const testZipCodes = {
  standard: '48221', // Detroit, MI - Standard single district
  multiDistrict: '01007', // Massachusetts - Multi-district
  territory: '00601', // Puerto Rico - Territory
  dc: '20001', // Washington D.C.
  atLarge: '99501', // Alaska - At-large district
  invalid: '00000', // Invalid ZIP code
  nonExistent: '99999', // Non-existent ZIP code
};
```

### Test Scenarios

1. **Valid ZIP Code**: Should return representative information
2. **Multi-District ZIP**: Should return multiple districts with primary marked
3. **Invalid ZIP**: Should return 400 error with helpful message
4. **Rate Limiting**: Should return 429 error when exceeded
5. **Service Unavailable**: Should return 503 error with retry information

## Changelog

### Version 1.0.0 (2025-01-15)

- Initial release with 39,363 ZIP code coverage
- Multi-district ZIP code support
- Territory and DC representation
- Comprehensive error handling
- Performance optimizations

## Support

### Documentation

- Full API documentation: `/docs/API_DOCUMENTATION.md`
- System overview: `/docs/ZIP_CODE_MAPPING_SYSTEM.md`
- Implementation guide: `/docs/IMPLEMENTATION_GUIDE.md`

### Issues and Support

- GitHub Issues: https://github.com/civdotiq/civic-intel-hub/issues
- Feature Requests: Use "enhancement" label
- Bug Reports: Use "bug" label

### Community

- Discussions: GitHub Discussions
- Updates: Follow project releases
- Contributing: See CONTRIBUTING.md

## License

This API is part of the CIV.IQ Civic Information Hub, licensed under MIT License. See LICENSE for details.
