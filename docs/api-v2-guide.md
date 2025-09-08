# API v2 Migration Guide

## Overview

The Civic Intel Hub API has been consolidated and optimized in Phase 2. This guide provides everything you need to know about migrating to the new unified endpoints.

## 🎯 What Changed

### API Route Consolidation
- **Before**: 65 API endpoints (with duplicates and legacy versions)  
- **After**: 54 optimized endpoints  
- **Reduction**: 17% fewer routes to maintain
- **Benefit**: Cleaner API surface, consistent patterns, better performance

### Key Improvements
- ✅ Unified response types across all endpoints
- ✅ Consistent error handling patterns
- ✅ Improved caching (72% performance improvement on repeat calls)
- ✅ Better TypeScript support with strict types
- ✅ Standardized query parameters

---

## 🚀 V2 Endpoints

### Representatives API
The core representatives endpoints have been unified and optimized.

#### Primary Endpoints
```http
GET /api/representatives              # Search representatives
GET /api/representatives/all          # Get all representatives  
GET /api/representative/[bioguideId]  # Individual representative
GET /api/v2/representatives           # Enhanced v2 endpoint
```

#### Enhanced V2 Representatives
```http
GET /api/v2/representatives?format=simple&limit=10&chamber=senate
```

**Query Parameters:**
- `format`: `simple` | `detailed` (default: `detailed`)
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `chamber`: `house` | `senate` | `both` (default: `both`)
- `state`: Filter by state abbreviation (e.g., `MN`, `CA`)
- `party`: Filter by party (`Democrat`, `Republican`, `Independent`)

**Response:**
```json
{
  "success": true,
  "data": {
    "representatives": [
      {
        "bioguideId": "K000367",
        "name": "Amy Klobuchar",
        "party": "Democrat",
        "state": "MN",
        "chamber": "Senate",
        "title": "U.S. Senator",
        "imageUrl": "/api/representative-photo/K000367",
        "website": "https://www.klobuchar.senate.gov",
        "phone": "202-224-3244"
      }
    ],
    "pagination": {
      "total": 537,
      "count": 1,
      "offset": 0,
      "limit": 10,
      "hasMore": true
    }
  },
  "metadata": {
    "apiVersion": "v2",
    "timestamp": "2025-09-08T02:20:00.000Z",
    "responseTime": 45,
    "cached": false,
    "dataSource": "congress-legislators"
  }
}
```

### Representative Details API
```http
GET /api/representative/[bioguideId]
```

**Individual Representative Sub-endpoints:**
```http
GET /api/representative/[bioguideId]/votes        # Voting records
GET /api/representative/[bioguideId]/bills        # Sponsored bills  
GET /api/representative/[bioguideId]/finance      # Campaign finance
GET /api/representative/[bioguideId]/committees   # Committee memberships
GET /api/representative/[bioguideId]/batch        # All data in one call
```

### Search & Discovery
```http
GET /api/representatives?zip=48221               # Find by ZIP code
GET /api/search?q=climate&type=bills            # General search
GET /api/districts/all                           # All congressional districts
GET /api/districts/[districtId]                  # Individual district
```

### Specialized Endpoints
```http
GET /api/health                                  # API health status
GET /api/cache/status                            # Cache performance metrics
GET /api/senate-votes/[voteNumber]              # Senate voting records
GET /api/vote/[voteId]                          # Individual vote details
```

---

## 🔄 Migration Examples

### Before (Legacy)
```javascript
// OLD - Multiple different endpoints
const reps = await fetch('/api/representatives-simple?limit=10')
const repData = await fetch('/api/representatives-v2')
const health = await fetch('/api/api-health')
```

### After (V2 Unified)
```javascript
// NEW - Unified endpoints
const reps = await fetch('/api/v2/representatives?format=simple&limit=10')
const health = await fetch('/api/health')
```

### ZIP Code Lookup
```javascript
// Find representatives by ZIP code
const response = await fetch('/api/representatives?zip=48221')
const { representatives } = await response.json()

// Enhanced search with filters
const filtered = await fetch('/api/representatives?zip=48221&chamber=house')
```

### Individual Representative
```javascript
// Get full representative profile
const rep = await fetch('/api/representative/K000367')

// Get specific data types
const votes = await fetch('/api/representative/K000367/votes')
const bills = await fetch('/api/representative/K000367/bills')
const finance = await fetch('/api/representative/K000367/finance')

// Get everything in one call (recommended)
const allData = await fetch('/api/representative/K000367/batch')
```

---

