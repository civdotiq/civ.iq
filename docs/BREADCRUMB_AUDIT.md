# Breadcrumb Navigation Audit & Implementation Plan

**Date:** October 17, 2025
**Status:** In Progress

## Overview

This document tracks the implementation of consistent breadcrumb navigation across all pages in the CIV.IQ application.

## Breadcrumb Component

**Location:** `src/components/shared/ui/Breadcrumb.tsx`

### Available Components:

1. **`<Breadcrumb />`** - Full breadcrumb with Home > Context > Current Page
2. **`<SimpleBreadcrumb />`** - Simple "Back to Representatives" link

### Breadcrumb Props:

```typescript
interface BreadcrumbProps {
  currentPage: string; // Current page title
  fromBioguideId?: string; // Representative bioguide ID from query params
  fromRepName?: string; // Representative name from query params
  customItems?: BreadcrumbItem[]; // Additional custom breadcrumb items
  className?: string; // Optional CSS class
}
```

## Implementation Status

### ✅ COMPLETED - Pages WITH Breadcrumbs

| Page                   | Path                           | Component Used        | Status       |
| ---------------------- | ------------------------------ | --------------------- | ------------ |
| Vote Detail            | `/vote/[voteId]`               | `<Breadcrumb>`        | ✅ Complete  |
| Committee Detail       | `/committee/[committeeId]`     | `<Breadcrumb>`        | ✅ Complete  |
| Bill Detail            | `/bill/[billId]`               | Breadcrumb nav        | ✅ Complete  |
| Representative Profile | `/representative/[bioguideId]` | "Back to Search" link | ✅ Complete  |
| **District Detail**    | `/districts/[districtId]`      | `<SimpleBreadcrumb>`  | ✅ **ADDED** |

### 🚧 IN PROGRESS - Federal Pages NEEDING Breadcrumbs

| Page                 | Path           | Priority | Notes                  |
| -------------------- | -------------- | -------- | ---------------------- |
| **Compare**          | `/compare`     | MEDIUM   | Federal rep comparison |
| **Legislation List** | `/legislation` | LOW      | Has arrow navigation   |
| **Districts List**   | `/districts`   | LOW      | Has arrow navigation   |

### ⏸️ DEFERRED - State/Local Pages (Not Currently Needed)

| Page                  | Path                         | Reason                         |
| --------------------- | ---------------------------- | ------------------------------ |
| **State Overview**    | `/states/[state]`            | State government - not federal |
| **State Legislature** | `/state-legislature/[state]` | State government - not federal |
| **State Bills**       | `/state-bills/[state]`       | State government - not federal |
| **Local Government**  | `/local`                     | Local government - not federal |

### ℹ️ Pages That DON'T Need Breadcrumbs

| Page                 | Path                  | Reason                      |
| -------------------- | --------------------- | --------------------------- |
| Home/Landing         | `/`                   | Top-level page              |
| About                | `/about`              | Static page with header nav |
| Privacy              | `/privacy`            | Static page with header nav |
| Data Sources         | `/data-sources`       | Static page with header nav |
| Search/Results       | `/search`, `/results` | Search flow pages           |
| Representatives List | `/representatives`    | Top-level list page         |
| States List          | `/states`             | Top-level list page         |

## Implementation Plan

### Phase 1: Federal Detail Pages ✅ COMPLETE

- [x] District Detail pages
- [x] Vote Detail pages (already done)
- [x] Committee Detail pages (already done)
- [x] Bill Detail pages (already done)
- [x] Representative Profile pages (already done)

### Phase 2: Federal Secondary Pages (Optional - Low Priority)

- [ ] Compare page (federal rep comparison)
- [ ] Legislation List page (optional - has arrow nav)
- [ ] Districts List page (optional - has arrow nav)

### Phase 3: Verification ✅ COMPLETE

- [x] Test all breadcrumb links work correctly
- [x] Verify breadcrumb styling is consistent
- [x] Check mobile responsive behavior
- [x] Run TypeScript type-check (PASSED)
- [x] Run ESLint validation (PASSED)

## Breadcrumb Patterns

### Pattern 1: Simple Back Link

Used when there's no specific context or previous page.

```tsx
import { SimpleBreadcrumb } from '@/components/shared/ui/Breadcrumb';

<SimpleBreadcrumb />;
```

**Renders:** Home icon + "Back to Representatives"

### Pattern 2: Representative Context

Used when navigating from a representative's profile (e.g., to their votes, committees, bills).

```tsx
import { Breadcrumb } from '@/components/shared/ui/Breadcrumb';

<Breadcrumb
  currentPage="Vote on H.R. 1234"
  fromBioguideId={bioguideId} // From query param: ?from=K000367
  fromRepName={repName} // From query param: ?name=Amy%20Klobuchar
/>;
```

**Renders:** Home > Amy Klobuchar > Vote on H.R. 1234

### Pattern 3: Custom Breadcrumb Path

Used when you need a custom navigation hierarchy.

```tsx
import { Breadcrumb } from '@/components/shared/ui/Breadcrumb';

<Breadcrumb
  currentPage="Current Page"
  customItems={[
    { label: 'States', href: '/states' },
    { label: 'California', href: '/states/CA' },
  ]}
/>;
```

**Renders:** Home > States > California > Current Page

## Implementation Status Summary

### ✅ COMPLETED - Federal Breadcrumb Navigation System

**Primary Implementation:**

1. ✅ **District Detail pages** - SimpleBreadcrumb added to `/districts/[districtId]`
2. ✅ **Comprehensive Audit** - All pages documented with federal/state/local categorization
3. ✅ **Validation Complete** - TypeScript type-check passed, ESLint passed
4. ✅ **Consistent Patterns** - Breadcrumb placement standardized across federal pages

**All Critical Federal Pages Now Have Breadcrumbs:**

- Vote Detail pages (`/vote/[voteId]`)
- Committee Detail pages (`/committee/[committeeId]`)
- Bill Detail pages (`/bill/[billId]`)
- Representative Profile pages (`/representative/[bioguideId]`)
- District Detail pages (`/districts/[districtId]`)

### Optional Future Enhancements (Low Priority)

**Federal Secondary Pages:**

- Compare page (`/compare`) - Federal representative comparison tool
- Legislation List page (`/legislation`) - Already has arrow navigation
- Districts List page (`/districts`) - Already has arrow navigation

**Note:** State legislature, state bills, and local government pages are intentionally excluded as they are not federal government pages.

## Notes

- All breadcrumbs should appear immediately after the header/above the page title
- Use consistent spacing: `className="mb-6"` on breadcrumb component
- Breadcrumbs improve UX by providing context and easy navigation back
- SimpleBreadcrumb defaults to `/representatives` as fallback - adjust if needed for different contexts

---

**Last Updated:** October 17, 2025
**Updated By:** Claude Code Assistant
