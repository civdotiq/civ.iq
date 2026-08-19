# Privacy

CIV.IQ is civic infrastructure. It exists to make government data accessible, not to collect data about citizens.

## What we collect

**Nothing.** CIV.IQ does not have user accounts, login systems, or registration. There is no database of user information.

## Address lookups

When you enter an address to find your representatives, the address is:

1. Sent to the Census Bureau Geocoder API to resolve to a congressional district
2. Used to query representative data from Congress.gov and related APIs
3. **Never logged.** Server logs record only the city and state of a lookup (and a one-way hash used for cache accounting) — never the street address.
4. **Cached briefly, under a hash.** To make repeat lookups fast, the district result for an address (including the Census Bureau's normalized form of it) is cached for up to 7 days, keyed by a one-way hash of the address. The cache is not tied to you: CIV.IQ has no accounts, cookies, or user identifiers, so a cached entry cannot be connected to any person or browser. After 7 days it is deleted automatically.

The cache runs on managed Redis infrastructure (Upstash); no other third party receives the address beyond the Census geocoding service.

## Analytics

The site uses Google Analytics to understand aggregate traffic patterns (which pages are visited, not who visits them). No personally identifiable information is sent to Google Analytics. If you block analytics scripts, the site works identically.

## Cookies

CIV.IQ uses only a single localStorage key (`theme`) to remember your light/dark mode preference. No tracking cookies, no session cookies, no third-party cookies.

## Third-party APIs

When you browse CIV.IQ, your browser makes requests to:

- **CIV.IQ's own API** (civdotiq.org) for all civic data
- **Radar.io** for address autocomplete suggestions (if you use the address search)
- **Google Analytics** for anonymous page view counting

No government API is called directly from your browser. All government data is fetched server-side and served through CIV.IQ's API layer.

## Data we display

All data on CIV.IQ is sourced from official public government records:

- Congress.gov (bills, members, committees, votes)
- Federal Election Commission (campaign finance)
- Senate Lobbying Disclosure Act filings
- USASpending.gov (federal contracts and grants)
- Census Bureau (demographics, geographic boundaries)
- Federal Register (regulations, executive orders)
- Bureau of Labor Statistics (employment data)
- OpenStates (state legislatures)

This data is public record. CIV.IQ does not editorialize, interpret, or add non-public information.

## AI-generated analysis

The intelligence layer generates plain-language summaries of statistical patterns. These summaries:

- Are clearly labeled as AI-generated
- Carry confidence scores and methodology documentation
- Never claim causation (only correlation and pattern)
- Are derived entirely from public government data
- Do not use any user data as input

## Contact

Questions about privacy: contact@civdotiq.org
