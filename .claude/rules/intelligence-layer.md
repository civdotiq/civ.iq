# Intelligence Layer Rules

**Roadmap**: `docs/internal/ROADMAP-ai-layer.md` (supersedes ANALYSIS-\*.md documents where they conflict)

## Architecture

- On-demand computation + Redis caching (same pattern as `CivicAlignmentAnalyzer`)
- Analyzers: `src/lib/intelligence/analyzers/`
- Entity resolution: `src/lib/intelligence/entity-resolution/`
- Statistics: `src/lib/intelligence/statistics/` (wraps `simple-statistics`)
- API routes: `src/app/api/intelligence/`
- UI components: `src/components/intelligence/`

## Rules

- Statistics first, AI second. Every analyzer computes numbers before calling LLM.
- Every insight carries: confidence (0-1), dataAsOf, methodology, disclaimer.
- Minimum sample sizes: 10 votes per sector, 4 quarters for temporal, 3 trades for stock analysis.
- All AI text must pass reading level validation (Flesch-Kincaid <= 8).
- Never claim causation. Use "pattern", "correlation", "association" — never "caused", "influenced", "resulted in".
- Baselines required: always compare to peer group average.
- Kill threshold: if an analyzer's false positive rate exceeds 20%, do not ship it.
- No Redis graph layer, no pre-computed pipeline, no Nostr coupling for change detection.
