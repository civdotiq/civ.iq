# Audit: "Influence" Usage in CIV.IQ

**Date:** 2026-04-07
**Purpose:** Catalog every occurrence of "influence" to inform a potential rename to "access," "engagement," or "activity" in user-facing text. This audit flags — it does not rename.

---

## A. User-Facing Occurrences (would need to change)

### Navigation & Page Titles

| File                                                | Line     | Text                                                                       |
| --------------------------------------------------- | -------- | -------------------------------------------------------------------------- |
| `src/shared/components/navigation/Header.tsx`       | 62       | Nav item: `"Influence"`                                                    |
| `src/app/(civic)/influence/page.tsx`                | 28       | Breadcrumb: `"Influence"`                                                  |
| `src/app/(civic)/influence/[committeeId]/page.tsx`  | 191, 199 | Breadcrumb: `"Influence"`                                                  |
| `src/app/(civic)/influence/[committeeId]/error.tsx` | 25       | Breadcrumb link: `"Influence"`                                             |
| `src/app/(civic)/federal/page.tsx`                  | 93-94    | Category: `"Money & Influence"` / `"Money & influence"`                    |
| `src/app/(civic)/federal/page.tsx`                  | 104-106  | Link: `"Influence"` — detail: `"Lobbying networks and influence paths..."` |
| `src/app/(civic)/investigate/layout.tsx`            | 11       | Meta description: `"...trace influence through real government data."`     |

### Component Headings & Labels

| File                                                    | Line  | Text                                                |
| ------------------------------------------------------- | ----- | --------------------------------------------------- |
| `src/components/intelligence/InfluenceChainCard.tsx`    | 132   | Heading: `"Influence Chains"`                       |
| `src/components/intelligence/InfluenceClusterChart.tsx` | 160   | Heading: `"Funding Influence Clusters"`             |
| `src/components/intelligence/MoneyReportCard.tsx`       | 84-85 | Label: `"Chains"` (contextually "influence chains") |

### Disclaimers & Help Text

| File                                                                 | Line    | Text                                                                  |
| -------------------------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| `src/components/graph/GraphSidebar.tsx`                              | 598-599 | `"...contributions influenced any vote..."`                           |
| `src/components/graph/GraphSidebar.tsx`                              | 835     | `"...money influenced any legislative action."`                       |
| `src/app/(civic)/influence/[committeeId]/CommitteeProfileClient.tsx` | 317     | `"Voting alignment not prove influence..."`                           |
| `src/app/(civic)/comment-periods/page.tsx`                           | 137-138 | `"...your opportunity to influence federal policy"` (appropriate use) |

### Education Curriculum

| File                                   | Line | Text                                                                      |
| -------------------------------------- | ---- | ------------------------------------------------------------------------- |
| `src/lib/data/education-curriculum.ts` | 1115 | `"Does money influence votes?"`                                           |
| `src/lib/data/education-curriculum.ts` | 1359 | `"...explain how they might influence representation."` (appropriate use) |
| `src/lib/data/education-curriculum.ts` | 3001 | `"...influence others through communication..."` (appropriate use)        |
| `src/lib/data/education-curriculum.ts` | 3115 | `"...economic decisions influence environments."` (appropriate use)       |

### Developer Portal

| File                                   | Line | Text                                   |
| -------------------------------------- | ---- | -------------------------------------- |
| `src/app/(public)/developers/page.tsx` | 85   | MCP tool name: `"get_influence_chain"` |

### URL Paths (visible to users)

| Path                       | Notes                 |
| -------------------------- | --------------------- |
| `/influence`               | PAC search index page |
| `/influence/[committeeId]` | PAC profile page      |

---

## B. Internal-Only Occurrences (no rename needed)

### File & Directory Names

- `src/app/(civic)/influence/` (directory)
- `src/features/influence/` (directory)
- `src/lib/intelligence/analyzers/influence-chain-analyzer.ts`
- `src/lib/intelligence/analyzers/influence-graph-analyzer.ts`

### Component File Names

- `InfluenceChainCard.tsx`, `InfluenceClusterChart.tsx`, `InfluenceGraphCard.tsx`
- `InfluencePathSection.tsx`, `InfluencePathView.tsx`

### Type Names

- `InfluenceChainInsight`, `InfluenceGraphInsight`, `InfluenceChain`
- `InfluenceGraphChain`, `InfluenceClusterData`, `InfluenceScore`

### Function Names

- `analyzeInfluenceChains()`, `analyzeInfluenceGraph()`, `influenceChainKeyStats()`

### API Routes

- `/api/intelligence/influence-clusters`
- `/api/intelligence/representative/[bioguideId]/influence-chain`
- `/api/intelligence/representative/[bioguideId]/influence-graph`
- `/api/influence/[committeeId]`, `/api/influence/search`
- `/api/mesh/influence/path`, `/api/mesh/influence/counterfactual`, `/api/mesh/influence/cascade`

### Redis Cache Keys

- `influence:resolved-recipients:${committeeId}:${cycle}`
- `insight:influence_chain:${bioguideId}`
- `insight:influence_graph:${bioguideId}`
- `influence-chain-count:${chamber}:${bioguideId}`

---

## C. Rename Considerations

### What would change (user-facing)

- **Nav label**: "Influence" -> "Follow the Money" or "PACs" (note: layout.tsx title is already "Follow the Money")
- **Card headings**: "Influence Chains" -> "Activity Chains" or "Access Chains"
- **Card headings**: "Funding Influence Clusters" -> "Funding Activity Clusters"
- **Federal hub category**: "Money & Influence" -> "Money & Access"
- **URL paths**: `/influence` -> would need redirects (breaking change)

### What would NOT change (internal)

- File names, function names, type names, Redis keys — internal naming is fine
- Education curriculum uses of "influence" in the general English sense (not campaign finance context)
- Comment-periods page "influence federal policy" — appropriate general usage

### Risk assessment

- URL rename (`/influence` -> something else) is a breaking change requiring redirects
- MCP tool name `get_influence_chain` is a public API contract
- Internal renames add churn with no user benefit
- Recommend: rename user-facing labels only, keep URLs and internals stable, add redirects if URLs change
