# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

CIV.IQ is a federal civic data platform built with Next.js 15 (App Router), TypeScript, and React 18. It provides elected official lookup, voting records, campaign finance data, and legislation tracking using ONLY real government APIs.

**Critical constraint**: Never generate fake or mock data. Use real government APIs or show "Data unavailable."

## Commands

```bash
# Development
npm run dev                    # Dev server at localhost:3000
npm run validate:all           # REQUIRED before completing work (lint + test + type-check + build)
npm run diagnose:apis          # Test API connectivity

# Testing
npm test                       # Unit tests (Jest)
npm test -- --watch            # Watch mode
npm run test:e2e               # E2E tests (Playwright)
npm run test:coverage          # Coverage report

# Single test file
npm test -- path/to/file.test.ts

# Type checking
npm run type-check             # TypeScript validation
npm run lint                   # ESLint
npm run lint:fix               # Auto-fix lint issues
```

## Architecture

### Data Flow Pattern

All external API calls route through internal API endpoints for caching, rate limiting, and error handling:

```
Client → /api/endpoint → External Service (Congress.gov, FEC, Census, etc.)
              ↓
         Redis Cache
```

### Feature Module Structure

Features are organized as self-contained modules in `src/features/`:

- `campaign-finance/` - FEC data, contribution analysis
- `legislation/` - Bills, voting records
- `representatives/` - Member profiles, contact info
- `state-legislature/` - OpenStates integration for state-level data
- `districts/` - Congressional district boundaries, demographics

Each feature module contains its own components, hooks, and types.

### Key Services (`src/lib/`)

- `api/congress.ts` - Congress.gov API client
- `fec-api.ts` - Federal Election Commission data
- `census-api.ts` - Demographics and geocoding
- `openstates-api.ts` - State legislator data (v3 REST API)
- `cache.ts` - Redis caching layer with TTL management

### State Management

- **Server state**: SWR for data fetching with automatic revalidation
- **Client state**: Zustand for UI state

### Caching TTLs

- Representatives: 1 hour
- Votes: 15 minutes
- Districts: 24 hours
- News: 5 minutes

## Code Standards

### TypeScript

- **Strict mode enforced** - no `any` types
- Use optional chaining for null safety
- Define interfaces in `src/types/`

### Design System (Aicher/Ulm School)

This project follows a strict modernist design system:

| Element | Value                               |
| ------- | ----------------------------------- |
| Font    | Braun Linear (weights 100-700)      |
| Red     | #e11d07 (errors, Republican)        |
| Green   | #0a9338 (success, Democrat)         |
| Blue    | #3ea2d4 (links, interactive)        |
| Grid    | 8px base (all spacing in multiples) |
| Borders | 2px structural                      |

**Banned patterns**: Purple gradients, rounded corners, box shadows, skeleton loaders, toast notifications, gradient buttons, Inter/Roboto fonts, decorative emojis.

### Commits

Use conventional commit format: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

## API Routes

API routes live in `src/app/api/`. Key patterns:

- Input validation with Zod schemas
- Consistent error response format with proper HTTP status codes
- Real data or honest "unavailable" messages (never zeros for missing data)

### Main Endpoints

- `/api/representatives?zip=XXXXX` - Find reps by ZIP
- `/api/representative/[bioguideId]` - Member profile
- `/api/representative/[bioguideId]/votes` - Voting records
- `/api/representative/[bioguideId]/finance` - FEC campaign data
- `/api/state-legislature/[state]` - State legislators
- `/api/health` - System health check

## External Data Sources

| Source         | Data                                            |
| -------------- | ----------------------------------------------- |
| Congress.gov   | Bills, votes, members, committees               |
| FEC.gov        | Campaign contributions, expenditures            |
| Census Bureau  | Demographics, geocoding, district boundaries    |
| Senate.gov XML | Senate roll call votes                          |
| OpenStates     | State legislators (all 50 states + territories) |

API keys are configured in `.env.local` (see `.env.example`).

## Troubleshooting

| Issue                | Fix                             |
| -------------------- | ------------------------------- |
| "Cannot find module" | `npm ci`                        |
| Type errors          | Add types in `src/types/`       |
| Build fails          | `rm -rf .next && npm run build` |
| API returns no data  | Check `.env.local` for API keys |

## Extended Documentation

- `docs/API_REFERENCE.md` - Complete API documentation
- `docs/ARCHITECTURE.md` - System design and patterns
- `CONTRIBUTING.md` - Contribution guidelines
- `SECURITY.md` - Security policies
