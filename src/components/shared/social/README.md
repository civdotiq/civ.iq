# Social Sharing Components

Rams-inspired social sharing system for CIV.IQ federal representative profiles.

## Design Philosophy

Following Dieter Rams' principle: **"As little design as possible"**

- Single purpose: Share government data to X.com
- Minimal visual design: Geometric, clean, functional
- Clear interaction: No popups, no tracking, no clutter
- Data integrity: Only share real government data

## Components

### ShareButton

Basic share button with three variants.

```tsx
import { ShareButton, ShareIconButton, ShareTextButton } from '@/components/shared/social/ShareButton';

// Default variant (icon + text)
<ShareButton data={shareData} />

// Minimal variant (icon only)
<ShareIconButton data={shareData} />

// Text variant (text only)
<ShareTextButton data={shareData} />
```

### ShareableDataCard

Container card with integrated share functionality.

```tsx
import { ShareableDataCard } from '@/components/shared/social/ShareableDataCard';

<ShareableDataCard
  representative={{
    name: 'Amy Klobuchar',
    party: 'Democratic',
    state: 'MN',
    bioguideId: 'K000367',
    chamber: 'Senate',
  }}
  section="finance"
  title="Campaign Finance"
  stats={{
    totalRaised: 5200000,
    individualPercent: 67,
    pacPercent: 33,
    topIndustry: 'Technology',
    topIndustryAmount: 340000,
  }}
>
  {/* Your data visualization here */}
</ShareableDataCard>;
```

### Helper Components

```tsx
import {
  ShareableHeroStat,
  ShareableStatRow,
  ShareableBarChart
} from '@/components/shared/social/ShareableDataCard';

// Large hero statistic
<ShareableHeroStat
  value="$5.2M"
  label="Total Raised"
  sublabel="Through Q4 2024"
/>

// Single stat row
<ShareableStatRow
  label="Party Alignment"
  value="92%"
  trend="up"
/>

// Horizontal bar chart
<ShareableBarChart
  data={[
    { label: 'Individual', value: 3484000, percentage: 67, color: 'blue' },
    { label: 'PAC', value: 1716000, percentage: 33, color: 'gray' }
  ]}
/>
```

## Share Data Structure

```typescript
interface ShareData {
  representative: {
    name: string;
    party: string;
    state: string;
    bioguideId: string;
    chamber?: 'House' | 'Senate';
    district?: string;
  };
  section:
    | 'overview'
    | 'finance'
    | 'voting'
    | 'legislation'
    | 'committees'
    | 'alignment'
    | 'district';
  stats?: {
    // Finance stats
    totalRaised?: number;
    individualPercent?: number;
    pacPercent?: number;
    topIndustry?: string;
    topIndustryAmount?: number;

    // Voting stats
    partyAlignment?: number;
    bipartisanVotes?: number;
    totalVotes?: number;
    alignmentTrend?: 'increasing' | 'decreasing' | 'stable';

    // Legislative stats
    billsSponsored?: number;
    billsEnacted?: number;
    topAreas?: string[];

    // Committee stats
    committeeCount?: number;
    leadershipRoles?: string[];
  };
}
```

## Integration Examples

### Adding Share to Existing Component

```tsx
'use client';

import { ShareIconButton } from '@/components/shared/social/ShareButton';
import { ShareData } from '@/lib/social/share-utils';

export function MyFinanceComponent({ representative, financeData }) {
  const shareData: ShareData = {
    representative: {
      name: representative.name,
      party: representative.party,
      state: representative.state,
      bioguideId: representative.bioguideId,
      chamber: representative.chamber,
    },
    section: 'finance',
    stats: {
      totalRaised: financeData.totalRaised,
      individualPercent: Math.round(
        (financeData.individualContributions / financeData.totalRaised) * 100
      ),
    },
  };

  return (
    <div>
      <h2>
        Campaign Finance
        <ShareIconButton data={shareData} className="ml-2" />
      </h2>
      {/* Your content */}
    </div>
  );
}
```

### Complete Shareable Section

See `src/features/representatives/components/ShareableFinanceSection.tsx` for a full example of a shareable data section.

## Tweet Templates

The system automatically generates appropriate tweet text based on the section and available data:

**Finance:**

```
Sen. Amy Klobuchar (D-MN) campaign finance:
• $5.2M raised
• 67% from individuals
• Top: Technology ($340K)

Real government data via @civdotiq
https://civdotiq.org/representative/K000367#campaign-finance
```

**Voting:**

```
Sen. Amy Klobuchar (D-MN) voting record:
• 92% party alignment
• 18 bipartisan votes
• Trend: → stable

Transparency via @civdotiq
https://civdotiq.org/representative/K000367#voting-record
```

**Legislation:**

```
Sen. Amy Klobuchar (D-MN) legislative activity:
• 45 bills sponsored
• 12 became law
• Focus: Healthcare, Energy

Track Congress via @civdotiq
https://civdotiq.org/representative/K000367#legislation
```

## URL Structure

All share URLs link directly to the specific section:

- `#campaign-finance` - Finance section
- `#voting-record` - Voting section
- `#legislation` - Legislation section
- `#committees` - Committees section
- `#party-alignment` - Alignment section
- `#district` - District section

## Design Specifications

### Colors (Ulm School Palette)

```css
--civiq-red: #e11d07 /* Errors, deficits, against party */ --civiq-green: #0a9338
  /* Success, surplus, with party */ --civiq-blue: #3ea2d4 /* Links, accents, neutral */
  --gray-300: #e0e0e0 /* Borders */ --gray-600: #666666 /* Secondary text */ --black: #000000
  /* Primary text */;
```

### Typography

- System sans-serif font stack
- 2-3 font sizes maximum per component
- Clear hierarchy: Bold for data, regular for labels

### Layout

- 8px grid system
- 2px borders (geometric, no rounded corners)
- Horizontal spacing: 8px, 16px, 24px
- Vertical spacing: 8px, 16px, 24px, 32px

### Interaction

- Hover: Border color change + background tint
- Active: 1px translateY
- Focus: 2px solid outline with 2px offset

## Data Integrity Rules

1. **Never generate fake data** - If data is unavailable, show "Data unavailable"
2. **Always link to source** - Every share links back to the full page with real data
3. **Clear attribution** - Every tweet includes "@civdotiq" and "Real government data"
4. **Transparent errors** - Show clear error states, never hide missing data

## Accessibility

- All buttons have `aria-label` attributes
- Icon-only buttons include `title` attributes
- Color is not the only indicator (text labels included)
- Focus states are clearly visible
- Keyboard navigation supported

## Performance

- Components are client-side only (`'use client'`)
- ShareButton opens native browser window (no React state overhead)
- No external dependencies beyond Next.js
- Tweet text generated on-demand (no pre-computation)

## Future Enhancements

1. **OG Image Generation** - Dynamic Open Graph images (Phase 2)
2. **Share Analytics** - Privacy-respecting share tracking (Phase 3)
3. **Multiple Platforms** - Facebook, LinkedIn support (Phase 4)
4. **Comparison Shares** - Side-by-side representative comparisons (Phase 5)
