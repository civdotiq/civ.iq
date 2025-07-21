# 🚨 ACTIVE CIV.IQ PROJECT - CIVIC INTEL HUB 🚨

You are working in: /mnt/d/civic-intel-hub

This is the ONLY active CIV.IQ project. Ignore any other folders with similar names.

## Project Identity
- **Folder**: civic-intel-hub
- **Location**: D:\ drive (/mnt/d/civic-intel-hub in WSL)
- **Version**: 2025 Advanced Civic Information Platform (Phase 6 Complete)
- **Status**: PRODUCTION READY WITH ADVANCED FEATURES

## Development Partnership

We're building production-quality code together. Your role is to create maintainable, efficient solutions while catching potential issues early.

When you seem stuck or overly complex, I'll redirect you - my guidance helps you stay on track.

## 🚨 AUTOMATED CHECKS ARE MANDATORY
**ALL hook issues are BLOCKING - EVERYTHING must be ✅ GREEN!**  
No errors. No formatting issues. No linting problems. Zero tolerance.  
These are not suggestions. Fix ALL issues before continuing.

## CRITICAL WORKFLOW - ALWAYS FOLLOW THIS!

### Research → Plan → Implement
**NEVER JUMP STRAIGHT TO CODING!** Always follow this sequence:
1. **Research**: Explore the codebase, understand existing patterns
2. **Plan**: Create a detailed implementation plan and verify it with me  
3. **Implement**: Execute the plan with validation checkpoints

When asked to implement any feature, you'll first say: "Let me research the codebase and create a plan before implementing."

For complex architectural decisions or challenging problems, use **"ultrathink"** to engage maximum reasoning capacity. Say: "Let me ultrathink about this architecture before proposing a solution."

### USE MULTIPLE AGENTS!
*Leverage subagents aggressively* for better results:

* Spawn agents to explore different parts of the codebase in parallel
* Use one agent to write tests while another implements features
* Delegate research tasks: "I'll have an agent investigate the database schema while I analyze the API structure"
* For complex refactors: One agent identifies changes, another implements them

Say: "I'll spawn agents to tackle different aspects of this problem" whenever a task has multiple independent parts.

### Reality Checkpoints
**Stop and validate** at these moments:
- After implementing a complete feature
- Before starting a new major component  
- When something feels wrong
- Before declaring "done"
- **WHEN HOOKS FAIL WITH ERRORS** ❌

Run: `make fmt && make test && make lint`

> Why: You can lose track of what's actually working. These checkpoints prevent cascading failures.

### 🚨 CRITICAL: Hook Failures Are BLOCKING
**When hooks report ANY issues (exit code 2), you MUST:**
1. **STOP IMMEDIATELY** - Do not continue with other tasks
2. **FIX ALL ISSUES** - Address every ❌ issue until everything is ✅ GREEN
3. **VERIFY THE FIX** - Re-run the failed command to confirm it's fixed
4. **CONTINUE ORIGINAL TASK** - Return to what you were doing before the interrupt
5. **NEVER IGNORE** - There are NO warnings, only requirements

This includes:
- Formatting issues (gofmt, black, prettier, etc.)
- Linting violations (golangci-lint, eslint, etc.)
- Forbidden patterns (time.Sleep, panic(), interface{})
- ALL other checks

Your code must be 100% clean. No exceptions.

**Recovery Protocol:**
- When interrupted by a hook failure, maintain awareness of your original task
- After fixing all issues and verifying the fix, continue where you left off
- Use the todo list to track both the fix and your original task

## Quick Reference

### Brand Colors
```css
--civiq-red: #e11d07;    /* Logo circle, errors */
--civiq-green: #0a9338;  /* Logo rectangle, success */
--civiq-blue: #3ea2d4;   /* Links, accents */
```

### Key Files
- `src/app/page.tsx` - Landing page (clean design)
- `src/app/representatives/page.tsx` - Representatives list
- `src/app/representative/[bioguideId]/page.tsx` - Enhanced profile pages
- `src/lib/congress-legislators.ts` - Enhanced representative data service
- `src/lib/api/` - API client functions
- `src/types/representative.ts` - Enhanced TypeScript definitions
- `src/components/BillSummary.tsx` - AI-powered bill summaries

### API Endpoints
```
GET /api/representatives?zip=48221             # Enhanced with congress-legislators
GET /api/representative/[bioguideId]           # Enhanced profiles with social media
GET /api/representative/[bioguideId]/votes     # Real voting records
GET /api/representative/[bioguideId]/bills     # Real bills with categorization
GET /api/representative/[bioguideId]/finance   # Real FEC data
GET /api/representative/[bioguideId]/news      # GDELT news with deduplication
GET /api/representative/[bioguideId]/party-alignment # Real party voting analysis
POST /api/representative/[bioguideId]/batch    # Batch API for multiple endpoints
GET /api/districts/[districtId]                # Districts with real Census data
GET /api/district-map?zip=48221                # Interactive maps with GeoJSON
GET /api/search                                # Advanced representative search
GET /api/health                                # Service health monitoring
```

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run linter
npm test         # Run tests
npm run security:audit  # Run security audit

