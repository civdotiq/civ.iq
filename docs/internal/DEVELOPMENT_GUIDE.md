# Development Guide - CIV.IQ

Complete guide for developing and maintaining the civic-intel-hub platform.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git
- Visual Studio Code (recommended)

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/civdotiq/civic-intel-hub.git
cd civic-intel-hub
```

### 2. Install Dependencies

```bash
npm ci  # Use ci for exact versions from package-lock.json
```

### 3. Environment Configuration

Create `.env.local` file:

```env
# Required API Keys
CONGRESS_API_KEY=your_congress_api_key
FEC_API_KEY=your_fec_api_key
CENSUS_API_KEY=your_census_api_key

# Optional Services
SENTRY_DSN=your_sentry_dsn
REDIS_URL=redis://localhost:6379

# Development
NODE_ENV=development
```

### 4. Verify Setup

```bash
npm run validate:all  # Run all checks
npm run dev          # Start development server
```

## NPM Scripts

### Core Development

```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build
npm start            # Start production server
npm run clean        # Clean build artifacts
```

### Code Quality

```bash
npm run lint         # Run ESLint
npm run lint:fix     # Fix auto-fixable issues
npm run type-check   # TypeScript type checking
npm run validate:all # Run all validation checks
```

### Testing

```bash
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Playwright with UI mode
```

### Data Processing

```bash
npm run process-census           # Process Census data
npm run process-zip-districts    # Process ZIP to district mappings
npm run process-real-census-districts # Process Census TIGER boundaries
npm run process-district-boundaries # Generate boundary metadata (2023 redistricting)
npm run validate-mappings        # Validate all data mappings
npm run test-phase3-integration  # Test ZIP integration
npm run test-district-accuracy   # Validate district boundaries
npm run diagnose:apis           # Test API connectivity and error handling
npm run validate:data           # Comprehensive data integrity validation
```

### Migration & Updates

```bash
npm run migrate:119th    # Migrate to 119th Congress data
npm run validate:data    # Validate all data integrity
```

### Security

```bash
npm run security:audit     # Run security audit
npm run security:full      # Comprehensive security check
npm run security:emergency # Force fix critical vulnerabilities
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
code .

# Validate changes
npm run validate:all

# Commit with conventional commits
git add .
git commit -m "feat: add new feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### 2. Bug Fixes

```bash
# Create fix branch
git checkout -b fix/issue-description

# Fix the issue
# Add tests to prevent regression

# Validate
npm test
npm run lint

# Commit
git commit -m "fix: resolve issue with X"
```

### 3. Documentation Updates

```bash
# Direct commits to main allowed for docs
git checkout main
git pull

# Update documentation

# Commit
git commit -m "docs: update API documentation"
git push
```

## Project Structure

```
civic-intel-hub/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── (routes)/       # Page routes
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Landing page
│   ├── components/         # React components
│   │   ├── ui/            # Base UI components
│   │   ├── representatives/ # Feature components
│   │   └── shared/        # Shared components
│   ├── lib/               # Utilities & services
│   │   ├── api/          # API client functions
│   │   ├── congress-legislators.ts # Data service
│   │   └── utils.ts      # Helper functions
│   ├── types/             # TypeScript definitions
│   ├── hooks/             # Custom React hooks
│   └── styles/            # Global styles
├── public/                # Static assets
├── tests/                 # Test files
├── scripts/               # Build & data scripts
├── docs/                  # Documentation
└── data/                  # Processed data files
```

## Coding Standards

### TypeScript

```typescript
// ✅ Good - Specific types
interface Representative {
  bioguideId: string;
  name: string;
  party: 'Democrat' | 'Republican' | 'Independent';
}

// ❌ Bad - Using any
const data: any = fetchData();
```

### React Components

```tsx
// ✅ Good - Typed props, null safety
interface Props {
  representative: Representative | null;
  onSelect?: (id: string) => void;
}

export function RepresentativeCard({ representative, onSelect }: Props) {
  if (!representative) return <EmptyState />;

  return <div onClick={() => onSelect?.(representative.bioguideId)}>{representative.name}</div>;
}

// ❌ Bad - No types, no null checks
export function RepresentativeCard(props) {
  return <div>{props.representative.name}</div>;
}
```

### API Routes

```typescript
// ✅ Good - Error handling, types, real data
export async function GET(request: Request) {
  try {
    const data = await fetchRealData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Data unavailable' }, { status: 503 });
  }
}

// ❌ Bad - Mock data generation
export async function GET() {
  return NextResponse.json({
    representatives: generateFakeData(), // NEVER DO THIS
  });
}
```

## Testing Guidelines

### Unit Tests

