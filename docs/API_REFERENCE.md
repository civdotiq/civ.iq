# API Reference - CIV.IQ

Complete documentation for all API endpoints in the civic-intel-hub platform.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://civ.iq/api`

## Authentication

All public endpoints are currently open. API keys are used for external service integration:

- `CONGRESS_API_KEY` - Congress.gov API access
- `FEC_API_KEY` - Federal Election Commission data
- `CENSUS_API_KEY` - U.S. Census Bureau data

## Endpoints

### Representatives

#### GET /api/representatives

Find federal representatives by ZIP code.

**Query Parameters:**

- `zip` (required): 5-digit ZIP code

**Response:**

```json
{
  "representatives": [
    {
      "bioguideId": "string",
      "name": "string",
      "party": "string",
      "state": "string",
      "district": "string",
      "chamber": "house|senate",
      "imageUrl": "string",
      "office": "string",
      "phone": "string",
      "website": "string"
    }
  ],
  "senators": [...],
  "zipCode": "string",
  "state": "string"
}
```

#### GET /api/representative/[bioguideId]

Get detailed information about a specific representative.

**Parameters:**

- `bioguideId`: Congress bioguide identifier

**Response:**

```json
{
  "bioguideId": "string",
  "name": "string",
  "party": "string",
  "state": "string",
  "district": "string",
  "chamber": "house|senate",
  "imageUrl": "string",
  "office": "string",
  "phone": "string",
  "website": "string",
  "socialMedia": {
    "twitter": "string",
    "facebook": "string",
    "youtube": "string"
  },
  "biography": {
    "birthDate": "string",
    "birthPlace": "string",
    "education": ["string"],
    "previousPositions": ["string"]
  },
  "committees": [
    {
      "name": "string",
      "role": "string",
      "subcommittees": ["string"]
    }
  ],
  "nextElection": "string",
  "termStart": "string",
  "termEnd": "string"
}
```

### Voting Records

#### GET /api/representative/[bioguideId]/votes

Get voting records for a representative (House and Senate).

**Parameters:**

- `bioguideId`: Congress bioguide identifier
- `limit` (optional): Number of records to return (default: 50)
- `offset` (optional): Pagination offset

**Response:**

```json
{
  "votes": [
    {
      "voteId": "string",
      "chamber": "house|senate",
      "date": "string",
      "billNumber": "string",
      "billTitle": "string",
      "question": "string",
      "position": "Yea|Nay|Present|Not Voting",
      "result": "Passed|Failed",
      "voteType": "string",
      "requiredMajority": "string",
      "democratsYea": "number",
      "democratsNay": "number",
      "republicansYea": "number",
      "republicansNay": "number"
    }
  ],
  "totalVotes": "number",
  "votingSummary": {
    "yea": "number",
    "nay": "number",
    "present": "number",
    "notVoting": "number",
    "partyLineVotes": "number",
    "bipartisanVotes": "number"
  }
}
```

### Bills & Legislation

#### GET /api/representative/[bioguideId]/bills

Get bills sponsored or co-sponsored by a representative.

**Parameters:**

- `bioguideId`: Congress bioguide identifier
- `type` (optional): "sponsored" | "cosponsored" | "all" (default: "all")

**Response:**

```json
{
  "sponsored": [
    {
      "billId": "string",
      "number": "string",
      "title": "string",
      "summary": "string",
      "introducedDate": "string",
      "status": "string",
      "lastAction": "string",
      "cosponsorsCount": "number",
      "committee": "string",
      "policyArea": "string"
    }
  ],
  "cosponsored": [...],
  "statistics": {
    "totalSponsored": "number",
    "totalCosponsored": "number",
    "passedHouse": "number",
    "passedSenate": "number",
    "becameLaw": "number"
  }
}
```

#### GET /api/bill/[billId]

Get detailed information about a specific bill.

**Parameters:**

- `billId`: Bill identifier (e.g., "hr1-118" for H.R.1 in 118th Congress)

**Response:**

```json
{
  "billId": "string",
  "number": "string",
  "title": "string",
  "summary": "string",
  "fullText": "string",
  "sponsor": {
    "bioguideId": "string",
    "name": "string",
    "party": "string",
    "state": "string"
  },
  "cosponsors": [...],
  "introducedDate": "string",
  "committees": [...],
  "actions": [...],
  "amendments": [...],
  "relatedBills": [...],
  "cboCostEstimate": "string",
  "subjects": ["string"],
  "policyArea": "string"
}
```

