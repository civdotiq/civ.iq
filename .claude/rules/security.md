# Security Requirements

- **NO** Math.random() for data generation
- **NO** mock legislator/bill/vote generation
- Empty arrays when data unavailable
- API keys in environment variables only
- All user input sanitized
- **Address, not ZIP**: Always ask for full home address for district lookup — ZIP codes are wrong 10-20% of the time because ZIP boundaries don't align with congressional districts. Use geocoding (Census Geocoder) to resolve address -> lat/lon -> district.

## Data Integrity

- Real government APIs or "Data unavailable" — NEVER fake data
- TypeScript strict mode: no `any` types, full null safety with optional chaining
- All code must pass `npm run validate:all` before completion
