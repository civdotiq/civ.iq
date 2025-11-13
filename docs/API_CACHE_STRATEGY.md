# API Route Caching Strategy

## Cache Duration Reference

| Duration  | Seconds | Use Case                                       |
| --------- | ------- | ---------------------------------------------- |
| 1 week    | 604800  | Biographical data, boundaries, historical data |
| 1 day     | 86400   | Profiles, demographics, statistics             |
| 1 hour    | 3600    | Bills, votes, finance data                     |
| 5 minutes | 300     | News, trending topics                          |
| No cache  | -       | User-specific, search, admin                   |

## Route Categorization

### 1 WEEK (604800s) - Static/Biographical Data

**Representative Biographical:**

- `/api/representative/[bioguideId]/simple` - Lightweight profile
- `/api/representative-photo/[id]` - Photos (local files)

**Committee Biographical:**

- `/api/committee/[committeeId]/wikipedia` - Committee biographies

**Boundaries & Geography:**

- `/api/district-boundaries/[districtId]` - District GeoJSON
- `/api/district-boundaries/metadata` - Boundary metadata
- `/api/state-boundaries/[stateCode]` - State boundaries
- `/api/district-map` - District map data

**Reference Data:**

- `/api/congress/119th/stats` - Congressional statistics
- `/api/districts/all` - All districts list

---

### 1 DAY (86400s) - Profiles & Demographics

**Representative Profiles:**

- `/api/representative/[bioguideId]` - Full profile
- `/api/representative/[bioguideId]/district` - District info
- `/api/representative/[bioguideId]/leadership` - Leadership positions
- `/api/representative/[bioguideId]/committees` - Committee assignments
- `/api/representatives/all` - All representatives

**V2 API:**

- `/api/v2/representatives` - V2 representatives list
- `/api/v2/representatives/[id]` - V2 representative profile

**District Data:**

- `/api/districts/[districtId]` - District profile
- `/api/districts/[districtId]/economic-profile` - Economic data (Census/BLS)
- `/api/districts/[districtId]/government-spending` - Federal spending
- `/api/districts/[districtId]/services-health` - Public services
- `/api/districts/[districtId]/neighbors` - Neighboring districts

**State Data:**

- `/api/state-demographics/[stateCode]` - Census demographics
- `/api/state-executives/[state]` - Governors, etc.
- `/api/state-judiciary/[state]` - State judges

**Committees:**

- `/api/committees` - All committees
- `/api/committee/[committeeId]` - Committee details
- `/api/committee/[committeeId]/timeline` - Committee timeline

**State Legislature:**

- `/api/state-legislature/[state]` - State overview
- `/api/state-legislature/[state]/legislator/[id]` - Legislator profile
- `/api/state-legislature/[state]/committee/[id]` - State committee
- `/api/state-legislature/[state]/committees` - All state committees
- `/api/local-government/[location]` - Local officials

---

### 1 HOUR (3600s) - Legislative Activity

**Bills:**

- `/api/bills/latest` - Latest bills
- `/api/bill/[billId]` - Bill details
- `/api/bill/[billId]/summary` - Bill summary
- `/api/representative/[bioguideId]/bills` - Sponsored bills
- `/api/committee/[committeeId]/bills` - Committee bills
- `/api/committee/[committeeId]/reports` - Committee reports
- `/api/state-legislature/[state]/bill/[id]` - State bill
- `/api/state-bills/[state]` - State bills list
- `/api/state-legislature/[state]/legislator/[id]/bills` - Legislator bills

**Votes:**

- `/api/vote/[voteId]` - Vote details
- `/api/senate-votes/[voteNumber]` - Senate vote
- `/api/representative/[bioguideId]/votes` - Voting records
- `/api/representative/[bioguideId]/votes-simple` - Lightweight votes
- `/api/representative/[bioguideId]/voting-record` - Full voting history
- `/api/representative/[bioguideId]/party-alignment` - Party alignment
- `/api/state-legislature/[state]/legislator/[id]/votes` - State legislator votes

**Finance:**

- `/api/representative/[bioguideId]/finance` - FEC overview
- `/api/representative/[bioguideId]/finance/comprehensive` - Complete finance
- `/api/representative/[bioguideId]/finance/contributors` - Contributors
- `/api/representative/[bioguideId]/finance/expenditures` - Spending
- `/api/representative/[bioguideId]/finance/funding-sources` - Funding
- `/api/representative/[bioguideId]/finance/geography` - Geographic donors
- `/api/representative/[bioguideId]/finance/industries` - Industry contributions
- `/api/representative/[bioguideId]/election-cycles` - Election cycles

**Legislative Context:**

- `/api/representative/[bioguideId]/state-legislature` - Related state data
- `/api/representative/[bioguideId]/lobbying` - Lobbying disclosure
- `/api/representatives/by-district` - Representatives by district
- `/api/state-representatives` - State representatives

**Comparison:**

- `/api/compare` - Compare representatives

---

### 5 MINUTES (300s) - News & Real-Time

**News:**

- `/api/representative/[bioguideId]/news` - Representative news
- `/api/districts/[districtId]/news` - District news
- `/api/state-legislature/[state]/legislator/[id]/news` - Legislator news
- `/api/news/batch` - Batch news processing

**Trending:**

- `/api/representative/[bioguideId]/trending` - Trending topics

**RSS:**

- `/api/cron/rss-aggregator` - RSS aggregation

**Deprecated GDELT (keep existing or add short cache):**

- `/api/gdelt` - GDELT data
- `/api/gdelt/batch` - Batch GDELT
- `/api/gdelt/cache/status` - GDELT cache status

---

### NO CACHE - Dynamic/User-Specific

**Search & Geocoding:**

- `/api/search` - Advanced search
- `/api/geocode` - Address geocoding
- `/api/unified-geocode` - Unified geocoding
- `/api/state-legislators-by-address` - Find by address
- `/api/representatives-multi-district` - Multi-district lookup

**Batch Operations:**

- `/api/representative/[bioguideId]/batch` - Batch data fetch
- `/api/warmup` - Cache warmup

**Admin & Debug:**

- `/api/admin/cache` - Admin cache management
- `/api/admin/fec-health` - FEC API health
- `/api/debug` - Debug info
- `/api/debug/clear-cache` - Clear cache

**Cache Management:**

- `/api/cache/status` - Cache status
- `/api/cache/warm` - Warm cache
- `/api/cache/refresh` - Refresh cache
- `/api/cache/invalidate` - Invalidate cache

**Health Checks:**

- `/api/health` - Health check
- `/api/health/redis` - Redis status

**AI Agent:**

- `/api/agent` - AI agent endpoint (user queries)

---

## Implementation Notes

1. **Next.js 15 Route Segment Config**: Add `export const revalidate = <seconds>` at the top of each route.ts file

2. **Combined with Redis**: These ISR cache times work alongside our Redis caching layer for optimal performance

3. **Manual Invalidation**: Use `/api/cache/invalidate` to manually invalidate specific cache entries when needed

4. **Build-Time Generation**: Routes with long cache times (1 week, 1 day) may benefit from static generation at build time

5. **Edge Cases**: Routes that accept query parameters should consider whether caching is appropriate based on parameter cardinality
