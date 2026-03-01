# Infrastructure Plan: 8 New Features

## Codebase Audit Summary

Before planning, the codebase was audited for existing infrastructure relevant to each feature.

**What already exists:**

| Asset                   | Location                                     | Relevance                                                                                |
| ----------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 107 API endpoints       | `src/app/api/`                               | Data layer for widgets, downloads, print packs                                           |
| 10 join endpoints       | `src/app/api/` (see DATA_NETWORK.md)         | 4 surfaced in UI, 6 API-only                                                             |
| JSON-LD schemas         | `src/components/seo/JsonLd.tsx`              | Person, GovernmentOrganization, Breadcrumb, FAQ, LegislativeEvent, Organization, WebSite |
| Export utilities        | `src/lib/utils/data-export.ts`               | CSV/JSON client-side export with metadata                                                |
| Print CSS               | `src/styles/print.css`                       | Basic print styles                                                                       |
| Printable worksheets    | `src/app/(civic)/education/`                 | PrintableWorksheet.tsx, PrintableRubric.tsx                                              |
| District export         | `DistrictExportButton.tsx`                   | JSON export via `/api/district/{districtId}/export`                                      |
| Delegation export       | `DelegationExportButton.tsx`                 | CSV/JSON for state delegations                                                           |
| D3 + Recharts           | package.json                                 | d3 ^7.9.0, recharts ^3.0.0                                                               |
| Cron infrastructure     | vercel.json + `src/app/api/cron/`            | 3 daily jobs (RSS, bill summaries, Nostr)                                                |
| Middleware              | `src/middleware.ts`                          | Rate limiting, CORS, CSP, security headers                                               |
| CORS on public APIs     | middleware.ts                                | `Access-Control-Allow-Origin: *` on `/api/v1/`, `/api/feed/`, `/api/activitypub/`        |
| X-Frame-Options         | middleware.ts                                | Currently set to `DENY` on all routes                                                    |
| v1 API envelope         | `src/lib/api/v1-response.ts`                 | Consistent response format with pagination and meta                                      |
| Tailwind design system  | `tailwind.config.ts`                         | Aicher 8px grid, color tokens, border widths                                             |
| Trading cards feature   | `src/features/trading-cards/`                | Self-contained feature pattern with types, data, components, OG renderer                 |
| `generateMetadata()`    | Multiple page.tsx files                      | Async metadata generation per route                                                      |
| OpenDataStrip component | `src/shared/components/ui/OpenDataStrip.tsx` | Links to RSS, API, Nostr, Fediverse per page                                             |
| Glossary                | `src/app/(civic)/glossary/`                  | Term definitions with individual pages                                                   |
| csv-parse + papaparse   | package.json                                 | CSV parsing already available                                                            |

**What does NOT exist:**

- No i18n library or translation files
- No PDF generation library (html2canvas in devDeps only)
- No embed/widget route group
- No `/lite/` or text-only mode
- No bulk download infrastructure
- No "Follow the Money" narrative page
- No Spanish content

---

## Feature-by-Feature Plan

---

### Feature 1: Embeddable Widgets

**Effort:** M

**What exists:**

- All data APIs needed for widgets are live
- CORS already configured for `/api/v1/` endpoints
- Design system tokens in Tailwind config
- Trading cards feature provides a pattern for self-contained visual components

**What's needed:**

- New route group: `src/app/(embed)/embed/`
- Override `X-Frame-Options` from `DENY` to `ALLOWALL` for embed routes only
- Minimal layout (no header, no footer, no navigation)
- 3 widget page components
- Documentation page with embed codes

**Technical decisions:**

| Decision            | Options                           | Recommendation                                                                                                                                                                                                                                 |
| ------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delivery mechanism  | `<iframe>` vs `<script>` tag      | **iframe only.** Script injection is a security liability and couples our CSS to the host site. Iframes are sandboxed, self-contained, and work everywhere. Provide a `<script>` loader only as a convenience wrapper that creates the iframe. |
| Styling isolation   | Tailwind in iframe vs minimal CSS | **Minimal inline CSS within Tailwind.** The iframe gets its own layout.tsx with a stripped-down stylesheet. Use the existing design tokens but no header/footer/nav.                                                                           |
| Responsive behavior | Fixed sizes vs fluid              | **Fluid width, fixed min-height.** Widgets should fill their container width. Use `postMessage` to communicate height back to parent for auto-resizing iframes.                                                                                |

