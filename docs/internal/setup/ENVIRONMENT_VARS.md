# Environment Variables

This document lists all environment variables used in the Civic Intel Hub application.

## Environment Variables Table

| Variable Name            | Description                                                               | Required | Example Value           |
| ------------------------ | ------------------------------------------------------------------------- | -------- | ----------------------- |
| `CONGRESS_API_KEY`       | API key for Congress.gov to access bills, votes, and member data          | Yes      | `your-key-here`         |
| `FEC_API_KEY`            | API key for Federal Election Commission to access campaign finance data   | Yes      | `your-key-here`         |
| `OPENSTATES_API_KEY`     | API key for OpenStates.org to access state legislature data               | Yes      | `your-key-here`         |
| `CENSUS_API_KEY`         | API key for US Census Bureau to access demographic and district data      | Yes      | `your-key-here`         |
| `REDIS_HOST`             | Redis server hostname for caching (optional, defaults to in-memory cache) | No       | `localhost`             |
| `REDIS_PORT`             | Redis server port                                                         | No       | `6379`                  |
| `REDIS_PASSWORD`         | Redis server password                                                     | No       | `your-key-here`         |
| `OPENAI_API_KEY`         | OpenAI API key for AI bill summaries (optional, uses fallback summaries)  | No       | `your-key-here`         |
| `NODE_ENV`               | Application environment mode                                              | No       | `development`           |
| `NEXT_PUBLIC_APP_URL`    | Public application URL for internal API calls                             | No       | `http://localhost:3001` |
| `ENABLE_ANALYTICS`       | Enable or disable analytics features                                      | No       | `false`                 |
| `ENABLE_ERROR_REPORTING` | Enable or disable error reporting                                         | No       | `false`                 |

## API Key Sources

- **Congress.gov**: Get your free API key at https://api.congress.gov/sign-up/
- **FEC**: Get your free API key at https://api.open.fec.gov/developers/
- **OpenStates**: Get your free API key at https://openstates.org/accounts/profile/
- **Census Bureau**: Get your free API key at https://api.census.gov/data/key_signup.html
- **OpenAI**: Get your API key at https://platform.openai.com/api-keys

## Services Without API Keys

The following services work without API keys:

- GDELT Project API (news data)
- Census.gov geocoding API
- GitHub congress-legislators repository
- PMTiles for district boundaries

## Setup Instructions

1. Copy `.env.example` to `.env.local`
2. Replace placeholder values with your actual API keys
3. All required API keys are free to obtain from government sources
4. The application provides fallback data when APIs are unavailable
