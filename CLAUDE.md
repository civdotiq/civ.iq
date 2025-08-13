# CLAUDE.MD - CIV.IQ AI Assistant Instructions

## 🎯 Quick Context

**Project**: civic-intel-hub | **Location**: D:\civic-intel-hub | **Stack**: Next.js 15 + TypeScript + React 18  
**Purpose**: Federal civic data platform using ONLY real government APIs (no mock data ever)

## ⚡ CRITICAL RULES (NEVER VIOLATE)

1. **Quality Gates**: ALL code must pass `npm run lint && npm test` - NO exceptions
2. **Real Data Only**: Use real government APIs or show "Data unavailable" - NEVER generate fake data
3. **TypeScript Strict**: No `any` types, full null safety with optional chaining
4. **Test Everything**: Features aren't complete until tested end-to-end
5. **Clean Commits**: Use conventional commits (feat/fix/docs/chore)

## 🔄 REQUIRED WORKFLOW

```
Research → Plan → Implement → Verify
```

**NEVER jump straight to coding!** Always:

1. **Research**: Explore existing codebase patterns first
2. **Plan**: Write implementation strategy and verify approach
3. **Implement**: Code with validation checkpoints
4. **Verify**: Confirm all tests pass and feature works

For complex problems, say: _"Let me ultrathink about this architecture"_

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes (all use real data)
│   ├── representatives/   # Representative pages
│   └── page.tsx          # Landing page
├── components/            # React components
├── lib/                   # Utilities and services
├── types/                 # TypeScript definitions
└── hooks/                 # Custom React hooks

Key Entry Points:
- Landing: src/app/page.tsx
- API Base: src/app/api/
- Types: src/types/representative.ts
```

## ✅ Validation Commands

```bash
# MUST PASS before claiming completion:
npm run lint        # ESLint checks
npm test           # Jest unit tests
npm run type-check # TypeScript validation
npm run build      # Production build
npm run validate:all # Run ALL checks at once

# Development:
npm run dev        # Start dev server (http://localhost:3000)

# Data Processing:
npm run process-census          # Update Census data
npm run process-zip-districts   # Process ZIP mappings
```

## 🌐 API Endpoints

All endpoints return real data or appropriate error messages:

```typescript
GET /api/representatives?zip=48221           # List by ZIP
GET /api/representative/[bioguideId]        # Member details
GET /api/representative/[bioguideId]/votes  # Voting records
GET /api/representative/[bioguideId]/bills  # Sponsored bills
GET /api/representative/[bioguideId]/finance # FEC data
GET /api/representative/[bioguideId]/news   # GDELT news
GET /api/committee/[committeeId]            # Committee info
GET /api/bill/[billId]                      # Bill details
GET /api/districts/[districtId]             # District data
GET /api/search                             # Advanced search
```

## 🔧 Common Tasks

### Adding a New API Endpoint

1. Create route in `src/app/api/`
2. Add TypeScript types in `src/types/`
3. Implement with real data source
4. Add error handling and caching
5. Write tests in `tests/`

### Updating Representative Data

1. Check `src/lib/congress-legislators.ts`
2. Verify Congress.gov API integration
3. Update TypeScript interfaces
4. Test with real bioguide IDs

### Fixing Type Errors

1. Check `src/types/` for schema
2. Use optional chaining (`?.`)
3. Add null checks
4. Run `npm run type-check`

## 🎨 UI Guidelines

```css
/* Brand Colors */
--civiq-red: #e11d07; /* Errors, logo */
--civiq-green: #0a9338; /* Success, logo */
--civiq-blue: #3ea2d4; /* Links, accents */
```

- Clean, minimalist design
- Mobile-first responsive
- Accessibility (WCAG 2.1 AA)
- Loading states for all async operations
- Error boundaries for fault tolerance

## 🚨 Troubleshooting

| Issue                          | Solution                                     |
| ------------------------------ | -------------------------------------------- |
| "Cannot find module"           | Run `npm ci`                                 |
| "Type 'any' is not assignable" | Add proper types in `src/types/`             |
| "Test timeout"                 | Increase timeout in `jest.config.js`         |
| "Build fails"                  | Clear cache: `rm -rf .next && npm run build` |
| "API returns mock data"        | Check `.env.local` for API keys              |

## 📊 Current Status

### ✅ Production Ready

- Federal representatives with Congress.gov data
- ZIP code lookup (39,363 ZIPs mapped)
- Campaign finance (FEC integration)
- Voting records (House + Senate)
- GDELT news integration
- Interactive district maps
- Committee profiles
- Bill tracking

### 🚧 In Development

- State legislature integration
- Local government officials
- Enhanced analytics

## 🔐 Security Requirements

- **NO Math.random()** for data generation
- **NO mock legislator generation**
- **NO fake bills or votes**
- Empty arrays when data unavailable
- Clear "Data unavailable" messaging
- All user input sanitized
- API keys in environment variables only

## 📝 Session Management

At start of each session:

1. Check current branch: `git branch`
2. Pull latest: `git pull origin main`
3. Verify environment: `npm run validate:all`
4. Note current focus in this section

**Current Focus**: Frontend Data Flow Resolution Complete (2025-08-13):

- ✅ **Critical Bug Fixed**: Legislation/Voting tabs now display server-fetched data
- ✅ **Data Flow Pattern**: Server-fetched data (294 bills) now passes correctly to client tabs
- ✅ **Architecture**: BillsTrackerWrapper now uses initialData prop instead of redundant SWR fetch
- ✅ **Client Rendering**: Profile tab ✅, Legislation tab ✅, all tabs now working correctly
- ✅ **Production Ready**: Amy Klobuchar profile displays 294 sponsored bills successfully

**Recent Fixes Applied (2025-08-13)**:

- **Data Flow Resolution**: Fixed server-fetched data not reaching client tabs
- **BillsTrackerWrapper Enhancement**: Added initialData prop to use server data directly
- **Client-Server Bridge**: Modified DataFetchingWrappers to prioritize server data over SWR
- **Loading State Logic**: Prevented loading indicators when initial data available
- **Production Verification**: Amy Klobuchar profile now displays 294 bills successfully
- Documented comprehensive debugging methodology for future use

**Previous Fixes (2025-08-12)**:

- Fixed useMemo null checks in BillsTracker.tsx for defensive programming
- Expanded bills API to show last 3 congresses instead of current only
- Fixed at-large states filtering in representatives route
- Resolved Campaign Finance API build issues via static imports

## 🆘 When Stuck

1. **Stop** - Don't create complex workarounds
2. **Research** - Re-read relevant code sections
3. **Simplify** - The simple solution is usually correct
4. **Ask** - "Should I approach this as X or Y?"
5. **Validate** - Run tests to verify assumptions

## 📚 Extended Documentation

For detailed information, see:

- `docs/API_REFERENCE.md` - Complete API documentation
- `docs/DEVELOPMENT_GUIDE.md` - Development setup and commands
- `docs/PHASE_TRACKER.md` - Feature completion tracking
- `docs/ARCHITECTURE.md` - Technical architecture details
- `docs/development/OODA_DEBUGGING_METHODOLOGY.md` - OODA debugging methodology
- `README.md` - Complete project documentation
- `ROADMAP.md` - Development phases and planning
- `SECURITY-REMEDIATION.md` - Security audit details

---

**Remember**: This is a civic utility serving citizens with real government data.
Keep it clean, fast, transparent, and always use authentic sources.