**File structure:**

```
src/app/(embed)/
  layout.tsx                              # Minimal layout: no header/footer, embed-specific CSP
  embed/
    reps/[districtId]/page.tsx            # "Your District's Reps" widget
    bill/[billId]/page.tsx                # "Bill Status Tracker" widget
    district/[districtId]/page.tsx        # "District Snapshot" widget
src/app/(public)/
  embed-docs/page.tsx                     # Documentation page with embed codes
```

**Middleware change:** Add embed route exception to `X-Frame-Options` in `src/middleware.ts`. For paths matching `/embed/*`, set `X-Frame-Options: ALLOWALL` and add `frame-ancestors *` to CSP.

**CORS:** Already configured for `/api/v1/` which the widgets will fetch from. No changes needed.

**Data flow:** Each widget is a server component that fetches data at render time via the existing service layer (same pattern as district/committee pages). No client-side API calls needed from the iframe.

---

### Feature 2: Bulk Downloadable Datasets

**Effort:** L

**What exists:**

- `data-export.ts` with `toCSV()` and `toJSON()` utilities
- csv-parse and papaparse in dependencies
- Cron infrastructure (3 existing Vercel cron jobs)
- All source APIs are live
- v1 API envelope provides consistent data access

**What's needed:**

- New cron job: `/api/cron/dataset-generator`
- Storage strategy for generated files
- Download page: `/data` or `/downloads`
- 5 dataset generators

**Technical decisions:**

| Decision         | Options                                                          | Recommendation                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File storage     | `/public/data/` (static) vs API route (on-demand) vs Vercel Blob | **Vercel Blob storage.** Static files in `/public/` require a redeploy to update. On-demand generation is too slow for large datasets. Vercel Blob stores files externally, serves them via CDN, and the cron job can overwrite them on schedule. If Vercel Blob is not available, fall back to an API route that generates on first request and caches for 24h (using existing Redis cache). |
| Update frequency | Real-time vs daily vs weekly                                     | **Daily for Congress members + bills + votes. Weekly for finance + spending** (FEC updates quarterly, USASpending updates daily but aggregation is expensive).                                                                                                                                                                                                                                |
| File format      | CSV only vs JSON only vs both                                    | **Both.** CSV for spreadsheet users (journalists, teachers). JSON for developers. Same data, two formats.                                                                                                                                                                                                                                                                                     |
| Dataset scope    | Current session only vs historical                               | **Current session only** (119th Congress). Historical datasets are a future consideration.                                                                                                                                                                                                                                                                                                    |

**File structure:**

```
src/app/api/cron/dataset-generator/route.ts    # Cron handler
src/lib/datasets/
  generators/
    congress-members.ts                          # All current members
    bills-current-session.ts                     # All bills this session
    campaign-finance.ts                          # Finance summaries by member
    spending-by-district.ts                      # Federal spending per district
    vote-records.ts                              # Vote records current session
  index.ts                                       # Orchestrator
src/app/(public)/downloads/page.tsx              # Download listing page
```

**Cron schedule (vercel.json):**

```json
{ "path": "/api/cron/dataset-generator", "schedule": "0 4 * * *" }
```

**Dataset specifications:**

| Dataset              | Rows (est.) | Sources                  | Update |
| -------------------- | ----------- | ------------------------ | ------ |
| Congress members     | ~535        | Congress.gov, bioguide   | Daily  |
| Bills (119th)        | ~15,000     | Congress.gov             | Daily  |
| Campaign finance     | ~535        | FEC API                  | Weekly |
| Spending by district | ~435        | USASpending              | Weekly |
| Vote records         | ~1,000+     | Congress.gov, Senate XML | Daily  |

