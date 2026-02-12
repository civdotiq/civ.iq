<p align="center">
  <img src="public/images/civiq-logo-hero.webp" alt="CIV.IQ" width="160">
</p>

<h1 align="center">CIV.IQ</h1>

<p align="center">Civic data from government sources, organized for public use.</p>

<p align="center">
  <a href="https://civdotiq.org">civdotiq.org</a> &bull;
  <a href="docs/API_DOCUMENTATION.md">API Reference</a> &bull;
  <a href="CONTRIBUTING.md">Contribute</a> &bull;
  <a href="LICENSE">License</a>
</p>

---

## What this is

A platform for looking up elected officials and what they do. Enter an address or ZIP code, get back representatives at every level of government with their voting records, campaign finance data, committee assignments, and legislative activity.

All data comes from government APIs. If the data isn't available, the interface says so.

## Data sources

| Source             | What it provides                                     |
| ------------------ | ---------------------------------------------------- |
| Congress.gov       | Bills, votes, members, committees                    |
| FEC.gov            | Campaign contributions, expenditures, filings        |
| U.S. Census Bureau | Demographics, geocoding, economic data               |
| Senate.gov         | Senate floor votes, roll calls                       |
| House Clerk        | House voting records                                 |
| OpenStates         | State legislators, bills, committees (all 50 states) |
| GovInfo            | Hearing transcripts, legislative documents           |
| Federal Register   | Executive orders, proposed rules, comment periods    |
| Census Geocoding   | Address-to-district resolution                       |

No data is fabricated, scraped, or generated.

## Setup

```bash
git clone https://github.com/civdotiq/civic-intel-hub.git
cd civic-intel-hub
npm install
cp .env.example .env.local
```

Add API keys to `.env.local`. All are free:

```env
CONGRESS_API_KEY=       # api.congress.gov/sign-up
FEC_API_KEY=            # api.open.fec.gov/developers
CENSUS_API_KEY=         # api.census.gov/data/key_signup.html
OPENSTATES_API_KEY=     # openstates.org/api/register
```

```bash
npm run dev
```

Verify at [localhost:3000/api/health](http://localhost:3000/api/health).

## Structure

```
src/
├── app/api/            # API routes
├── components/         # Shared components
├── features/           # Feature modules
│   ├── campaign-finance/
│   ├── legislation/
│   ├── representatives/
│   └── state-legislature/
├── lib/                # API clients, services, utilities
├── hooks/              # React hooks
└── types/              # TypeScript definitions
```

## Stack

Next.js 15, React 18, TypeScript (strict), Tailwind CSS, MapLibre GL, D3.js, Recharts, Redis.

## Validation

```bash
npm run validate:all    # lint + type-check + test + build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT with attribution. Copyright (c) 2019-2026 Mark Sandford.

Use it, modify it, distribute it. Include the copyright notice. Provide visible attribution: "Powered by CIV.IQ." The CIV.IQ name and logo require written permission to use. See [LICENSE](LICENSE).

---

Mark Sandford - mark@marksandford.dev
