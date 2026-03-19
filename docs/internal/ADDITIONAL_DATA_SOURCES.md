# Additional Data Sources for Civic-Intel-Hub

**Research Date**: November 4, 2025
**Purpose**: Identify APIs and data sources to enhance civic-intel-hub beyond Wikidata integration

---

## 🎯 Executive Summary

This document catalogs additional government and civic data sources that could enhance the civic-intel-hub platform. Sources are evaluated on:

- **Cost**: Free tier availability
- **Data Quality**: Coverage and accuracy
- **Integration Effort**: API complexity
- **Unique Value**: What new capabilities it enables

**Current Integrations** (as of Nov 2025):

- ✅ Congress.gov API (federal legislators)
- ✅ OpenStates API (state legislators)
- ✅ FEC API (campaign finance)
- ✅ NewsAPI (news aggregation)
- ✅ Census API (demographics)
- ✅ Wikidata (biographical enrichment)
- ✅ Wikipedia

---

## 🟢 HIGH PRIORITY - Free & High Value

### 1. OpenSecrets API

**Website**: https://www.opensecrets.org/open-data/api
**Cost**: FREE (200 calls/day limit)
**Data Coverage**:

- Campaign finance contributions
- Lobbying disclosure data (clients, registrants, lobbyists)
- Politician financial relationships
- Top contributors to candidates/members
- Industry influence tracking

**Why It's Valuable**:

- Complements existing FEC data with lobbying connections
- Shows "follow the money" relationships
- Public already uses OpenSecrets extensively
- API + bulk data downloads available

**Integration Effort**: Medium

- Well-documented REST API
- Rate limit requires caching strategy
- Multiple endpoints (getLegislators, candSummary, candContrib)

**Unique Capabilities**:

- Link legislators to lobbying firms
- Track industry influence by sector
- Historical spending trends
- Lobbyist-legislator connections

**Recommended Implementation**:

```
Phase 1: Integrate lobbying data for individual legislators
Phase 2: Add top contributors/industries to profile pages
Phase 3: Create lobbying dashboard showing industry influence
```

---

### 2. USAspending.gov API

**Website**: https://api.usaspending.gov/
**Cost**: FREE (no rate limits documented)
**Data Coverage**:

- Federal contracts (FY2001-present)
- Federal grants (FY2001-present)
- Government spending by district
- Award recipients and amounts
- Agency spending breakdowns

**Why It's Valuable**:

- Show how federal money flows to each district
- Track government contracts by representative's district
- Identify largest recipients of federal funds
- Connect spending to legislators who voted for appropriations

**Integration Effort**: Low-Medium

- RESTful API with comprehensive documentation
- Large datasets require pagination
- Data goes back to FY2001

**Unique Capabilities**:

- District-level federal spending breakdowns
- Connect spending to legislation votes
- Track earmarks and special appropriations
- Government contractor relationships

**Recommended Implementation**:

```
Phase 1: Add district spending summary to district pages
Phase 2: Link contracts/grants to voting records on funding bills
Phase 3: Create spending trends visualization over time
```

---

### 3. CourtListener API (Free Law Project)

**Website**: https://www.courtlistener.com/help/api/rest/
**Cost**: FREE (with bulk data + API access)
**Data Coverage**:

- 10+ million legal opinions (federal & state courts)
- U.S. Supreme Court opinions
- Federal appellate & district court opinions
- State supreme and appellate court opinions
- Judicial financial records (FOIA data)

**Why It's Valuable**:

- Complements Wikidata judiciary data with actual case law
- Track judges mentioned in legislation (judicial appointments)
- Show how court decisions impact legislation
- Judicial financial disclosures

**Integration Effort**: Medium-High

- Comprehensive REST API
- Large bulk data downloads available
- Complex legal data requires proper presentation

**Unique Capabilities**:

- Link legislation to court challenges
- Track judicial appointments by senators
- Show financial disclosures for judges
- Connect court rulings to legislative responses

**Recommended Implementation**:

```
Phase 1: Add judicial financial disclosures to state judiciary pages
Phase 2: Link Supreme Court justices to Senate confirmation votes
Phase 3: Connect landmark cases to related legislation
```

---

### 4. LegiScan API

**Website**: https://legiscan.com/legiscan
**Cost**: FREE tier (30,000 queries/month)
**Data Coverage**:

- All 50 states + Congress legislation
- Bill details, status, sponsors
- Full bill text
- Roll call records
- Bill abstracts and summaries

**Why It's Valuable**:

- **Alternative/Supplement to OpenStates** (currently integrated)
- More comprehensive bill text access
- Better historical data
- Congress + state unified API

**Integration Effort**: Medium

- Well-documented REST API
- Requires API key (free tier available)
- 30k queries/month sufficient for moderate use

**Unique Capabilities**:

- Unified federal + state legislation API
- More detailed bill text than OpenStates
- Better roll call data for state legislatures
- Bill similarity/tracking features

**Recommended Implementation**:

```
Phase 1: Evaluate vs OpenStates for better state bill coverage
Phase 2: Use as backup/supplement for states with poor OpenStates data
Phase 3: Integrate Congress bill tracking (alternative to Congress.gov)
```

