# Privacy

CIV.IQ is civic infrastructure. It exists to make government data accessible, not to collect data about citizens.

## What we collect

CIV.IQ has no user accounts, logins or registration. The only personal data it stores is the email address of people who sign up for email alerts or the weekly digest (see below).

## Address lookups

When you enter an address to find your representatives, the address is:

1. Sent to the Census Bureau Geocoder API to resolve to a congressional district
2. Used to query representative data from Congress.gov and related APIs
3. **Never logged.** Server logs record only the city and state of a lookup (and a one-way hash used for cache accounting) — never the street address.
4. **Cached briefly, under a hash.** To make repeat lookups fast, the district result for an address (including the Census Bureau's normalized form of it) is cached for up to 7 days, keyed by a one-way hash of the address. The cache is not tied to you: CIV.IQ has no accounts, cookies, or user identifiers, so a cached entry cannot be connected to any person or browser. After 7 days it is deleted automatically.

The cache runs on managed Redis infrastructure (Upstash). As you type, the address box sends your partial address to Radar.io for autocomplete suggestions. No other third party receives the address beyond the Census geocoding service.

`src/__tests__/lib/address-not-logged.test.ts` fails if either Census geocoder logs the address again.

## Site search

Text typed into the site search boxes is sent in the request URL (`/api/search?q=…`), and the hosting provider's request logs record URLs. A home address typed there can therefore appear in those logs. The address lookup sends addresses in a POST body instead, which keeps them out of request logs.

## Email alerts and the weekly digest

If you sign up, CIV.IQ stores your email address, what you follow and when you signed up, in Redis under a SHA-256 hash of the email. Sign-ups are double opt-in: unconfirmed ones expire after 48 hours. Emails are sent through Resend. Every email carries a signed one-click unsubscribe link, and unsubscribing deletes the record. Logs show only a masked form of the address (the first three characters).

## Analytics

The site uses Google Analytics to understand aggregate traffic patterns. Google Analytics sets its own cookies. Vercel Web Analytics also counts page views, without cookies. If you block analytics scripts, the site works identically.

## Cookies and local storage

CIV.IQ sets no cookies of its own: no session cookies and no login cookies. Google Analytics sets third-party analytics cookies.

The browser keeps a few things in localStorage: the theme, recent searches, the last-viewed district, and error details when a page breaks. They stay on the device and are never sent to CIV.IQ.

## Server logs and rate limiting

Vercel keeps request logs (IP address, URL, time, user agent) for a limited period. The rate limiter counts requests per IP address in Redis, and each count expires after one minute.

## Third-party APIs

When you browse CIV.IQ, your browser makes requests to:

- **CIV.IQ's own API** (civdotiq.org) for all civic data
- **Radar.io** for address autocomplete suggestions (if you use the address search)
- **Google Analytics** and **Vercel Web Analytics** for page view counting

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
