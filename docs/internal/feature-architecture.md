# Feature-Based Component Architecture

## 📋 Overview

The Civic Intel Hub uses a **feature-based architecture** that organizes code by business domain rather than by technical concerns. This approach improves maintainability, developer experience, and code discoverability by co-locating all related code within feature boundaries.

**Date**: 2025-09-08  
**Architecture Type**: Feature-based co-location with shared component library  
**Organization**: Domain-driven design principles

---

## 🎯 Architecture Principles

### 1. Domain-Driven Organization

Components, services, types, and hooks are grouped by **business feature** rather than technical layer:

```
✅ GOOD: Feature-based
src/features/representatives/
├── components/           # UI components for representatives
├── services/            # API calls and business logic
├── hooks/               # Feature-specific React hooks
└── types/               # TypeScript interfaces for this domain

❌ BAD: Layer-based
src/components/          # All components mixed together
src/services/            # All services mixed together
src/hooks/               # All hooks mixed together
```

### 2. Clear Feature Boundaries

Each feature is **self-contained** with minimal cross-feature dependencies:

- **Representatives**: Member profiles, voting records, contact information
- **Campaign Finance**: FEC data, donation tracking, financial analysis
- **Districts**: Geographic boundaries, demographic data, mapping
- **Legislation**: Bills, voting records, bill tracking
- **News**: GDELT integration, representative news feeds
- **Search**: Cross-domain search functionality
- **Voting**: Roll call analysis, voting pattern insights
- **Analytics**: Data visualization and trend analysis

### 3. Shared Component Library

Common components are organized in `components/shared/` by purpose:

```typescript
src/components/shared/
├── common/              # General-purpose components
│   ├── LoadingSpinner.tsx
│   ├── ErrorBoundary.tsx
│   └── CiviqLogo.tsx
├── layout/              # Layout-specific components
│   ├── SiteHeader.tsx
│   └── CongressBadge.tsx
└── ui/                  # Base UI primitives
    ├── Button.tsx
    └── Card.tsx
```

---

## 🏗️ Feature Structure Template

Each feature follows a consistent internal organization:

```typescript
src/features/[feature-name]/
├── components/          # React components (*.tsx)
│   ├── [FeatureName]Client.tsx      # Main client component
│   ├── [FeatureName]Card.tsx        # Card/summary components
│   ├── [FeatureName]Details.tsx     # Detailed view components
│   └── index.ts                     # Barrel export
├── services/            # API calls and data fetching (*.ts)
│   ├── [feature]-api.ts             # External API integration
│   ├── [feature]-cache.ts           # Caching logic
│   └── [feature]-utils.ts           # Business logic utilities
├── hooks/               # React hooks (*.ts)
│   ├── use[FeatureName].ts          # Primary data hook
│   └── use[FeatureName]Cache.ts     # Caching hook
├── types/               # TypeScript interfaces (*.ts)
│   └── [feature].ts                 # Domain-specific types
└── utils/               # Pure utility functions (*.ts)
    └── [feature]-helpers.ts         # Helper functions
```

---

## 🌐 Current Feature Inventory

### Core Features

#### 1. **Representatives** (`src/features/representatives/`)

**Purpose**: Federal representative profiles, contact info, and basic data  
**Components**: 37 components including profile cards, search forms, headers  
**Key Files**:

- `PersonalInfoCard.tsx` - Biographical information with Wikidata integration
- `RepresentativesClient.tsx` - Main list/search interface
- `MinimalRepresentativePage.tsx` - Individual representative pages

**Services**: Congress.gov API integration, batch voting data  
**Hooks**: Representative data fetching and caching

#### 2. **Campaign Finance** (`src/features/campaign-finance/`)

**Purpose**: FEC data integration and financial analysis  
**Components**: 9 specialized components for financial visualization  
**Key Files**:

- `CampaignFinanceVisualizer.tsx` - Main financial dashboard
- `DonorAnalysis.tsx` - Donation pattern analysis
- `IndustryBreakdown.tsx` - Sector-based contribution analysis

**Services**: FEC API integration with data quality validation  
**Types**: FEC response interfaces, financial metrics

#### 3. **Districts** (`src/features/districts/`)