```typescript
// src/lib/__tests__/utils.test.ts
describe('formatCurrency', () => {
  it('formats cents to dollars', () => {
    expect(formatCurrency(1500)).toBe('$15.00');
  });

  it('handles null values', () => {
    expect(formatCurrency(null)).toBe('N/A');
  });
});
```

### Component Tests

```tsx
// src/components/__tests__/RepresentativeCard.test.tsx
import { render, screen } from '@testing-library/react';
import { RepresentativeCard } from '../RepresentativeCard';

test('renders representative name', () => {
  const rep = {
    bioguideId: 'P000197',
    name: 'Nancy Pelosi',
    party: 'Democrat',
  };

  render(<RepresentativeCard representative={rep} />);
  expect(screen.getByText('Nancy Pelosi')).toBeInTheDocument();
});
```

### E2E Tests

```typescript
// tests/e2e/search.spec.ts
import { test, expect } from '@playwright/test';

test('search by ZIP code', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name="zip"]', '94114');
  await page.click('button[type="submit"]');
  await expect(page.locator('.representative-card')).toBeVisible();
});
```

## Performance Optimization

### 1. Image Optimization

```tsx
import Image from 'next/image';

// ✅ Use Next.js Image component
<Image src={imageUrl} alt={name} width={200} height={200} loading="lazy" />;
```

### 2. Code Splitting

```tsx
// ✅ Dynamic imports for heavy components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

### 3. Data Fetching

```tsx
// ✅ Use SWR for client-side caching
import useSWR from 'swr';

const { data, error } = useSWR(`/api/representative/${id}`, fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 1 minute
});
```

## Debugging

### 1. Server-Side Debugging

```typescript
// Add to any server component or API route
console.log('[API]', {
  endpoint: request.url,
  method: request.method,
  timestamp: new Date().toISOString(),
});
```

### 2. Client-Side Debugging

```typescript
// Use debug flag in development
if (process.env.NODE_ENV === 'development') {
  console.log('[Component]', { state, props });
}
```

### 3. Network Debugging

```bash
# Monitor API calls in Chrome DevTools
# Network tab → Filter by XHR
# Check request/response payloads
```

## Common Issues & Solutions

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm ci
npm run build
```

### Type Errors

```bash
# Regenerate types
npm run type-check -- --noEmit false
```

### Test Failures

```bash
# Run specific test file
npm test -- RepresentativeCard.test.tsx

# Update snapshots
npm test -- -u
```

### District Boundary Issues

```bash
# Validate district mappings after redistricting updates
npm run validate:data
npm run test-district-accuracy

# Check specific district (e.g., MI-12)
curl http://localhost:3000/api/districts/MI-12 | jq '.geography'

# Verify Congress data version
npm run diagnose:apis
```

### Census API Errors

```bash
# Test Census API connectivity
npm run diagnose:apis

# Check API key validity
curl "https://api.census.gov/data/2022/acs/acs5?get=NAME&for=congressional%20district:*&in=state:26&key=$CENSUS_API_KEY"
```

### Representative Assignment Issues

```bash
# Verify 119th Congress data is current
npm run validate:data

# Check specific representative assignment
curl http://localhost:3000/api/representative/D000355 | jq '.district'

# Validate term dates
grep -r "119th Congress" src/lib/helpers/congress-validation.ts
```

### API Rate Limiting

```typescript
// Implement caching layer
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function fetchWithCache(url: string) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetch(url).then(r => r.json());
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

## Deployment

### Vercel Deployment

```bash
# Automatic deployment on push to main
git push origin main

# Manual deployment
vercel --prod
```

### Environment Variables

Set in Vercel dashboard:

- CONGRESS_API_KEY
- FEC_API_KEY
- CENSUS_API_KEY
- SENTRY_DSN (optional)

### Build Optimization

```javascript
// next.config.ts
module.exports = {
  images: {
    domains: ['bioguide.congress.gov'],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};
```

## Monitoring

### Error Tracking (Sentry)

```typescript
// Automatic error capture configured in sentry.client.config.ts
Sentry.captureException(error, {
  tags: {
    section: 'api',
    endpoint: '/representative',
  },
});
```

### Performance Monitoring

```typescript
// Use Next.js built-in analytics
// pages/_app.tsx
export function reportWebVitals(metric) {
  console.log(metric);
}
```

## Git Hooks (Husky)

Pre-commit hooks run automatically:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css,scss}": ["prettier --write"]
  }
}
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev)
- [Congress.gov API](https://api.congress.gov)
- [FEC API Documentation](https://api.open.fec.gov/developers/)
- [Census API Guide](https://www.census.gov/data/developers.html)