**Note**: Since civic-intel-hub already uses OpenStates, LegiScan would be best as a complementary source for gaps in OpenStates coverage.

---

## 🟡 MEDIUM PRIORITY - Paid or Limited Free Access

### 5. Financial Modeling Prep (FMP) - Congressional Trading API

**Website**: https://site.financialmodelingprep.com/datasets/ownership-senate-insider
**Cost**: PAID (pricing not disclosed in search)
**Data Coverage**:

- Senate financial disclosures (STOCK Act)
- House financial disclosures
- Insider stock trades by Congress members
- Real-time trade notifications
- Historical trading patterns

**Why It's Valuable**:

- Public interest in congressional stock trading is HIGH
- Tracks STOCK Act compliance
- Shows potential conflicts of interest
- Real-time alerts on trades

**Integration Effort**: Low-Medium

- Commercial API (likely well-documented)
- Requires subscription
- Data is public but aggregated commercially

**Unique Capabilities**:

- Track stock trades by individual legislators
- Show trading patterns by committee assignment
- Alert on suspicious trading timing
- Compare trades to legislative votes

**Recommended Implementation**:

```
Phase 1: Evaluate free alternatives (LegiStorm, OpenSecrets)
Phase 2: If budget allows, integrate FMP for real-time trading data
Phase 3: Create "Stock Watchdog" feature tracking congressional trades
```

**Alternative Free Sources**:

- LegiStorm: Manual financial disclosure scraping
- OpenSecrets: Aggregated financial data
- Direct: Clerk.House.gov and Senate Ethics Committee (manual downloads)

---

### 6. LegiStorm

**Website**: https://www.legistorm.com/
**Cost**: PAID (subscription-based, pricing not disclosed)
**Data Coverage**:

- Congressional staff salaries
- Personal financial disclosures (images + data)
- Travel reports
- Privately funded travel
- Gift reports

**Why It's Valuable**:

- Unique staff salary data (not available elsewhere)
- Original financial disclosure images
- Travel transparency
- Gift tracking

**Integration Effort**: Unknown (requires contact)

- May require API key or data licensing
- Might only offer web scraping access

**Unique Capabilities**:

- Staff salary transparency
- Track revolving door (staff to lobbyist pipeline)
- Privately funded travel by legislators
- Gift reporting compliance

**Recommended Implementation**:

```
Phase 1: Contact LegiStorm about data access/API
Phase 2: If API available, integrate staff salary data
Phase 3: Create "Transparency Dashboard" with travel/gifts
```

---

## 🔴 LOW PRIORITY - Discontinued or Niche

### 7. ProPublica Congress API

**Status**: ❌ DISCONTINUED (no longer accepting new API keys)
**Historical Coverage**: Voting records, member data, bill tracking
**Replacement**: Congress.gov API + OpenStates

**Note**: ProPublica Campaign Finance API may still be active (separate from Congress API). Requires further research.

---

### 8. GovTrack API

**Status**: ❌ DISCONTINUED (ended summer recess 2024)
**Historical Coverage**: Bills, votes, legislators (1789-2024)
**Replacement**: Congress.gov API

**Note**: GovTrack website still active for research, but bulk data/API terminated.

---

### 9. Google Civic Information API

**Status**: ❌ SHUTTING DOWN (April 2025)
**Coverage**: Representative lookup by address, election data
**Replacement**: BallotReady, Ballotpedia, Cicero

**Note**: Civic-intel-hub uses Census Geocoding + OpenStates instead.

---

### 10. Sunlight Foundation Congress API

**Status**: ⚠️ UNCERTAIN (Sunlight Labs projects mostly archived)
**Coverage**: Historical congressional data
**Replacement**: Congress.gov API

**Note**: Sunlight Foundation dissolved in 2020; legacy projects on GitHub.

---

## 📊 Data Source Comparison Matrix

| Source              | Cost           | Federal | State | Finance     | Lobbying | Judiciary | Spending | Status          |
| ------------------- | -------------- | ------- | ----- | ----------- | -------- | --------- | -------- | --------------- |
| **OpenSecrets**     | Free (200/day) | ✅      | ❌    | ✅          | ✅       | ❌        | ❌       | ✅ Active       |
| **USAspending.gov** | Free           | ✅      | ❌    | ❌          | ❌       | ❌        | ✅       | ✅ Active       |
| **CourtListener**   | Free           | ✅      | ✅    | ⚠️ (judges) | ❌       | ✅        | ❌       | ✅ Active       |
| **LegiScan**        | Free (30k/mo)  | ✅      | ✅    | ❌          | ❌       | ❌        | ❌       | ✅ Active       |
| **FMP Trading**     | Paid           | ✅      | ❌    | ✅          | ❌       | ❌        | ❌       | ✅ Active       |
| **LegiStorm**       | Paid           | ✅      | ❌    | ✅          | ⚠️       | ❌        | ⚠️       | ✅ Active       |
| **ProPublica**      | N/A            | ✅      | ❌    | ✅          | ✅       | ❌        | ❌       | ❌ Discontinued |
| **GovTrack**        | N/A            | ✅      | ❌    | ❌          | ❌       | ❌        | ❌       | ❌ Discontinued |

