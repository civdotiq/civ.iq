# CLAUDE.MD - CIV.IQ AI Assistant Instructions

## Quick Context

**Project**: civic-intel-hub | **Stack**: Next.js 16 + TypeScript + React 18
**Purpose**: Civic intelligence platform using ONLY real government APIs (no mock data ever)
**Status**: 100% TypeScript compliant, 249 API endpoints, 21 intelligence analyzers

## Critical Rules (NEVER VIOLATE)

1. **Real Data Only**: Use real government APIs or show "Data unavailable" - NEVER fake data
2. **TypeScript Strict**: No `any` types, full null safety with optional chaining
3. **Quality Gates**: All code must pass `npm run validate:all` before completion
4. **30-Line Rule**: Never write more than 30 lines without validation
5. **Clean Commits**: Use conventional commits (feat/fix/docs/chore)
6. **Ask First**: Clarify approach before implementing non-trivial features

## Project Structure

```
src/
├── app/api/              # 249 API routes (real data only)
├── app/(civic)/          # Public pages
├── components/           # React components
│   └── intelligence/     # 35 insight cards and analysis displays
├── features/             # Feature modules (campaign-finance, legislation, representatives)
├── lib/                  # Utilities and services
│   ├── intelligence/     # 21 analyzers, ML models, embeddings, entity resolution
│   ├── nostr/            # Nostr event signing and relay publishing
│   └── data-sources/     # Federal Register, FRED, SEC, lobbying services
├── types/                # TypeScript definitions
└── hooks/                # Custom React hooks
packages/                 # npm workspaces — all three must be present for `npm ci`
├── civic-statistics/     # @civiq/civic-statistics
├── entity-resolution/    # @civiq/entity-resolution
└── sdk/                  # @civiq/sdk — TypeScript client for the public API
```

## Domain Rules (in .claude/rules/)

Detailed rules are decomposed into focused files loaded automatically:

- **design-system.md** — Aicher/Ulm School: colors, typography, borders, wayfinding, banned patterns
- **intelligence-layer.md** — Analyzer architecture, confidence scores, causation language, sample sizes
- **security.md** — Data integrity, API key handling, address-not-ZIP, input sanitization
- **workflow.md** — Guiding principles, workflow habits, when-stuck protocol

## Validation Commands

```bash
npm run validate:all  # Run ALL checks (lint, test, type-check, build)
npm run dev           # Dev server at http://localhost:3000
npm run diagnose:apis # Test API connectivity
```

## Troubleshooting

| Issue                | Quick Fix                       |
| -------------------- | ------------------------------- |
| "Cannot find module" | `npm ci`                        |
| Type errors          | Add types in `src/types/`       |
| Build fails          | `rm -rf .next && npm run build` |
| API returns no data  | Check `.env.local` for API keys |

## Extended Documentation

- `docs/API_REFERENCE.md` - Complete API documentation (249 endpoints)
- `docs/ARCHITECTURE.md` - System design and patterns
- `docs/DATA_NETWORK.md` - Cross-domain join layer
- `docs/internal/PHASE_TRACKER.md` - Feature completion tracking
- `SECURITY.md` - Security policies

---

**Remember**: Civic utility serving citizens with real government data.
Keep it clean, fast, transparent, and always use authentic sources.
