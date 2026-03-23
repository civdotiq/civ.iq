# PLAN: Congressional Stock Trade Pipeline — Fix, Expand, Optimize

## Overview

The stock trade feature has the right architecture but produces visibly wrong data (parsing bugs), silently returns nothing for 14 members who file paper PTRs, excludes the entire Senate, and shows raw data instead of answering what citizens actually want to know. Four independent phases, each committable and shippable alone.

## The Citizen Questions (North Star)

1. **"What stocks has my rep traded?"** — Accurate, complete trade table
2. **"Are they trading in sectors their committee regulates?"** — Stock-committee analyzer (already built, fed bad data)
3. **"Did they file on time?"** — STOCK Act requires 45-day disclosure; flag violations
4. **"How much are they trading?"** — Volume, frequency, top holdings at a glance
5. **"How do they compare to peers?"** — Rankings among all House members
6. **"What about my Senator?"** — Currently a dead end

## Data Sources

- **House Office of the Clerk** — `disclosures-clerk.house.gov` (existing)
- **Senate Stock Watcher** — `github.com/timothycarambat/senate-stock-watcher-data` (new, Phase 3)
  - Pre-parsed JSON from Senate eFD filings, updated daily
  - Must attribute as third-party source derived from official Senate records

---

## Phase 1: Fix the Parser (Data Quality) — DO FIRST

The most urgent work. Fixes wrong data that's live right now. Every downstream feature depends on clean parse results.

### 1a. Fix page-boundary Description line bleeding

**File:** `src/lib/data-sources/house-disclosure-service.ts`, `extractTradesFromText()` (~lines 154-317)

**Root cause:** The split regex (line 228) strips `F S : {status}` + optional `D :` + optional `S O :` lines between trade blocks. But when a page break occurs mid-trade, the `D :` (Description) line from the previous trade appears at the _start_ of the next block instead of being consumed by the split. Result: `"D : Sold 20,000 shares. SPAmazon.com, Inc."` as the asset description.

**Fix:**

- [ ] After splitting on `F S :` delimiters, add a cleanup pass on each block that strips leading `D··········:` lines (lines starting with `D` followed by 2+ spaces and a colon)
- [ ] Also strip leading `S  O :` (SubOwner) orphan lines that weren't caught by the existing orphan stripper
- [ ] The regex split pattern (line 227-229) currently consumes `D :` only AFTER `F S :` — also need to handle `D :` that appears BEFORE the next trade's owner prefix due to page breaks

**Test:** Parse Pelosi filing `20033725` → assert AMZN trade `assetDescription` does NOT contain "D :" or "Sold"

### 1b. Fix owner prefix misparse at page boundaries

**Same file, same root cause.** When a block starts with `D : ... SP`, the owner detection (lines 265-270) checks position 0 for "SP"/"JT"/"DC" but finds "D" instead, defaulting to "Self".

**Fix:**

- [ ] Run owner detection AFTER stripping the `D :` artifact from step 1a
- [ ] As fallback, scan for `SP[A-Z]` / `JT[A-Z]` / `DC[A-Z]` anywhere in the first line of the cleaned block

**Test:** Pelosi AMZN trade in `20033725` should parse as `owner: "Spouse"`, not "Self"

### 1c. Fix transaction type contamination

The "D : Sold 20,000 shares" text tricks the transaction type regex into seeing "S" (Sale) when the actual trade is a Purchase. The regex (line 255) matches `P`/`S`/`E` too broadly.

**Fix:**

- [ ] Tighten the transaction type regex: require it to appear immediately after the `[XX]` asset type bracket, not anywhere in the block
- [ ] Pattern: `\[([A-Z]{2})\][\s\n]*(S \(partial\)|S \(full\)|S|P|E)` — keep but ensure it's anchored to the bracket, and run it on the CLEANED block (after `D :` stripping)

**Test:** Pelosi AMZN `20033725` → `transactionType: "Purchase"` (the `P` after `[ST]`)

### 1d. Expand asset type codes

**Files:** `src/types/stock-trades.ts`, `src/lib/data-sources/house-disclosure-service.ts`

The House uses **52 asset type codes**. We handle ~6. AllianceBernstein `[AB]` (Asset-Backed Securities) is misidentified.

**Fix:**

- [ ] Add `ASSET_TYPE_CODES: Record<string, string>` map in `src/types/stock-trades.ts` with all 52 codes:
  ```
  ST=Stocks, OP=Options, EF=ETFs, MF=Mutual Funds, CS=Corporate Securities,
  CT=Cryptocurrency, RE/RF/RN=REITs, RS=RSUs, GS=Gov Securities,
  AB=Asset-Backed Securities, BA=Bank Accounts, FU=Futures, HE/HN=Hedge Funds,
  PM=Precious Metals, PS=Private Stock, OT=Other, 4K=401K, 5C/5F/5P=529 Plans,
  BK=Brokerage, CO=Collectibles, DB=Defined Benefit, DO=Debts Owed,
  DS=Delaware Trust, ET=Exchange Traded Notes, EQ=Blind Trust, FA=Farms,
  FE=Foreign Exchange, FN=Fixed Annuity, IC=Investment Club, IH=IRA Cash,
  IP=Intellectual Property, IR=IRA, MA=Managed Accounts, MO=Mineral Rights,
  OI/OL=Ownership Interest, PE=Pensions, RP=Real Property, SA=Stock Appreciation,
  TR=Trust, VA=Variable Annuity, VI=Variable Insurance, WU=Whole Life Insurance
  ```
