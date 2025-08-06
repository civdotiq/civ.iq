# Phase 1: Entity Recognition & Link Infrastructure

## Overview

Transform all static text mentions of political entities into clickable, bidirectional links that enable natural exploration of power relationships.

## Deliverable

Automatic entity linking in all text content across the application.

## Success Test

1. Navigate to any bill page
2. All representative names in the description are clickable
3. Clicking a name navigates to that representative's profile
4. The representative's profile shows a "Mentioned in Bills" section linking back

## Implementation Tasks

### 1. Create EntityLinkWrapper Component

Location: `src/components/EntityLinkWrapper.tsx`

```typescript
interface EntityLinkWrapperProps {
  text: string;
  entityType?: 'auto' | 'representative' | 'bill' | 'committee';
  className?: string;
}
```

Features:

- Parse text for entity mentions
- Wrap entities in Next.js Link components
- Add hover preview cards
- Track bidirectional relationships

### 2. Build Entity Recognition Service

Location: `src/lib/entity-recognition.ts`

```typescript
interface EntityMatch {
  type: 'representative' | 'bill' | 'committee' | 'donor';
  text: string;
  id: string;
  startIndex: number;
  endIndex: number;
}

class EntityRecognitionService {
  recognizeEntities(text: string): EntityMatch[];
  getEntityLink(entity: EntityMatch): string;
  preloadEntityData(entityIds: string[]): void;
}
```

### 3. Implement Text Parsers

Patterns to recognize:

- Representatives: "Rep. [Name]", "Senator [Name]", "[Full Name] (R-TX)"
- Bills: "H.R. 1234", "S. 567", "HR1234"
- Committees: "House Committee on [Name]", "Senate [Name] Committee"
- Money: "$1.2M from", "donated $50,000"

### 4. Add Link Styling and Hover Previews

Create consistent styling:

- Underline on hover
- Different colors per entity type
- Hover card with quick info
- Loading state for preview data

### 5. Create Bidirectional Link Tracking

Location: `src/lib/connection-tracker.ts`

Track when entities reference each other:

- Store in-memory during build
- Update API to return backlinks
- Add "Mentioned In" sections

### 6. Update Existing Components

Components to update:

- `BillSummary.tsx` - Link sponsors and committee mentions
- `RepresentativeProfile.tsx` - Link bill numbers and committees
- `CommitteeDetails.tsx` - Link all member names
- `VotingRecordsTable.tsx` - Link bill numbers
- `CampaignFinanceVisualizer.tsx` - Link donor names

## Code Examples

### EntityLinkWrapper Usage

```typescript
<EntityLinkWrapper text={bill.summary} />
// Automatically converts "Rep. John Smith voted on H.R. 1234"
// to linked text
```

### Entity Recognition Example

```typescript
const entities = recognizeEntities(
  'Rep. Jane Doe (D-CA) sponsored H.R. 5678 in the House Ways and Means Committee'
);
// Returns:
// [
//   { type: 'representative', text: 'Rep. Jane Doe (D-CA)', id: 'D000123' },
//   { type: 'bill', text: 'H.R. 5678', id: 'hr5678-119' },
//   { type: 'committee', text: 'House Ways and Means Committee', id: 'HSWM' }
// ]
```

## Testing Checklist

- [ ] Representative names in bill descriptions are linked
- [ ] Bill numbers in voting records are linked
- [ ] Committee names in member lists are linked
- [ ] Hover previews load within 200ms
- [ ] Links work with keyboard navigation
- [ ] No false positive matches
- [ ] Performance: <50ms to parse typical page

## Next Phase Preview

Phase 2 will build the backend infrastructure to track and query these connections, enabling features like "Find all representatives connected through committee X" or "Show voting correlation between connected members."
