# CIV.IQ API Documentation

## Overview

The CIV.IQ API provides comprehensive access to U.S. government data with enhanced representative profiles from congress-legislators, advanced features including intelligent caching, request batching, news deduplication, and PWA support. All data is sourced from official government APIs with real-time validation and monitoring.

### Key Features
- **Congress-Legislators Integration**: Enhanced representative profiles with social media, biographical data, and complete contact information
- **Real Party Voting Analysis**: Live party line vote tracking with peer comparisons
- **Interactive District Maps**: Live GeoJSON boundaries with Census TIGER/Line integration
- **Live Census Demographics**: Real ACS data for all congressional districts
- **Batch API System**: Multi-endpoint requests reducing round-trips by 80%
- **Advanced Search**: Comprehensive filtering across multiple criteria
- **Legislative Partnerships**: Collaboration networks and bipartisan voting patterns
- **Intelligent Caching**: Redis-backed caching with automatic fallback
- **Request Batching**: Optimize multiple requests into single API calls
- **News Deduplication**: AI-powered duplicate detection and quality filtering
- **Progressive Loading**: Lazy loading with intersection observers
- **Error Recovery**: Automatic retries with exponential backoff
- **Input Validation**: XSS protection and comprehensive sanitization
- **Real-time Monitoring**: Health checks and performance metrics
- **Null-Safe Operations**: Comprehensive null checking throughout the API

## Base URL

```
Production: https://civic-intel-hub.vercel.app/api
Development: http://localhost:3000/api
Production: https://civiq.org/api
```

## Authentication

Currently, the API is open and does not require authentication. Rate limiting is applied per IP address.

## Rate Limiting

- **Limit**: 100 requests per minute
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## Endpoints

### Representatives

#### Search Representatives by ZIP Code

Find all representatives for a given ZIP code.

```http
GET /api/representatives?zip={zipCode}
```

**Parameters:**
- `zip` (required): 5-digit ZIP code

**Response:**
```json
{
  "representatives": [
    {
      "bioguideId": "S000522",
      "name": "Christopher H. Smith",
      "party": "Republican",
      "state": "NJ",
      "district": "4",
      "chamber": "House",
      "title": "U.S. Representative",
      "imageUrl": "https://bioguide.congress.gov/bioguide/photo/S/S000522.jpg",
      "website": "https://chrissmith.house.gov",
      "phone": "(202) 225-3765",
      "contactInfo": {
        "phone": "(202) 225-3765",
        "website": "https://chrissmith.house.gov",
        "office": "2440 Rayburn House Office Building",
        "contactForm": "https://chrissmith.house.gov/contact"
      },
      "committees": [
        {
          "name": "Committee on Foreign Affairs",
          "role": "Ranking Member"
        }
      ],
      "social": {
        "twitter": "RepChrisSmith",
        "facebook": "RepChrisSmith",
        "youtube": "RepChrisSmithNJ04",
        "instagram": null
      },
      "bio": {
        "gender": "M",
        "stateRank": null
      },
      "ids": {
        "govtrack": 400380,
        "opensecrets": "N00000647",
        "wikipedia": "Chris_Smith_(New_Jersey_politician)"
      }
    }
  ],
  "metadata": {
    "dataSource": "congress-legislators + census",
    "timestamp": "2025-07-06T17:09:53.953Z",
    "zipCode": "08540",
    "totalFound": 3,
    "district": "NJ-4",
    "dataSources": ["congress-legislators", "census.gov"],
    "enhancedDataUsed": true
  }
}
```

#### Get Representative Details

Get detailed information about a specific representative.

```http
GET /api/representative/{bioguideId}
```

**Parameters:**
- `bioguideId` (required): Official Bioguide ID

**Response:**
```json
{
  "representative": {
    "bioguideId": "S000522",
    "name": "Christopher H. Smith",
    "firstName": "Christopher",
    "lastName": "Smith",
    "party": "Republican",
    "state": "NJ",
    "district": "4",
    "chamber": "House",
    "title": "U.S. Representative",
    "phone": "(202) 225-3765",
    "email": null,
    "website": "https://chrissmith.house.gov",
    "imageUrl": "https://bioguide.congress.gov/bioguide/photo/S/S000522.jpg",
    "terms": [
      {
        "congress": "119",
        "startYear": "2023",
        "endYear": "2025"
      }
    ],
    "committees": [
      {
        "name": "Committee on Foreign Affairs",
        "role": "Ranking Member"
      }
    ],
    "fullName": {
      "first": "Christopher",
      "middle": "Henry",
      "last": "Smith",
      "official": "Christopher H. Smith"
    },
    "bio": {
      "birthday": "1953-03-04",
      "gender": "M",
      "religion": "Roman Catholic"
    },
    "currentTerm": {
      "start": "2023-01-03",
      "end": "2025-01-03",
      "office": "2440 Rayburn House Office Building",
      "phone": "(202) 225-3765",
      "website": "https://chrissmith.house.gov",
      "contactForm": "https://chrissmith.house.gov/contact"
    },
    "socialMedia": {
      "twitter": "RepChrisSmith",
      "facebook": "RepChrisSmith",
      "youtube": "RepChrisSmithNJ04",
      "instagram": null
    },
    "ids": {
      "govtrack": 400380,
      "opensecrets": "N00000647",
      "votesmart": 26976,
      "fec": ["H8NJ04100"],
      "cspan": 5929,
      "wikipedia": "Chris_Smith_(New_Jersey_politician)"
    }
  },
  "metadata": {
    "dataSource": "congress-legislators",
    "timestamp": "2025-07-06T17:09:53.953Z",
    "enhancedDataUsed": true
  }
}
```

