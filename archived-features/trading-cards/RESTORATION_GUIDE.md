# Trading Card Feature Restoration Guide

**Date Archived:** January 2025  
**Reason:** Feature archived for future use while maintaining core civic functionality  

## Files Archived

### Components
- `components/RepresentativeTradingCard.tsx` - Main trading card component
- `components/TradingCardGenerator.tsx` - Card generation logic  
- `components/TradingCardModal.tsx` - Modal interface for card creation
- `components/TradingCardPreview.tsx` - Preview component
- `components/TradingCardSharePanel.tsx` - Social sharing panel
- `components/CardCustomizationPanel.tsx` - Card customization options
- `components/StatDetailPanel.tsx` - Statistics detail panel
- `components/CardTemplateSelector.tsx` - Template selection component

### Library Functions
- `lib/cardGenerator.ts` - Core card generation utilities
- `lib/cardTracking.ts` - Card analytics and tracking

### API Routes
- `api/trading-card/og-image/route.ts` - Open Graph metadata generation

### Tests
- `tests/RepresentativeTradingCard.test.tsx`
- `tests/TradingCardGenerator.test.tsx`
- `tests/TradingCardModal.test.tsx`
- `tests/TradingCardSharePanel.test.tsx`
- `tests/cardGenerator.test.ts`
- `tests/socialSharing.test.ts`

## Integration Points Removed

### RepresentativePageSidebar.tsx
- **Lines 163-228:** Trading card section commented out
- **Lines 9-14:** Trading card imports commented out
- **Lines 35-38:** Trading card state variables commented out

### socialSharing.ts
- **Lines 13-111:** Trading card specific functions commented out:
  - `generateShareText()` - Generate social media share text
  - `generateShareUrl()` - Generate platform-specific share URLs
  - `generateOpenGraphTags()` - Generate Open Graph metadata

## Import Updates Needed for Restoration

When restoring this feature, the following import updates will be required:

### Component Imports
```typescript
// In RepresentativePageSidebar.tsx
import { TradingCardPreview } from './TradingCardPreview';
import { TradingCardModal } from './TradingCardModal';
import { EnhancedRepresentative } from '@/types/representative';
import { useState } from 'react';
```

### Utility Imports
```typescript
// In socialSharing.ts
import { EnhancedRepresentative } from '@/types/representative';
```

### API Route Imports
```typescript
// In og-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateOpenGraphTags } from '@/lib/socialSharing';
import { EnhancedRepresentative } from '@/types/representative';
import { structuredLogger } from '@/lib/logging/logger';
```

## Dependencies Required

The following packages were used by the trading card feature:
- `qrcode` - QR code generation
- `html2canvas` - Canvas rendering for card generation

## Restoration Steps

1. **Move files back to original locations:**
   ```bash
   # Move components back
   mv archived-features/trading-cards/components/* src/components/
   
   # Move utilities back  
   mv archived-features/trading-cards/lib/* src/lib/
   
   # Move API routes back
   mv archived-features/trading-cards/api/* src/app/api/
   
   # Move tests back
   mv archived-features/trading-cards/tests/* src/components/__tests__/
   ```

2. **Uncomment integration points:**
   - Uncomment lines in `RepresentativePageSidebar.tsx`
   - Uncomment functions in `socialSharing.ts`

3. **Update import paths as needed**

4. **Test the feature:**
   ```bash
   npm run build
   npm run test
   ```

5. **Add trading card route back to navigation if desired**

## Feature Overview

The trading card feature allowed users to:
- Generate shareable "trading cards" for representatives
- Customize card themes and layouts
- Share cards on social media platforms
- View card statistics and analytics
- Generate QR codes for easy sharing

The feature was fully functional and tested when archived.