---

## 🎯 Recommended Implementation Roadmap

### Phase 1: Lobbying Transparency (FREE)

**Goal**: Connect money to politics
**Sources**: OpenSecrets API
**Features**:

- Add "Lobbying" tab to legislator profiles
- Show top lobbying firms/industries
- Track lobbying spending trends
- Link lobbyists to legislation

**Estimated Effort**: 2-3 weeks
**ROI**: High - users frequently ask "who's funding this?"

---

### Phase 2: Federal Spending by District (FREE)

**Goal**: Show where federal money goes
**Sources**: USAspending.gov API
**Features**:

- District spending dashboard
- Top federal contractors by district
- Grant recipients by district
- Link spending to appropriations votes

**Estimated Effort**: 2-3 weeks
**ROI**: High - connects abstract votes to tangible impact

---

### Phase 3: Judicial Financial Disclosures (FREE)

**Goal**: Judicial branch transparency
**Sources**: CourtListener API
**Features**:

- Add financial disclosures to judiciary pages
- Track Supreme Court confirmation votes
- Link landmark cases to legislation
- Show judge appointment timelines

**Estimated Effort**: 3-4 weeks
**ROI**: Medium - complements existing judiciary integration

---

### Phase 4: Enhanced Bill Tracking (FREE - 30k queries/month)

**Goal**: Better state legislation coverage
**Sources**: LegiScan API
**Features**:

- Supplement OpenStates with LegiScan for gaps
- Full bill text access
- Better roll call data
- Bill similarity tracking

**Estimated Effort**: 2-3 weeks
**ROI**: Medium - improves data quality, not new features

---

### Phase 5 (Optional - PAID): Stock Trading Watchdog

**Goal**: Congressional stock trade transparency
**Sources**: FMP API (paid) OR manual scraping (free)
**Features**:

- Track congressional stock trades
- Alert on suspicious timing
- Compare trades to committee assignments
- Show trading patterns

**Estimated Effort**: 3-4 weeks
**ROI**: High public interest, requires budget or scraping infrastructure

---

## 🔍 Additional Research Needed

### Data Sources to Investigate Further:

1. **Ballotpedia API**: Check if they offer programmatic access (mentioned as Google Civic replacement)

2. **Cicero by Azavea**: Address-based legislator lookup (Google Civic replacement)

3. **BallotReady API**: Candidate information and election data

4. **Federal Register API**: Executive orders, rules, regulations
   URL: https://www.federalregister.gov/developers

5. **ProPublica Campaign Finance API**: May still be active (separate from Congress API)

6. **Twitter/X API**: Track official legislator social media
   (Recent pricing changes may make this prohibitive)

7. **Congressional Record API**: Official proceedings from Congress
   URL: https://api.govinfo.gov/

8. **GovInfo API** (GPO): Government documents, bills, hearings
   URL: https://www.govinfo.gov/developers

9. **Regulations.gov API**: Public comments on proposed rules
   URL: https://open.gsa.gov/api/regulationsgov/

10. **State-level equivalents**: State spending, state lobbying (varies by state)

---

## 📚 Reference Links

### Official Government APIs:

- Congress.gov API: https://api.congress.gov/
- USAspending.gov API: https://api.usaspending.gov/
- Federal Register API: https://www.federalregister.gov/developers/documentation/api/v1
- GovInfo API: https://www.govinfo.gov/developers
- Regulations.gov: https://open.gsa.gov/api/regulationsgov/
- Census API: https://www.census.gov/data/developers/data-sets.html
- FEC API: https://api.open.fec.gov/developers/

### Non-Profit Data Sources:

- OpenSecrets: https://www.opensecrets.org/open-data/api
- CourtListener: https://www.courtlistener.com/help/api/rest/
- OpenStates: https://docs.openstates.org/api-v3/
- Wikidata: https://query.wikidata.org/

### Commercial Services:

- LegiScan: https://legiscan.com/legiscan
- LegiStorm: https://www.legistorm.com/
- Financial Modeling Prep: https://financialmodelingprep.com/
- Cicero: https://www.cicerodata.com/api/

### Historical/Archived:

- GovTrack: https://www.govtrack.us/about-our-data (website only)
- Sunlight Labs: https://sunlightlabs.github.io/congress/ (archived)

---

## ✅ Next Steps

1. **User Feedback**: Which of these data sources would add the most value?

2. **API Key Registration**: Create accounts for free tier APIs:
   - [ ] OpenSecrets API key
   - [ ] USAspending.gov (no key needed - test access)
   - [ ] CourtListener API key
   - [ ] LegiScan API key (free tier)

3. **Proof of Concept**: Build quick prototype for highest priority (OpenSecrets lobbying)

4. **Budget Discussion**: If paid APIs are desired (FMP, LegiStorm), discuss budget allocation

5. **Architecture Planning**: Design caching strategy for new data sources (rate limits)

---

**Document Status**: Research Complete - Awaiting User Prioritization
**Last Updated**: November 4, 2025
**Author**: Claude Code + Mark Sandford
