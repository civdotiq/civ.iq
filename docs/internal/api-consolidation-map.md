# API Route Consolidation Map

**Phase 2: API Consolidation Strategy**  
**Current Routes**: 63 endpoints  
**Target Routes**: 28 endpoints  
**Reduction**: 55% (35 routes eliminated)

## Consolidation Categories

### 1. Representatives Endpoints (7 → 1)

**Target**: `/api/v2/representatives`

| Current Route                    | Consolidation Strategy | Query Parameters             |
| -------------------------------- | ---------------------- | ---------------------------- |
| `representatives`                | PRIMARY ENDPOINT       | (none)                       |
| `representatives-simple`         | Query parameter        | `?format=simple`             |
| `representatives-v2`             | MERGE INTO PRIMARY     | (migrate existing logic)     |
| `representatives-multi-district` | Query parameter        | `?includeMultiDistrict=true` |
| `representatives/all`            | Query parameter        | `?includeAll=true`           |
| `representatives/by-district`    | Query parameter        | `?state=XX&district=YY`      |
| `v1/representatives`             | DEPRECATED → REDIRECT  | `?legacy=v1`                 |

**Response Format**: `ListResponse<Representative>` from Phase 1 middleware

### 2. Representative Detail & Sub-endpoints (16 → 5)

#### 2A. Primary Detail Endpoint

**Target**: `/api/v2/representative/[id]`

| Current Route                        | Consolidation Strategy       |
| ------------------------------------ | ---------------------------- |
| `representative/[bioguideId]`        | PRIMARY ENDPOINT             |
| `representative/[bioguideId]/simple` | Query param `?format=simple` |
| `representative/[bioguideId]/batch`  | Query param `?include=batch` |
| `v1/representative`                  | DEPRECATED → REDIRECT        |

#### 2B. Bills & Legislation

**Target**: `/api/v2/representative/[id]/legislation`

| Current Route                       | Consolidation Strategy | Query Parameters        |
| ----------------------------------- | ---------------------- | ----------------------- |
| `representative/[bioguideId]/bills` | PRIMARY ENDPOINT       | `?type=sponsored`       |
| `state-bills/[state]`               | Query parameter        | `?level=state&state=XX` |

#### 2C. Voting Records

**Target**: `/api/v2/representative/[id]/votes`

| Current Route                               | Consolidation Strategy | Query Parameters   |
| ------------------------------------------- | ---------------------- | ------------------ |
| `representative/[bioguideId]/votes`         | PRIMARY ENDPOINT       | (default detailed) |
| `representative/[bioguideId]/votes-simple`  | Query parameter        | `?format=simple`   |
| `representative/[bioguideId]/voting-record` | MERGE                  | (legacy endpoint)  |

#### 2D. Profile & Analytics

**Target**: `/api/v2/representative/[id]/profile`

| Current Route                                 | Consolidation Strategy | Query Parameters      |
| --------------------------------------------- | ---------------------- | --------------------- |
| `representative/[bioguideId]/committees`      | Include section        | `?include=committees` |
| `representative/[bioguideId]/finance`         | Include section        | `?include=finance`    |
| `representative/[bioguideId]/party-alignment` | Include section        | `?include=alignment`  |
| `representative/[bioguideId]/leadership`      | Include section        | `?include=leadership` |
| `representative/[bioguideId]/election-cycles` | Include section        | `?include=elections`  |

#### 2E. External Data

**Target**: `/api/v2/representative/[id]/external`

| Current Route                                   | Consolidation Strategy | Query Parameters  |
| ----------------------------------------------- | ---------------------- | ----------------- |
| `representative/[bioguideId]/news`              | Data type              | `?type=news`      |
| `representative/[bioguideId]/lobbying`          | Data type              | `?type=lobbying`  |
| `representative/[bioguideId]/district`          | Data type              | `?type=district`  |
| `representative/[bioguideId]/state-legislature` | Data type              | `?type=state-leg` |

### 3. Bills & Legislation (3 → 1)

**Target**: `/api/v2/bills`

| Current Route           | Consolidation Strategy | Query Parameters                    |
| ----------------------- | ---------------------- | ----------------------------------- |
| `bills/latest`          | PRIMARY ENDPOINT       | `?sort=latest` (default)            |
| `v1/bills`              | DEPRECATED → REDIRECT  | `?legacy=v1`                        |
| `bill/[billId]/summary` | Detail endpoint        | `/api/v2/bill/[id]?include=summary` |

**Detail Endpoint**: `/api/v2/bill/[id]` (consolidates `bill/[billId]`)

### 4. Committees (4 → 1)

**Target**: `/api/v2/committees`

