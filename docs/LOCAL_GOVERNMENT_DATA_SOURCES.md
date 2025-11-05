# Local Government Data Sources for Civic-Intel-Hub

**Research Date**: November 4, 2025
**Purpose**: Identify APIs and data sources for city/county/municipal political information in the USA

---

## 🎯 Executive Summary

This document catalogs data sources for LOCAL government information (cities, counties, municipalities) in the United States. While federal and state data is relatively centralized, local government data is highly **fragmented** across thousands of jurisdictions.

**Key Challenges**:

- 🏛️ **500,000+ elected local officials** across ~90,000 local governments
- 🗺️ **No single API** covers all cities/counties
- 📊 **Inconsistent formats** - each city uses different systems
- 💰 **Mix of free/paid** - commercial aggregators vs. open data portals

**Current Integrations** (as of Nov 2025):

- ✅ Census API (geocoding to find cities/counties)
- ⚠️ No comprehensive local officials database yet

---

## 🟢 HIGH PRIORITY - Free & Comprehensive

### 1. Socrata Open Data API (SODA)

**Platform**: https://dev.socrata.com/
**Cost**: FREE (rate limits vary by city)
**Coverage**: 1,000+ cities, counties, states worldwide

**Cities Using Socrata**:

- New York City (data.cityofnewyork.us)
- Chicago (data.cityofchicago.org)
- Seattle (data.seattle.gov)
- Los Angeles (data.lacity.org)
- San Francisco (datasf.org)
- Boston (data.boston.gov)
- Austin, Dallas, Denver, Philadelphia, Portland, and 1,000+ more

**Why It's Valuable**:

- Most widely adopted municipal open data platform
- Every Socrata dataset has built-in SODA API
- Consistent API format across all cities
- Covers budgets, crime, 311 requests, permits, etc.

**Data Types Available**:

- City budgets and expenditures
- Building permits and zoning
- 311 service requests
- Crime incidents
- Restaurant inspections
- Business licenses
- Traffic/transportation data
- Parks and recreation
- Public employee salaries

**Integration Effort**: Low-Medium

- RESTful API with consistent structure
- OData-style filtering ($filter, $select, $limit)
- Well-documented with tutorials
- Each city has unique domain (e.g., data.seattle.gov)

**API Example**:

```
GET https://data.cityofchicago.org/resource/crimes.json?$limit=10
GET https://data.seattle.gov/resource/pu5n-trf4.json?$where=status='Open'
GET https://data.boston.gov/api/3/action/datastore_search?resource_id=311
```

**Unique Capabilities**:

- Query thousands of cities with same API syntax
- Real-time data updates (varies by city)
- GeoJSON support for mapping
- Time-series data for trends

**Recommended Implementation**:

```
Phase 1: Integrate top 50 cities' datasets (budgets, crime, 311)
Phase 2: Add dynamic city discovery (user enters city → fetch datasets)
Phase 3: Create unified dashboard for cross-city comparison
```

---

### 2. Granicus Legistar Web API

**Platform**: https://webapi.legistar.com/
**Cost**: FREE (public read access, some cities require token)
**Coverage**: 3,500+ municipalities in US/Canada

**Cities Using Legistar**:

- New York City
- Los Angeles County
- Philadelphia
- San Jose
- Phoenix
- Columbus
- Baltimore
- Milwaukee
- And 3,500+ more

**Why It's Valuable**:

- Access city council agendas, minutes, votes
- Track local legislation (ordinances, resolutions)
- Council member contact info
- Meeting videos and transcripts
- Most comprehensive local legislative data

**Data Types Available**:

- Council meeting agendas and minutes
- Legislative items (bills, ordinances, resolutions)
- Voting records by council member
- Committee assignments
- Meeting videos and transcripts
- Public hearing notices
- Council member contact information

**Integration Effort**: Medium

- RESTful API with OData support
- Requires city-specific client ID
- 1,000 records per query limit (pagination needed)
- Well-documented with examples

**API Format**:

```
GET https://webapi.legistar.com/v1/{ClientName}/Matters
GET https://webapi.legistar.com/v1/{ClientName}/Events
GET https://webapi.legistar.com/v1/{ClientName}/Persons
GET https://webapi.legistar.com/v1/{ClientName}/Votes

# OData filtering
?$filter=EventDate ge datetime'2025-01-01'&$orderby=EventDate desc
?$top=50&$skip=100
```

