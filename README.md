<p align="center">
  <img src="public/images/civiq-logo-hero.webp" alt="CIV.IQ Logo" width="200">
</p>

<h1 align="center">CIV.IQ - Civic Information Hub</h1>

<p align="center">
  <strong>Government data about your elected officials, organized and easy to understand.</strong>
</p>

<p align="center">
  <a href="https://civdotiq.org">Live Demo</a> &bull;
  <a href="docs/API_DOCUMENTATION.md">API Docs</a> &bull;
  <a href="https://github.com/civdotiq/civic-intel-hub/issues">Report Bug</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15-black" alt="Next.js 15"></a>
  <img src="https://img.shields.io/badge/APIs-89_endpoints-green" alt="89 API Endpoints">
</p>

---

## Why CIV.IQ?

Finding information about your elected officials shouldn't require a political science degree. CIV.IQ organizes scattered government data from Congress.gov, FEC.gov, Census Bureau, and state legislatures into one unified, searchable platform. Enter your ZIP code and instantly see who represents you at every level of government, how they vote, and who funds their campaigns.

## About

CIV.IQ makes government data accessible by connecting citizens with their representatives from federal to local levels. The platform integrates live data from Congress.gov, FEC.gov, Census Bureau, and other official sources to provide transparent access to:

- Representative profiles and contact information
- Voting records and legislative activity
- Campaign finance data
- District demographics and boundaries
- Breaking news and policy trends

**Project Status**: Active development. Core federal features are production-ready. State/local features are in development.

## Key Features

### Federal Government Coverage

- **Representative Search**: Find representatives by ZIP code or address
- **Voting Records**: Real-time House and Senate voting data from Congress.gov and Senate.gov
- **Campaign Finance**: FEC integration with industry categorization and contribution analysis
- **Legislative Tracking**: Bill monitoring, sponsorship networks, and committee assignments
- **District Intelligence**: Census demographics, economic data, and interactive boundary maps

### State Legislature Coverage

- **State District Mapping**: Interactive boundary maps for all 7,383 state legislative districts
- **State Representative Profiles**: Complete information from OpenStates API
- **State Bills & Votes**: Legislative tracking for all 50 states
- **Address-to-Legislator**: Find your state house and senate representatives by address

### Data Integrity

- **Zero Mock Data**: All displayed information is real government data or clearly marked as unavailable
- **Live API Integration**: Congress.gov, FEC.gov, Census Bureau, OpenStates
- **Transparent Sources**: Clear attribution and data quality indicators
- **Validated Coordinates**: Comprehensive test suite prevents geospatial bugs

### Performance

- **PWA Ready**: Offline functionality and mobile installation
- **Smart Caching**: Redis-backed caching with automatic fallbacks
- **Optimized Loading**: Server components, lazy loading, and batch APIs
- **TypeScript**: 100% type-safe codebase with zero compilation errors

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Redis (optional for development, recommended for production)

### Installation

```bash
# Clone repository
git clone https://github.com/civdotiq/civic-intel-hub.git
cd civic-intel-hub

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Required API Keys

Edit `.env.local` with your API keys:

```env
CONGRESS_API_KEY=your_congress_api_key_here
FEC_API_KEY=your_fec_api_key_here
CENSUS_API_KEY=your_census_api_key_here
OPENSTATES_API_KEY=your_openstates_api_key_here
```

**Getting API Keys:**

- Congress.gov: https://api.congress.gov/sign-up/
- FEC.gov: https://api.open.fec.gov/developers/
- Census Bureau: https://api.census.gov/data/key_signup.html
- OpenStates: https://openstates.org/api/register/

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Verify Setup

Visit [http://localhost:3000/api/health](http://localhost:3000/api/health) to check all services are running.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Visualization**: Recharts, React Leaflet, D3.js
- **Caching**: Redis with in-memory fallback
- **APIs**: Congress.gov, FEC.gov, Census Bureau, OpenStates, NewsAPI

## Project Structure

```
civic-intel-hub/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── (public)/        # Public routes (landing, search)
│   │   ├── (civic)/         # Civic data routes (representatives, districts)
│   │   └── api/             # API routes
│   ├── components/          # React components
│   ├── lib/                 # Utilities and API clients
│   ├── hooks/               # Custom React hooks
│   └── types/               # TypeScript definitions
├── public/                  # Static assets and PWA files
├── tests/                   # Test suite
└── docs/                    # Additional documentation
```

## Documentation

- **[API Documentation](docs/API.md)**: Complete API reference
- **[Environment Setup](docs/setup/ENVIRONMENT.md)**: Detailed configuration guide
- **[Data Integrity Framework](docs/DATA_INTEGRITY_FRAMEWORK.md)**: Testing and validation
- **[Security Policy](SECURITY.md)**: Security measures and vulnerability reporting
- **[Performance Guide](docs/PERFORMANCE_OPTIMIZATION.md)**: Optimization strategies
- **[Changelog](CHANGELOG.md)**: Version history and updates

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**: Follow TypeScript and ESLint guidelines
4. **Write tests**: Ensure your changes are tested
5. **Submit a pull request**: Describe your changes clearly

### Areas for Contribution

- API integrations for state/local government data
- Accessibility improvements (WCAG 2.1 AA compliance)
- Performance optimizations
- Test coverage expansion
- Documentation improvements
- UI/UX enhancements

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

## Security

- **Data Validation**: Comprehensive input sanitization and XSS protection
- **Rate Limiting**: API throttling to prevent abuse
- **Secure Dependencies**: Automated npm audit on install
- **Vulnerability Reporting**: See [SECURITY.md](SECURITY.md)

## License

MIT License with attribution requirements.

**You CAN**: Use, modify, distribute commercially  
**You MUST**: Include copyright notice and "Powered by CIV.IQ" attribution  
**You CANNOT**: Use CIV.IQ™ trademark without permission

Copyright (c) 2019-2025 Mark Sandford. See [LICENSE](LICENSE) for full terms.

## Acknowledgments

- **U.S. Government**: Congress.gov, FEC.gov, Census Bureau for official data
- **NewsAPI & Google News**: Real-time news aggregation
- **OpenStates**: State legislature data
- **Open Source Community**: Dependencies and inspiration

## Contact

- **Maintainer**: Mark Sandford
- **Email**: mark@marksandford.dev
- **Issues**: [GitHub Issues](https://github.com/civdotiq/civic-intel-hub/issues)

---

**Note**: This project is independent and not affiliated with any government agency. All data is sourced from public government APIs and databases.