**Download page:** Static server component listing each dataset with name, description, row count, file size, last-updated timestamp, and download links (CSV + JSON). Follow existing page patterns (breadcrumbs, OpenDataStrip).

---

### Feature 3: Printable District Civic Packs

**Effort:** M

**What exists:**

- `src/styles/print.css` with basic print optimization
- `PrintableWorksheet.tsx` and `PrintableRubric.tsx` as patterns
- District data API returns demographics, rep info, spending, geography
- `DistrictExportButton.tsx` for JSON export
- District page already renders most needed data

**What's needed:**

- Print-optimized route: `/districts/[districtId]/print`
- `@media print` CSS for the print layout
- QR code generation (lightweight library or inline SVG)
- Server-rendered layout optimized for 1-2 page print

**Technical decisions:**

| Decision       | Options                                                                     | Recommendation                                                                                                                                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementation | Separate print route vs CSS-only on existing page vs PDF generation library | **Separate print route** with `@media print` CSS. A dedicated route keeps the print layout simple and avoids polluting the main district page with print-specific markup. No PDF library needed -- browser print dialog handles PDF export. This matches the existing PrintableWorksheet pattern. |
| QR codes       | Library (qrcode.react) vs external API vs inline SVG                        | **`qrcode.react`** (~3KB gzipped). Generates QR codes as inline SVG at build time. No external dependency.                                                                                                                                                                                        |
| District map   | Include vs exclude                                                          | **Include as a static image.** Use a pre-rendered map thumbnail (from the existing MapLibre setup) or a simple SVG outline. The full interactive map is too heavy for print. Consider using a static Census TIGER/Line SVG.                                                                       |
| State reps     | Include vs exclude                                                          | **Include if available.** The OpenStates API integration exists. Show state reps below federal reps with a note about data availability.                                                                                                                                                          |

**File structure:**

```
src/app/(civic)/districts/[districtId]/print/page.tsx   # Print-optimized page
src/styles/civic-pack-print.css                          # Print-specific styles
```

**Layout:** Server component, no client JS. Fetches all data server-side via existing services. Uses `@media print` to hide browser chrome and optimize for letter-size paper. The page renders as a normal web page that looks good when printed.

**Content layout (letter-size, 1-2 pages):**

```
Page 1:
  [District ID + State]        [QR Code → civ.iq/districts/{id}]
  [Federal Representatives: photo, name, party, contact, committees]
  [State Representatives (if available)]

Page 2 (if needed):
  [Top Federal Spending Categories — bar chart or table]
  [Key Demographics — population, median income, education, broadband]
  [Data sources + last updated]
```

---

### Feature 4: Schema.org Structured Data

**Effort:** S

**What exists:**

- `src/components/seo/JsonLd.tsx` already implements 7 schema types
- PersonSchema on rep pages (name, jobTitle, party, image, committees, sameAs)
- GovernmentOrganizationSchema on committee pages
- LegislativeEventSchema on bill/vote pages
- BreadcrumbSchema and FAQSchema on multiple pages
- `generateMetadata()` on all major page types

**What's needed:**

- Audit existing schemas against Google's Rich Results requirements
- Add missing schema types for underserved pages
- Improve existing schemas with additional properties

**Audit of current coverage:**