| Current Route                      | Consolidation Strategy | Query Parameters                  |
| ---------------------------------- | ---------------------- | --------------------------------- |
| `committees`                       | PRIMARY ENDPOINT       | (none)                            |
| `committee/[committeeId]/bills`    | Sub-resource           | `/api/v2/committee/[id]/bills`    |
| `committee/[committeeId]/reports`  | Sub-resource           | `/api/v2/committee/[id]/reports`  |
| `committee/[committeeId]/timeline` | Sub-resource           | `/api/v2/committee/[id]/timeline` |

**Detail Endpoint**: `/api/v2/committee/[id]` (consolidates `committee/[committeeId]`)

### 5. Districts & Geography (5 → 2)

#### 5A. Districts Listing

**Target**: `/api/v2/districts`

| Current Route   | Consolidation Strategy | Query Parameters |
| --------------- | ---------------------- | ---------------- |
| `districts/all` | PRIMARY ENDPOINT       | (default all)    |
| `v1/districts`  | DEPRECATED → REDIRECT  | `?legacy=v1`     |

#### 5B. Geographic Services

**Target**: `/api/v2/geography`

| Current Route                      | Consolidation Strategy | Query Parameters                    |
| ---------------------------------- | ---------------------- | ----------------------------------- |
| `district-map`                     | Service type           | `?service=map`                      |
| `district-boundaries/metadata`     | Service type           | `?service=boundaries&type=metadata` |
| `district-boundaries/[districtId]` | Service type           | `?service=boundaries&id=[id]`       |
| `districts/[districtId]/neighbors` | Service type           | `?service=neighbors&id=[id]`        |

**Detail Endpoint**: `/api/v2/district/[id]` (consolidates `districts/[districtId]`)

### 6. Voting Records (2 → 1)

**Target**: `/api/v2/votes`

| Current Route               | Consolidation Strategy | Query Parameters               |
| --------------------------- | ---------------------- | ------------------------------ |
| `vote/[voteId]`             | Detail endpoint        | `/api/v2/vote/[id]`            |
| `senate-votes/[voteNumber]` | Chamber parameter      | `?chamber=senate&number=[num]` |

### 7. State & Local Government (4 → 1)

**Target**: `/api/v2/government`

| Current Route                 | Consolidation Strategy | Query Parameters                              |
| ----------------------------- | ---------------------- | --------------------------------------------- |
| `state-legislature/[state]`   | Level parameter        | `?level=state&state=[state]&type=legislature` |
| `state-representatives`       | Level parameter        | `?level=state&type=representatives`           |
| `state-executives/[state]`    | Level parameter        | `?level=state&state=[state]&type=executives`  |
| `local-government/[location]` | Level parameter        | `?level=local&location=[loc]`                 |

### 8. Analytics & System (7 → 3)

#### 8A. Analytics

**Target**: `/api/v2/analytics`

| Current Route                | Consolidation Strategy | Query Parameters             |
| ---------------------------- | ---------------------- | ---------------------------- |
| `analytics/voting-trends`    | Analysis type          | `?analysis=voting-trends`    |
| `analytics/campaign-finance` | Analysis type          | `?analysis=campaign-finance` |
| `analytics/effectiveness`    | Analysis type          | `?analysis=effectiveness`    |

#### 8B. System Health

**Target**: `/api/v2/health`

| Current Route  | Consolidation Strategy | Query Parameters |
| -------------- | ---------------------- | ---------------- |
| `health`       | PRIMARY ENDPOINT       | (none)           |
| `admin/health` | Access level           | `?admin=true`    |
| `api-health`   | MERGE INTO PRIMARY     | (legacy)         |

#### 8C. System Utilities

**Target**: `/api/v2/system`

| Current Route               | Consolidation Strategy | Query Parameters               |
| --------------------------- | ---------------------- | ------------------------------ |
| `cache-status`              | Service type           | `?service=cache&action=status` |
| `cache/status`              | MERGE                  | (duplicate of above)           |
| `debug/clear-cache`         | Service type           | `?service=cache&action=clear`  |
| `warmup`                    | Service type           | `?service=warmup`              |
| `representative-photo/[id]` | Service type           | `?service=photo&id=[id]`       |

### 9. Specialized Endpoints (4 → 4)

These remain largely unchanged but adopt new response format:

| Current Route | New Route            | Changes                    |
| ------------- | -------------------- | -------------------------- |
| `search`      | `/api/v2/search`     | Unified response format    |
| `compare`     | `/api/v2/compare`    | Unified response format    |
| `news/batch`  | `/api/v2/news/batch` | Unified response format    |
| `agent`       | `/api/v2/agent`      | Unified response format    |
| `v1/news`     | DEPRECATED           | Redirect to `/api/v2/news` |

## Final Consolidated Structure (28 Routes)

### Core Resources (8 routes)

1. `/api/v2/representatives` (GET) - All representatives with filtering
2. `/api/v2/representative/[id]` (GET) - Individual representative details
3. `/api/v2/bills` (GET) - Bills listing with filtering
4. `/api/v2/bill/[id]` (GET) - Individual bill details
5. `/api/v2/committees` (GET) - Committees listing
6. `/api/v2/committee/[id]` (GET) - Individual committee details
7. `/api/v2/districts` (GET) - Districts listing
8. `/api/v2/district/[id]` (GET) - Individual district details

