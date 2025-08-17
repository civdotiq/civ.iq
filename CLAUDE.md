# CLAUDE.MD - CIV.IQ AI Assistant Instructions (Enhanced with Claude Code Patterns)

## 🎯 Quick Context

**Project**: civic-intel-hub | **Location**: D:\civic-intel-hub | **Stack**: Next.js 15 + TypeScript + React 18  
**Purpose**: Federal civic data platform using ONLY real government APIs (no mock data ever)  
**Methodology**: Claude Code best practices + OODA debugging framework  
**Status**: ✅ **100% TypeScript Compliant** - ZERO compilation errors (December 17, 2025)

## ⚡ CRITICAL RULES (NEVER VIOLATE)

1. **Quality Gates**: ALL code must pass `npm run lint && npm test` - NO exceptions
2. **Real Data Only**: Use real government APIs or show "Data unavailable" - NEVER generate fake data
3. **TypeScript Strict**: No `any` types, full null safety with optional chaining
4. **Test Everything**: Features aren't complete until tested end-to-end
5. **Clean Commits**: Use conventional commits (feat/fix/docs/chore)
6. **30-Line Rule**: NEVER write more than 30 lines without validation

## 🔨 TASK DECOMPOSITION PROTOCOL

### Before Starting ANY Task:

```bash
# 1. Understand current state
git status && git log --oneline -5
npm run validate:all

# 2. Map the territory
find src -name "*[relevant]*.ts*" | head -10
grep -r "PatternName" src/ --include="*.ts*" | head -5

# 3. Create implementation manifest
echo "TASK: [Feature Name]
├── Current State: [git branch, last commit]
├── Files to Modify: [explicit list]
├── Validation Gates: [after each file]
└── Success Criteria: [measurable]"
```

### Task Breakdown Template:

```
LEVEL 1: EXPLORE
- Find existing patterns
- Identify dependencies
- Note potential issues

LEVEL 2: PLAN
- Step-by-step approach
- Validation checkpoints
- Rollback strategy

LEVEL 3: EXECUTE
- Implement in 30-line chunks
- Validate after each chunk
- Commit working states
```

## 🔄 ENHANCED DEVELOPMENT WORKFLOW

### Core Loop: Explore → Hypothesis → Implement → Validate → Iterate

```bash
# EXPLORE - Always understand before coding
find src -type f -name "*.tsx" | xargs grep -l "ComponentPattern" | head -5

# HYPOTHESIS - State your approach
echo "Based on patterns in [files], I will:"
echo "1. [Specific action]"
echo "2. [Expected outcome]"

# IMPLEMENT - Small, validated chunks
[Write 20-30 lines maximum]

# VALIDATE - Immediate feedback
npm run type-check || echo "Fixing type error..."
npm run lint --quiet

# ITERATE - Only continue if passing
git add . && git commit -m "checkpoint: [what works so far]"
```

## ⚡ RAPID FEEDBACK PROTOCOL

**Golden Rule**: Never write more than 30 lines without validation

### Incremental Development Pattern:

```bash
# Write small chunk
[implement 20-30 lines]

# Immediate type check
npx tsc --noEmit --skipLibCheck [current-file]

# Test in isolation (if applicable)
npx tsx -e "import { functionName } from './path'; console.log(functionName())"

# Verify no regression
npm run lint --quiet

# Continue only if passing
[next 20-30 lines]
```

### Validation Checkpoints:

- After EVERY type/interface change: `npm run type-check`
- After EVERY component change: Check dev server for errors
- After EVERY API change: `curl localhost:3000/api/[endpoint]`
- Before EVERY commit: `npm run validate:all`

## 🛠️ CIV.IQ SPECIFIC TOOL PATTERNS

### Finding Code Patterns:

```bash
# List all API routes
find src/app/api -name "route.ts" -type f | sort

# Check endpoint implementations
grep "export async function" src/app/api/**/route.ts

# Find type usage across codebase
grep -r "RepresentativeResponse" src/ --include="*.ts*" | cut -d: -f1 | uniq

# Track component dependencies
grep -r "import.*from.*features" src/components --include="*.tsx"

# Find all uses of a hook
grep -r "useRepresentative" src/ --include="*.tsx" | cut -d: -f1 | sort -u
```

### Batch Operations:

```bash
# Update multiple files with same pattern
files=$(grep -r "OldPattern" src/ --include="*.ts*" | cut -d: -f1 | uniq)
for file in $files; do
  echo "Checking: $file"
  grep -n "OldPattern" "$file"
done
```

## 🌐 API VALIDATION PROTOCOL

### Before Implementation - Test Real APIs:

```bash
# Test Congress.gov directly
curl -H "X-API-Key: $CONGRESS_API_KEY" \
  "https://api.congress.gov/v3/member/K000367" | jq '.'

# Verify response structure
[response] | jq 'keys'

# Extract type shape
echo "interface CongressResponse {"
[response] | jq -r 'to_entries | .[] | "  \(.key): \(.value | type);"'
echo "}"
```

### After Implementation - Verify Your Endpoint:

```bash
# Start dev server
npm run dev &

# Test your endpoint
curl http://localhost:3000/api/representative/K000367 | jq '.'

# Verify data flow
curl http://localhost:3000/api/representative/K000367/bills | jq '.[] | {title, congress}'

# Check for data completeness
curl http://localhost:3000/api/representative/K000367 | jq '{name, party, state, hasCommittees: .committees | length > 0}'
```

## 📋 SESSION STATE MANAGEMENT

### Session Start Protocol:

```typescript
/**
 * SESSION: [Date] [Time]
 * GOAL: [Specific objective]
 * CONTEXT: [Issue/Feature link]
 *
 * CHECKPOINTS:
 * [ ] Environment validated (npm run validate:all)
 * [ ] Branch created/checked out
 * [ ] Related files identified
 * [ ] Tests identified/created
 * [ ] Documentation updated
 *
 * FILES TO MODIFY:
 * - [ ] src/[specific/file/path.tsx]
 * - [ ] src/types/[interface.ts]
 *
 * SUCCESS CRITERIA:
 * - [ ] [Measurable outcome]
 * - [ ] All tests passing
 * - [ ] No TypeScript errors
 */
```

### Progress Tracking:

```bash
# Create session log
echo "[$(date '+%Y-%m-%d %H:%M')] Starting: $TASK" >> .session.log

# Checkpoint after each major step
echo "[$(date '+%H:%M')] ✅ Types updated in src/types/representative.ts" >> .session.log
echo "[$(date '+%H:%M')] ✅ API endpoint tested: 200 OK with data" >> .session.log
echo "[$(date '+%H:%M')] ⚠️ Issue: TypeScript error in line 45" >> .session.log
echo "[$(date '+%H:%M')] ✅ Fixed: Added null check" >> .session.log

# End of session summary
echo "[$(date '+%H:%M')] SESSION COMPLETE: $TASK implemented" >> .session.log
git add . && git commit -m "feat: $TASK - see .session.log for details"
```

## 🚑 ERROR RECOVERY PATTERNS

### Immediate Diagnosis:

```bash
# Capture full error context
npm run build 2>&1 | tee build-error.log
tail -50 build-error.log | grep -E "error|Error|failed"

# Find what changed
git diff HEAD~1 --name-only | grep -E "\.(ts|tsx)$"

# Quick type check on changed files
for file in $(git diff --name-only); do
  echo "Checking: $file"
  npx tsc --noEmit --skipLibCheck "$file" 2>&1 | head -5
done
```

### OODA Debugging Framework:

When facing complex issues, activate OODA protocol:

```bash
# OBSERVE - Gather all data
echo "=== OBSERVE PHASE ==="
npm run build 2>&1 | tee error.log
grep -n "error" error.log

# ORIENT - Analyze patterns
echo "=== ORIENT PHASE ==="
# What type of error? (Type, Runtime, Build, Logic)
# What changed recently? (git diff)
# Similar patterns elsewhere? (grep codebase)

# DECIDE - Choose approach
echo "=== DECIDE PHASE ==="
# Option A: [Quick fix]
# Option B: [Refactor]
# Option C: [Revert and retry]

# ACT - Implement with validation
echo "=== ACT PHASE ==="
[implement fix]
npm run type-check && echo "✅ Types fixed"
npm run build && echo "✅ Build successful"
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes (all use real data)
│   ├── (civic)/           # Civic app routes group
│   └── page.tsx          # Landing page
├── components/            # React components
├── features/              # Feature modules
│   ├── campaign-finance/ # FEC integration
│   ├── legislation/       # Bills & votes
│   └── representatives/  # Member data
├── lib/                   # Utilities and services
├── types/                 # TypeScript definitions
└── hooks/                 # Custom React hooks

Key Entry Points:
- Landing: src/app/page.tsx
- API Base: src/app/api/
- Types: src/types/representative.ts
- Features: src/features/
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

# Debugging:
npm run diagnose:apis          # Test API connectivity
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

## 🔧 Common Implementation Patterns

### Adding a New API Endpoint:

```bash
# 1. Check existing patterns
find src/app/api -name "route.ts" | xargs grep "export async function GET" | head -5

# 2. Create route file
mkdir -p src/app/api/[new-endpoint]
touch src/app/api/[new-endpoint]/route.ts

# 3. Add types first
echo "// Add to src/types/[domain].ts"
echo "export interface NewEndpointResponse { ... }"

# 4. Implement with validation
[implement endpoint]
npm run type-check

# 5. Test immediately
curl http://localhost:3000/api/[new-endpoint] | jq '.'

# 6. Add to documentation
echo "GET /api/[new-endpoint] # Description" >> docs/API_REFERENCE.md
```

### Updating Representative Data:

```bash
# 1. Find current implementation
grep -r "getEnhancedRepresentative" src/

# 2. Check type definitions
cat src/types/representative.ts | grep "interface.*Representative"

# 3. Test with real bioguide
curl http://localhost:3000/api/representative/K000367 | jq '.name, .state, .party'

# 4. Verify Congress.gov integration
grep "CONGRESS_API" .env.local
```

### Fixing Type Errors:

```bash
# 1. Get specific error
npm run type-check 2>&1 | head -20

# 2. Find the type definition
grep -r "TypeName" src/types/

# 3. Check usage patterns
grep -r "TypeName" src/ --include="*.ts*" | head -10

# 4. Fix incrementally
[fix one file]
npx tsc --noEmit [fixed-file]
[repeat]
```

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

## 🚨 Troubleshooting Quick Reference

| Issue                          | Quick Fix                            | Validation                   |
| ------------------------------ | ------------------------------------ | ---------------------------- |
| "Cannot find module"           | `npm ci`                             | `npm run build`              |
| "Type 'any' is not assignable" | Add types in `src/types/`            | `npm run type-check`         |
| "Test timeout"                 | Increase timeout in `jest.config.js` | `npm test -- --verbose`      |
| "Build fails"                  | `rm -rf .next && npm run build`      | Check build-error.log        |
| "API returns no data"          | Check `.env.local` for API keys      | `npm run diagnose:apis`      |
| "SWR not updating"             | Check cache keys and mutate          | Browser DevTools Network tab |
| "Hydration mismatch"           | Wrap dynamic content in `Suspense`   | Check server vs client logs  |

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
- Data flow architecture (server → client → components)

### 🚧 In Development

- State legislature integration
- Local government officials
- Enhanced analytics
- Performance optimizations

### 🐛 Known Issues

- Heavy API responses may need pagination
- Some district boundaries need refinement
- Mobile layout optimization ongoing

## 🔐 Security Requirements

- **NO Math.random()** for data generation
- **NO mock legislator generation**
- **NO fake bills or votes**
- Empty arrays when data unavailable
- Clear "Data unavailable" messaging
- All user input sanitized
- API keys in environment variables only
- Rate limiting on all API endpoints
- CORS properly configured

## 📝 Session Management

### At Start of Each Session:

```bash
# 1. Sync with latest
git pull origin main