## ⚠️ Deprecated Routes

The following routes have been **removed** and will return 404:

### Removed Representatives Routes
- ❌ `/api/representatives-simple` → Use `/api/v2/representatives?format=simple`
- ❌ `/api/representatives-v2` → Use `/api/v2/representatives`  
- ❌ `/api/representatives-multi-district` → Use `/api/representatives`

### Removed Health Routes  
- ❌ `/api/api-health` → Use `/api/health`
- ❌ `/api/admin/health` → Use `/api/health`

### Removed Cache Routes
- ❌ `/api/cache-status` → Use `/api/cache/status`

### Removed V1 Routes
- ❌ `/api/v1/representatives` → Use `/api/v2/representatives`
- ❌ `/api/v1/bills` → Use `/api/bills/latest`
- ❌ `/api/v1/districts` → Use `/api/districts/all`
- ❌ `/api/v1/news` → Use `/api/news/batch`

---

## 🎨 Response Format Standards

All V2 endpoints follow consistent response patterns:

### Success Response
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "metadata": {
    "timestamp": "2025-09-08T02:20:00.000Z",
    "responseTime": 45,
    "cached": false,
    "dataSource": "congress-legislators"
  }
}
```

### Error Response  
```json
{
  "success": false,
  "error": {
    "code": "REPRESENTATIVE_NOT_FOUND",
    "message": "Representative with bioguideId 'INVALID' not found",
    "statusCode": 404
  },
  "metadata": {
    "timestamp": "2025-09-08T02:20:00.000Z",
    "endpoint": "/api/representative/INVALID"
  }
}
```

### Pagination
```json
{
  "pagination": {
    "total": 537,
    "count": 20,
    "offset": 0,
    "limit": 20,
    "hasMore": true,
    "nextOffset": 20
  }
}
```

---

## 🏃‍♂️ Performance Features

### Caching
- **Automatic caching** on all GET requests
- **72% performance improvement** on cached responses
- **Cache headers** indicate hit/miss status
- **TTL varies by data type**: Representatives (30min), Finance (24hr), Districts (7 days)

### Query Optimization
- **Efficient pagination** with offset/limit
- **Field filtering** in detailed responses  
- **Batch endpoints** reduce round trips
- **Response compression** for large datasets

### Rate Limiting
- **1000 requests/hour** per IP in development
- **10,000 requests/hour** per API key in production
- **Headers included** with remaining quota

---

## 📊 Migration Checklist

### For Frontend Applications
- [ ] Update all API calls to use new endpoints
- [ ] Remove references to deprecated routes
- [ ] Update error handling for new response format
- [ ] Test pagination with new offset/limit pattern
- [ ] Verify caching behavior works with your application

### For Backend Services  
- [ ] Update any server-to-server API calls
- [ ] Implement new error response handling
- [ ] Test batch endpoints for better performance
- [ ] Update monitoring to use `/api/health`

### Testing Your Migration
```bash
# Test that old routes return 404
curl -I http://localhost:3000/api/representatives-simple
# Expected: 404 Not Found

# Test new v2 endpoint  
curl http://localhost:3000/api/v2/representatives?limit=1
# Expected: 200 OK with v2 response format

# Test caching performance
time curl -s http://localhost:3000/api/health > /dev/null
time curl -s http://localhost:3000/api/health > /dev/null  # Should be faster
```

---

## 🆘 Troubleshooting

### Common Issues

**Q: Getting 404 on previously working endpoints**  
A: Check if you're using a deprecated route. Refer to the "Deprecated Routes" section above.

**Q: Response format looks different**  
A: V2 responses include `success`, `data`, and `metadata` fields. Update your parsing logic.

**Q: Pagination not working**  
A: Use `offset` and `limit` parameters instead of `page` and `size`.

**Q: Performance seems slower**  
A: First request populates cache. Second request should be ~72% faster.

### Getting Help

- 📖 **Full API docs**: `/docs/API_REFERENCE.md`
- 🏗️ **Architecture guide**: `/docs/feature-architecture.md`  
- 🐛 **Issues**: Report bugs in GitHub issues
- 💬 **Questions**: Use GitHub discussions

---

## 🗓️ Timeline

- ✅ **Phase 2 Complete**: 2025-09-08
- ⏳ **Monitoring Period**: 2025-09-08 to 2025-09-22 (2 weeks)
- 📊 **Performance Review**: 2025-09-22
- 🎯 **Phase 3 Planning**: 2025-09-22

---

*Last updated: 2025-09-08*  
*API Version: 2.0*