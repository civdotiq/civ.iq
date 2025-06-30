# CIV.IQ - Civic Intelligence Hub

A modern, transparent civic engagement platform that connects citizens with their government representatives through official data sources.

![CIV.IQ Logo](https://img.shields.io/badge/CIV.IQ-Civic%20Intelligence-blue?style=for-the-badge)

## 🎯 Mission

CIV.IQ empowers citizens with transparent access to government data, making it easy to:
- Find all representatives from federal to local levels
- Track voting records and legislative activity
- Monitor campaign finance data
- Compare representatives' effectiveness and positions

## ✨ Features

### Current (Phase 1 - MVP)
- **Representative Search**: Find your federal representatives by ZIP code
- **Enhanced Representative Profiles**: Comprehensive representative details with:
  - Contact information and office locations
  - Committee assignments and legislative stats
  - Biography and background information
  - Professional timeline and relationships
- **Advanced Voting Records**: Interactive voting analysis featuring:
  - Multi-dimensional filtering (time, type, position, search)
  - Detailed vote list with bill information
  - Visual voting pattern timeline
  - Party alignment and attendance statistics
- **Comprehensive Bill Tracking**: Legislative monitoring with:
  - Timeline view showing bill progress through Congress
  - Advanced filtering by category, status, and search
  - Progress visualization with status indicators
  - Sponsor and co-sponsor information
- **Campaign Finance Analysis**: FEC data integration including:
  - Financial health assessment and trends
  - Searchable contribution and expenditure records
  - Spending pattern analysis
  - Compliance and transparency information
- **Clean, Modern UI**: Minimalist design focused on data clarity
- **Real-time Data**: Fresh information from official government APIs

### Planned Features
- **Address-based Search**: Full address geocoding for precise district matching
- **State & Local Representatives**: Expand beyond federal officials  
- **District Maps**: Interactive congressional district boundaries
- **Enhanced Comparison Tools**: Side-by-side representative analysis
- **Historical Data**: Extended voting patterns and trends over time
- **Notification System**: Alerts for new bills and voting activity
- **Export Features**: Data export for research and analysis

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

### Data Sources
- **Congress.gov API**: Legislative data, member information, bills
- **FEC.gov API**: Campaign finance data
- **Census.gov API**: District demographics (planned)
- **OpenStates.org**: State legislature data (planned)

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
# Congress.gov API
CONGRESS_API_KEY=your_key_here

# FEC API
FEC_API_KEY=your_key_here

# Census API (if needed)
CENSUS_API_KEY=your_key_here
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

#### Get Representatives by ZIP
```
GET /api/representatives?zip=48221
```

#### Get Representative Details
```
GET /api/representative/[bioguideId]
```

#### Get Representative Votes
```
GET /api/representative/[bioguideId]/votes
```

#### Get Representative Bills
```
GET /api/representative/[bioguideId]/bills
```

#### Get Campaign Finance Data
```
GET /api/representative/[bioguideId]/finance
```

### External API Integration

The project integrates with official government APIs:
- **Congress.gov**: Member data, bills, votes
- **FEC.gov**: Campaign finance records
- **Census.gov**: Demographics and geographic data

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