### Representative Sub-resources (5 routes)

9. `/api/v2/representative/[id]/legislation` (GET) - Bills & legislative history
10. `/api/v2/representative/[id]/votes` (GET) - Voting records & positions
11. `/api/v2/representative/[id]/profile` (GET) - Committees, finance, leadership
12. `/api/v2/representative/[id]/external` (GET) - News, lobbying, district data
13. `/api/v2/representative/[id]/analytics` (GET) - Performance metrics & trends

### Committee Sub-resources (3 routes)

14. `/api/v2/committee/[id]/bills` (GET) - Committee-related bills
15. `/api/v2/committee/[id]/reports` (GET) - Committee reports
16. `/api/v2/committee/[id]/timeline` (GET) - Committee activity timeline

### Specialized Services (7 routes)

17. `/api/v2/votes` (GET) - Cross-chamber voting data
18. `/api/v2/vote/[id]` (GET) - Individual vote details
19. `/api/v2/government` (GET) - State & local government data
20. `/api/v2/geography` (GET) - Maps, boundaries, geographic services
21. `/api/v2/analytics` (GET) - System-wide analytics & trends
22. `/api/v2/search` (GET) - Universal search across all data
23. `/api/v2/compare` (GET) - Representative/bill comparison tools

### System & Utilities (5 routes)

24. `/api/v2/health` (GET) - System health & service status
25. `/api/v2/system` (GET/POST) - Cache, photos, utilities
26. `/api/v2/news/batch` (GET) - Batch news processing
27. `/api/v2/agent` (GET/POST) - AI agent interactions
28. `/api/v2/news` (GET) - News & media data

## Implementation Strategy

### Query Parameter Conventions

```typescript
// Format control
?format=simple|detailed|minimal
?include=committees,finance,leadership  // Comma-separated includes
?exclude=committees,votes              // Comma-separated excludes

// Filtering
?state=CA&district=12                  // Geographic filters
?party=Democrat|Republican|Independent  // Party filters
?chamber=House|Senate                  // Chamber filters
?congress=119&session=1                // Congressional session

// Pagination & Sorting
?page=1&limit=50&sort=name             // Standard pagination
?cursor=eyJpZCI6MTIzfQ==               // Cursor-based pagination
?sort=name,party,-district             // Multi-field sorting

// Data control
?level=federal|state|local             // Government level
?type=bills|votes|news|lobbying        // Data type filters
?analysis=trends|effectiveness|finance  // Analytics type
```

### Backward Compatibility Strategy

1. **Phase 1 (Weeks 1-2)**: Create v2 endpoints alongside existing
2. **Phase 2 (Weeks 3-4)**: Add redirect headers to legacy endpoints
3. **Phase 3 (Weeks 5-6)**: Mark legacy endpoints as deprecated
4. **Phase 4 (Week 7+)**: Remove legacy endpoints after migration period

### Response Format Standardization

All endpoints will use the Phase 1 unified response format:

```typescript
// List endpoints
interface ListResponse<T> {
  success: boolean;
  data: T[];
  count: number;
  metadata: ApiMetadata;
}

// Detail endpoints
interface SingleResponse<T> {
  success: boolean;
  data: T;
  metadata: ApiMetadata;
}

// Error responses
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: ApiMetadata;
}
```

### Validation & Error Handling

Centralized validation middleware will handle:

- Parameter validation (bioguide IDs, state codes, etc.)
- Query parameter sanitization
- Rate limiting and request throttling
- Standardized error response format
- Request/response logging and monitoring

## Migration Checklist

- [ ] **Week 1**: Create v2 representatives endpoints (7→1 consolidation)
- [ ] **Week 1**: Create comprehensive test suite for new endpoints
- [ ] **Week 2**: Consolidate representative sub-endpoints (16→5)
- [ ] **Week 2**: Update frontend to use consolidated endpoints
- [ ] **Week 3**: Migrate bills, committees, districts endpoints
- [ ] **Week 4**: Migrate voting, geography, analytics endpoints
- [ ] **Week 5**: Add deprecation warnings to legacy endpoints
- [ ] **Week 6**: Remove legacy endpoints and cleanup

## Success Metrics

- **Route Reduction**: 63 → 28 endpoints (55% reduction achieved)
- **Response Consistency**: 100% of endpoints use unified format
- **Performance**: <10% impact on average response times
- **Error Rates**: <1% increase during migration period
- **Test Coverage**: >90% coverage for all consolidated endpoints
- **Documentation**: Complete OpenAPI 3.0 specification for v2 API

---

**Status**: 📋 Planning Complete - Ready for Test Implementation  
**Next**: Create comprehensive test suite for TDD approach
