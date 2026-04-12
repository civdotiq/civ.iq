# API Reference - CIV.IQ

Complete documentation for all API endpoints in the civic-intel-hub platform.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://civdotiq.org/api`

## Authentication

All public endpoints are currently open. API keys are used for external service integration:

- `CONGRESS_API_KEY` - Congress.gov API access
- `FEC_API_KEY` - Federal Election Commission data
- `CENSUS_API_KEY` - U.S. Census Bureau data

## MCP Server (Model Context Protocol)

CIV.IQ provides a Model Context Protocol server for AI assistant integration.

- **Endpoint**: `POST /api/mcp` (streamable HTTP transport)
- **Spec**: [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **15 tools**: representative lookup, bill search, campaign finance, lobbying, spending, intelligence analysis
- **3 resources**: `civiq://legislators/{bioguideId}`, `civiq://bills/{congress}/{type}/{number}`, `civiq://districts/{stateCode}/{districtNumber}`
- **3 prompts**: `legislator_accountability`, `bill_impact_analysis`, `policy_comparison`

### Connecting

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "civiq": {
      "url": "https://civdotiq.org/api/mcp"
    }
  }
}
```

## AI-Readable Documentation

- `/llms.txt` — concise platform description for AI assistants ([llmstxt.org](https://llmstxt.org))
- `/llms-full.txt` — comprehensive API documentation for LLMs
- `/openapi.json` — OpenAPI 3.0 specification

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

Analyze how often a representative votes with their party. Uses the real
party-line analyzer which derives party majority from actual member votes per
roll call and computes peer averages from same-chamber, same-party legislators.

Returns `null`-equivalent (zeros + metadata note) for Independents or when
insufficient qualifying roll calls exist.

**Parameters:**

- `bioguideId`: Congress bioguide identifier

**Response:**

```json
{
  "overall_alignment": "number (0-100)",
  "votes_with_party": "number",
  "votes_against_party": "number",
  "total_votes_analyzed": "number",
  "peer_average_alignment": "number (0-100)",
  "peer_count": "number",
  "confidence": "number (0-1)",
  "data_as_of": "string (ISO date)",
  "methodology": "string",
  "disclaimer": "string"
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

### Cross-Domain Join Endpoints

Join endpoints connect CIV.IQ's isolated data domains — bills, spending, votes, committees, campaign finance, regulations, and hearings — into a linked civic intelligence graph.

All join responses include a standard `metadata` envelope:

```json
{
  "metadata": {
    "generatedAt": "2026-02-23T12:00:00.000Z",
    "dataSources": ["congress.gov", "usaspending.gov"],
    "joinType": "bill-spending",
    "dataQuality": "complete|partial|degraded"
  }
}
```

#### GET /api/bill/[billId]/votes

Get enriched vote data for a bill including pass/fail summary.

**Parameters:**

- `billId` (path): Bill identifier (e.g., `119-hr-1`)

**Cache:** 24h (historical bills: 1 year)

**Response:**

```json
{
  "billId": "string",
  "billTitle": "string",
  "votes": [
    {
      "date": "string",
      "chamber": "House|Senate",
      "rollNumber": "number",
      "question": "string",
      "result": "string",
      "url": "string"
    }
  ],
  "summary": {
    "totalVotes": "number",
    "passedCount": "number",
    "failedCount": "number"
  },
  "metadata": {}
}
```

#### GET /api/bill/[billId]/spending

Connect a bill to related federal spending via its policyArea and committee assignments.

**Parameters:**

- `billId` (path): Bill identifier (e.g., `119-hr-1`)
- `limit` (query, optional): Max awards to return (default: 20, max: 50)

**Cache:** 6h

**Connection Logic:**

1. Fetch bill → extract `policyArea` + `committees[]`
2. Map policyArea → agency slugs (via policy-area-map)
3. Map committees → agency slugs (via committee-agency-map)
4. Query USAspending for awards from those agencies

**Response:**

```json
{
  "billId": "string",
  "billTitle": "string",
  "policyArea": "string|null",
  "relatedAgencies": ["department-of-defense (direct)", "department-of-energy (inferred)"],
  "spending": {
    "awards": [
      {
        "id": "string",
        "recipientName": "string",
        "amount": "number",
        "type": "contract|grant",
        "agency": "string",
        "startDate": "string",
        "description": "string",
        "url": "string"
      }
    ],
    "totalAmount": "number",
    "awardCount": "number"
  },
  "metadata": {}
}
```

#### GET /api/spending/agency/[agencySlug]/bills

Reverse of bill→spending. Find recent bills related to a USAspending agency.

**Parameters:**

- `agencySlug` (path): USAspending agency slug (e.g., `department-of-defense`)
- `limit` (query, optional): Max bills (default: 10, max: 30)

**Cache:** 2h

**Connection Logic:**

1. Look up oversight committees for this agency
2. Find policyAreas that reference this agency
3. Fetch recent bills from Congress.gov, post-filter by matching policyArea
4. Fall back to topic-keyword title matching for `inferred` connections

**Response:**

```json
{
  "agencySlug": "string",
  "oversightCommittees": [{ "code": "HSAS", "name": "Armed Services", "chamber": "House" }],
  "relatedPolicyAreas": ["Armed Forces and National Security"],
  "bills": [
    {
      "id": "119-hr-1234",
      "title": "string",
      "type": "HR",
      "number": "1234",
      "congress": 119,
      "policyArea": "string|null",
      "introducedDate": "string",
      "latestActionDate": "string",
      "latestActionText": "string",
      "connectionStrength": "direct|inferred",
      "url": "string"
    }
  ],
  "metadata": {}
}
```

#### GET /api/representative/[bioguideId]/finance-jurisdiction

The "money and power" join. Shows where a representative's campaign donors overlap with their committee jurisdiction.

**Parameters:**

- `bioguideId` (path): Congress bioguide identifier

**Cache:** 12h

**Connection Logic:**

1. Get rep's committees → map to topics → map to IndustrySector values
2. Get rep's FEC contributions → categorize by IndustrySector
3. Cross-reference: which donor sectors overlap with committee jurisdiction?

**Response:**

```json
{
  "committeeCode": "string",
  "committeeName": "string",
  "jurisdictionTopics": ["energy", "health", "environment"],
  "industrySectors": ["ENERGY_NATURAL_RESOURCES", "HEALTH"],
  "members": [
    {
      "bioguideId": "string",
      "name": "string",
      "party": "string",
      "topSectors": [{ "sector": "HEALTH", "amount": 200000 }]
    }
  ],
  "metadata": {}
}
```

#### GET /api/committee/[committeeId]/regulations

Find Federal Register documents related to a committee's oversight domain.

**Parameters:**

- `committeeId` (path): Committee code (e.g., `HSIF`, `SSEG`)
- `limit` (query, optional): Max items per category (default: 10, max: 30)

**Cache:** 3h

**Connection Logic:**

1. Look up committee in committee-agency-map → agencies + topics
2. For each agency, fetch proposed rules, final rules, and open comment periods
3. Filter by topic keywords for relevance
4. Group into three categories sorted by urgency

**Response:**

```json
{
  "committeeCode": "HSIF",
  "committeeName": "Energy and Commerce",
  "chamber": "House",
  "oversightAgencies": [
    { "name": "Department of Energy", "slug": "department-of-energy", "abbreviation": "DOE" }
  ],
  "activeRulemakings": [],
  "openCommentPeriods": [],
  "recentFinalRules": [],
  "summary": {
    "totalDocuments": "number",
    "openComments": "number",
    "urgentComments": "number"
  },
  "metadata": {}
}
```

#### GET /api/govinfo/hearings/connections

Connect congressional hearings to committees, bills, or policy areas via keyword matching.

**Query Parameters (at least one required):**

- `committeeId` (optional): Committee code (e.g., `HSAS`)
- `billId` (optional): Bill identifier (e.g., `119-hr-1`)
- `policyArea` (optional): Congress.gov policy area string
- `limit` (optional): Max results (default: 20, max: 50)

**Cache:** 2h

**Response:**

```json
{
  "filter": {
    "committeeId": "string|undefined",
    "billId": "string|undefined",
    "policyArea": "string|undefined"
  },
  "hearings": [
    {
      "id": "string",
      "title": "string",
      "type": "hearing",
      "congress": 119,
      "chamber": "House|Senate|Joint",
      "dateIssued": "string",
      "relevanceScore": "number",
      "matchedTopics": ["defense", "military"],
      "connectionType": "committee|bill|policy-area",
      "detailsUrl": "string",
      "pdfUrl": "string"
    }
  ],
  "summary": {
    "totalMatches": "number",
    "topTopics": ["string"]
  },
  "metadata": {}
}
```

#### GET /api/search/policy-area

Cross-domain search by Congress.gov policyArea. Returns related items from four domains in parallel.

**Query Parameters:**

- `policyArea` (required): Congress.gov policy area string (e.g., `Health`)
- `limit` (optional): Max items per domain (default: 10, max: 30)

**Cache:** 2h

**Response:**

```json
{
  "policyArea": "Health",
  "bills": [
    {
      "id": "119-hr-1234",
      "title": "string",
      "status": "introduced|referred|reported|passed_house|passed_senate|enacted|...",
      "introducedDate": "string"
    }
  ],
  "regulations": [],
  "spending": {
    "totalAmount": "number",
    "topAgencies": [{ "name": "string", "amount": "number" }]
  },
  "committees": [{ "code": "HSIF", "name": "Energy and Commerce", "chamber": "House" }],
  "metadata": {}
}
```

#### GET /api/search/policy-area/list

List all known Congress.gov policyArea values.

**Cache:** 24h

**Response:**

```json
{
  "policyAreas": ["Agriculture and Food", "Armed Forces and National Security", "..."],
  "count": 32,
  "metadata": {
    "generatedAt": "string",
    "dataSource": "congress.gov"
  }
}
```

#### GET /api/bills/lifecycle

Track recent bills filtered by lifecycle status and date range.

**Query Parameters:**

- `status` (optional): BillStatus value (`introduced`, `referred`, `reported`, `passed_house`, `passed_senate`, `passed_both`, `failed`, `enacted`, `vetoed`)
- `since` (optional): ISO date or relative (`7d`, `30d`, `90d`) — default `7d`
- `until` (optional): ISO date — default now
- `chamber` (optional): `house` or `senate`
- `limit` (optional): Max results (default: 20, max: 50)

**Cache:** 1h

**Response:**

```json
{
  "filters": {
    "status": "string|null",
    "since": "2026-02-16",
    "until": "2026-02-23",
    "chamber": "string|null"
  },
  "bills": [
    {
      "id": "119-hr-1234",
      "title": "string",
      "type": "HR",
      "number": "1234",
      "congress": 119,
      "chamber": "House",
      "status": "passed_house",
      "introducedDate": "string",
      "latestActionDate": "string",
      "latestActionText": "string",
      "policyArea": "string|null",
      "url": "string"
    }
  ],
  "statusCounts": {
    "introduced": 45,
    "referred": 30,
    "passed_house": 5
  },
  "metadata": {}
}
```

#### GET /api/district/[districtId]/bills

Find bills relevant to a congressional district by cross-referencing spending, committees, and policy areas.

**Parameters:**

- `districtId` (path): District identifier (e.g., `MI-05`, `CA-12`, `AK-AL`)
- `limit` (query, optional): Max results (default: 15, max: 30)

**Cache:** 6h

**Relevance Scoring:**

- **+3**: Bill's policyArea maps to an agency with district spending
- **+2**: Bill title matches representative's committee topics
- **+1**: Bill title matches district spending topics

**Response:**

```json
{
  "districtId": "MI-05",
  "state": "MI",
  "district": "05",
  "representativeName": "string|null",
  "topAgencies": ["Department of Defense", "Department of Health and Human Services"],
  "relevantPolicyAreas": ["Armed Forces and National Security", "Health"],
  "bills": [
    {
      "id": "119-hr-1234",
      "title": "string",
      "type": "HR",
      "number": "1234",
      "congress": 119,
      "status": "introduced",
      "policyArea": "string|null",
      "introducedDate": "string",
      "latestActionDate": "string",
      "latestActionText": "string",
      "relevanceScore": 5,
      "relevanceReasons": [
        "Policy area \"Health\" linked to district spending",
        "Matches representative's committee topics"
      ],
      "url": "string"
    }
  ],
  "metadata": {}
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

### Intelligence

All intelligence endpoints use `force-dynamic` and return `Cache-Control: public, s-maxage=43200, stale-while-revalidate=3600` (12-hour CDN cache). Every insight includes `InsightBase` metadata: `confidence` (0-1), `dataAsOf`, `methodology`, `disclaimer`, `lastAnalyzedAt`, and `source` (`ai-generated` or `statistical-fallback`).

#### GET /api/intelligence/representative/[bioguideId]

Combined finance-jurisdiction and vote-finance insights for a legislator. Both analyzers run in parallel.

**Parameters:**

- `bioguideId` (path): Congress bioguide identifier (e.g., `P000197`)

**Response:**

```json
{
  "bioguideId": "string",
  "insights": {
    "financeJurisdiction": {
      "bioguideId": "string",
      "overlapScore": "number (0-1)",
      "committees": [
        {
          "committeeCode": "string",
          "committeeName": "string",
          "jurisdictionSectors": ["string"],
          "jurisdictionDonations": "number",
          "jurisdictionDonationPercentage": "number (0-1)"
        }
      ],
      "peerComparison": { "percentileRank": "number", "peerAverage": "number", "peerCount": "number" },
      "narrative": "string",
      "confidence": "number (0-1)",
      "dataAsOf": "string (ISO)",
      "methodology": "string",
      "disclaimer": "string",
      "lastAnalyzedAt": "string (ISO)",
      "source": "ai-generated|statistical-fallback"
    },
    "voteFinance": {
      "bioguideId": "string",
      "correlations": [
        {
          "sector": "string",
          "donationAmount": "number",
          "billsVotedOn": "number",
          "alignmentScore": "number (0-1)",
          "meetsSampleSize": "boolean"
        }
      ],
      "overallCorrelation": "number|null",
      "peerComparison": { "percentileRank": "number", "peerAverage": "number", "peerCount": "number" },
      "narrative": "string",
      "...InsightBase fields"
    }
  },
  "generatedAt": "string (ISO)"
}
```

Returns `null` for either insight when data is insufficient (no committees, no FEC mapping, fewer than 10 votes per sector).

#### GET /api/intelligence/representative/[bioguideId]/influence-chain

Lobbying pipeline insights for each committee a representative sits on.

**Parameters:**

- `bioguideId` (path): Congress bioguide identifier

**Response:**

```json
{
  "bioguideId": "string",
  "committees": [
    {
      "committeeCode": "string",
      "committeeName": "string",
      "lobbyingInsight": {
        "committeeCode": "string",
        "committeeName": "string",
        "chamber": "House|Senate|Joint",
        "totalSpending": "number",
        "organizationCount": "number",
        "matchedBillCount": "number",
        "topOrganizations": [
          { "name": "string", "totalSpending": "number", "filingCount": "number", "issueCodes": ["string"] }
        ],
        "issueAlignments": [
          {
            "issueCode": "string",
            "issueLabel": "string",
            "lobbyingSpending": "number",
            "organizationCount": "number",
            "matchedBills": [{ "id": "string", "title": "string", "policyArea": "string" }]
          }
        ],
        "peerComparison": { "percentileRank": "number", "peerAverage": "number", "peerCount": "number" },
        "narrative": "string",
        "...InsightBase fields"
      }
    }
  ],
  "generatedAt": "string (ISO)"
}
```

Returns `null` for `lobbyingInsight` when fewer than 5 filings reference the committee.

#### GET /api/intelligence/representative/[bioguideId]/temporal

Temporal vote pattern shift analysis across quarterly windows.

**Parameters:**

- `bioguideId` (path): Congress bioguide identifier

**Response:**

```json
{
  "bioguideId": "string",
  "quarters": [
    { "quarter": "2025-Q1", "alignmentScore": "number (0-1)", "voteCount": "number", "rollingAverage": "number|null" }
  ],
  "shifts": [
    {
      "quarter": "string",
      "magnitude": "number",
      "direction": "increase|decrease",
      "context": { "newCommittees": ["string"], "largeContributions": "number", "electionProximity": "boolean" }
    }
  ],
  "overallTrend": "stable|increasing|decreasing|volatile",
  "peerComparison": { "percentileRank": "number", "peerAverage": "number", "peerCount": "number" },
  "narrative": "string",
  "...InsightBase fields"
}
```

Returns `null` when fewer than 4 quarters of vote data available.

#### GET /api/intelligence/representative/[bioguideId]/stock-trades

Stock trade-committee jurisdiction overlap analysis. House members only.

**Parameters:**

- `bioguideId` (path): Congress bioguide identifier

**Response:**

```json
{
  "bioguideId": "string",
  "totalTrades": "number",
  "totalResolvableTrades": "number",
  "flaggedTradeCount": "number",
  "overlapRate": "number (0-1)",
  "expectedOverlapRate": "number (0-1)",
  "committees": [
    {
      "committeeName": "string",
      "committeeCode": "string",
      "jurisdictionSectors": ["string"],
      "flaggedTradeCount": "number",
      "totalTradesInSectors": "number"
    }
  ],
  "flaggedTrades": [
    {
      "ticker": "string",
      "assetDescription": "string",
      "transactionType": "string",
      "transactionDate": "string",
      "amount": "string",
      "sector": "string",
      "committeeName": "string",
      "sourceUrl": "string"
    }
  ],
  "peerComparison": { "percentileRank": "number", "peerAverage": "number", "peerCount": "number" },
  "narrative": "string",
  "...InsightBase fields"
}
```

Returns `null` for Senate members or when fewer than 3 resolvable trades.

#### GET /api/intelligence/committee/[committeeId]

Lobbying pipeline analysis for a specific committee.

**Parameters:**

- `committeeId` (path): Committee code (e.g., `HSAG`, `SSFI`)

**Response:**

Same as `LobbyingPipelineInsight` (see influence-chain response above). Returns 404 if committee code not found in mappings.

#### GET /api/intelligence/bill/[billId]

Sponsor/cosponsor funding analysis and related lobbying activity for a bill.

**Parameters:**

- `billId` (path): Bill identifier in format `{congress}-{type}-{number}` (e.g., `119-hr-1234`)

**Response:**

```json
{
  "billId": "string",
  "billTitle": "string",
  "policyArea": "string",
  "affectedSectors": ["string"],
  "sponsorAnalysis": {
    "bioguideId": "string",
    "name": "string",
    "party": "string",
    "sectorDonationPercentage": "number (0-1)",
    "sectorDonationAmount": "number",
    "totalDonations": "number"
  },
  "cosponsorSummary": {
    "totalCosponsors": "number",
    "analyzedCosponsors": "number",
    "avgSectorDonationPercentage": "number (0-1)"
  },
  "relatedLobbyingSpending": "number",
  "relatedLobbyingOrgs": "number",
  "narrative": "string",
  "...InsightBase fields"
}
```

Returns `null` when bill not found, has no policy area, or no sectors map to the policy area.

#### GET /api/intelligence/pac/[committeeId]

PAC-to-legislator vote tracing analysis.

**Parameters:**

- `committeeId` (path): FEC committee ID (e.g., `C00123456`)

**Response:**

```json
{
  "committeeId": "string",
  "committeeName": "string",
  "sector": "string",
  "totalDisbursed": "number",
  "recipientCount": "number",
  "relevantBillCount": "number",
  "recipientVotes": [
    {
      "bioguideId": "string",
      "name": "string",
      "party": "string",
      "state": "string",
      "chamber": "House|Senate",
      "amountReceived": "number",
      "relevantVoteCount": "number",
      "yeaRate": "number (0-1)",
      "partyBaselineYeaRate": "number (0-1)",
      "differenceFromBaseline": "number"
    }
  ],
  "aggregateYeaRate": "number (0-1)",
  "aggregateBaselineYeaRate": "number (0-1)",
  "peerComparison": { "percentileRank": "number", "peerAverage": "number", "peerCount": "number" },
  "narrative": "string",
  "...InsightBase fields"
}
```

Returns `null` when PAC sector is unclassified (`OTHER`) or fewer than 3 recipients.

#### GET /api/intelligence/district/[districtId]

Intelligence summary for all representatives in a district.

**Parameters:**

- `districtId` (path): District identifier (e.g., `CA-13`, `TX-Senate`)

**Response:**

```json
{
  "districtId": "string",
  "representatives": [
    {
      "bioguideId": "string",
      "name": "string",
      "party": "string",
      "chamber": "House|Senate",
      "financeJurisdictionOverlap": "number|null",
      "hasStockTrades": "boolean",
      "insightsAvailable": "number"
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
- Join endpoints: 1-24 hours (varies by data volatility)
  - Bill votes: 24h (historical: 1 year)
  - Bill spending: 6h
  - Agency bills: 2h
  - Finance jurisdiction: 12h
  - Committee regulations: 3h
  - Hearings connections: 2h
  - Policy area search: 2h
  - Bill lifecycle: 1h
  - District bills: 6h
  - Policy area list: 24h
- Intelligence insights: 12 hours (s-maxage)
  - Analyzer-level Redis cache: 7 days (most), 14 days (temporal)

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

- **Congress.gov** - Legislation, votes, members, committees (119th Congress)
- **FEC.gov** - Campaign finance data
- **USAspending.gov** - Federal contracts, grants, spending by agency/district
- **Federal Register** - Proposed rules, final rules, open comment periods
- **GovInfo.gov** - Congressional hearings and reports
- **Census.gov** - Demographics, 2023+ district boundaries (TIGER/Line)
- **Senate.gov** - Senate roll call votes
- **GDELT** - News aggregation
- **congress-legislators** - Enhanced member data
- **Wikidata** - Biographical information via SPARQL
- **Senate LDA** - Lobbying disclosure filings

## Notes

- All endpoints return real data or clear "unavailable" messages
- No mock data is ever generated
- Dates are in ISO 8601 format
- Currency values are in USD cents
- GeoJSON follows RFC 7946 specification