### Campaign Finance

#### GET /api/representative/[bioguideId]/finance

Get FEC campaign finance data for a representative.

**Parameters:**

- `bioguideId`: Congress bioguide identifier
- `cycle` (optional): Election cycle year (default: current cycle)

**Response:**

```json
{
  "summary": {
    "totalRaised": "number",
    "totalSpent": "number",
    "cashOnHand": "number",
    "debt": "number",
    "lastReport": "string"
  },
  "contributions": {
    "individual": "number",
    "pac": "number",
    "party": "number",
    "candidate": "number",
    "other": "number"
  },
  "topContributors": [
    {
      "name": "string",
      "amount": "number",
      "type": "individual|pac|organization"
    }
  ],
  "industries": [
    {
      "name": "string",
      "amount": "number",
      "individuals": "number",
      "pacs": "number"
    }
  ],
  "expenditures": {
    "operating": "number",
    "fundraising": "number",
    "advertising": "number",
    "other": "number"
  },
  "independentExpenditures": {
    "support": "number",
    "oppose": "number"
  }
}
```

### News & Media

#### GET /api/representative/[bioguideId]/news

Get recent news articles about a representative using GDELT.

**Parameters:**

- `bioguideId`: Congress bioguide identifier
- `limit` (optional): Number of articles (default: 20)
- `days` (optional): Days to look back (default: 30)

**Response:**

```json
{
  "articles": [
    {
      "title": "string",
      "url": "string",
      "source": "string",
      "publishDate": "string",
      "summary": "string",
      "imageUrl": "string",
      "sentiment": "positive|neutral|negative",
      "themes": ["string"],
      "mentions": "number"
    }
  ],
  "themes": {
    "healthcare": "number",
    "economy": "number",
    "immigration": "number",
    "climate": "number",
    "education": "number",
    "defense": "number",
    "gunControl": "number",
    "abortion": "number",
    "votingRights": "number",
    "infrastructure": "number"
  },
  "totalArticles": "number",
  "dateRange": {
    "start": "string",
    "end": "string"
  }
}
```

### Party Alignment

#### GET /api/representative/[bioguideId]/party-alignment

Analyze how often a representative votes with their party.

**Parameters:**

- `bioguideId`: Congress bioguide identifier
- `session` (optional): Congressional session number

**Response:**

```json
{
  "alignment": {
    "withParty": "number",
    "againstParty": "number",
    "percentage": "number"
  },
  "comparison": {
    "partyAverage": "number",
    "chamberAverage": "number",
    "stateAverage": "number"
  },
  "notableVotes": [
    {
      "billNumber": "string",
      "title": "string",
      "memberVote": "string",
      "partyMajority": "string",
      "date": "string"
    }
  ]
}
```

### Committees

#### GET /api/committee/[committeeId]

Get detailed information about a congressional committee.

**Parameters:**

- `committeeId`: Committee identifier (e.g., "HSIF" for House Energy & Commerce)

**Response:**

```json
{
  "committeeId": "string",
  "name": "string",
  "chamber": "house|senate|joint",
  "jurisdiction": "string",
  "established": "string",
  "chair": {
    "bioguideId": "string",
    "name": "string",
    "party": "string",
    "state": "string"
  },
  "rankingMember": {...},
  "members": [...],
  "subcommittees": [
    {
      "id": "string",
      "name": "string",
      "chair": {...},
      "members": [...]
    }
  ],
  "recentActivity": [...],
  "website": "string"
}
```

### Districts

#### GET /api/districts/[districtId]

Get information about a congressional district.

**Parameters:**

- `districtId`: District identifier (e.g., "CA-12")

**Response:**

```json
{
  "districtId": "string",
  "state": "string",
  "number": "string",
  "representative": {...},
  "population": "number",
  "demographics": {
    "medianAge": "number",
    "medianIncome": "number",
    "ethnicBreakdown": {...},
    "educationLevels": {...},
    "employmentRate": "number"
  },
  "geography": {
    "area": "number",
    "counties": ["string"],
    "majorCities": ["string"],
    "boundaries": "GeoJSON"
  },
  "votingHistory": [
    {
      "election": "string",
      "democraticVotes": "number",
      "republicanVotes": "number",
      "totalVotes": "number",
      "turnout": "number"
    }
  ],
  "competitiveness": "safe|likely|lean|tossup"
}
```

