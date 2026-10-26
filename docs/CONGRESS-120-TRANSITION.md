# 120th Congress transition checklist

The 120th Congress convenes at noon ET on **January 3, 2027**. Until then the site shows the sitting 119th Congress: its members, its district lines and data tabulated on those lines. On that date, sitting members, district boundaries and several data vintages change together. This note lists what must change and whether it happens on its own.

Ten states redrew their House maps for the 2026 election, so the 120th lines differ from the 119th there: **AL, CA, FL, LA, MO, NC, OH, TN, TX, UT**. Everything below matters most in those states.

## Happens automatically on January 3

- **Current Congress number.** `getCurrentCongressNumber()` (`src/lib/data/congressional-constants.ts`) is date-based and returns 120 from midnight UTC on January 3, 2027, which is about 17 hours before the noon ET convening that the geocoder switch below uses. Align the two if the gap matters. `CONGRESS_SESSIONS` already has an entry for the 120th.
- **Address → district lookup.** `currentOfficeholderVintage()` (`src/lib/census-vintage.ts`) switches from the frozen `ACS2025_Current` geocoder vintage (119th lines) to `Current_Current` (120th lines) at `CONGRESS_120_CONVENES_MS`.
- **Senate roll-call mirror.** `scripts/sync-senate-votes.ts` derives the Congress number from the date, so the mirror moves to the 120th menu once senate.gov publishes it.

## Must be changed by hand

### Members

- **Roster.** `sync-congress-legislators.yml` picks up the new members once the congress-legislators project updates (usually within days of the swearing-in). Check that new members, departed members and the cached roster all refresh, and that profile pages for departed 119th members stop presenting them as sitting.
- **Vacancies.** `src/lib/data/vacancies.json` tracks 119th seat changes. Start a fresh list for the 120th, and point `sync-vacancies.yml` at the 120th Congress "Changes in membership" page instead of the 119th.

### District boundaries and maps

- **TIGERweb layers.** `TIGERWEB_SITTING_LAYERS` (`src/lib/tigerweb-layers.ts`) names `119th Congressional Districts` and `2024 State Legislative Districts`. Rename them to the 120th and 2026 layers. This feeds the single-district outline, `/api/district-map` and the background map tiles. Layers are resolved by name, so a stale name falls back to an old layer number and shows the wrong lines.
- **Congressional district manifest.** `public/data/districts/manifest.json` comes from TIGER/Line 2025 (119th). Regenerate it from the TIGER release that carries the 120th districts.
- **State legislative map tiles.** `public/data/state_legislative_districts.pmtiles` is built by `scripts/process-state-legislative-districts.mjs` from TIGER2025 (2024 legislative districts). Rebuild from the release with the 2026 legislative districts. Most legislatures elected in November 2026 are seated in January 2027, but each state sets its own date.
- **2026 ballot districts.** The CD120 corpus (`src/lib/data-sources/cd120-districts`) and the `ballotDistrict2026` field exist because the ballot lines and the sitting lines differ until January 3. Afterwards the geocoder returns the 120th lines directly, so retire `ballotDistrict2026` or fold it into the normal result.

### Census figures

- **Survey vintage.** `ACS_5YR_VINTAGE` (`src/lib/census-vintage.ts`) is 2024 (2020–2024 estimates, 119th lines). The ACS 2025 release (expected December 2026) is still tabulated on 119th lines, and TIGERweb's "ACS 2025" layer group confirms it. Figures on 120th lines should first appear in a later release. Until they exist, district pages in the ten redrawn states describe the old lines. Those pages should then say "Data unavailable" or carry a caveat, never show old-line figures as if they were current.
- **Cache keys.** Each vintage change needs a bump of the `district-details-v*` cache key (`src/lib/districts/district-details.ts`). Otherwise cached figures keep the old year's numbers under the new label.

### Hard-coded "119th"

- **Wording.** About 110 source files mention the 119th Congress. These include the answer-first sentences and the member meta descriptions (`src/lib/seo/answer-first.ts`, `src/lib/seo/meta-descriptions.ts`, which say "in the 119th Congress"), the record card, page copy and llms.txt. Derive the number from `getCurrentCongressNumber()` rather than editing each literal.
- **Data windows.** Stock trades count from the 119th's first day (`STOCK_TRADES_SINCE` in `src/lib/questions/stock-trades.ts`). The record card's party-line and attendance baselines are per Congress. `bill-policy-areas-mirror.yml` defaults to `--congress 119`. Each needs a 120th window, and the first weeks of a new Congress will have little data. Show small counts honestly rather than carrying over 119th numbers.
- **Old-Congress pages.** The site covers the current Congress only. After the switch, 119th-only pages (votes, bills, members who left) must not present themselves as current.

## Unchanged

- **Seat count.** 541 seats: 535 voting members plus 6 non-voting delegates.
- **Data sources.** The pipelines for Congress.gov, FEC, LDA and USASpending are keyed by date or Congress number rather than district lines.