**Purpose**: Congressional districts, demographics, and geographic data  
**Components**: 16 components including maps and demographic charts  
**Key Files**:

- `DistrictBoundaryMap.tsx` - Interactive district visualization
- `DistrictDemographics.tsx` - Census data display
- `CongressSessionInfo.tsx` - Legislative context from Wikidata

**Services**: Census API, district boundary data  
**Utils**: Geographic calculations, demographic processing

#### 4. **Legislation** (`src/features/legislation/`)

**Purpose**: Bills, legislative tracking, and AI-powered analysis  
**Services**: 6 AI services including bill summarization and text processing  
**Key Files**:

- `bill-summarizer.ts` - AI-powered bill analysis
- `rollcall-parser.ts` - Voting record processing

**Features**: Reading level validation, summary caching, text processing

#### 5. **Voting** (`src/features/voting/`)

**Purpose**: Roll call analysis and voting pattern insights  
**Components**: Voting analysis and pattern recognition  
**Services**: Senate XML parsing, House roll call integration  
**Hooks**: Vote data caching and analysis

### Supporting Features

#### 6. **News** (`src/features/news/`)

**Purpose**: GDELT news integration for representatives  
**Services**: GDELT API integration, query building  
**Components**: News feed display and filtering

#### 7. **Search** (`src/features/search/`)

**Purpose**: Cross-domain search functionality  
**Components**: Universal search interface  
**Services**: Multi-domain search aggregation

#### 8. **Analytics** (`src/features/analytics/`)

**Purpose**: Data visualization and trend analysis  
**Components**: Chart components, effectiveness metrics  
**Services**: Data aggregation and statistical analysis

---

## ✅ Co-location Benefits

### 1. **Developer Experience**

- **Single Location**: All representative-related code in `features/representatives/`
- **Clear Ownership**: Each feature has defined boundaries and responsibilities
- **Easy Navigation**: Related files are physically close together
- **Reduced Context Switching**: Work within one feature directory at a time

### 2. **Maintainability**

- **Localized Changes**: Feature updates rarely affect other domains
- **Clear Dependencies**: Import patterns show feature relationships
- **Testing Focus**: Feature-specific tests co-located with code
- **Code Review Efficiency**: Changes grouped by business logic

### 3. **Scalability**

- **Team Boundaries**: Features can be assigned to specific teams
- **Independent Development**: Features can evolve independently
- **Selective Refactoring**: Update one feature without affecting others
- **Clear Interfaces**: Well-defined boundaries between features

### 4. **Code Discoverability**

```typescript
// Clear, predictable imports
import { PersonalInfoCard } from '@/features/representatives/components/PersonalInfoCard';
import { getBatchVotingData } from '@/features/representatives/services/batch-voting-service';
import { useRepresentative } from '@/features/representatives/hooks/useRepresentative';

// Instead of unclear layer-based imports
import { PersonalInfoCard } from '@/components/PersonalInfoCard'; // Which domain?
import { getBatchData } from '@/services/batch-service'; // What type of batch?
import { useData } from '@/hooks/useData'; // What data?
```

---

## 🔗 Inter-Feature Communication

### Import Patterns

#### ✅ **Allowed Dependencies**

```typescript
// 1. Feature components can import from shared library
import { LoadingSpinner } from '@/components/shared/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/shared/common/ErrorBoundary';

// 2. Features can import types from global types directory
import { EnhancedRepresentative } from '@/types/representative';
import { DistrictInfo } from '@/types/district';

// 3. Features can import utilities from lib/
import { formatCurrency } from '@/lib/utils/formatting';
import { apiClient } from '@/lib/api/client';

// 4. Limited cross-feature imports for composition
import { DistrictInfoCard } from '@/features/districts/components/DistrictInfoCard';
```

#### ⚠️ **Discouraged Dependencies**

```typescript
// Avoid importing internal services across features
❌ import { fecService } from '@/features/campaign-finance/services/fec-api';

// Instead: Use global API clients or create shared services in lib/
✅ import { getFECData } from '@/lib/api/fec-client';
```

