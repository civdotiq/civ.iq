# Security & Data Integrity

- **No synthetic data**: no `Math.random()` for data, no generated legislators/bills/votes. Return empty arrays when data is unavailable.
- **Secrets**: API keys in environment variables only.
- **Input**: sanitize all user input.
- **Address, not ZIP**: district lookup needs a full home address. ZIP boundaries don't align with congressional districts (wrong 10-20% of the time). Resolve address → Census Geocoder → lat/lon → district.
