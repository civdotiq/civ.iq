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

Get voting records for a representative (House and Senate). **Updated 2025-08-25**: Enhanced Senate XML parsing with improved member matching.

**Parameters:**

- `bioguideId`: Congress bioguide identifier
- `limit` (optional): Number of records to return (default: 20, max: 50)

**Data Sources:**

- **House**: Congress.gov API
- **Senate**: Official Senate XML feeds (https://senate.gov/legislative/LIS/)

**Response:**

```json
{
  "votes": [
    {
      "voteId": "string",
      "bill": {
        "number": "string",
        "title": "string",
        "congress": "string",
        "type": "string",
        "url": "string"
      },
      "question": "string",
      "result": "string",
      "date": "string",
      "position": "Yea|Nay|Present|Not Voting",
      "chamber": "House|Senate",
      "rollNumber": "number",
      "description": "string",
      "category": "Budget|Healthcare|Defense|Judiciary|Foreign Affairs|Other",
      "isKeyVote": "boolean",
      "metadata": {
        "source": "house-congress-api|senate-xml-feed",
        "confidence": "high|medium|low",
        "processingDate": "string"
      }
    }
  ],
  "totalResults": "number",
  "member": {
    "bioguideId": "string",
    "name": "string",
    "chamber": "string"
  },
  "dataSource": "string",
  "success": "boolean",
  "metadata": {
    "timestamp": "string",
    "phase": "string",
    "crashProof": "boolean"
  }
}
```

**Senate XML Parsing Features:**

- Real-time parsing of official Senate roll call votes
- Bioguide ID to LIS member ID mapping
- Enhanced name matching (handles "Bernie" ↔ "Bernard" variations)
- State-based validation for accuracy
- Comprehensive logging for debugging
- Supports all 100 current senators

**Error Handling:**

- Returns empty array with descriptive error message if member not found
- Graceful degradation if XML feeds are unavailable
- Detailed logging for troubleshooting parsing issues

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

Get FEC campaign finance data for a representative. **Updated 2025-09-02**: Enhanced with reliable bioguide→FEC ID mapping and honest error handling.

**Parameters:**

- `bioguideId`: Congress bioguide identifier
- `cycle` (optional): Election cycle year (default: current cycle)

**Response (Success - 200):**

```json
{
  "totalRaised": "number",
  "totalSpent": "number",
  "cashOnHand": "number",
  "individualContributions": "number",
  "pacContributions": "number",
  "partyContributions": "number",
  "candidateContributions": "number",
  "industryBreakdown": [
    {
      "industry": "string",
      "amount": "number",
      "percentage": "number",
      "topEmployers": ["string"]
    }
  ],
  "geographicBreakdown": [
    {
      "state": "string",
      "amount": "number",
      "percentage": "number"
    }
  ],
  "dataQuality": {
    "industry": {
      "totalContributionsAnalyzed": "number",
      "contributionsWithEmployer": "number",
      "completenessPercentage": "number"
    },
    "geography": {
      "totalContributionsAnalyzed": "number",
      "contributionsWithState": "number",
      "completenessPercentage": "number"
    },
    "overallDataConfidence": "high|medium|low"
  },
  "candidateId": "string",
  "cycle": "number",
  "lastUpdated": "string",
  "fecDataSources": {
    "financialSummary": "string",
    "contributions": "string"
  }
}
```

**Response (No FEC Mapping - 404):**

```json
{
  "error": "Campaign finance data unavailable for this representative.",
  "reason": "No corresponding FEC committee ID could be found or the data source is unreachable.",
  "bioguideId": "string",
  "cycle": "number"
}
```

**Response (Service Unavailable - 503):**

```json
{
  "error": "Campaign finance data is temporarily unavailable.",
  "reason": "The upstream data source (FEC API) could not be reached or returned an error.",
  "bioguideId": "string"
}
```

**Architecture Notes:**

- **Systems Fix (2025-09-02)**: Fixed bioguide→FEC ID mapping in batch service with proper error handling
- **Single Data Path**: Consistent flow through Frontend → Batch API → FEC Service (no more dual paths)
- **Honest Error Handling**: Returns proper HTTP status codes instead of misleading zero-data responses
- **Production Verified**: End-to-end tested with Nancy Pelosi (P000197) showing real FEC data

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

Get comprehensive information about a congressional district, including 2023+ redistricting data.

**Parameters:**

- `districtId`: District identifier (e.g., "CA-12", "MI-12")

**Response:**

```json
{
  "districtId": "string",
  "state": "string",
  "number": "string",
  "representative": {
    "bioguideId": "string",
    "name": "string",
    "party": "string",
    "chamber": "house",
    "imageUrl": "string"
  },
  "demographics": {
    "population": "number",
    "medianAge": "number",
    "medianIncome": "number",
    "raceEthnicity": {
      "white": "number",
      "black": "number",
      "hispanic": "number",
      "asian": "number",
      "nativeAmerican": "number",
      "pacificIslander": "number",
      "other": "number",
      "multiracial": "number"
    },
    "education": {
      "lessThanHighSchool": "number",
      "highSchool": "number",
      "someCollege": "number",
      "bachelors": "number",
      "graduate": "number"
    },
    "employment": {
      "employmentRate": "number",
      "unemploymentRate": "number",
      "laborForceParticipation": "number"
    }
  },
  "geography": {
    "counties": ["string"],
    "majorCities": ["string"],
    "area": "number",
    "centroid": [lat, lng],
    "bounds": [[minLat, minLng], [maxLat, maxLng]],
    "dataVersion": "119th Congress (2023-2025)",
    "source": "Census TIGER/Line 2023"
  },
  "metadata": {
    "lastUpdated": "string",
    "dataSource": "Congress.gov + Census Bureau",
    "boundaryVersion": "2023 Redistricting"
  }
}
```

**Notes:**

- Geography data reflects 2023 congressional redistricting
- Boundary data sourced from Census TIGER/Line 2023 files
- Demographics include enhanced Census API integration with error handling
- All coordinates in WGS84 (EPSG:4326) format

#### GET /api/district-boundaries/metadata

Get comprehensive metadata about all congressional district boundaries.

**Response:**

```json
{
  "districts": {
    "AL-01": {
      "id": "AL-01",
      "state_fips": "01",
      "state_name": "Alabama",
      "state_abbr": "AL",
      "district_num": "01",
      "name": "AL-01",
      "full_name": "Alabama 1st Congressional District",
      "centroid": [lng, lat],
      "bbox": [minLng, minLat, maxLng, maxLat],
      "area_sqm": "number",
      "geoid": "string"
    }
  },
  "states": {
    "01": {
      "fips": "01",
      "name": "Alabama",
      "abbr": "AL",
      "district_count": "number",
      "districts": ["AL-01", "AL-02", ...]
    }
  },
  "summary": {
    "total_districts": "number",
    "states_with_districts": "number",
    "last_updated": "string",
    "source": "Census TIGER/Line 2023"
  }
}
```

#### GET /api/district-map

Get interactive map data for districts with PMTiles support.

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
  "zoom": "number",
  "pmtilesUrl": "/maps/congressional_districts_119.pmtiles"
}
```

### District Enhancement APIs

#### GET /api/districts/[districtId]/economic-profile

Get comprehensive economic and infrastructure data for a congressional district.

**Parameters:**

- `districtId`: District identifier (e.g., "CA-12", "MI-12")

**Response:**

```json
{
  "districtId": "string",
  "economic": {
    "employment": {
      "unemploymentRate": "number",
      "laborForceParticipation": "number",
      "jobGrowthRate": "number",
      "majorIndustries": ["string"],
      "averageWage": "number"
    },
    "infrastructure": {
      "bridgeConditionRating": "number",
      "highwayFunding": "number",
      "broadbandAvailability": "number",
      "publicTransitAccessibility": "number"
    },
    "connectivity": {
      "fiberAvailability": "number",
      "averageDownloadSpeed": "number",
      "averageUploadSpeed": "number",
      "digitalDivideIndex": "number"
    }
  },
  "metadata": {
    "timestamp": "string",
    "dataSources": {
      "bls": "Bureau of Labor Statistics - https://api.bls.gov/",
      "fcc": "Federal Communications Commission - https://opendata.fcc.gov/",
      "infrastructure": "Data unavailable - no real API source"
    },
    "notes": ["string"]
  }
}
```

**Data Sources:**

- **BLS (Bureau of Labor Statistics)**: Real unemployment rates, labor force participation
- **FCC (Federal Communications Commission)**: Broadband availability, fiber access, internet speeds
- **Infrastructure**: Currently shows zero values - awaiting real government APIs

#### GET /api/districts/[districtId]/services-health

Get education, healthcare, and public health data for a congressional district.

**Parameters:**

- `districtId`: District identifier (e.g., "CA-12", "MI-12")

**Response:**

```json
{
  "districtId": "string",
  "services": {
    "education": {
      "schoolDistrictPerformance": "number",
      "graduationRate": "number",
      "collegeEnrollmentRate": "number",
      "federalEducationFunding": "number",
      "teacherToStudentRatio": "number"
    },
    "healthcare": {
      "hospitalQualityRating": "number",
      "primaryCarePhysiciansPerCapita": "number",
      "healthOutcomeIndex": "number",
      "medicareProviderCount": "number",
      "healthcareCostIndex": "number"
    },
    "publicHealth": {
      "preventableDiseaseRate": "number",
      "mentalHealthProviderRatio": "number",
      "substanceAbusePrograms": "number",
      "preventiveCareCoverage": "number"
    }
  },
  "metadata": {
    "timestamp": "string",
    "dataSources": {
      "education": "Department of Education - https://data.ed.gov/",
      "healthcare": "CDC PLACES - https://www.cdc.gov/places/",
      "cms": "Centers for Medicare & Medicaid Services"
    },
    "notes": ["string"]
  }
}
```

**Data Sources:**

- **Department of Education**: School performance, graduation rates, federal funding
- **CDC PLACES**: Health outcomes, preventable disease rates
- **CMS**: Medicare provider counts, healthcare quality ratings

#### GET /api/districts/[districtId]/government-spending

Get federal investment and social services data for a congressional district.

**Parameters:**

- `districtId`: District identifier (e.g., "CA-12", "MI-12")

**Response:**

```json
{
  "districtId": "string",
  "government": {
    "federalInvestment": {
      "totalAnnualSpending": "number",
      "contractsAndGrants": "number",
      "majorProjects": [
        {
          "title": "string",
          "amount": "number",
          "agency": "string",
          "description": "string"
        }
      ],
      "infrastructureInvestment": "number"
    },
    "socialServices": {
      "snapBeneficiaries": "number",
      "medicaidEnrollment": "number",
      "housingAssistanceUnits": "number",
      "veteransServices": "number"
    },
    "representation": {
      "billsAffectingDistrict": [
        {
          "billNumber": "string",
          "title": "string",
          "status": "string",
          "impactLevel": "High|Medium|Low"
        }
      ],
      "federalFacilities": [
        {
          "name": "string",
          "type": "string",
          "employees": "number",
          "economicImpact": "number"
        }
      ],
      "appropriationsSecured": "number"
    }
  },
  "metadata": {
    "timestamp": "string",
    "dataSources": {
      "usaspending": "USASpending.gov - https://api.usaspending.gov/",
      "congress": "Congress.gov - enhanced legislative tracking"
    },
    "notes": ["string"]
  }
}
```

**Data Sources:**

- **USASpending.gov**: Federal contracts, grants, spending by district
- **Congress.gov**: Bills affecting district, legislative impact tracking
- **Federal Facilities**: Government installations and their economic impact

### State Legislators

State legislator endpoints provide access to state-level legislative data using OpenStates v3 API.

**API Architecture:**

- All endpoints use `StateLegislatureCoreService` for consistent data access
- OpenStates v3 REST API integration with proper caching
- Supports all 50 states + DC, Puerto Rico, and territories

#### GET /api/state-legislature/[state]

Get all legislators for a specific state.

**Parameters:**

- `state` (path): Two-letter state code (e.g., "MI", "CA", "NY")

**Query Parameters:**

- `chamber` (optional): "upper" | "lower" - Filter by legislative chamber

**Response:**

```json
{
  "success": true,
  "legislators": [
    {
      "id": "ocd-person-...",
      "name": "string",
      "party": "Democratic" | "Republican" | "Independent" | "Green" | "Libertarian",
      "chamber": "upper" | "lower",
      "district": "string",
      "state": "string",
      "title": "string",
      "photoUrl": "string",
      "email": "string",
      "phoneNumbers": [{"type": "string", "number": "string"}],
      "addresses": [{"type": "string", "address": "string"}],
      "links": [{"url": "string", "note": "string"}],
      "committees": [{"name": "string", "role": "string"}]
    }
  ],
  "count": 0,
  "state": "string",
  "chamber": "string"
}
```

**Example:**

```bash
curl "http://localhost:3000/api/state-legislature/MI?chamber=lower"
```

#### GET /api/state-legislature/[state]/legislator/[id]

**⭐ CANONICAL ENDPOINT** - Get detailed information about a specific state legislator.

**Parameters:**

- `state` (path): Two-letter state code
- `id` (path): OpenStates person ID (format: `ocd-person-{uuid}`)

**Response:**

```json
{
  "success": true,
  "legislator": {
    "id": "string",
    "name": "string",
    "party": "string",
    "chamber": "upper" | "lower",
    "district": "string",
    "state": "string",
    "title": "string",
    "chamberTitle": "string",
    "photoUrl": "string",
    "email": "string",
    "phoneNumbers": [{"type": "string", "number": "string"}],
    "addresses": [{"type": "string", "address": "string", "city": "string", "state": "string", "zip": "string"}],
    "links": [{"url": "string", "note": "string"}],
    "socialMedia": {"twitter": "string", "facebook": "string"},
    "bio": "string",
    "committees": [
      {
        "name": "string",
        "role": "Chair" | "Vice Chair" | "Member",
        "chamber": "upper" | "lower"
      }
    ],
    "currentRole": {
      "title": "string",
      "chamber": "string",
      "district": "string",
      "startDate": "string",
      "endDate": "string"
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/state-legislature/MI/legislator/ocd-person-dc6ff9c0-f2b1-433d-a96b-292cf05bcb50"
```

**Migration Note:**

The deprecated endpoint `/api/state-legislator/[state]/[id]` will redirect to this canonical endpoint with a 301 status.

#### GET /api/state-legislature/[state]/legislator/[id]/bills

Get bills sponsored by a specific state legislator.

**Parameters:**

- `state` (path): Two-letter state code
- `id` (path): OpenStates person ID

**Query Parameters:**

- `session` (optional): Legislative session identifier
- `limit` (optional): Maximum number of results (default: 50, max: 200)

**Response:**

```json
{
  "success": true,
  "bills": [
    {
      "id": "string",
      "identifier": "string",
      "title": "string",
      "classification": ["bill" | "resolution" | "concurrent resolution"],
      "subject": ["string"],
      "session": "string",
      "chamber": "upper" | "lower",
      "sponsors": [
        {
          "name": "string",
          "role": "primary" | "cosponsor",
          "personId": "string"
        }
      ],
      "status": "string",
      "latestAction": {
        "description": "string",
        "date": "string"
      },
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "count": 0,
  "legislatorName": "string",
  "state": "string"
}
```

**Example:**

```bash
curl "http://localhost:3000/api/state-legislature/MI/legislator/ocd-person-dc6ff9c0-f2b1-433d-a96b-292cf05bcb50/bills?limit=25"
```

#### GET /api/state-legislators-by-address

Find state legislators by full address (uses Census Bureau geocoding).

**Query Parameters:**

- `street` (required): Street address
- `city` (optional but recommended): City name
- `state` (optional but recommended): State abbreviation
- `zip` (optional but recommended): ZIP code

**Response:**

```json
{
  "success": true,
  "address": {
    "input": "string",
    "matched": "string",
    "coordinates": { "lat": 0, "lng": 0 }
  },
  "legislators": {
    "upper": [
      {
        "id": "string",
        "name": "string",
        "party": "string",
        "district": "string",
        "chamber": "upper"
      }
    ],
    "lower": [
      {
        "id": "string",
        "name": "string",
        "party": "string",
        "district": "string",
        "chamber": "lower"
      }
    ]
  },
  "districts": {
    "upper": "string",
    "lower": "string"
  },
  "state": "string"
}
```

**Example:**

```bash
curl "http://localhost:3000/api/state-legislators-by-address?street=1200%20N%20Telegraph%20Rd&city=Pontiac&state=MI&zip=48341"
```

**Data Sources:**

- **OpenStates v3 API**: State legislator profiles, bills, committees
- **U.S. Census Bureau**: Address geocoding and legislative district mapping
- **State Legislatures**: Official government sources via OpenStates

**State-Specific Notes:**

- **Nebraska**: Unicameral legislature (only "lower" chamber, officially called "Legislature")
- **DC**: Uses "lower" chamber designation (Council of the District of Columbia)
- **Territories**: Puerto Rico, Guam, Virgin Islands, American Samoa, Northern Mariana Islands supported

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

### Vote Details

#### GET /api/vote/[voteId]

Get comprehensive details about a specific Senate roll call vote, including all senators' positions, vote counts, and related bill information. **New Feature 2025-08-25**: Direct Senate XML parsing for detailed vote analysis.

**Parameters:**

- `voteId`: Senate roll call vote number (numeric)

**Data Source:**

- **Senate XML Feeds**: Direct parsing from `https://senate.gov/legislative/LIS/roll_call_votes/` with real-time data

**Response:**

```json
{
  "vote": {
    "voteId": "string",
    "congress": "string",
    "session": "string",
    "rollNumber": "number",
    "date": "string",
    "time": "string",
    "title": "string",
    "question": "string",
    "description": "string",
    "result": "string",
    "yeas": "number",
    "nays": "number",
    "present": "number",
    "absent": "number",
    "totalVotes": "number",
    "requiredMajority": "string",
    "members": [
      {
        "lisId": "string",
        "bioguideId": "string",
        "firstName": "string",
        "lastName": "string",
        "fullName": "string",
        "state": "string",
        "party": "D|R|I",
        "position": "Yea|Nay|Present|Not Voting"
      }
    ],
    "bill": {
      "number": "string",
      "title": "string",
      "type": "string"
    },
    "amendment": {
      "number": "string",
      "purpose": "string"
    },
    "metadata": {
      "source": "senate-xml-feed",
      "confidence": "high",
      "processingDate": "string",
      "xmlUrl": "string"
    }
  },
  "success": "boolean",
  "metadata": {
    "timestamp": "string",
    "requestId": "string",
    "responseTime": "number"
  }
}
```

**Features:**

- **Complete Senator Information**: All 100 senators' voting positions with full names, states, and parties
- **Comprehensive Vote Data**: Yea/Nay/Present/Absent counts with percentages
- **Bill Integration**: Related bill information when available
- **Amendment Details**: Amendment information for amendment votes
- **High Performance**: Cached responses with 1-hour TTL
- **Error Handling**: Graceful handling of missing votes or XML parsing failures

**Error Response:**

```json
{
  "vote": null,
  "success": false,
  "error": "Vote 123 not found or could not be parsed",
  "metadata": {
    "timestamp": "string",
    "requestId": "string",
    "responseTime": "number"
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

- **Congress.gov** - Legislation, votes, members (119th Congress)
- **FEC.gov** - Campaign finance data
- **Census.gov** - Demographics, 2023+ district boundaries (TIGER/Line)
- **Senate.gov** - Senate roll call votes
- **GDELT** - News aggregation
- **congress-legislators** - Enhanced member data
- **Wikidata** - Biographical information via SPARQL

## Notes

- All endpoints return real data or clear "unavailable" messages
- No mock data is ever generated
- Dates are in ISO 8601 format
- Currency values are in USD cents
- GeoJSON follows RFC 7946 specification