- [ ] Add `assetTypeLabel` computed in the parser using this map
- [ ] When ticker === assetType (like AB), don't confuse them

### 1e. Handle image-based PDFs gracefully

**File:** `src/lib/data-sources/house-disclosure-service.ts`

14 members file paper PTRs → scanned image PDFs → `pdf-parse` returns ~6 chars. Rather than adding an OCR dependency now, degrade gracefully.

**Fix:**

- [ ] In `parsePtrPdf()`: if extracted text length < 50 chars AND PDF has > 0 pages, return a sentinel trade with `assetDescription: "Paper filing — view original disclosure"`, `ticker: null`, `sourceUrl` pointing to the PDF
- [ ] Add `isPaperFiling: boolean` to `StockTrade` type
- [ ] In `StockTradesSection.tsx`: render paper filings as a distinct card with a link to the official PDF, not as a broken table row
- [ ] Metadata note: "This member files paper disclosures. Individual trades cannot be extracted automatically. View the original filing for details."

### 1f. Fixture-based parser test suite

**File:** `src/__tests__/lib/data-sources/house-disclosure-service.test.ts`

Current tests mock PDF content. Need fixture-based tests with known-good parse results.

- [ ] Save raw PDF text for: Pelosi `20033725`, Gottheimer `20033756`, one diverse-asset-type filing
- [ ] Test exact trade counts and spot-check 3-4 trades per fixture (all fields)
- [ ] Test the image PDF detection path (< 50 chars text)
- [ ] Test asset type code mapping (AB → "Asset-Backed Securities")

### 1g. Validate

- [ ] `npm run validate:all` passes

**Commit message:** `fix(stock-trades): repair PDF parser page-boundary bugs, expand 52 asset type codes, handle paper filings`

---

## Phase 2: Citizen Analytics (Late Filing + Summary) — SECOND

Adds the computed fields and summary UI that answer citizen questions 3-4.

### 2a. Late filing detection

**Files:** `src/types/stock-trades.ts`, `src/lib/data-sources/house-disclosure-service.ts`

- [x] Add `daysToDisclose: number` computed field to `StockTrade` (filingDate - transactionDate in calendar days)
- [x] Add `isLateFiling: boolean` (true if `daysToDisclose > 45`)
- [x] Compute in `extractTradesFromText()` using the already-available dates
- [x] Use filingDate from XML index (authoritative) for the calculation, not PDF-internal date

### 2b. Trading summary card

**New file:** `src/components/intelligence/StockTradeSummary.tsx`

Renders above the trade table. Answers "How much?" at a glance:

- [x] Total transactions + total filings
- [x] Estimated value range (sum midpoints of amount ranges — $7,500 for "$1,001-$15,000", etc.)
- [x] Top 5 most-traded tickers (frequency badges)
- [x] Trading frequency (transactions per month over coverage period)
- [x] Asset mix breakdown (% stocks / options / ETFs / other by count)
- [x] Late filings count (red text if > 0)
- [x] Design: Aicher grid, border-2, 8px spacing, no shadows

### 2c. Late filing flag in trade table

**File:** `src/features/campaign-finance/components/StockTradesSection.tsx`

- [x] Add "Filed" column showing days-to-disclose
- [x] Red text for trades > 45 days (with aria-label explaining the threshold)
- [x] Sort option: "Late filings first"

### 2d. Human-readable asset types in table

**File:** `src/features/campaign-finance/components/StockTradesSection.tsx`

- [x] Show "Stock" not "ST", "Options" not "OP" in the Type column
- [x] Use `ASSET_TYPE_CODES` map from Phase 1d

### 2e. Filter controls

**File:** `src/features/campaign-finance/components/StockTradesSection.tsx`

- [x] Filter by: transaction type (Purchase/Sale/All), year, owner (Self/Spouse/All)
- [x] Search: filter by ticker or asset name (client-side, no API change)
- [x] Compact filter bar above the table

### 2f. Validate

- [x] `npm run validate:all` passes

**Commit message:** `feat(stock-trades): add late filing detection, trading summary card, filters`

---

## Phase 3: Senate Disclosures — THIRD

Fills the biggest coverage gap. Answers citizen question 6.

### 3a. Senate data source service

**New file:** `src/lib/data-sources/senate-disclosure-service.ts`

- [ ] Fetch pre-parsed JSON from Senate Stock Watcher GitHub repo
- [ ] Map to `StockTrade` type (normalize field names, dates, amounts to match House format)
- [ ] Resolve Senator names to bioguide IDs using existing `RepresentativesCoreService`
- [ ] Compute `daysToDisclose` and `isLateFiling` (same as House)
- [ ] Cache: 24 hours
- [ ] `dataSource: 'senate-stock-watcher'` in metadata

