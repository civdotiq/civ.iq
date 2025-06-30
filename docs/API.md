# CIV.IQ API Documentation

## Overview

The CIV.IQ API provides programmatic access to U.S. government representative data, voting records, and campaign finance information. All data is sourced from official government APIs.

## Base URL

```
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
  "federal": [
    {
      "bioguideId": "S000522",
      "name": "Christopher H. Smith",
      "firstName": "Christopher",
      "lastName": "Smith",
      "middleName": "H.",
      "party": "Republican",
      "state": "NJ",
      "district": "4",
      "chamber": "House",
      "url": "https://chrissmith.house.gov",
      "photoUrl": "https://www.congress.gov/img/member/s000522_200.jpg",
      "contact": {
        "phone": "(202) 225-3765",
        "address": "2440 Rayburn House Office Building",
        "city": "Washington",
        "state": "DC",
        "zip": "20515"
      },
      "social": {
        "twitter": "@RepChrisSmith",
        "facebook": "RepChrisSmith"
      },
      "terms": [
        {
          "start": "2023-01-03",
          "end": "2025-01-03",
          "chamber": "House",
          "state": "NJ",
          "district": "4"
        }
      ]
    }
  ],
  "state": [],  // Phase 2
  "local": []   // Phase 3
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
  "bioguideId": "S000522",
  "name": "Christopher H. Smith",
  "party": "Republican",
  "state": "NJ",
  "district": "4",
  "chamber": "House",
  "inOffice": true,
  "dateOfBirth": "1953-03-04",
  "committees": [
    {
      "name": "Foreign Affairs",
      "role": "Member",
      "subcommittees": [
        "Africa, Global Health, and Global Human Rights"
      ]
    }
  ],
  "leadership": null,
  "termsServed": 21,
  "nextElection": "2024",
  "contact": {
    "dcOffice": {
      "phone": "(202) 225-3765",
      "address": "2440 Rayburn House Office Building",
      "city": "Washington",
      "state": "DC",
      "zip": "20515"
    },
    "districtOffices": [
      {
        "city": "Freehold",
        "phone": "(732) 780-3035",
        "address": "112 Village Center Drive"
      }
    ]
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

All data is sourced from official government APIs:
- **Congress.gov**: Member data, bills, votes
- **FEC.gov**: Campaign finance data
- **Census.gov**: Demographics (coming soon)
- **GDELT**: News and media mentions

## Webhooks (Future)

Coming in Phase 4: Subscribe to updates for representatives, bills, or votes.

## SDKs

Coming soon:
- JavaScript/TypeScript SDK
- Python SDK
- Go SDK

## Support

- **Documentation**: https://docs.civiq.org
- **Issues**: https://github.com/civiq/api/issues
- **Email**: api@civiq.org
