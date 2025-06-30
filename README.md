# CIV.IQ - Civic Intelligence Hub

A comprehensive civic engagement platform that connects citizens with their government representatives through live, validated data from official sources.

![CIV.IQ Logo](https://img.shields.io/badge/CIV.IQ-Civic%20Intelligence-blue?style=for-the-badge)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![API Integration](https://img.shields.io/badge/APIs-Live%20Data-success)
![Coverage](https://img.shields.io/badge/coverage-federal%20%7C%20state%20%7C%20local-blue)

## 🎯 Mission

CIV.IQ empowers citizens with transparent, real-time access to government data, making it easy to:
- Find representatives from federal to local levels using live APIs
- Track voting records and legislative activity in real-time
- Monitor campaign finance with FEC integration
- Access breaking news and policy trends via GDELT
- Compare representatives with validated, cross-referenced data

## ✨ Features

### ✅ **Phase 4 Complete: Live Data Integration (2025)**
- **🏛️ Real-time Government APIs**: Live data from Census, Congress.gov, FEC, GDELT
- **📊 Advanced Search & Visualization**: Multi-criteria filtering and D3.js visualizations
- **🏛️ State & Local Government**: Complete state legislature and local officials database
- **💰 Campaign Finance**: Live FEC data with contribution analysis and spending patterns
- **📰 Breaking News Integration**: Real-time political news and trending topics via GDELT
- **🔍 Data Validation**: Multi-source cross-validation with quality metrics
- **📡 Government RSS Feeds**: Official announcements from White House, Congress, agencies

### **Current Features (All Phases)**

#### **Federal Government Coverage**
- **Representative Search**: Find federal representatives by ZIP code with live Census geocoding
- **Enhanced Profiles**: Comprehensive details with real Congress.gov data:
  - Live voting records and bill sponsorship
  - Committee assignments and leadership roles
  - Campaign finance integration with FEC data
  - Real-time news mentions via GDELT
- **Advanced Voting Analysis**: Interactive voting visualization with:
  - Multi-dimensional filtering and timeline views
  - Party alignment and crossover voting patterns
  - Bill impact analysis and vote correlation
- **Legislative Tracking**: Real-time bill monitoring featuring:
  - Live status updates from Congress.gov
  - Sponsor and co-sponsor networks
  - Amendment tracking and procedural history
- **Campaign Finance**: Live FEC integration including:
  - Real-time contribution tracking
  - Top donor analysis and spending categories
  - Financial health assessment and trends

#### **State & Local Government**
- **State Legislature**: Complete state-level coverage with:
  - Upper and lower chamber composition
  - State bill tracking and committee assignments
  - Governor and state executive profiles
- **Local Officials**: Multi-jurisdiction support for:
  - City mayors, council members, and managers
  - County executives, commissioners, and sheriffs
  - School board members and superintendents
  - Special district officials

#### **Real-time News & Analysis**
- **Breaking News Monitoring**: GDELT-powered alerts for:
  - Legislative developments and policy changes
  - Political events and crisis monitoring
  - Trending topics with sentiment analysis
- **Government Communications**: RSS feed integration from:
  - White House press releases
  - Congressional announcements
  - Federal agency updates
  - Supreme Court decisions

#### **Data Quality & Validation**
- **Multi-source Validation**: Cross-reference data from multiple APIs
- **Quality Metrics**: Completeness, accuracy, timeliness scoring
- **Source Attribution**: Full transparency with reliability ratings
- **Error Detection**: Automated consistency checks and conflict resolution

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Custom enhanced components with interactive features
- **Visualizations**: D3.js for charts and data visualization
- **State Management**: React hooks with optimized filtering and search
- **Data Fetching**: Native fetch with caching and error handling

### Backend
- **Runtime**: Node.js
- **API Routes**: Next.js API routes
- **Caching**: In-memory caching (Redis planned)
- **Rate Limiting**: Built-in request throttling

### Live Data Sources & APIs
- **Congress.gov API**: Real-time legislative data, member info, bills, votes
- **FEC.gov API**: Live campaign finance data, contributions, expenditures
- **Census.gov API**: Congressional districts, demographics, geocoding
- **GDELT Project**: Real-time news, events, political trends
- **OpenStates.org**: State legislature and bill data
- **Government RSS Feeds**: Official announcements and press releases

### API Integration Features
- **Rate Limiting**: Intelligent request throttling across all APIs
- **Caching Strategy**: Optimized TTL based on data volatility
- **Error Recovery**: Graceful fallbacks and retry mechanisms
- **Data Validation**: Multi-source cross-validation and quality scoring
- **Source Attribution**: Full transparency and reliability tracking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/civic-intel-hub.git
cd civic-intel-hub
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:
```env
# Congress.gov API (required for federal data)
CONGRESS_API_KEY=your_key_here

# FEC API (required for campaign finance)
FEC_API_KEY=your_key_here

# Census API (required for demographics and geocoding)
CENSUS_API_KEY=your_key_here

# OpenStates API (optional, for enhanced state data)
OPENSTATES_API_KEY=your_key_here

# GDELT is public (no key required)
# RSS feeds are public (no key required)
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🎛️ Enhanced Components

### EnhancedVotingChart
Advanced voting records visualization with:
- **Multi-dimensional filtering**: Time period, vote type, position, and search
- **Interactive timeline**: Visual representation of voting patterns
- **Detailed view toggle**: Switch between summary and comprehensive vote lists
- **Enhanced statistics**: Party alignment, attendance, and breakdown percentages

### BillsTracker  
Comprehensive bill tracking system featuring:
- **Timeline view**: Visual progression of bills through the legislative process
- **Advanced filtering**: Category, status, sponsorship, and search capabilities
- **Progress visualization**: Status indicators and completion tracking
- **Enhanced bill details**: Sponsor information, co-sponsor counts, and policy areas

### CampaignFinanceVisualizer
FEC data integration with:
- **Financial health assessment**: Fundraising efficiency and spending analysis
- **Searchable records**: Filter contributions and expenditures
- **Analysis dashboard**: Financial trends and compliance information
- **Interactive charts**: Contribution sources and spending patterns

### Representative Profile Pages
Enhanced representative details including:
- **Comprehensive information display**: Biography, contact, and background
- **Professional relationships**: Committee memberships and networks
- **Statistical dashboard**: Legislative activity and effectiveness metrics
- **Clean tabbed interface**: Organized data presentation

## 📁 Project Structure

```
civic-intel-hub/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── representatives/   # Representatives list
│   │   ├── representative/   # Individual profiles (enhanced)
│   │   ├── districts/        # District information
│   │   ├── states/           # State overviews
│   │   └── api/              # API routes
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── EnhancedVotingChart.tsx      # Advanced voting visualization
│   │   ├── BillsTracker.tsx             # Legislative tracking system
│   │   ├── CampaignFinanceVisualizer.tsx # FEC data integration
│   │   └── SkeletonLoader.tsx           # Loading states
│   ├── lib/                  # Utility functions
│   │   ├── api/             # API client functions
│   │   ├── congress-api.ts  # Congress.gov integration
│   │   └── utils.ts         # Helper utilities
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
├── tests/                   # Test files
└── docs/                    # Documentation
```

## 🔌 API Documentation

### Internal API Endpoints

#### Federal Government
```
GET /api/representatives?zip=48221         # Find reps by ZIP
GET /api/representative/[bioguideId]       # Representative details
GET /api/representative/[bioguideId]/votes # Voting records
GET /api/representative/[bioguideId]/bills # Sponsored bills
GET /api/representative/[bioguideId]/finance # Campaign finance
GET /api/representative/[bioguideId]/news  # Recent news mentions
```

#### State & Local Government
```
GET /api/state-legislature/[state]         # State legislators
GET /api/state-bills/[state]              # State bills
GET /api/state-executives/[state]         # Governor & state officials
GET /api/local-government/[location]      # Local officials
```

#### Real-time Data
```
GET /api/gdelt/trends                     # Political trends
GET /api/rss/government                   # Government announcements
GET /api/census/district/[zip]            # District demographics
```

### Live API Integration

The platform integrates with multiple government and research APIs:

#### Government Sources (High Reliability)
- **Congress.gov API**: Real-time legislative data with 5000 req/hour limit
- **FEC.gov API**: Campaign finance with 1000 req/hour limit  
- **Census.gov API**: Demographics and geocoding with 500 req/day limit
- **Government RSS**: White House, Congress, Federal agencies

#### Research Sources (Medium-High Reliability)
- **GDELT Project**: Real-time news and events with 30 req/minute limit
- **OpenStates.org**: State legislature data (API key required)

#### Data Quality Features
- **Cross-validation**: Multiple source verification
- **Source Attribution**: Full transparency and reliability scoring
- **Cache Optimization**: 15min-24hr TTL based on data volatility
- **Error Recovery**: Intelligent fallbacks and retry logic

## 🎨 Design System

### Brand Colors
- **Primary Red**: `#e11d07` - Logo circle, important actions
- **Primary Green**: `#0b983c` - Logo rectangle, success states
- **Primary Blue**: `#3ea2d4` - Links, accents, interactive elements
- **Neutral**: Tailwind gray scale for text and backgrounds

### Typography
- **Headings**: System font stack with bold weights
- **Body**: Clean, readable sans-serif
- **Monospace**: For data and statistics

### Components
- Clean, minimalist design
- Focus on data clarity
- Consistent spacing and alignment
- Accessible color contrasts

## 🧪 Testing

Run the test suite:
```bash
# Unit tests
npm run test

# E2E tests (when implemented)
npm run test:e2e

# Test coverage
npm run test:coverage
```

## 🚦 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages

### Best Practices
- Keep components small and focused
- Use semantic HTML
- Ensure accessibility (WCAG 2.1 AA)
- Optimize for performance
- Cache API responses appropriately

### Git Workflow
1. Create feature branch from `main`
2. Make changes with clear commits
3. Write/update tests
4. Submit pull request
5. Code review and merge

## 📊 Performance

- **Lighthouse Score**: Target 95+ across all metrics
- **Bundle Size**: Keep under 200KB for initial load
- **API Response**: Cache responses to minimize API calls
- **Image Optimization**: Use Next.js Image component

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Areas for Contribution
- Add state/local representative data
- Improve search functionality
- Enhance data visualizations
- Add more data sources
- Improve accessibility
- Write tests

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Data provided by official U.S. government APIs
- Icons by Lucide React
- UI patterns inspired by shadcn/ui

## 📞 Contact

- **Project Lead**: [Your Name]
- **Email**: contact@civiq.org
- **Issues**: [GitHub Issues](https://github.com/yourusername/civic-intel-hub/issues)

---

**Note**: This is the active 2025 MVP implementation. For the latest updates and roadmap, see [ROADMAP.md](ROADMAP.md).