### 3b. Data source attribution

**File:** `src/components/shared/ui/DataSourceAttribution.tsx` (add new entry)

- [ ] Add `DATA_SOURCES.SENATE_STOCK_WATCHER` with:
  - name: "Senate Stock Watcher"
  - note: "Derived from Senate Office of Public Records electronic financial disclosures. Senate Stock Watcher is an independent open-source project, not an official government service."
  - url: link to the GitHub repo

### 3c. Update API route

**File:** `src/app/api/representative/[bioguideId]/stock-trades/route.ts`

- [ ] Remove Senate early-return (lines 59-78)
- [ ] When `chamber === 'Senate'`, call `senateDisclosureService.getTradesForMember(bioguideId)`
- [ ] Use Senate-specific metadata and data source attribution

### 3d. Enable stock-committee analyzer for Senate

**File:** `src/lib/intelligence/analyzers/stock-committee-analyzer.ts`

- [ ] Remove `if (rep.chamber !== 'House') return null` gate
- [ ] Verify `getTopicsForCommittee()` handles Senate committee names
- [ ] Update peer comparison key from `House:{state}` to `{chamber}:{state}`

### 3e. Tests

- [ ] Test Senate data service with mock JSON fixture
- [ ] Test API route returns trades for Senate bioguide IDs
- [ ] Test stock-committee analyzer works for Senate members

### 3f. Validate

- [ ] `npm run validate:all` passes
- [ ] Manual: Tuberville, Ossoff, Hickenlooper should return trade data

**Commit message:** `feat(stock-trades): add Senate disclosures via Senate Stock Watcher`

---

## Phase 4: Peer Comparison & Rankings — FOURTH

Answers citizen question 5. Requires Phases 1-3 data to be flowing.

### 4a. Trading leaderboard API

**New file:** `src/app/api/intelligence/stock-trades/leaderboard/route.ts`

- [ ] Aggregate from cached trade data: rank members by trade count, estimated value, late filing count
- [ ] Top 25 traders leaderboard (both chambers)
- [ ] Per-member stat: "Ranks #X of Y members who disclosed trades"
- [ ] ISR cache: 24 hours

### 4b. Sector breakdown visualization

**New file:** `src/components/intelligence/TradeSectorBreakdown.tsx`

- [ ] Horizontal bar chart: sectors sorted by trade count
- [ ] Highlight sectors overlapping committee jurisdictions
- [ ] Reuse `resolveTickerIndustries()` from entity-resolution package
- [ ] Aicher design: bar colors from design system

### 4c. Integrate into representative profile

- [ ] Add `StockTradeSummary` above `StockTradesSection` in CampaignFinanceVisualizer
- [ ] Add `TradeSectorBreakdown` below trade table
- [ ] Add rank badge from leaderboard data

### 4d. Validate

- [ ] `npm run validate:all` passes

**Commit message:** `feat(stock-trades): add trading leaderboard, sector breakdown, peer rankings`

---

## File Impact Summary

| File                                                                     | Phase | Action                                    |
| ------------------------------------------------------------------------ | ----- | ----------------------------------------- |
| `src/lib/data-sources/house-disclosure-service.ts`                       | 1     | Major edit — fix parser                   |
| `src/types/stock-trades.ts`                                              | 1, 2  | Edit — asset codes, late filing fields    |
| `src/__tests__/lib/data-sources/house-disclosure-service.test.ts`        | 1     | Major edit — fixture tests                |
| `src/features/campaign-finance/components/StockTradesSection.tsx`        | 1, 2  | Edit — paper filings, filters, late flags |
| `src/features/campaign-finance/components/CampaignFinanceVisualizer.tsx` | 4     | Edit — integrate summary                  |
| `src/components/intelligence/StockTradeSummary.tsx`                      | 2     | New                                       |
| `src/lib/data-sources/senate-disclosure-service.ts`                      | 3     | New                                       |
| `src/app/api/representative/[bioguideId]/stock-trades/route.ts`          | 3     | Edit — Senate support                     |
| `src/lib/intelligence/analyzers/stock-committee-analyzer.ts`             | 3     | Edit — Senate gate                        |
| `src/app/api/intelligence/stock-trades/leaderboard/route.ts`             | 4     | New                                       |
| `src/components/intelligence/TradeSectorBreakdown.tsx`                   | 4     | New                                       |

## Risks

| Risk                                                      | Mitigation                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| Senate Stock Watcher repo goes stale                      | Cache 30 days; monitor upstream; build eFD scraper if needed     |
| PDF format changes from House Clerk                       | Fixture tests catch regressions; log parse failure rates         |
| Paper filing members switch to electronic (or vice versa) | Detection is dynamic (text length check), not hardcoded by DocID |
| Late filing calculation timezone edge cases               | Use filing date from XML index (authoritative), not PDF date     |
| Leaderboard requires most members to have cached data     | Phase 4 runs after cron has populated caches from Phases 1-3     |