| Page Type        | Current Schema                  | Gap                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Representative   | PersonSchema + BreadcrumbSchema | Good. Add `knowsAbout` for policy areas. Add `affiliation.name` for party. Verify `sameAs` includes all social links.                                                                                                                                                                                                                                                 |
| Bill             | LegislativeEventSchema          | **Weak.** Google doesn't have a dedicated Legislation schema, but the current Event-based approach is suboptimal. Switch to `Legislation` (schema.org) with `legislationIdentifier`, `legislationDate`, `legislationPassedBy`, `legislationDateVersion`, `isPartOf` (Congress). Note: `Legislation` is a pending schema.org type -- use it with `@context` extension. |
| Committee        | GovernmentOrganizationSchema    | Good. Add `member` array with Person references. Add `subOrganization` for subcommittees.                                                                                                                                                                                                                                                                             |
| District         | FAQSchema only                  | **Gap.** Add `AdministrativeArea` with `containedInPlace` (State), `geo` (centroid), `population`.                                                                                                                                                                                                                                                                    |
| Vote             | LegislativeEventSchema          | Acceptable. Add `VoteAction` with `actionOption` (Yea/Nay), `agent` (legislators), `object` (bill).                                                                                                                                                                                                                                                                   |
| State legislator | None                            | **Gap.** Add PersonSchema (same pattern as federal reps).                                                                                                                                                                                                                                                                                                             |
| Glossary terms   | None                            | **Gap.** Add `DefinedTerm` with `name`, `description`, `inDefinedTermSet`.                                                                                                                                                                                                                                                                                            |

**File changes:**

```
src/components/seo/JsonLd.tsx                # Add new schema components, improve existing
src/app/(civic)/districts/[districtId]/page.tsx    # Add AdministrativeAreaSchema
src/app/(civic)/glossary/[term]/page.tsx           # Add DefinedTermSchema
src/app/(civic)/state-legislature/[state]/legislator/[id]/page.tsx  # Add PersonSchema
```

**No new files needed.** All changes are additions to `JsonLd.tsx` and schema invocations in existing page components.

**Validation:** Test with Google's Rich Results Test tool after implementation. Priority schemas for rich results: Person (knowledge panel), FAQPage (accordion in search), BreadcrumbList (breadcrumbs in search).

---

### Feature 5: Surface the Join Layer in the Front-End UI

**Effort:** L

**What exists (UI-visible joins):**

| Join Endpoint                                      | UI Location                                    | Status                                      |
| -------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `/api/bill/{billId}/spending`                      | Bill pages, "Related Federal Spending" section | Visible via `BillSpendingSection.tsx`       |
| `/api/bill/{billId}/votes`                         | Bill pages, "Congressional Votes" section      | Visible (fetched as part of main bill data) |
| `/api/district/{districtId}/bills`                 | District pages, "Relevant Legislation" section | Visible via `DistrictRelevantBills.tsx`     |
| `/api/representative/{bioguideId}/civic-alignment` | Rep pages, "Civic Alignment" tab               | Visible via `CivicAlignmentTab.tsx`         |

**What's API-only (invisible to browsers):**

| Join Endpoint                                           | Current Status   | Planned UI Location                                       |
| ------------------------------------------------------- | ---------------- | --------------------------------------------------------- |
| `/api/spending/agency/{agencySlug}/bills`               | API-only, tested | Spending page: "Related Legislation" section              |
| `/api/representative/{bioguideId}/finance-jurisdiction` | API-only, tested | Rep pages: new "Money & Oversight" section in finance tab |
| `/api/committee/{committeeId}/regulations`              | API-only, tested | Committee pages: new "Oversight Regulations" section      |
| `/api/govinfo/hearings/connections`                     | API-only, tested | Committee pages: new "Related Hearings" section           |
| `/api/search/policy-area`                               | API-only, tested | Topics pages: cross-domain search results                 |
| `/api/bills/lifecycle`                                  | API-only, tested | Legislation page: bill status distribution chart          |

**Implementation plan for each gap:**

**5a. Committee pages + Regulations** (committee/{committeeId}/regulations)

- New component: `CommitteeRegulations.tsx`
- Location: Below members list on committee page
- Shows: Proposed rules, final rules, open comment periods grouped by urgency
- Pattern: Same `useSWR` lazy-loading as `BillSpendingSection.tsx`

**5b. Committee pages + Hearings** (govinfo/hearings/connections?committeeId=X)

- New component: `CommitteeHearings.tsx`
- Location: Below regulations section on committee page
- Shows: Recent hearings with relevance scores and matched topics
- Pattern: `useSWR` with committeeId param

**5c. Rep pages + Finance-Jurisdiction** (representative/{bioguideId}/finance-jurisdiction)