**Unique Capabilities**:

- Track local legislation lifecycle (introduced → passed → signed)
- See how individual council members voted
- Search across all Legistar cities simultaneously
- Compare council meeting frequency across cities

**Recommended Implementation**:

```
Phase 1: Integrate city council data for top 100 cities
Phase 2: Add local legislation tracking (like federal bill tracking)
Phase 3: Create "My City Council" dashboard with meeting alerts
```

**Important Notes**:

- NYC has custom Legistar API: https://council.nyc.gov/legislation/api/
- Some cities require API token (free registration)
- Query limits: 1,000 records per request

---

### 3. Data.gov Municipal Datasets

**Platform**: https://catalog.data.gov/
**Cost**: FREE
**Coverage**: 1,000+ cities, counties, special districts

**Why It's Valuable**:

- Centralized catalog of local open data
- Filter by "City Government" organization type
- Includes datasets from cities without Socrata
- JSON, CSV, XML formats available

**Data Types Available**:

- Zoning and land use
- Property tax assessments
- Municipal budgets
- Public employee salaries
- Election results
- Infrastructure assets
- Environmental data
- Economic development

**Integration Effort**: Medium-High

- No single API (aggregates links to city APIs)
- CKAN API for metadata search
- Each dataset has unique access method
- Requires per-city integration

**API Example**:

```
# Search for city budget datasets
GET https://catalog.data.gov/api/3/action/package_search?q=budget&fq=organization_type:"City Government"

# Search by city name
GET https://catalog.data.gov/api/3/action/package_search?q=tags:seattle&tags:budget
```

**Unique Capabilities**:

- Discover datasets from small cities without dedicated portals
- Historical data archives
- Special districts (water, school, transit)
- County-level data

**Recommended Implementation**:

```
Phase 1: Use as discovery layer to find city data sources
Phase 2: Create city data catalog browser
Phase 3: Cache common datasets for faster access
```

---

## 🟡 MEDIUM PRIORITY - Paid or Limited Free Access

### 4. Cicero by Azavea

**Platform**: https://www.cicerodata.com/
**Cost**: FREE TRIAL (1,000 credits / 90 days), then PAID
**Coverage**: 9 countries, all levels of government

**Why It's Valuable**:

- **Address → Officials** lookup (federal, state, local)
- Most comprehensive local official database
- Includes city council, mayors, county supervisors
- Global coverage (not just USA)

**Data Types Available**:

- Elected officials (city, county, school board, special districts)
- Legislative district boundaries
- Contact information (office, email, phone, social media)
- Committee assignments
- Term start/end dates
- District maps (GeoJSON)

**Integration Effort**: Low

- RESTful API with excellent documentation
- Geocoding built-in (address → lat/lon → officials)
- Simple JSON responses

**API Example**:

```
# Lookup by address
GET https://cicero.azavea.com/v3.1/official?lat=40.7128&lon=-74.0060&key={API_KEY}

# Returns all officials (federal, state, local) for that address
{
  "response": {
    "results": {
      "officials": [
        {
          "first_name": "Jane",
          "last_name": "Doe",
          "office": {
            "name": "New York City Council Member",
            "district": {
              "district_type": "City Council",
              "district_id": "District 1"
            }
          },
          "email": "jdoe@council.nyc.gov"
        }
      ]
    }
  }
}
```

**Unique Capabilities**:

- One API call returns ALL officials (federal + state + local)
- School board members and special districts
- Historical official data
- District boundary shapefiles

**Pricing** (estimated):

- Nonprofit/Education discount available
- Pay-per-query model (bulk pricing available)
- Free tier: 1,000 queries (good for testing)

**Recommended Implementation**:

```
Phase 1: Evaluate free trial with 1,000 test queries
Phase 2: If valuable, integrate as primary local officials source
Phase 3: Supplement with free sources (Ballotpedia, city websites)
```

**Alternatives (Free but Incomplete)**:

- BallotReady (cities only, election-focused)
- Ballotpedia (top 100 cities only)
- Manual: OpenStreetMap civic data (requires aggregation)

---

### 5. BallotReady API