### Voting Records

#### Get Representative's Recent Votes

```http
GET /api/representative/{bioguideId}/votes
```

**Query Parameters:**
- `limit` (optional): Number of votes to return (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `timeframe` (optional): "6months" | "1year" | "all" (default: "all")
- `position` (optional): "Yea" | "Nay" | "Present" | "Not Voting" | "all" (default: "all")
- `voteType` (optional): "key" | "passed" | "failed" | "all" (default: "all")
- `search` (optional): Search term for bill titles or numbers

**Response:**
```json
{
  "votes": [
    {
      "rollCall": 123,
      "date": "2024-03-15",
      "question": "On Passage",
      "bill": {
        "number": "H.R. 1234",
        "title": "Infrastructure Investment Act"
      },
      "position": "Yes",
      "result": "Passed",
      "partyLine": false,
      "voteBreakdown": {
        "yeas": 235,
        "nays": 180,
        "present": 0,
        "notVoting": 20
      }
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 20,
    "offset": 0
  }
}
```

### Bills & Legislation

#### Get Sponsored Bills

```http
GET /api/representative/{bioguideId}/bills
```

**Query Parameters:**
- `type` (optional): "sponsored" | "cosponsored" (default: "sponsored")
- `status` (optional): "introduced" | "committee" | "passed-chamber" | "enacted" | "all" (default: "all")
- `congress` (optional): Congress number (e.g., 118)
- `category` (optional): Policy area filter (e.g., "Healthcare", "Environment")
- `search` (optional): Search term for bill titles, numbers, or policy areas
- `sort` (optional): "date" | "cosponsors" | "status" (default: "date")

**Response:**
```json
{
  "bills": [
    {
      "billId": "hr1234-118",
      "number": "H.R. 1234",
      "title": "Clean Energy Act of 2024",
      "introducedDate": "2024-01-15",
      "status": "Referred to Committee",
      "summary": "A bill to promote clean energy...",
      "subjects": ["Energy", "Environmental Protection"],
      "cosponsors": 45,
      "committees": [
        {
          "name": "Energy and Commerce",
          "activities": ["Referral"],
          "lastAction": "2024-01-16"
        }
      ],
      "actions": [
        {
          "date": "2024-01-15",
          "description": "Introduced in House",
          "actionCode": "Intro-H"
        }
      ]
    }
  ]
}
```

### Campaign Finance

#### Get Campaign Finance Summary

```http
GET /api/representative/{bioguideId}/finance
```

**Query Parameters:**
- `cycle` (optional): Election cycle year (default: current cycle) or "all" for all cycles
- `search` (optional): Search term for contributor names, employers, or expenditure descriptions
- `contributorType` (optional): "individual" | "pac" | "party" | "all" (default: "all")

**Response:**
```json
{
  "candidate": {
    "fecId": "H8NJ04100",
    "name": "SMITH, CHRISTOPHER H",
    "party": "REP",
    "state": "NJ",
    "district": "04"
  },
  "cycle": 2024,
  "summary": {
    "totalReceipts": 1234567.89,
    "totalDisbursements": 987654.32,
    "cashOnHand": 246913.57,
    "debtsOwed": 0,
    "lastReport": "2024-03-31"
  },
  "contributions": {
    "individual": 543210.98,
    "pac": 432109.87,
    "party": 123456.78,
    "candidate": 50000.00,
    "other": 85790.26
  },
  "topContributors": [
    {
      "name": "Healthcare Corp PAC",
      "total": 10000,
      "type": "PAC"
    }
  ]
}
```

### Districts

#### Get District Information

```http
GET /api/districts/{state}/{district}
```

**Parameters:**
- `state` (required): Two-letter state code
- `district` (required): District number (use "AL" for at-large)

**Response:**
```json
{
  "state": "NJ",
  "district": "4",
  "currentRepresentative": {
    "bioguideId": "S000522",
    "name": "Christopher H. Smith",
    "party": "Republican"
  },
  "demographics": {
    "population": 732658,
    "medianAge": 41.2,
    "medianIncome": 87653,
    "education": {
      "highSchool": 91.2,
      "bachelors": 35.8
    },
    "ethnicity": {
      "white": 78.2,
      "black": 8.1,
      "hispanic": 10.2,
      "asian": 3.5
    }
  },
  "politicalLean": "R+8",
  "previousElections": [
    {
      "year": 2022,
      "winner": "Christopher H. Smith",
      "margin": 12.5
    }
  ]
}
```

### News & Media

#### Get Recent News

```http
GET /api/representative/{bioguideId}/news
```

**Query Parameters:**
- `limit` (optional): Number of articles (default: 10)
- `days` (optional): Look back period in days (default: 30)

**Response:**
```json
{
  "articles": [
    {
      "title": "Rep. Smith Introduces New Healthcare Bill",
      "source": "Local News Network",
      "url": "https://example.com/article",
      "publishedDate": "2024-03-20",
      "summary": "Representative Smith introduced legislation...",
      "sentiment": "neutral"
    }
  ]
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "INVALID_ZIP_CODE",
    "message": "The provided ZIP code is invalid",
    "details": {
      "provided": "1234",
      "expected": "5-digit ZIP code"
    }
  }
}
```

### Common Error Codes

- `INVALID_ZIP_CODE`: ZIP code format is invalid
- `REPRESENTATIVE_NOT_FOUND`: No representative found with given ID
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `EXTERNAL_API_ERROR`: Upstream API error
- `INVALID_PARAMETER`: Invalid query parameter
- `SERVER_ERROR`: Internal server error

## Data Sources

All data is sourced from official government APIs and enhanced data sources:
- **Congress-Legislators YAML**: Enhanced representative profiles with social media, biographical data, and IDs
- **Congress.gov**: Member data, bills, votes, and legislative activity
- **FEC.gov**: Campaign finance data and contribution tracking
- **Census.gov**: Congressional district mapping and demographics
- **GDELT**: Real-time news and media mentions with AI deduplication

### Party Alignment Analysis

Get real party line voting analysis with peer comparisons.

```http
GET /api/representative/{bioguideId}/party-alignment
```

**Response:**
```json
{
  "overall_alignment": 82.5,
  "party_loyalty_score": 85.2,
  "bipartisan_votes": 23,
  "total_votes_analyzed": 156,
  "recent_alignment": 78.9,
  "alignment_trend": "stable",
  "key_departures": [
    {
      "bill_number": "H.R. 1234",
      "bill_title": "Infrastructure Investment and Jobs Act",
      "vote_date": "2024-03-15",
      "representative_position": "Yea",
      "party_majority_position": "Nay",
      "significance": "high"
    }
  ],
  "voting_patterns": {
    "with_party": 129,
    "against_party": 18,
    "bipartisan": 23,
    "absent": 9
  },
  "comparison_to_peers": {
    "state_avg_alignment": 79.3,
    "party_avg_alignment": 87.1,
    "chamber_avg_alignment": 81.7
  }
}
```

### Batch API System

Optimize multiple API calls by fetching multiple endpoints in a single request.

```http
POST /api/representative/{bioguideId}/batch
```

**Request Body:**
```json
{
  "endpoints": ["profile", "votes", "bills", "finance", "news", "party-alignment"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": { /* representative profile data */ },
    "votes": { /* voting records data */ },
    "bills": { /* sponsored bills data */ },
    "finance": { /* campaign finance data */ },
    "news": { /* news mentions data */ },
    "party-alignment": { /* party voting analysis */ }
  },
  "errors": {},
  "metadata": {
    "timestamp": "2025-07-07T12:00:00.000Z",
    "requestedEndpoints": ["profile", "votes", "bills", "finance", "news", "party-alignment"],
    "successfulEndpoints": ["profile", "votes", "bills", "finance", "news", "party-alignment"],
    "failedEndpoints": [],
    "totalTime": 450
  }
}
```

**Available Batch Endpoints:**
- `profile` - Representative profile data
- `votes` - Recent voting records
- `bills` - Sponsored/co-sponsored bills
- `finance` - Campaign finance data
- `news` - Recent news mentions
- `committees` - Committee assignments
- `party-alignment` - Party voting analysis
- `leadership` - Leadership roles

### Congressional Districts

#### Get All Districts

```http
GET /api/districts/all
```

**Response:** Array of all congressional districts with basic information.

#### Get District Details

```http
GET /api/districts/{districtId}
```

**Parameters:**
- `districtId`: State-district format (e.g., "CA-12", "TX-02")

**Response:**
```json
{
  "district": {
    "id": "ca-12",
    "state": "CA",
    "number": "12",
    "name": "California District 12",
    "representative": {
      "name": "Nancy Pelosi",
      "party": "D",
      "bioguideId": "P000197"
    },
    "demographics": {
      "population": 767871,
      "medianIncome": 112376,
      "medianAge": 38.5,
      "white_percent": 43.2,
      "black_percent": 5.8,
      "hispanic_percent": 15.1,
      "asian_percent": 35.9,
      "poverty_rate": 8.4,
      "bachelor_degree_percent": 67.8
    },
    "political": {
      "cookPVI": "D+37",
      "lastElection": {
        "winner": "D",
        "margin": 73.2,
        "turnout": 78.9
      }
    },
    "geography": {
      "area": 232,
      "counties": ["San Francisco"],
      "majorCities": ["San Francisco"]
    }
  }
}
```

### Interactive District Maps

Get GeoJSON district boundaries for interactive mapping.

```http
GET /api/district-map?zip={zipCode}
```

**Parameters:**
- `zip` (required): 5-digit ZIP code

**Response:**
```json
{
  "zipCode": "94102",
  "state": "CA",
  "coordinates": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "boundaries": {
    "congressional": {
      "type": "Polygon",
      "coordinates": [/* GeoJSON coordinates */],
      "properties": {
        "district": "12",
        "state": "CA",
        "name": "Congressional District 12",
        "type": "congressional"
      }
    },
    "state_senate": { /* State senate district boundary */ },
    "state_house": { /* State house district boundary */ }
  },
  "bbox": {
    "minLat": 37.7081,
    "maxLat": 37.8197,
    "minLng": -122.5144,
    "maxLng": -122.3664
  }
}
```

### Advanced Search

Comprehensive representative search with multiple filtering criteria.

```http
GET /api/search?query={searchTerm}&party={party}&chamber={chamber}&state={state}&committee={committee}
```

**Parameters:**
- `query` (optional): Search term for name, state, or keywords
- `party` (optional): `D`, `R`, `I`, or `all`
- `chamber` (optional): `House`, `Senate`, or `all`
- `state` (optional): State abbreviation (e.g., "CA")
- `committee` (optional): Committee name or keyword
- `experienceYearsMin` (optional): Minimum years in office
- `experienceYearsMax` (optional): Maximum years in office
- `billsSponsoredMin` (optional): Minimum bills sponsored
- `billsSponsoredMax` (optional): Maximum bills sponsored
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (max: 100, default: 20)
- `sort` (optional): Sort field (`name`, `state`, `party`, `yearsInOffice`)
- `order` (optional): Sort order (`asc`, `desc`)

**Response:**
```json
{
  "results": [
    {
      "bioguideId": "P000595",
      "name": "Gary Peters",
      "party": "D",
      "state": "MI",
      "chamber": "Senate",
      "yearsInOffice": 12,
      "committees": ["Armed Services", "Commerce"],
      "billsSponsored": 145,
      "votingScore": 72.5,
      "fundraisingTotal": 8500000
    }
  ],
  "totalResults": 45,
  "page": 1,
  "totalPages": 3,
  "filters": {
    "party": "D",
    "chamber": "Senate"
  }
}
```

## Performance Optimization

### Request Batching Benefits

- **80% Reduction** in API round-trips for complex pages
- **Parallel Processing** of multiple data sources
- **Consistent Caching** across all endpoints
- **Error Isolation** - individual endpoint failures don't affect others

### Caching Strategy

- **Profile Data**: 30 minutes
- **Voting Records**: 15 minutes  
- **Bills**: 1 hour
- **Campaign Finance**: 6 hours
- **News**: 5 minutes
- **Party Alignment**: 1 hour
- **District Demographics**: 24 hours
- **District Boundaries**: 7 days

### Custom Hooks (React)

```typescript
// Single endpoint
const { data, loading, error } = useBatchAPI(bioguideId, ['profile', 'votes']);

// Pre-configured profile hook
const { data, loading, error } = useRepresentativeProfile(bioguideId, {
  includeVotes: true,
  includeBills: true,
  includeFinance: true
});

// Specific data types
const { data, loading, error } = useRepresentativeData(bioguideId, 
  ['votes', 'party-alignment'], 
  true // enabled
);
```

## Webhooks (Future)

Coming in Phase 7: Subscribe to updates for representatives, bills, or votes.

## SDKs

Coming soon:
- JavaScript/TypeScript SDK with batch optimization
- Python SDK
- Go SDK

## Support

- **Documentation**: https://docs.civiq.org
- **Issues**: https://github.com/civiq/api/issues
- **Email**: api@civiq.org