# ZIP Code Integration Pipeline (Phases 1-3)
npx tsx scripts/validate-119th-congress-data.ts  # Phase 1: Validate ZIP code data
npm run process-zip-districts  # Phase 2: Process ZIP to district data
npm run test-phase3-integration  # Phase 3: Test integration

# Additional utilities
npm run process-census   # Process census data
npm run validate-mappings  # Validate mappings
```

### Critical Rules
1. ONLY use approved APIs (Congress-Legislators, Census, Congress, FEC, OpenStates, GDELT)
2. NEVER use Google Civic or ProPublica APIs
3. Keep the clean, minimalist design
4. TypeScript for all new code with null safety
5. Cache API responses with intelligent TTL
6. Always implement null-safe patterns (use optional chaining)

### Current Phase: MVP PRODUCTION READY (Phase 6 Complete + Full Verification - Jan 2025)
- ✅ Federal representatives with enhanced congress-legislators data
- ✅ ZIP code lookup with real Census API
- ✅ Enhanced profiles with social media and biographical data
- ✅ **Real voting records from Congress.gov with bill-based extraction and roll call parsing (Enhanced Jan 2025)**
- ✅ **Campaign finance with real FEC data including PAC contributions and complete source breakdown (Enhanced Jan 2025)**
- ✅ **GDELT news integration with advanced story clustering and 10 political themes (Enhanced Jan 2025)**
- ✅ **Multi-source photo pipeline with 99% reliability and 6-source validation (Enhanced Jan 2025)**
- ✅ AI-powered bill summarization
- ✅ **Real party line voting analysis with peer comparisons**
- ✅ **Interactive district maps with live GeoJSON boundaries**
- ✅ **Live Census ACS demographics for all districts**
- ✅ **Batch API system reducing round-trips by 80%**
- ✅ **Advanced search with comprehensive filtering**
- ✅ **Legislative partnerships and collaboration tracking**
- ✅ Comprehensive null-safe error handling
- ✅ Production-ready PWA features
- ✅ **119th Congress ZIP Code Data Validation (Phase 1 Complete - Jan 2025)**
- ✅ **Trading Card Party Data Fix (Jan 2025)** - Removed hardcoded Republican assignments
- ✅ **Representatives Page Loading Fix (Jan 2025)** - Fixed API endpoint routing
- ✅ **Enhanced Debugging & Monitoring (Jan 2025)** - Comprehensive logging system
- ✅ **🎉 MVP VERIFICATION COMPLETE (Jan 21, 2025)** - All federal functionality tested and production-ready
- ✅ **District Map API Fix (Jan 21, 2025)** - Fixed geocoding with intelligent fallbacks and real boundaries
- ✅ **Complete Error Handling (Jan 21, 2025)** - Enhanced TypeScript safety and null-checking across all systems
- ❌ State/local (Phase 2+)

### Phase 3 Complete: Integration with Existing System
- ✅ **Comprehensive Integration** - 39,363 ZIP codes seamlessly integrated with existing CIV.IQ system
- ✅ **Sub-millisecond performance** - 0.000ms average response time with 100% hit rate
- ✅ **100% backward compatibility** - All existing APIs preserved with zero breaking changes
- ✅ **Multi-district ZIP support** - 6,569 complex ZIPs with primary district assignment
- ✅ **Real-time monitoring** - Performance metrics and coverage statistics tracking
- ✅ **API call reduction** - 90% fewer Census API calls with comprehensive local mapping
- ✅ **Dynamic proxy mapping** - Intelligent ZIP_TO_DISTRICT_MAP with 146x coverage increase
- ✅ **Perfect integration** - 9/9 integration tests passed with TypeScript compilation verified

### Phase 2 Complete: Data Processing Pipeline
- ✅ **CSV processing** - 46,620 rows processed in 169ms with zero errors
- ✅ **District normalization** - At-large districts (98 → 00) and format standardization
- ✅ **Multi-district handling** - 6,569 multi-district ZIPs with primary assignment logic
- ✅ **TypeScript generation** - Complete mapping file with utility functions and type safety
- ✅ **Performance optimized** - O(1) lookup structure with comprehensive error handling
- ✅ **Quality assurance** - 100% data validation with comprehensive reporting pipeline

### Phase 1 Complete: 119th Congress ZIP Code Integration
- ✅ **OpenSourceActivismTech data validated** - 39,363 ZIP codes with 119th Congress districts
- ✅ **Data quality verified** - 100% clean data, zero missing fields
- ✅ **Complete US coverage** - All 50 states + territories (DC, GU, PR, VI)
- ✅ **Multi-district ZIP support** - Handles ZIP codes spanning multiple districts
- ✅ **Validation pipeline** - Automated data validation and quality assurance
- ✅ **Performance ready** - 90% API call reduction, <10ms lookup times projected

### Ready for Phase 4: Edge Case Handling & UI Updates
- ⏳ **Multi-district ZIP UI strategy** - Design UI for handling multiple districts
- ⏳ **Enhanced tooltips and warnings** - User-friendly edge case messaging
- ⏳ **Comprehensive state testing** - All 50 states + territories validation
- ⏳ **Unmapped ZIP logging** - Tracking and analytics for missing ZIPs

### Environment Variables
```env
CONGRESS_API_KEY=
FEC_API_KEY=
CENSUS_API_KEY=
```

### Design Principles
- Clean, minimalist interface
- Data clarity over decoration
- Fast, responsive performance
- Accessible to all users
- Mobile-first approach

### Git Workflow
1. Feature branch from `main`
2. Clear commit messages (feat/fix/docs)
3. Test before pushing
4. PR with description

## Working Memory Management

### When context gets long:
- Re-read this CLAUDE.md file
- Summarize progress in a PROGRESS.md file
- Document current state before major changes

### Maintain TODO.md:
```
## Current Task
- [ ] What we're doing RIGHT NOW

