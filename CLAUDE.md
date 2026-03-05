# CLAUDE.MD - CIV.IQ AI Assistant Instructions

## Quick Context

**Project**: civic-intel-hub | **Stack**: Next.js 15 + TypeScript + React 18
**Purpose**: Federal civic data platform using ONLY real government APIs (no mock data ever)
**Status**: 100% TypeScript compliant, 107 API endpoints

## Critical Rules (NEVER VIOLATE)

1. **Real Data Only**: Use real government APIs or show "Data unavailable" - NEVER fake data
2. **TypeScript Strict**: No `any` types, full null safety with optional chaining
3. **Quality Gates**: All code must pass `npm run validate:all` before completion
4. **30-Line Rule**: Never write more than 30 lines without validation
5. **Clean Commits**: Use conventional commits (feat/fix/docs/chore)
6. **Ask First**: Clarify approach before implementing non-trivial features

## Guiding Principles

- **Stop overthinking** - Simple solutions over complex ones
- **Read carefully** - Understand requests before responding
- **Find existing patterns** - Search codebase before creating new abstractions
- **Validate assumptions** - State approach and confirm before implementing

## Project Structure

```
src/
├── app/api/          # API routes (real data only)
├── components/       # React components
├── features/         # Feature modules (campaign-finance, legislation, representatives)
├── lib/              # Utilities and services
├── types/            # TypeScript definitions
└── hooks/            # Custom React hooks
```

## Validation Commands

```bash
npm run validate:all  # Run ALL checks (lint, test, type-check, build)
npm run dev           # Dev server at http://localhost:3000
npm run diagnose:apis # Test API connectivity
```

## Security Requirements

- **NO** Math.random() for data generation
- **NO** mock legislator/bill/vote generation
- Empty arrays when data unavailable
- API keys in environment variables only
- All user input sanitized

## UI Design System (Aicher/Ulm School)

**DO NOT CHANGE:**
| Element | Value | Usage |
|---------|-------|-------|
| Font | Braun Linear | Weights 100-700 only |
| Red | #e11d07 | Errors, Republican |
| Green | #0a9338 | Success, Democrat |
| Blue | #3ea2d4 | Links, interactive |
| Grid | 8px base | All spacing in multiples |
| Borders | 2px structural | No shadows |

**BANNED patterns:** Purple gradients, rounded corners, box shadows, skeleton loaders, toast notifications, gradient buttons, Inter/Roboto fonts, decorative emojis.

## Troubleshooting

| Issue                | Quick Fix                       |
| -------------------- | ------------------------------- |
| "Cannot find module" | `npm ci`                        |
| Type errors          | Add types in `src/types/`       |
| Build fails          | `rm -rf .next && npm run build` |
| API returns no data  | Check `.env.local` for API keys |

## When Stuck

1. STOP - Don't create complex workarounds
2. OBSERVE - Get the specific error message
3. RESEARCH - Find similar patterns in codebase
4. SIMPLIFY - The simple solution is usually correct
5. ASK - "Should I approach this as X or Y?"

## Intelligence Layer

**Roadmap**: `ROADMAP-ai-layer.md` (supersedes ANALYSIS-\*.md documents where they conflict)

### Architecture

- On-demand computation + Redis caching (same pattern as `CivicAlignmentAnalyzer`)
- Analyzers: `src/lib/intelligence/analyzers/`
- Entity resolution: `src/lib/intelligence/entity-resolution/`
- Statistics: `src/lib/intelligence/statistics/` (wraps `simple-statistics`)
- API routes: `src/app/api/intelligence/`
- UI components: `src/components/intelligence/`

### Rules

- Statistics first, AI second. Every analyzer computes numbers before calling LLM.
- Every insight carries: confidence (0-1), dataAsOf, methodology, disclaimer.
- Minimum sample sizes: 10 votes per sector, 4 quarters for temporal, 3 trades for stock analysis.
- All AI text must pass reading level validation (Flesch-Kincaid <= 8).
- Never claim causation. Use "pattern", "correlation", "association" — never "caused", "influenced", "resulted in".
- Baselines required: always compare to peer group average.
- Kill threshold: if an analyzer's false positive rate exceeds 20%, do not ship it.
- No Redis graph layer, no pre-computed pipeline, no Nostr coupling for change detection.

## Extended Documentation

- `docs/API_REFERENCE.md` - Complete API documentation (107 endpoints)
- `docs/ARCHITECTURE.md` - System design and patterns
- `docs/PHASE_TRACKER.md` - Feature completion tracking
- `SECURITY.md` - Security policies

---

**Remember**: Civic utility serving citizens with real government data.
Keep it clean, fast, transparent, and always use authentic sources.