#### GET /api/district-map

Get interactive map data for districts.

**Query Parameters:**

- `zip` (optional): ZIP code to center on
- `state` (optional): State to display
- `district` (optional): Specific district

**Response:**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "districtId": "string",
        "representative": "string",
        "party": "string",
        "population": "number"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ],
  "center": {
    "lat": "number",
    "lng": "number"
  },
  "zoom": "number"
}
```

### Search

#### GET /api/search

Advanced search across representatives, bills, and committees.

**Query Parameters:**

- `q` (required): Search query
- `type` (optional): "representatives" | "bills" | "committees" | "all"
- `filters` (optional): JSON object with filter criteria

**Response:**

```json
{
  "representatives": [...],
  "bills": [...],
  "committees": [...],
  "totalResults": "number",
  "facets": {
    "party": {...},
    "state": {...},
    "chamber": {...},
    "committees": {...}
  }
}
```

### System

#### GET /api/health

Health check endpoint for monitoring.

**Response:**

```json
{
  "status": "healthy|degraded|unhealthy",
  "version": "string",
  "uptime": "number",
  "services": {
    "congress": "up|down",
    "fec": "up|down",
    "census": "up|down",
    "gdelt": "up|down",
    "database": "up|down"
  },
  "timestamp": "string"
}
```

### Batch Operations

#### POST /api/representative/[bioguideId]/batch

Fetch multiple data types for a representative in one request.

**Parameters:**

- `bioguideId`: Congress bioguide identifier

**Request Body:**

```json
{
  "endpoints": ["votes", "bills", "finance", "news", "party-alignment"],
  "options": {
    "votes": { "limit": 10 },
    "news": { "days": 7 }
  }
}
```

**Response:**

```json
{
  "votes": {...},
  "bills": {...},
  "finance": {...},
  "news": {...},
  "partyAlignment": {...},
  "timing": {
    "total": "number",
    "endpoints": {...}
  }
}
```

### Senate-Specific

#### GET /api/senate-votes/[voteNumber]

Proxy endpoint for Senate.gov XML vote data (handles CORS).

**Parameters:**

- `voteNumber`: Senate roll call vote number
- `session` (optional): Session number (default: current)
- `congress` (optional): Congress number (default: 119)

**Response:**

```json
{
  "voteNumber": "string",
  "date": "string",
  "title": "string",
  "question": "string",
  "result": "string",
  "yeas": "number",
  "nays": "number",
  "members": [
    {
      "bioguideId": "string",
      "name": "string",
      "state": "string",
      "party": "string",
      "vote": "Yea|Nay|Present|Not Voting"
    }
  ]
}
```

## Rate Limiting

API endpoints implement intelligent rate limiting:

- Public endpoints: 100 requests per minute
- Batch endpoints: 20 requests per minute
- Search endpoints: 50 requests per minute

## Caching

Responses are cached with appropriate TTLs:

- Representative profiles: 1 hour
- Voting records: 15 minutes
- News: 5 minutes
- District data: 24 hours
- Committee info: 6 hours

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {...}
  },
  "timestamp": "string",
  "path": "string"
}
```

Common error codes:

- `NOT_FOUND` - Resource not found
- `INVALID_PARAM` - Invalid parameter value
- `RATE_LIMITED` - Too many requests
- `SERVICE_ERROR` - External service failure
- `INTERNAL_ERROR` - Server error

## Data Sources

All data comes from official government sources:

- **Congress.gov** - Legislation, votes, members
- **FEC.gov** - Campaign finance data
- **Census.gov** - Demographics, district boundaries
- **Senate.gov** - Senate roll call votes
- **GDELT** - News aggregation
- **congress-legislators** - Enhanced member data

## Notes

- All endpoints return real data or clear "unavailable" messages
- No mock data is ever generated
- Dates are in ISO 8601 format
- Currency values are in USD cents
- GeoJSON follows RFC 7946 specification
