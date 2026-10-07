# CIV.IQ

Civic data platform (civdotiq.org): factual, nonpartisan representative profiles built only from real government sources. Next.js 16 + TypeScript + React 18.

## Rules that never bend

1. **Real data only.** Real government APIs or an explicit "Data unavailable" — never fake, mock, or estimated-as-real data.
2. **TypeScript strict.** No `any`; null-safe with optional chaining.
3. **Done means verified.** `npm run validate:all` passes, and the change is checked against real output (curl the route, check `%{http_code}`, load the page) — not just "it compiles".
4. **Conventional commits** (feat/fix/docs/chore).

## How to work

- Bugs with a clear repro: just fix and verify. Don't ask permission.
- Features where the approach is genuinely ambiguous or hard to undo (new data source, schema/cache-key changes, anything user-visible at scale): state the approach in a few lines and confirm first. Otherwise, proceed.
- Match the effort to the ask. A small fix stays small — no drive-by refactors.

## Project Structure

```
src/
├── app/api/              # API routes (real data only)
├── app/(civic)/          # Public pages
├── components/           # React components
│   └── intelligence/     # Insight cards and analysis displays
├── features/             # Feature modules (campaign-finance, legislation, representatives)
├── lib/                  # Utilities and services
│   ├── intelligence/     # Analyzers, ML models, embeddings, entity resolution
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
- **workflow.md** — Subagents, corrections, when stuck

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

- `docs/API_REFERENCE.md` - API documentation
- `docs/ARCHITECTURE.md` - System design and patterns
- `docs/DATA_NETWORK.md` - Cross-domain join layer
- `docs/internal/PHASE_TRACKER.md` - Feature completion tracking
- `SECURITY.md` - Security policies

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