- New component: `FinanceJurisdictionSection.tsx`
- Location: Within existing Campaign Finance tab, below industry breakdown
- Shows: Which donor sectors overlap with committee oversight jurisdiction
- Visual: Table or matrix showing sector name, donation amount, oversight committee
- This is the most impactful join for transparency

**5d. Spending page + Related Bills** (spending/agency/{agencySlug}/bills)

- New component: `AgencyRelatedBills.tsx`
- Location: Agency detail sections on spending page
- Shows: Bills that affect the selected agency
- Pattern: Fetch when an agency is selected/expanded

**5e. Topics/Policy area pages** (search/policy-area)

- Enhance existing topics pages (`/topics`, `/topics/economy`, `/topics/healthcare`)
- Add cross-domain results: related bills, regulations, spending, committees
- New component: `PolicyAreaCrossDomain.tsx`

**5f. Legislation page + Bill Lifecycle** (bills/lifecycle)

- New component: `BillLifecycleChart.tsx`
- Location: Top of `/legislation` page
- Shows: Status distribution histogram (how many bills at each stage)
- Visual: Horizontal stacked bar or funnel chart using D3

**File structure:**

```
src/features/committees/components/CommitteeRegulations.tsx
src/features/committees/components/CommitteeHearings.tsx
src/features/campaign-finance/components/FinanceJurisdictionSection.tsx
src/features/spending/components/AgencyRelatedBills.tsx
src/features/legislation/components/PolicyAreaCrossDomain.tsx
src/features/legislation/components/BillLifecycleChart.tsx
```

---

### Feature 6: "Follow the Money" Page

**Effort:** L

**What exists:**

- `/api/representative/{bioguideId}/finance-jurisdiction` — the core money/oversight join
- `/api/representative/{bioguideId}/finance` — full FEC data with industry breakdown
- `/api/bill/{billId}/spending` — bill-to-spending connection
- `/api/representative/{bioguideId}/votes` — voting records
- `/api/representative/{bioguideId}/bills` — sponsored legislation
- Committee data with jurisdiction topics
- SmartSearchInput component for ZIP/district lookup

**What's needed:**

- New page route: `/follow-the-money`
- Narrative flow component stitching existing data
- No new API endpoints

**Technical decisions:**

| Decision      | Options                                              | Recommendation                                                                                                                                                                                                                                                      |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry point   | ZIP code only vs ZIP + rep picker vs district picker | **ZIP code input reusing SmartSearchInput**, then show all reps for that address. User clicks a rep to see their money trail. Fallback: direct link with `?rep={bioguideId}`.                                                                                       |
| Data fetching | Single aggregated API call vs multiple client calls  | **Multiple parallel client-side fetches** using existing endpoints. This avoids creating a new aggregation endpoint and reuses tested infrastructure. Use `Promise.all` for parallel loading.                                                                       |
| Visualization | Text-heavy narrative vs flowchart vs Sankey diagram  | **Step-by-step narrative with simple data tables.** A Sankey diagram looks impressive but is hard to read on mobile and hard to build accessibly. The power is in the narrative sequence, not the chart. Use D3 only for a simple bar chart showing dollar amounts. |

**Page flow:**

```
Step 1: Enter ZIP or pick a rep
  → SmartSearchInput (existing component)

Step 2: [Rep Name] sits on these committees:
  → Committee list with jurisdiction descriptions
  → Source: Congress.gov

Step 3: Those committees oversee these industries:
  → Industry sector list mapped from committee-agency-map
  → Source: CIV.IQ committee-agency-map

Step 4: These industries donated to [Rep Name]:
  → Top donors by sector, with dollar amounts
  → Overlap indicator: which donors match committee jurisdiction
  → Source: FEC.gov

Step 5: [Rep Name] voted on bills affecting those industries:
  → Recent votes on bills in matching policy areas
  → Yea/Nay position shown
  → Source: Congress.gov

Step 6: Those bills authorized spending:
  → Federal spending connected to those bills
  → Source: USASpending.gov
```

**File structure:**

