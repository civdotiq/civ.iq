# Methodology

## Industry Taxonomy

Based on the OpenSecrets 13-sector classification model. Contributors are categorized by:

1. **Employer keywords** (high confidence) — e.g., "Goldman Sachs" matches Finance
2. **Occupation keywords** (medium confidence) — e.g., "Software Engineer" matches Communications/Electronics
3. **Contributor name** (for PACs) — e.g., "NRA" matches Ideology/Single-Issue

Non-informative employers like "SELF-EMPLOYED", "NONE", "N/A" are skipped, falling through to occupation matching.

## Lobbying Committee Resolution

Three-tier resolution for LDA `government_entities` strings:

1. **Noise filter** — Skip generic entries ("SENATE", "U.S. Congress", "White House")
2. **Exact alias match** — Static lookup against 200+ aliases per committee/agency
3. **Fuzzy match** — Fuse.js with threshold 0.15 (85%+ similarity) against committee names

Agency resolutions are converted to oversight committees via `getCommitteesForAgency()`, with slightly reduced confidence (0.9x).

## SIC Code Mapping

Maps 4-digit Standard Industrial Classification codes to IndustrySector:

- SIC ranges are ordered specific-to-broad (first match wins)
- Manufacturing is split: pharmaceuticals (2800s) → Health, petroleum (2900s) → Energy, etc.
- Defense catches aircraft/missile manufacturing (3720-3799)

## Ticker Resolution

Flow: `ticker → CIK (static lookup) → SIC code (SEC API) → IndustrySector`

- Static ticker-to-CIK mapping from SEC EDGAR `company_tickers.json` (~10K entries)
- SIC codes fetched from SEC submissions API with 30-day cache TTL
- Known ETF/fund tickers return null immediately (SPY, QQQ, etc.)
- Unresolvable tickers are cached as null to avoid repeated lookups

## FEC Entity Deduplication

Name matching uses Levenshtein distance with a default threshold of 0.85 (85% similarity). Additional metadata (employer, state, city) provides confirmation when available — at least 50% of checked metadata fields must match.

Name standardization:

- Individual names: "SMITH, JOHN" → "John Smith"
- Organization names: Remove corporate suffixes (Inc., LLC, Corp.)
- Normalize multiple spaces, strip punctuation
