# TypeScript Migration Guide

This guide documents the enhanced TypeScript configuration and type system implemented in CIV.IQ.

## 🎯 Overview

The TypeScript enhancements provide:

- **Strict type safety** with comprehensive null checks
- **Centralized type definitions** for all domain models
- **API versioning** with type-safe endpoints
- **Testing infrastructure** with mock utilities
- **Enhanced developer experience** with better IntelliSense

## 📘 Type System Architecture

### Directory Structure

```
src/types/
├── api/                           # API-specific types
│   ├── common.types.ts            # Generic API responses, pagination, validation
│   ├── representatives.types.ts   # Representative API endpoints
│   └── news.types.ts             # News API endpoints
├── models/                       # Domain models
│   ├── Representative.ts         # Core representative model with terms, contact info
│   ├── NewsArticle.ts           # News articles, themes, aggregation
│   └── Legislation.ts           # Bills, committees, votes, roll calls
└── index.ts                     # Central export point for all types
```

### Core Type Patterns

#### Readonly Arrays and Properties

```typescript
interface Representative {
  readonly bioguideId: string;
  readonly terms?: ReadonlyArray<RepresentativeTerm>;
  readonly contact: {
    readonly phone?: string;
    readonly website?: string;
  };
}
```

#### Generic API Responses

```typescript
interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ApiError;
  readonly metadata: ResponseMetadata;
}

// Usage
type RepresentativesResponse = ApiResponse<ReadonlyArray<Representative>>;
```

#### Union Types for Enums

```typescript
type BillStatus =
  | 'introduced'
  | 'referred'
  | 'reported'
  | 'passed_house'
  | 'passed_senate'
  | 'enacted'
  | 'vetoed';
```

## 🔧 Enhanced TypeScript Configuration

### tsconfig.json Updates

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/types": ["./src/types/index.ts"],
      "@/types/*": ["./src/types/*"],
      "@/config": ["./src/config/index.ts"],
      "@/store/*": ["./src/store/*"]
    }
  }
}
```

### Path Aliases

- `@/types` - Central type exports
- `@/types/*` - Direct access to type modules
- `@/config` - Configuration management
- `@/store/*` - State management types

## 🧪 Testing Infrastructure

### Test Utilities

Located in `tests/utils/test-helpers.ts`:

```typescript
// Mock API responses
export const createMockApiResponse = <T>(data: T): ApiResponse<T>;

// Generate test representatives
export const createMockRepresentative = (overrides?: Partial<Representative>): Representative;

// Mock fetch for API testing
export const mockFetch = (response: unknown, ok = true, status = 200);
```

### Test Data Fixtures

JSON fixtures in `tests/fixtures/`:

- `representatives.json` - Sample representative data
- `news.json` - Sample news articles
- `index.ts` - Centralized fixture exports

### Sample Test Structure

```typescript
import { representativesService } from '@/services/api/representatives.service';
import {
  createMockApiResponse,
  createMockRepresentative,
  mockFetch,
} from '../../utils/test-helpers';

describe('RepresentativesService', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should fetch representatives by ZIP code', async () => {
    const mockRepresentatives = [createMockRepresentative()];
    const mockResponse = createMockApiResponse(mockRepresentatives);

    mockFetch(mockResponse);
    const result = await representativesService.getByZipCode('48221');

    expect(result).toEqual(mockRepresentatives);
  });
});
```

## 🔄 API Versioning

### V1 API Structure

All API routes moved to versioned structure:

- `/api/v1/representatives`
- `/api/v1/news`
- `/api/v1/bills`
- `/api/v1/search`
- `/api/v1/districts`

### Configuration Management

Centralized configuration in `src/config/`:

```typescript
// api.config.ts
export const apiConfig = {
  version: 'v1',
  endpoints: {
    representatives: '/api/v1/representatives',
    news: '/api/v1/news',
    // ...
  },
  external: {
    congress: {
      baseURL: 'https://api.congress.gov/v3',
      timeout: 20000,
    },
    // ...
  },
};
```

## 🚀 Migration Strategies

### For Existing Components

1. **Import centralized types**:

   ```typescript
   import type { Representative, ApiResponse } from '@/types';
   ```

2. **Replace `any` types**:

   ```typescript
   // Before
   const [representatives, setRepresentatives] = useState<any[]>([]);

   // After
   const [representatives, setRepresentatives] = useState<Representative[]>([]);
   ```

3. **Use type-safe API calls**:

   ```typescript
   // Before
   const response = await fetch('/api/representatives');
   const data = await response.json();

   // After
   const response = await representativesService.getByZipCode(zipCode);
   // `response` is now typed as Representative[]
   ```

### For API Routes

1. **Use configuration endpoints**:

   ```typescript
   import { apiConfig } from '@/config';

   // Use configured endpoints instead of hardcoded strings
   const url = apiConfig.endpoints.representatives;
   ```

2. **Return typed responses**:
   ```typescript
   return NextResponse.json(result, {
     headers: {
       'API-Version': apiConfig.version,
     },
   });
   ```

## 🔍 Type Checking

### Running Type Checks

```bash
# Full TypeScript compilation check
npx tsc --noEmit

# Watch mode for development
npx tsc --noEmit --watch

# Check specific files
npx tsc --noEmit src/components/MyComponent.tsx
```

### Common Error Patterns

#### Null/Undefined Checks

```typescript
// Error: Object is possibly 'undefined'
const name = representative.name.first;

// Fix: Optional chaining
const name = representative.name?.first;

// Or: Null assertion (when you're certain)
const name = representative.name!.first;
```

#### Array Index Access

```typescript
// Error: Element implicitly has an 'any' type
const firstRep = representatives[0];

// Fix: Check array length or use optional access
const firstRep = representatives[0] as Representative | undefined;
// or
const firstRep = representatives.length > 0 ? representatives[0] : undefined;
```

#### Generic Type Constraints

```typescript
// Error: Type 'T' is not assignable to type 'string'
function processData<T>(data: T): string {
  return data.toString(); // Error if T doesn't have toString
}

// Fix: Add constraint
function processData<T extends { toString(): string }>(data: T): string {
  return data.toString();
}
```

## 📋 Migration Checklist

- [ ] Update component props with proper types
- [ ] Replace `any` types with specific interfaces
- [ ] Add null/undefined checks where needed
- [ ] Use centralized type imports
- [ ] Update API calls to use typed services
- [ ] Add unit tests with type-safe mocks
- [ ] Run `npx tsc --noEmit` and fix all errors
- [ ] Update documentation with type examples

## 🛠️ Development Workflow

1. **Make changes** with TypeScript support
2. **Run type check**: `npm run type-check`
3. **Run tests**: `npm test`
4. **Fix any type errors** before committing
5. **Use ESLint/Prettier** for consistent formatting

## 📚 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Testing Library with TypeScript](https://testing-library.com/docs/ecosystem-user-event)
- [Jest with TypeScript](https://jestjs.io/docs/getting-started#using-typescript)