```
src/app/(civic)/follow-the-money/page.tsx          # Page with metadata
src/features/follow-the-money/
  components/
    MoneyTrailFlow.tsx                              # Main narrative component
    StepCommittees.tsx                              # Step 2
    StepIndustries.tsx                              # Step 3
    StepDonors.tsx                                  # Step 4
    StepVotes.tsx                                   # Step 5
    StepSpending.tsx                                # Step 6
  hooks/
    useMoneyTrail.ts                                # Data fetching orchestrator
```

---

### Feature 7: Spanish Language Support

**Effort:** XL

**What exists:**

- Glossary with English definitions (`/glossary`, `/glossary/[term]`)
- Education page with civic content
- `generateMetadata()` on all pages (would need locale-aware versions)
- No i18n library installed
- No translation files

**What's needed:**

- i18n routing architecture
- Translation files for UI chrome
- Spanish glossary content
- Locale-aware metadata

**Technical decisions:**

| Decision          | Options                                                   | Recommendation                                                                                                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| i18n library      | Next.js built-in i18n (App Router) vs next-intl vs custom | **next-intl.** Next.js App Router has minimal built-in i18n (just locale detection). next-intl provides: message formatting, typed translations, server/client component support, and `[locale]` route segment. It's the standard choice for Next.js 13+ App Router i18n. |
| Route structure   | `/es/` prefix vs subdomain vs query param                 | **`/es/` prefix via `[locale]` route segment.** This is the standard next-intl pattern. URLs become `/es/representative/P000197`, `/es/bill/119-hr-1`, etc. Default locale (en) has no prefix.                                                                            |
| Translation scope | Everything vs UI chrome only                              | **UI chrome only.** Government data stays in English. See scope table below.                                                                                                                                                                                              |

**Translation scope:**

| Content Type                                            | Translate? | Rationale                 |
| ------------------------------------------------------- | ---------- | ------------------------- |
| Navigation labels (Home, Districts, Bills, etc.)        | Yes        | UI chrome                 |
| Section headers (Voting Record, Campaign Finance, etc.) | Yes        | UI chrome                 |
| Status labels (Introduced, Passed, Enacted, etc.)       | Yes        | UI chrome                 |
| Party names (Democratic, Republican, Independent)       | Yes        | UI chrome                 |
| Error messages                                          | Yes        | UI chrome                 |
| Glossary definitions                                    | Yes        | Educational content       |
| Education page content                                  | Yes        | Educational content       |
| About page, Terms, Privacy                              | Yes        | Legal/info                |
| Bill titles and text                                    | No         | Government API data       |
| Representative names                                    | No         | Proper nouns              |
| Committee names                                         | No         | Official government names |
| Vote descriptions                                       | No         | Government records        |
| News articles                                           | No         | External content          |
| API responses                                           | No         | Machine interface         |

**Translation workload estimate:**

- UI chrome: ~300-400 strings
- Glossary: ~50-100 terms with definitions
- Education content: ~2,000 words
- Static pages (about, terms, privacy): ~3,000 words
- Total: ~5,000-6,000 words of translation

**File structure:**

```
src/i18n/
  config.ts                          # Locale configuration
  request.ts                         # next-intl request config
messages/
  en.json                            # English strings
  es.json                            # Spanish strings
src/app/[locale]/                    # Locale-prefixed route group
  layout.tsx                         # Locale-aware root layout
  (civic)/                           # Mirror existing (civic) routes
  (public)/                          # Mirror existing (public) routes
```

**Migration complexity:** Moving from `src/app/(civic)/` to `src/app/[locale]/(civic)/` requires restructuring the route tree. Every hardcoded string in components needs extraction to message keys. This is a large refactor touching most files.

**Recommendation:** Defer this feature until after the others. It's the largest effort and touches every file. Build the other 8 features first, then do the i18n refactor once, rather than refactoring twice.

---

### Feature 8: Low-Bandwidth / Text-Only Mode

**Effort:** M

**What exists:**

- Server-rendered pages (many pages are server components already)
- `print.css` for print-optimized output
- All data accessible via server-side service calls
- Existing page structure with clear data sections