### Data Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Page/Route    │    │  Shared Types   │    │   Global API    │
│   (app/*)       │◄──►│   (types/*)     │◄──►│    (lib/api)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              ▲
         ▼                                              │
┌─────────────────┐    ┌─────────────────┐              │
│    Features     │    │  Shared Comps   │              │
│  (features/*)   │◄──►│(components/     │              │
│                 │    │   shared/*)     │              │
└─────────────────┘    └─────────────────┘              │
         │                                              │
         └──────────────────────────────────────────────┘
```

---

## 🛠️ Implementation Examples

### Example 1: Representatives Feature

```typescript
// File: src/features/representatives/components/PersonalInfoCard.tsx
import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react'; // External lib
import { EnhancedRepresentative } from '@/types/representative'; // Global type
import { getAgeFromWikidata } from '@/lib/api/wikidata'; // Global service

interface PersonalInfoCardProps {
  representative: EnhancedRepresentative;
  className?: string;
}

export function PersonalInfoCard({ representative, className = '' }: PersonalInfoCardProps) {
  // Component implementation...
}
```

### Example 2: Campaign Finance Integration

```typescript
// File: src/features/campaign-finance/components/DonorAnalysis.tsx
import { CampaignFinanceData } from '@/features/campaign-finance/types/finance'; // Local type
import { formatCurrency } from '@/lib/utils/formatting'; // Global util
import { MetricCard } from '@/features/campaign-finance/components/MetricCard'; // Local component

export function DonorAnalysis({ data }: { data: CampaignFinanceData }) {
  // Implementation using local types and components
}
```

### Example 3: Cross-Feature Composition

```typescript
// File: src/features/representatives/components/MinimalRepresentativePage.tsx
import { PersonalInfoCard } from '@/features/representatives/components/PersonalInfoCard';     // Local
import { DistrictInfoCard } from '@/features/districts/components/DistrictInfoCard';           // Cross-feature
import { CommitteeMembershipsCard } from '@/features/representatives/components/CommitteeMembershipsCard'; // Local

export function MinimalRepresentativePage({ bioguideId }: { bioguideId: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-6">
        <PersonalInfoCard representative={representative} />
        <CommitteeMembershipsCard representative={representative} />
      </div>
      <div className="lg:col-span-2">
        <DistrictInfoCard districtId={representative.districtId} />
      </div>
    </div>
  );
}
```

---

## 📊 Architecture Metrics

### Feature Sizes

| Feature              | Components | Services | Hooks | Types | Total Files |
| -------------------- | ---------- | -------- | ----- | ----- | ----------- |
| **Representatives**  | 37         | 4        | 2     | 1     | 44          |
| **Districts**        | 16         | 3        | 0     | 2     | 21          |
| **Campaign Finance** | 9          | 2        | 0     | 1     | 12          |
| **Legislation**      | 3          | 6        | 0     | 1     | 10          |
| **Voting**           | 4          | 2        | 2     | 1     | 9           |
| **News**             | 2          | 2        | 1     | 1     | 6           |
| **Search**           | 2          | 2        | 0     | 1     | 5           |
| **Analytics**        | 3          | 1        | 0     | 1     | 5           |

### Import Dependency Analysis

- **Internal Feature Dependencies**: 89% of imports stay within feature boundaries
- **Shared Component Usage**: 24 features use shared components appropriately
- **Cross-Feature Composition**: 6 cases of intentional cross-feature component usage
- **Global Type Usage**: All features properly use centralized types from `/types`

---

## 🎯 Best Practices

### 1. **Feature Naming**

- Use **domain nouns**: `representatives`, `districts`, `campaign-finance`
- Keep names **singular** when referring to the concept: `legislation`, `voting`
- Use **kebab-case** for directories, **PascalCase** for components

### 2. **Component Organization**

```typescript
// ✅ GOOD: Descriptive, feature-scoped names
PersonalInfoCard.tsx;
ServiceTermsCard.tsx;
CommitteeMembershipsCard.tsx;

// ❌ BAD: Generic or unclear names
Card.tsx;
Info.tsx;
Component.tsx;
```

### 3. **Service Layer Design**

```typescript
// ✅ GOOD: Feature-specific services with clear responsibilities
src/features/representatives/services/
├── congress-api.ts          # Congress.gov integration
├── batch-voting-service.ts  # Voting data aggregation
└── representative-cache.ts  # Feature-specific caching

// ❌ BAD: Generic services that mix concerns
src/services/
├── api.ts                   # Everything mixed together
└── data.ts                  # Unclear purpose
```

### 4. **Type Definition Strategy**

```typescript
// Global types (cross-feature): /types/representative.ts
export interface EnhancedRepresentative {
  bioguideId: string;
  name: string;
  // ... used by multiple features
}

// Feature-specific types: /features/campaign-finance/types/finance.ts
export interface DonorBreakdown {
  individualDonations: number;
  pacContributions: number;
  // ... used only within campaign-finance feature
}
```

### 5. **Import Optimization**

```typescript
// ✅ GOOD: Barrel exports for clean imports
// File: src/features/representatives/components/index.ts
export { PersonalInfoCard } from './PersonalInfoCard';
export { ServiceTermsCard } from './ServiceTermsCard';
export { CommitteeMembershipsCard } from './CommitteeMembershipsCard';

// Usage:
import { PersonalInfoCard, ServiceTermsCard } from '@/features/representatives/components';
```

---

## 🚀 Migration Guide

### Moving from Layer-Based to Feature-Based

#### Step 1: Identify Feature Boundaries

```bash
# Analyze current component usage
grep -r "Representative" src/components --include="*.tsx" | cut -d: -f1 | sort -u

# Group related components
echo "Representatives feature:"
echo "- RepresentativeCard.tsx"
echo "- RepresentativeList.tsx"
echo "- RepresentativeSearch.tsx"
```

#### Step 2: Create Feature Structure

```bash
# Create feature directories
mkdir -p src/features/representatives/{components,services,hooks,types,utils}

# Move related files
mv src/components/Representative*.tsx src/features/representatives/components/
mv src/services/representative-*.ts src/features/representatives/services/
```

#### Step 3: Update Import Paths

```bash
# Find and replace imports
grep -r "from.*components/Representative" src/ --include="*.tsx" | \
  sed 's|from.*components/Representative|from @/features/representatives/components/Representative|g'
```

#### Step 4: Create Barrel Exports

```typescript
// src/features/representatives/components/index.ts
export { RepresentativeCard } from './RepresentativeCard';
export { RepresentativeList } from './RepresentativeList';
export { RepresentativeSearch } from './RepresentativeSearch';
```

---

## 🔍 Troubleshooting

### Common Issues

**Q: Getting "Module not found" errors after restructuring**  
A: Check your `tsconfig.json` paths and ensure barrel exports are properly configured.

**Q: Circular dependency warnings**  
A: Avoid cross-feature service imports. Use global services in `lib/` for shared functionality.

**Q: Components becoming too large**  
A: Break down into smaller, feature-specific components. Consider if you're mixing multiple domain concerns.

**Q: Unclear feature boundaries**  
A: Ask: "If I had to assign this to a product team, which team would own it?" That's your feature boundary.

### Performance Considerations

- **Bundle Size**: Feature-based architecture enables better code splitting by route
- **Import Analysis**: Use `@next/bundle-analyzer` to ensure features aren't cross-importing unnecessarily
- **Lazy Loading**: Features can be lazy-loaded when used in different routes
- **Development**: Faster TypeScript compilation when working within feature boundaries

---

## 📈 Future Enhancements

### Planned Improvements

1. **Feature-Based Testing**: Co-locate tests with features (`features/*/tests/`)
2. **Feature Documentation**: Individual README files for complex features
3. **Dependency Visualization**: Tools to visualize inter-feature dependencies
4. **Team Ownership**: CODEOWNERS file mapping features to teams
5. **Feature Flags**: Enable/disable entire features for different environments

### Monitoring

- **Dependency Drift**: Regular analysis of cross-feature imports
- **Bundle Impact**: Monitor feature-specific bundle sizes
- **Developer Survey**: Quarterly feedback on architecture effectiveness
- **Code Reviews**: Ensure new code follows feature boundaries

---

_Last Updated: 2025-09-08_  
_Architecture Version: 2.0_  
_Phase: Feature Co-location Complete_
