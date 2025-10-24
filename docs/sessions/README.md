# Campaign Finance UX Redesign - Implementation Guide

## Overview

This guide breaks down the campaign finance UI/UX redesign into **3 digestible sessions** optimized for Claude Code or manual implementation.

## Quick Start

```bash
# Read the overview first
cat CLAUDE_CODE_CAMPAIGN_FINANCE_REDESIGN.md

# Then follow sessions in order:
# Session 1: Data layer & core components (2-3 hours)
# Session 2: Section components (2-3 hours)
# Session 3: Integration & polish (2-3 hours)
```

## Session Files

### 📁 Session 1: Data Layer & Core Components

**File**: `docs/sessions/FINANCE_UX_SESSION_1.md`

**What it builds**:

- Type definitions with comparison metrics
- Comparison calculation service
- ComparisonBarChart component
- SortableDataTable component

**Prerequisites**: None (start here)

**Claude Code command**:

```bash
claude-code "Implement the steps in docs/sessions/FINANCE_UX_SESSION_1.md.
Follow the 30-line rule and validate after each step."
```

---

### 📁 Session 2: Section Components

**File**: `docs/sessions/FINANCE_UX_SESSION_2.md`

**What it builds**:

- FundraisingSources section with sorting
- TopIndustries card layout with insights
- TopContributors with filtering

**Prerequisites**: Session 1 complete

**Claude Code command**:

```bash
claude-code "Implement the steps in docs/sessions/FINANCE_UX_SESSION_2.md.
Session 1 is already complete."
```

---

### 📁 Session 3: Integration & Polish

**File**: `docs/sessions/FINANCE_UX_SESSION_3.md`

**What it builds**:

- FinanceHeroSummary component
- CampaignFinancePage integration
- Unit tests
- Accessibility audit
- Performance optimization

**Prerequisites**: Sessions 1 & 2 complete

**Claude Code command**:

```bash
claude-code "Implement the steps in docs/sessions/FINANCE_UX_SESSION_3.md.
Sessions 1 and 2 are already complete."
```

---

## Design Principles

This redesign follows these core principles:

1. **Context is King** - Every metric has comparison benchmarks
2. **Progressive Disclosure** - Show Top 5, expand to see all (NO collapsed sections)
3. **Sortable & Filterable** - Users can explore data their way
4. **Plain Language** - Tooltips explain jargon
5. **Auto-Insights** - System highlights notable patterns
6. **Real Data Only** - FEC API or "Data unavailable" message

## File Structure

```
src/
├── types/
│   └── finance.ts                              # Extended with comparison types
├── lib/
│   └── services/
│       └── finance-comparisons.ts              # Comparison calculation logic
├── app/
│   └── api/
│       └── representative/
│           └── [bioguideId]/
│               └── finance/
│                   └── route.ts                # Enhanced with comparisons
└── features/
    └── campaign-finance/
        ├── CampaignFinancePage.tsx             # Main page integration
        └── components/
            ├── ComparisonBarChart.tsx          # Reusable bar chart
            ├── SortableDataTable.tsx           # Reusable table
            ├── FinanceHeroSummary.tsx          # Hero section
            ├── FundraisingSources.tsx          # Sources section
            ├── TopIndustries.tsx               # Industries section
            ├── TopContributors.tsx             # Contributors section
            └── __tests__/
                └── *.test.tsx                  # Unit tests
```

## Validation Checklist

After each session:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Tests
npm test

# All quality gates
npm run validate:all

# Session complete!
git commit -m "feat(finance): session [N] complete"
```

## Common Issues

### Issue: Types not found

**Solution**:

```bash
# Verify file exists
cat src/types/finance.ts | grep "ComparisonMetrics"

# Restart TypeScript server
# VS Code: Ctrl+Shift+P -> "TypeScript: Restart TS Server"
```

### Issue: Comparison data not in API response

**Solution**:

```bash
# Test API directly
curl http://localhost:3000/api/representative/T000193/finance | jq '.totalRaisedComparison'

# Should return object, not null
# If null, check src/app/api/representative/[bioguideId]/finance/route.ts
```

### Issue: Components not rendering

**Solution**:

```bash
# Check imports
grep -r "FundraisingSources" src/features/campaign-finance/

# Verify component exported
grep "export" src/features/campaign-finance/components/FundraisingSources.tsx

# Check browser console for errors
```

## Testing Strategy

### Unit Tests (Jest)

- Component rendering
- User interactions (sorting, filtering)
- Edge cases (zero amounts, missing data)

### Integration Tests

- Full page load
- Data fetching
- Error states

### Manual Testing

- Multiple representatives (with/without FEC data)
- Mobile responsive design
- Keyboard navigation
- Screen reader compatibility

## Performance Targets

- **Bundle Size**: < 50KB for finance feature
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90
- **No Layout Shifts**: CLS = 0

## Success Criteria

The redesign is complete when:

- [x] All 3 sessions implemented
- [x] All tests passing (>80% coverage)
- [x] TypeScript: 0 errors
- [x] ESLint: 0 warnings
- [x] Accessibility: WCAG 2.1 AA compliant
- [x] Manual testing: Works on 3+ representatives
- [x] Documentation: Updated in PHASE_TRACKER.md

## Next Steps After Completion

1. **User Testing**: Get feedback from civic-minded users
2. **Analytics**: Track which features are used most
3. **Iteration**: Enhance based on real usage patterns
4. **State Level**: Apply same patterns to state campaign finance

## Resources

- [FEC API Documentation](https://api.open.fec.gov/developers/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Otl Aicher Design System](../development/OTL_AICHER_DESIGN.md)
- [Project CLAUDE.md](../../CLAUDE.md)

---

**Questions?** Check the main overview: `CLAUDE_CODE_CAMPAIGN_FINANCE_REDESIGN.md`

**Remember**: This is civic infrastructure. Every line serves citizens seeking transparency.