# 2. Check environment
npm run validate:all

# 3. Create session branch (optional)
git checkout -b session/$(date +%Y%m%d)-[feature-name]

# 4. Start session log
echo "=== SESSION START: $(date) ===" >> .session.log
echo "GOAL: [What you're implementing]" >> .session.log

# 5. Note current focus below
```

**Current Focus**: Infrastructure Stability & OpenTelemetry Resolution (2025-08-14):

**CRITICAL FIX COMPLETED** ✅: OpenTelemetry RSC Bundling Issue

- ✅ **Root Cause**: OpenTelemetry packages incompatible with Next.js 15 RSC bundling
- ✅ **Error**: "Cannot find module './vendor-chunks/@opentelemetry.js'"
- ✅ **Solution**: Removed all @opentelemetry/\* dependencies from package.json
- ✅ **Telemetry**: Simplified implementation using `simple-logger` in telemetry.ts
- ✅ **Verification**: Client components now mount (🔴 CLIENT MOUNTED)
- ✅ **Status**: Representative pages load 200 OK, React hydration successful

**Previous Focus**: Claude Code Pattern Integration (2025-08-13):

- ✅ **CLAUDE.MD Enhanced**: Integrated Claude Code best practices
- ✅ **Task Decomposition**: Added granular breakdown protocol
- ✅ **30-Line Rule**: Implemented incremental development pattern
- ✅ **Tool Patterns**: Added CIV.IQ specific file operations
- ✅ **Session Management**: Enhanced with checkpoint tracking
- ✅ **API Validation**: Added real data verification patterns
- ✅ **Error Recovery**: Expanded with immediate diagnosis tools

**Previous Session**: Frontend Data Flow Resolution (2025-08-13):

- Fixed server-fetched data not reaching client tabs
- BillsTrackerWrapper now uses initialData prop
- All representative profile tabs now working correctly
- Production verified with Amy Klobuchar profile (294 bills displayed)

## 🆘 When Stuck

### Systematic Approach:

1. **STOP** - Don't create complex workarounds
2. **OBSERVE** - What exactly is failing? Get specific error
3. **RESEARCH** - Find similar patterns in codebase
4. **SIMPLIFY** - The simple solution is usually correct
5. **TEST** - Validate each step before proceeding
6. **ASK** - "Should I approach this as X or Y?"

### Emergency Recovery:

```bash
# If everything is broken
git stash
git checkout main
npm ci
npm run validate:all

# Start fresh with small steps
```

## 📚 Extended Documentation

### Core Documentation:

- `CLAUDE.md` - THIS FILE - AI assistant instructions
- `README.md` - Project overview and setup
- `ROADMAP.md` - Development phases and planning

### Technical Guides:

- `docs/API_REFERENCE.md` - Complete API documentation
- `docs/ARCHITECTURE.md` - System design and patterns
- `docs/DEVELOPMENT_GUIDE.md` - Development setup and commands
- `docs/development/OODA_DEBUGGING_METHODOLOGY.md` - Advanced debugging

### Implementation Docs:

- `docs/PHASE_TRACKER.md` - Feature completion tracking
- `docs/ZIP_CODE_MAPPING_SYSTEM.md` - ZIP to district mapping
- `docs/development/GDELT_NEWS_INTEGRATION.md` - News API setup
- `docs/development/CAMPAIGN_FINANCE_FIX.md` - FEC integration

### Security & Deployment:

- `SECURITY.md` - Security policies
- `SECURITY-REMEDIATION.md` - Security audit details
- `docs/deployment/` - Deployment guides

---

**Remember**: This is a civic utility serving citizens with real government data.
Keep it clean, fast, transparent, and always use authentic sources.

**Claude Code Integration**: This file now includes Claude Code best practices.
Always reference these patterns for efficient, validated development.
