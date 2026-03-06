# Contributing

## Requirements

- TypeScript strict mode — no `any` types
- All resolution functions return `null` for unresolvable inputs (never throw)
- Logger and cache are injected via `configure()` — never import app-specific modules

## Adding New Alias Tables

1. Add entries to the relevant alias builder function
2. Ensure both full and abbreviated forms are covered
3. Test with real LDA filing data

## Testing

```bash
npm test
```

## Code Style

- Functions, not classes
- Named exports only
- JSDoc on every export
- No side effects at module scope (except alias table initialization)
