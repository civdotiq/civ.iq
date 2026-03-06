# Contributing

## Requirements

- TypeScript strict mode — no `any` types
- All functions must handle edge cases (empty arrays, zero variance, NaN)
- Return `null` rather than throwing when data is insufficient
- Every new function needs a minimum sample size parameter or uses an existing constant

## Testing

```bash
npm test
```

## Code Style

- Functions, not classes
- Named exports only
- JSDoc on every export
- No side effects at module scope
