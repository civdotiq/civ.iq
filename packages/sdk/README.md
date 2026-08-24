# @civiq/sdk

TypeScript client for the [CIV.IQ](https://civdotiq.org) civic data API.

## What you can build with this

CIV.IQ resolves and cross-references 23 government data sources. This SDK gives you programmatic access to the results:

- **Find representatives by address** — geocode a street address to congressional district and return federal and state legislators
- **Trace campaign finance** — see who funds a legislator, broken down by industry sector
- **Read voting records** — every roll-call vote in the 119th Congress, by member
- **Follow legislation** — bill status, sponsors, cosponsors, committee assignments
- **See intelligence analysis** — vote prediction, influence chains, sector leaderboards, all with confidence scores and methodology disclosure
- **Explore the civic graph** — navigate connections between representatives, bills, committees, districts, and organizations

All data comes from real government APIs. No mock data. When a source is unavailable, the response says so.

## Install

```bash
npm install @civiq/sdk
```

## CLI

The package ships a `civiq` command — script lookups from a shell, or point an AI agent at it. JSON output, no API key required.

```bash
npx @civiq/sdk representatives --state MI --chamber house
npx @civiq/sdk representative P000197 votes --limit 5
npx @civiq/sdk bill 119-hr-1 summary
npx @civiq/sdk search healthcare
npx @civiq/sdk --help
```

Commands: `representatives`, `representative <id> [profile|votes|finance|lobbying]`, `bills`, `bill <id> [summary]`, `vote <id>`, `district <id>`, `committees`, `committee <id>`, `search <query>`. Options: `--base-url`, `--compact`, `--limit`, `--offset`. Errors print structured JSON on stderr with exit code 1.

## Quick start

```typescript
import { CivIQ } from '@civiq/sdk';

const civiq = new CivIQ();

// Who represents this address?
const reps = await civiq.districts.geocode({
  mode: 'address',
  address: '1600 Pennsylvania Ave NW, Washington DC 20500',
});

// What's their voting record?
const detail = await civiq.representatives.get('P000197');

// How independent are they from donor interests?
const prediction = await civiq.intelligence.votePrediction('P000197');

// What industries fund legislators on this committee?
const leaderboard = await civiq.intelligence.sectorLeaderboard('Energy', {
  chamber: 'senate',
});
```

## Resources

### representatives

```typescript
civiq.representatives.list({ chamber, state, party });
civiq.representatives.get(bioguideId);
civiq.representatives.profile(bioguideId);
civiq.representatives.compare(['A000001', 'B000002']);
civiq.representatives.all({ chamber, state });
```

### bills

```typescript
civiq.bills.list({ query, congress, chamber, status });
civiq.bills.get(billId);
civiq.bills.summary(billId);
```

### votes

```typescript
civiq.votes.get(voteId);
```

### districts

```typescript
civiq.districts.get(districtId);
civiq.districts.geocode({ mode, address });
```

### committees

```typescript
civiq.committees.list();
civiq.committees.get(committeeId);
```

### intelligence

```typescript
civiq.intelligence.votePrediction(bioguideId)
civiq.intelligence.influenceChain(bioguideId)
civiq.intelligence.sectorLeaderboard(sector, { chamber })
civiq.intelligence.moneyReportByAddress({ street, city, state })
civiq.intelligence.influenceClusters(bioguideId?)
```

### search

```typescript
civiq.search.unified({ q, limit });
civiq.search.policyArea({ policyArea });
```

### states

```typescript
civiq.states.legislature(state);
civiq.states.bills(state, { query });
civiq.states.legislatorsByAddress({ street, city, state });
```

### graph

```typescript
civiq.graph.neighbors(nodeId, { limit });
civiq.graph.entity(nodeId);
```

## Configuration

```typescript
// Custom base URL (local development or self-hosted)
const civiq = new CivIQ({ baseUrl: 'http://localhost:3000/api' });

// Append your app identifier to the default User-Agent so operators can
// see who's calling. The SDK signature is preserved either way:
//   "@civiq/sdk/0.1.1 my-dashboard/2.3.1"
const civiq = new CivIQ({ userAgent: 'my-dashboard/2.3.1' });
```

The SDK sends `User-Agent: @civiq/sdk/<version>` by default in Node, Deno, and Bun — this is how CIV.IQ tracks SDK adoption. Browsers silently drop custom User-Agent values per the fetch spec, so this header is skipped when running in browser environments.

## Error handling

```typescript
import { CivIQ, NotFoundError, RateLimitError, BadRequestError, UpstreamError } from '@civiq/sdk';

try {
  await civiq.representatives.get(bioguideId);
} catch (err) {
  if (err instanceof NotFoundError) {
    // No representative with that ID
  } else if (err instanceof RateLimitError) {
    // 60 requests/minute limit hit. err.retryAfter has seconds to wait.
  } else if (err instanceof UpstreamError) {
    // Government API is down
  }
}
```

## Types

All response types are exported for TypeScript consumers:

```typescript
import type {
  RepresentativeDetail,
  BillSummary,
  VoteDetail,
  DistrictDetail,
  IntelligenceInsight,
} from '@civiq/sdk';
```

## Data sources

Congress.gov, FEC, Census Bureau, USASpending.gov, Federal Register, Senate LDA, SEC EDGAR, OpenStates, and more. Full list at [civdotiq.org/data-sources](https://civdotiq.org/data-sources).

## License

MIT