**What's needed:**

- Alternate rendering mode that strips heavy components
- Lightweight CSS
- Accessible, fast-loading HTML

**Technical decisions:**

| Decision           | Options                                                                              | Recommendation                                                                                                                                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Trigger mechanism  | `/lite/` prefix vs `?lite=1` query param vs separate route group                     | **`?lite=1` query parameter** detected in middleware. This avoids duplicating the entire route tree. Middleware sets a header (`X-Lite-Mode: 1`) that layouts read to swap out heavy components. Provide `/lite/{path}` as a rewrite alias in next.config for clean URLs.                                                |
| Component strategy | Separate lite components vs conditional rendering in existing components vs CSS-only | **Conditional rendering via a LiteMode context provider.** Create a `useLiteMode()` hook. Heavy components (maps, D3 charts, interactive visualizations) check this flag and render a simpler fallback (data table, text summary). Lighter components render normally. This avoids maintaining parallel component trees. |
| CSS approach       | Separate stylesheet vs CSS media query vs Tailwind variants                          | **Tailwind variant `lite:` via a custom variant plugin.** When lite mode is active, the `<html>` tag gets a `data-lite` attribute. Tailwind's `lite:hidden` hides elements. This keeps styles co-located with components rather than in a separate file.                                                                 |
| Images             | Remove all vs keep small ones vs lazy-load                                           | **Keep rep photos (small, useful), remove maps and decorative images.** Photos are typically <50KB and provide real information. Maps and chart images are heavy and have text alternatives.                                                                                                                             |

**Implementation approach:**

1. Middleware detects `?lite=1` or `/lite/` prefix, sets response header
2. Root layout reads header, sets `data-lite` attribute on `<html>`
3. `LiteModeProvider` context wraps the app
4. Heavy components check `useLiteMode()` and render text fallbacks:
   - Maps → "District {id} in {state}" with county list
   - D3 charts → HTML tables with the same data
   - Interactive filters → Static lists
   - Client-side search → Server-side search link
5. Minimal CSS loaded in lite mode (no animations, no custom fonts if slow connection)

**File structure:**

```
src/lib/lite-mode/
  context.tsx                    # LiteModeProvider + useLiteMode hook
  middleware.ts                  # Lite mode detection logic (used by main middleware)
src/shared/components/ui/
  LiteFallback.tsx               # Generic wrapper: renders children or lite fallback
```

**Route rewrite (next.config.mjs):**

```js
rewrites: [{ source: '/lite/:path*', destination: '/:path*?lite=1' }];
```

**Key constraint satisfied:** Adding a new page to the main site does NOT require building a separate lite version. The lite mode is opt-in per component. Components that don't check `useLiteMode()` render normally in both modes.

---

## Dependencies Between Features

```
Feature 4 (Schema.org)  ──── independent, no dependencies
Feature 1 (Widgets)     ──── independent, no dependencies
Feature 8 (Lite Mode)   ──── independent, no dependencies
Feature 3 (Print Packs) ──── independent, no dependencies
Feature 5 (Join Layer)  ──── independent, no dependencies
Feature 6 (Follow Money) ─── depends on Feature 5 (finance-jurisdiction UI)
Feature 2 (Downloads)   ──── independent, but benefits from Feature 5 (more data to export)
Feature 7 (Spanish)     ──── depends on ALL other features being stable (touches every file)
```

Feature 7 (Spanish) should be last because it requires extracting every hardcoded string. Building all other features first means doing this extraction once.

Feature 6 (Follow the Money) benefits from Feature 5 (Join Layer UI) because the finance-jurisdiction component built for Feature 5 can be reused directly.

---

## Recommended Build Order

