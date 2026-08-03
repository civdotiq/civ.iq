# Workflow Rules

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

## Workflow Habits

- **Subagents for scale**: Use subagents liberally for parallel research, exploration, and validation across the large codebase. Keep main context clean.
- **Fix bugs autonomously**: When given a bug report with clear reproduction, just fix it. Point at logs/errors, resolve them, verify. Don't ask for hand-holding.
- **Learn from corrections**: After any user correction, save a feedback memory immediately so the mistake never repeats.

## When Stuck

1. STOP - Don't create complex workarounds
2. OBSERVE - Get the specific error message
3. RESEARCH - Find similar patterns in codebase
4. SIMPLIFY - The simple solution is usually correct
5. ASK - "Should I approach this as X or Y?"