**Platform**: https://organizations.ballotready.org/ballotready-api
**Cost**: PAID (pricing not disclosed)
**Coverage**: 10,000+ elections across US

**Why It's Valuable**:

- Ballot-specific data (what's on YOUR ballot)
- Candidate profiles, biographies, issue stances
- Local ballot measures (referendums, propositions)
- Endorsements and funding sources

**Data Types Available**:

- Candidate information (city council, mayor, county supervisor)
- Ballot measures and referendums
- Candidate issue positions
- Endorsements from organizations
- Campaign finance links
- Election dates and deadlines

**Integration Effort**: Low-Medium

- RESTful API or standard export
- Requires commercial license
- Well-documented for partners

**Use Cases**:

- "What's on my ballot?" feature
- Candidate comparison tools
- Local ballot measure tracking
- Voter guide generation

**Recommended Implementation**:

```
Phase 1: Contact BallotReady for API access/pricing
Phase 2: Integrate if budget allows and aligns with mission
Phase 3: Use for election season features (high user engagement)
```

**Note**: Google Civic Information API (similar service) **shut down April 2025**. BallotReady is the recommended replacement.

---

### 6. Property Tax & Assessment APIs (Commercial)

Multiple vendors provide property/parcel data APIs:

#### TaxNetUSA

**Website**: https://www.taxnetusa.com/data/web-service-api/
**Cost**: PAID (contact for pricing)
**Coverage**: 3,100+ counties, 158M+ properties

**Data**: Parcel boundaries, property assessments, tax rates, ownership, sales history

#### PropMix (Pubrec)

**Website**: https://pubrec.propmix.io/
**Cost**: PAID
**Coverage**: 151M+ properties, 3,100+ counties

**Data**: Property details, taxes, ownership, assessments, mortgages, deeds

#### ATTOM Data

**Website**: https://www.attomdata.com/
**Cost**: PAID (enterprise pricing)
**Coverage**: 158M+ properties, 3,000+ counties

**Data**: Assessor data, tax records, sales transactions, foreclosures, property characteristics

**Why It's Valuable**:

- Connect properties to city council votes (zoning, development)
- Show tax burden by district
- Track property value trends
- Link developers to local officials

**Recommended Implementation**:

```
Phase 1: Evaluate free alternatives (city open data portals)
Phase 2: If needed, negotiate bulk pricing for API access
Phase 3: Integrate property data with zoning/development votes
```

**Free Alternatives**:

- City assessor websites (manual scraping)
- County open data portals (Socrata)
- MassGIS (Massachusetts only - free)

---

## 🔴 LOW PRIORITY - Fragmented or Declining

### 7. 311 Service Request APIs (City-Specific)

**Status**: ⚠️ DECLINING (San Francisco shut down Open 311 API in July 2025)
**Coverage**: Varies by city

**Cities with 311 APIs**:

- New York City (via Socrata)
- Chicago (via Socrata)
- Boston (transitioning systems in 2025)
- Los Angeles (via Socrata)

**Why It's Valuable**:

- Track city responsiveness (potholes, graffiti, streetlights)
- See service request patterns by neighborhood
- Measure government efficiency

**Integration Challenge**:

- No standard API (each city different)
- San Francisco **shut down** Open 311 API (July 2025) - "too expensive"
- Boston **changing systems** (October 2025) - dataset structure will change

**Recommended Implementation**:

```
Phase 1: Use Socrata 311 datasets (most reliable)
Phase 2: Monitor city APIs for stability
Phase 3: Low priority - high maintenance burden
```

---

### 8. Crime Data APIs

**FBI Crime Data API**: https://github.com/fbi-cde/crime-data-api
**Cost**: FREE
**Coverage**: National UCR/NIBRS data

**CrimeoMeter API**: https://www.crimeometer.com/crime-data-api
**Cost**: PAID
**Coverage**: Nationwide crime incidents, unified schema

**City-Specific Sources**:

- NYC (via Socrata): data.cityofnewyork.us
- Chicago (via Socrata): data.cityofchicago.org
- Atlanta: opendata.atlantapd.org
- Cleveland, Cincinnati, New Orleans, etc.

**Why It's Valuable**:

- Public safety by neighborhood
- Crime trends over time
- Connect to policing budgets/policies

**Integration Effort**: Medium

- FBI API covers national data (aggregated)
- City APIs cover incident-level data (detailed)
- No single API for all cities

**Recommended Implementation**:

```
Phase 1: Integrate FBI national data for city comparisons
Phase 2: Add city-specific crime data via Socrata
Phase 3: Create neighborhood safety dashboard
```

---

### 9. Local Campaign Finance (City-Specific)

**Status**: ⚠️ FRAGMENTED - no national API

**Cities with Online Systems**:

- San Francisco: https://sfethics.org/ (downloadable datasets)
- Atlanta: https://atlantacity.easyvotecampaignfinance.com/ (web portal)
- Minneapolis: vote.minneapolismn.gov (reports available)
- Seattle, Los Angeles, New York (varies)

**Why It's Valuable**:

- Track money in local politics
- Developer contributions to council members
- Special interest influence

**Integration Challenge**:

- Each city has unique system
- Most are web portals, not APIs
- Would require scraping or manual data collection

**Recommended Implementation**:

```
Phase 1: Document city-by-city data availability
Phase 2: Partner with local transparency organizations
Phase 3: LOW PRIORITY - too fragmented for scalable integration
```

---

### 10. Zoning & Planning Data (Commercial)

**Zoneomics**: https://www.zoneomics.com/
**Cost**: PAID
**Data**: Zoning codes, permitted uses, setbacks, development potential

**Gridics**: https://gridics.com/
**Cost**: PAID
**Data**: Parcel-level zoning, building capacity, opportunity zones

**LightBox**: https://www.lightboxre.com/data/zoning-data/
**Cost**: PAID
**Data**: Zoning classifications, descriptions, bulk downloads

**Free Alternatives**:

- City planning department websites
- OpenDataPhilly (Philadelphia only): opendataphilly.org
- Individual city open data portals

**Why It's Valuable**:

- Track zoning changes and development projects
- Link to city council votes on rezonings
- Show affordable housing initiatives

**Recommended Implementation**:

```
Phase 1: Use free city open data portals
Phase 2: If budget allows, evaluate commercial APIs
Phase 3: Focus on cities with active development debates
```

---

## 📊 Data Source Comparison Matrix

| Source                | Cost                       | Coverage         | Officials | Legislation | Finance | Crime | Permits | Status          |
| --------------------- | -------------------------- | ---------------- | --------- | ----------- | ------- | ----- | ------- | --------------- |
| **Socrata (SODA)**    | Free                       | 1,000+ cities    | ❌        | ❌          | ✅      | ✅    | ✅      | ✅ Active       |
| **Legistar**          | Free (some need token)     | 3,500+ cities    | ✅        | ✅          | ❌      | ❌    | ❌      | ✅ Active       |
| **Data.gov**          | Free                       | 1,000+ cities    | ⚠️        | ⚠️          | ✅      | ✅    | ✅      | ✅ Active       |
| **Cicero**            | Paid (1k free trial)       | All US cities    | ✅        | ❌          | ❌      | ❌    | ❌      | ✅ Active       |
| **BallotReady**       | Paid                       | Election-focused | ✅        | ❌          | ⚠️      | ❌    | ❌      | ✅ Active       |
| **TaxNetUSA**         | Paid                       | 3,100 counties   | ❌        | ❌          | ⚠️      | ❌    | ⚠️      | ✅ Active       |
| **311 APIs**          | Free (city-specific)       | Major cities     | ❌        | ❌          | ❌      | ❌    | ⚠️      | ⚠️ Declining    |
| **Crime APIs**        | Free (FBI) / Paid (Crimeo) | Nationwide       | ❌        | ❌          | ❌      | ✅    | ❌      | ✅ Active       |
| **Campaign Finance**  | Free (city portals)        | Fragmented       | ❌        | ❌          | ✅      | ❌    | ❌      | ⚠️ Inconsistent |
| **Zoning APIs**       | Paid                       | Varies           | ❌        | ⚠️          | ❌      | ❌    | ✅      | ✅ Active       |
| **Google Civic API**  | N/A                        | N/A              | ✅        | ❌          | ❌      | ❌    | ❌      | ❌ Shut down    |
| **San Francisco 311** | N/A                        | N/A              | ❌        | ❌          | ❌      | ❌    | ✅      | ❌ Shut down    |

---

## 🎯 Recommended Implementation Roadmap

### Phase 1: City Council & Legislation (FREE)

**Goal**: Track local legislation like we track federal bills
**Sources**: Legistar Web API
**Features**:

- City council member profiles
- Local ordinance/resolution tracking
- Council meeting agendas and votes
- Committee assignments
- "My City Council" dashboard

**Estimated Effort**: 3-4 weeks
**ROI**: High - local politics affects users most directly

**Implementation Notes**:

- Start with top 50 cities by population
- Legistar covers 3,500+ municipalities
- NYC has custom API (separate integration)

---

### Phase 2: City Financial Data (FREE)

**Goal**: Show where city money goes
**Sources**: Socrata (SODA API)
**Features**:

- City budget breakdowns by department
- Public employee salaries
- Contract awards
- Spending trends over time
- Cross-city comparison tool

**Estimated Effort**: 2-3 weeks
**ROI**: High - transparency + civic engagement

**Implementation Notes**:

- Socrata has consistent API across 1,000+ cities
- Start with budget, expand to contracts/salaries
- Real-time data updates (varies by city)

---

### Phase 3: Local Officials Database (PAID or Hybrid)

**Goal**: "Who represents me?" for ALL levels of government
**Sources**: Cicero API (paid) OR Ballotpedia + scraping (free)
**Features**:

- Address → all officials (federal, state, county, city, school board)
- Contact information
- District boundaries
- Term information
- Committee assignments

**Estimated Effort**: 2-3 weeks (Cicero) or 6-8 weeks (build from scratch)
**ROI**: Very High - core feature for civic platform

**Budget Decision**:

- **Option A (PAID)**: Integrate Cicero API ($$$, comprehensive, maintained)
- **Option B (FREE)**: Aggregate Ballotpedia + city websites (time-intensive, incomplete)

---

### Phase 4: City Services & Infrastructure (FREE)

**Goal**: Track city responsiveness and service quality
**Sources**: Socrata 311 datasets + City Crime APIs
**Features**:

- 311 service request tracking by neighborhood
- Crime incident maps
- Building permit activity
- Restaurant inspection scores
- Infrastructure project status

**Estimated Effort**: 3-4 weeks
**ROI**: Medium - nice-to-have, not core civic function

**Implementation Notes**:

- Focus on Socrata cities (most stable)
- Avoid 311 APIs (declining support)
- Crime data from FBI + city portals

---

### Phase 5 (Optional): Advanced Features (PAID)

**Goal**: Premium features for power users
**Sources**: BallotReady, Property APIs, Zoning APIs
**Features**:

- Interactive ballot guides
- Property tax lookup
- Zoning/development tracking
- Candidate comparison tools

**Estimated Effort**: 4-6 weeks
**ROI**: Depends on monetization strategy

**Budget Requirements**:

- BallotReady API (pricing unknown)
- Property data API (~$5k-$50k/year depending on coverage)
- Zoning data API (~$10k+/year)

---

## 🔍 Additional Research Needed

### Data Sources to Investigate Further:

1. **School District APIs**:
   - GreatSchools API (education data)
   - NCES Common Core of Data (demographics, funding)
   - State education department APIs

2. **Transit/Transportation**:
   - GTFS feeds (bus/rail schedules)
   - City bike/scooter APIs
   - Traffic incident data

3. **Environmental Data**:
   - Air quality APIs (EPA AirNow)
   - Water quality monitoring
   - Green space/parks data

4. **Economic Development**:
   - Business license databases
   - Commercial development projects
   - TIF districts and incentives

5. **County-Level Data**:
   - County supervisors/commissioners
   - County budgets
   - Sheriff election data
   - County health departments

6. **Special Districts**:
   - Water/sewer districts
   - Fire districts
   - Library districts
   - Parks & recreation districts

---

## 📚 Reference Links

### Official Government Platforms:

- Data.gov: https://catalog.data.gov/
- FBI Crime Data API: https://github.com/fbi-cde/crime-data-api
- Census Geocoding: https://geocoding.geo.census.gov/

### Municipal Data Platforms:

- Socrata Developers: https://dev.socrata.com/
- Legistar Web API: https://webapi.legistar.com/
- NYC Legistar: https://council.nyc.gov/legislation/api/

### Commercial Services:

- Cicero: https://www.cicerodata.com/
- BallotReady: https://www.ballotready.org/
- Ballotpedia: https://ballotpedia.org/
- CrimeoMeter: https://www.crimeometer.com/
- TaxNetUSA: https://www.taxnetusa.com/
- Zoneomics: https://www.zoneomics.com/
- Gridics: https://gridics.com/

### City Open Data Portals (Examples):

- New York: https://data.cityofnewyork.us/
- Chicago: https://data.cityofchicago.org/
- Seattle: https://data.seattle.gov/
- Los Angeles: https://data.lacity.org/
- San Francisco: https://datasf.org/
- Boston: https://data.boston.gov/

---

## 💡 Key Insights & Recommendations

### 1. **Fragmentation is the Biggest Challenge**

Unlike federal/state data with centralized APIs, local data is scattered across:

- 19,429 incorporated places (cities, towns, villages)
- 3,144 counties
- 13,506 school districts
- 35,000+ special districts
- **Total: ~90,000 local governments**

**Recommendation**: Focus on **top 100 cities** (covers 20% of US population), then expand.

---

### 2. **Socrata + Legistar = 80% of Value**

- **Socrata**: City data (budgets, crime, permits, 311)
- **Legistar**: City council (legislation, votes, meetings)

Together, these cover **1,000+ cities for FREE** with consistent APIs.

**Recommendation**: Prioritize these two integrations before anything else.

---

### 3. **Officials Data Requires Budget Decision**

Two paths:

- **Option A (Paid)**: Cicero API - comprehensive, maintained, expensive
- **Option B (Free)**: Build from Ballotpedia + scraping - incomplete, maintenance burden

**Recommendation**: Start with Cicero **free trial** (1,000 queries). If valuable, allocate budget.

---

### 4. **Avoid 311 APIs and Campaign Finance**

- **311 APIs**: Declining (SF shut down), inconsistent
- **Campaign Finance**: Too fragmented, no standard API

**Recommendation**: Use Socrata 311 datasets instead of direct APIs. Skip campaign finance for now.

---

### 5. **Property/Zoning Data is Niche**

Valuable for real estate/development-focused users, but:

- Expensive APIs
- Complex data structures
- Limited user base

**Recommendation**: Phase 5 (future), only if demand justifies cost.

---

## ✅ Next Steps

1. **User Validation**: Which local features would users find most valuable?
   - [ ] City council member profiles?
   - [ ] Local legislation tracking?
   - [ ] City budget transparency?
   - [ ] "Who represents me?" (local officials)?

2. **API Key Registration**: Get started with free APIs
   - [ ] Socrata: No key needed (rate limits vary)
   - [ ] Legistar: Test public access, register if needed
   - [ ] Cicero: Sign up for 1,000 free trial queries
   - [ ] Data.gov: CKAN API (no key needed)

3. **Proof of Concept**: Build quick prototype
   - Test Legistar API with NYC/LA city councils
   - Pull budget data from Socrata for top 10 cities
   - Test Cicero address lookup for 100 sample addresses

4. **Budget Discussion**: Decide on paid services
   - Cicero API (recommended if budget allows)
   - BallotReady (if election focus)
   - Property/Zoning APIs (if niche demand)

5. **City Selection Strategy**:
   - Start with **top 50 cities by population**
   - Add cities where users are located (analytics data)
   - Expand to all **Legistar cities** (3,500+) over time

---

## 📈 Impact Projection

**If Implemented (Phases 1-3)**:

- **Coverage**: 1,000+ cities (50% of US population)
- **Data Types**: City council, legislation, budgets, officials, crime, services
- **User Value**: One-stop shop for local civic engagement
- **Differentiation**: Most comprehensive local government platform

**Comparison**:

- **Current civic-intel-hub**: Federal + State only
- **After local integration**: Federal + State + Local (complete picture)

---

**Document Status**: Research Complete - Awaiting User Prioritization
**Last Updated**: November 4, 2025
**Author**: Claude Code + Mark Sandford

**Note**: Local government data is the "last mile" of civic technology. It's fragmented and challenging, but it's also where politics affects people most directly. Strategic integration of Socrata + Legistar + Cicero can provide 80% of value with reasonable effort.