| Order | Feature                           | Size | Rationale                                                                                                                                                                      |
| ----- | --------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | **Feature 4: Schema.org**         | S    | Highest ROI. Small effort, immediate SEO benefit. No new routes or components -- just additions to existing `JsonLd.tsx` and page files.                                       |
| 2     | **Feature 8: Lite Mode**          | M    | Infrastructure that benefits all subsequent features. Once the lite mode context exists, every new component built for Features 5-6 can include lite fallbacks from the start. |
| 3     | **Feature 1: Embeddable Widgets** | M    | Self-contained, high external impact. Enables newsrooms, libraries, and schools to use CIV.IQ data without building anything. Requires only middleware and a new route group.  |
| 4     | **Feature 3: Print Packs**        | M    | Self-contained, high civic utility. Libraries and community organizations can print and distribute. Builds on existing district data and print CSS.                            |
| 5     | **Feature 5: Join Layer UI**      | L    | Surfaces the most powerful data in the system. The 6 API-only joins represent completed backend work that users can't see. This unlocks the full data network.                 |
| 6     | **Feature 6: Follow the Money**   | L    | Depends on Feature 5's finance-jurisdiction component. This is the signature narrative feature -- it tells the story that the data network makes possible.                     |
| 7     | **Feature 2: Bulk Downloads**     | L    | Benefits from all prior features having stabilized the data layer. The cron job needs to be reliable, and the datasets should reflect the full data network.                   |
| 8     | **Feature 7: Spanish**            | XL   | Last. Requires extracting every string from every component built in Features 1-6. Doing this once at the end is far more efficient than refactoring incrementally.            |

---

## Effort Summary

| Feature          | Size | New Routes                         | New Components                          | API Changes           |
| ---------------- | ---- | ---------------------------------- | --------------------------------------- | --------------------- |
| 1. Widgets       | M    | 3 embed + 1 docs                   | 3 widget + 1 docs page                  | Middleware only       |
| 2. Downloads     | L    | 1 cron + 1 page                    | 1 page + 5 generators                   | 1 new cron endpoint   |
| 3. Print Packs   | M    | 1 print page                       | 1 print layout                          | None                  |
| 4. Schema.org    | S    | 0                                  | 3-4 new schema components in JsonLd.tsx | None                  |
| 5. Join Layer UI | L    | 0                                  | 6 new data sections                     | None (all APIs exist) |
| 6. Follow Money  | L    | 1 page                             | 7 components + 1 hook                   | None (all APIs exist) |
| 7. Spanish       | XL   | All routes duplicated via [locale] | Message extraction across all files     | None                  |
| 8. Lite Mode     | M    | 0 (rewrite only)                   | 1 context + 1 fallback wrapper          | Middleware change     |

---

## What NOT to Build

1. **User accounts for any feature.** None of these 8 features require authentication. The philosophy is explicit: no accounts, no login, no tracking. Every feature works anonymously.

2. **Real-time push notifications for bill tracking widgets.** The widget shows current status at load time. Polling or SSE would add complexity and infrastructure for minimal gain. Users who want real-time updates should use the Atom feeds or Nostr subscriptions.

3. **Server-side PDF generation for print packs.** Libraries like Puppeteer or wkhtmltopdf add heavy dependencies and require headless browser infrastructure. The browser's built-in print-to-PDF is superior and free. Design the print page well and let the browser handle it.

4. **Full bilingual API responses for Spanish mode.** The API returns government data in English because that's what government APIs provide. Translating "Armed Forces and National Security" to "Fuerzas Armadas y Seguridad Nacional" in API responses would create a maintenance burden and diverge from the source data. UI chrome only.

5. **Historical trend lines.** CIV.IQ starts at the 119th Congress. There is no accumulated historical data to trend against. When multiple sessions of data exist in the future, trend visualizations become viable. Until then, this is infrastructure without content.

6. **Separate lite-mode component tree.** Maintaining two parallel versions of every component doubles the maintenance surface. The conditional rendering approach (one component, two code paths) is more maintainable even if individual components are slightly more complex.

7. **Script-tag widget delivery.** Offering `<script src="civ.iq/widget.js">` as the primary embed method couples our code to host site DOMs, creates CSP conflicts, and is a maintenance liability. Iframe-only is the correct approach for a civic utility that needs to work reliably on any website without debugging host-site conflicts.