## Completed  
- [x] What's actually done and tested

## Next Steps
- [ ] What comes next
```

## Go-Specific Rules

### FORBIDDEN - NEVER DO THESE:
- **NO interface{}** or **any{}** - use concrete types!
- **NO time.Sleep()** or busy waits - use channels for synchronization!
- **NO** keeping old and new code together
- **NO** migration functions or compatibility layers
- **NO** versioned function names (processV2, handleNew)
- **NO** custom error struct hierarchies
- **NO** TODOs in final code

> **AUTOMATED ENFORCEMENT**: The smart-lint hook will BLOCK commits that violate these rules.  
> When you see `❌ FORBIDDEN PATTERN`, you MUST fix it immediately!

### Required Standards:
- **Delete** old code when replacing it
- **Meaningful names**: `userID` not `id`
- **Early returns** to reduce nesting
- **Concrete types** from constructors: `func NewServer() *Server`
- **Simple errors**: `return fmt.Errorf("context: %w", err)`
- **Table-driven tests** for complex logic
- **Channels for synchronization**: Use channels to signal readiness, not sleep
- **Select for timeouts**: Use `select` with timeout channels, not sleep loops

## Implementation Standards

### Our code is complete when:
- ✅ All linters pass with zero issues
- ✅ All tests pass  
- ✅ Feature works end-to-end
- ✅ Old code is deleted
- ✅ Godoc on all exported symbols

### Testing Strategy
- Complex business logic → Write tests first
- Simple CRUD → Write tests after
- Hot paths → Add benchmarks
- Skip tests for main() and simple CLI parsing

### Project Structure
```
cmd/        # Application entrypoints
internal/   # Private code (the majority goes here)
pkg/        # Public libraries (only if truly reusable)
```

## Problem-Solving Together

When you're stuck or confused:
1. **Stop** - Don't spiral into complex solutions
2. **Delegate** - Consider spawning agents for parallel investigation
3. **Ultrathink** - For complex problems, say "I need to ultrathink through this challenge" to engage deeper reasoning
4. **Step back** - Re-read the requirements
5. **Simplify** - The simple solution is usually correct
6. **Ask** - "I see two approaches: [A] vs [B]. Which do you prefer?"

My insights on better approaches are valued - please ask for them!

## Performance & Security

### **Measure First**:
- No premature optimization
- Benchmark before claiming something is faster
- Use pprof for real bottlenecks

### **Security Always**:
- Validate all inputs
- Use crypto/rand for randomness
- Prepared statements for SQL (never concatenate!)

## Communication Protocol

### Progress Updates:
```
✓ Implemented authentication (all tests passing)
✓ Added rate limiting  
✗ Found issue with token expiration - investigating
```

### Suggesting Improvements:
"The current approach works, but I notice [observation].
Would you like me to [specific improvement]?"

## Working Together

- This is always a feature branch - no backwards compatibility needed
- When in doubt, we choose clarity over cleverness
- **REMINDER**: If this file hasn't been referenced in 30+ minutes, RE-READ IT!

Avoid complex abstractions or "clever" code. The simple, obvious solution is probably better, and my guidance helps you stay focused on what matters.

## If Confused
- Check `README.md` for full documentation
- Run `pwd` to verify location
- Check `git status` for current branch
- Review mockups in project root

Remember: This is a civic utility, not a commercial product. Keep it clean, fast, and focused on serving citizens.