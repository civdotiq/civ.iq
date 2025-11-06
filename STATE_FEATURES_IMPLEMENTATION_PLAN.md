# State-Level Features Implementation Plan

**Project**: CIV.IQ State Government Integration
**Created**: 2025-11-05
**Status**: Planning Phase
**Estimated Total Effort**: 24-30 hours

---

## 📋 Executive Summary

This plan outlines the implementation of three critical state-level features:

1. **State Executives & Judiciary Pages** (6-8 hours) - ⭐ PRIORITY 1
2. **Unified State Bill Search** (8-10 hours) - PRIORITY 2
3. **State Committee Detail Pages** (10-12 hours) - PRIORITY 3

All three features will integrate seamlessly into the existing state legislature infrastructure, leveraging production-ready backend APIs and following established UI patterns.

---

## 🎯 Feature 1: State Executives & Judiciary Pages

### Overview

Add comprehensive pages showing state government branches beyond the legislature:

- **Executives**: Governor, Lt. Governor, Attorney General, Secretary of State, Treasurer, etc.
- **Judiciary**: State Supreme Court justices, appellate judges, court system info

### Backend Status: ✅ PRODUCTION READY

- **Endpoints**:
  - `GET /api/state-executives/[state]` - Fully implemented with Wikidata enrichment
  - `GET /api/state-judiciary/[state]` - Fully implemented with Wikidata enrichment
- **Data Sources**: Wikidata API
- **Cache**: 24-hour TTL
- **Types**: Complete (`state-judiciary.ts`, inline types in executives route)

### Integration Strategy: Extend State Legislature Page

**Option A** (RECOMMENDED): Add tabs to existing `/state-legislature/[state]` page

```
/state-legislature/MI
├── Tab: Legislature (existing)
├── Tab: Executives (NEW)
└── Tab: Judiciary (NEW)
```

**Option B**: Create separate unified state page at `/states/[state]`

```
/states/MI
├── Tab: Legislature → links to /state-legislature/MI
├── Tab: Executives (NEW)
└── Tab: Judiciary (NEW)
```

**Decision**: Use Option A for faster implementation and better UX continuity.

---

### Implementation Steps

#### Step 1: Create State Executives Component (3-4 hours)

**File**: `src/features/state-government/components/StateExecutivesTab.tsx`

**Features**:

- Fetch executives from `/api/state-executives/[state]`
- Display in grid layout with party indicators
- Key officials first (Governor, Lt. Gov, AG)
- Profile cards with:
  - Photo
  - Name and title
  - Party affiliation badge
  - Term dates
  - Contact info (email, phone, office)
  - Social media links
  - Previous offices timeline
  - Key initiatives (if available)
- Party breakdown visualization
- Next election date/info

**UI Pattern**: Similar to legislator cards but emphasize statewide role

**Component Structure**:

```tsx
<StateExecutivesTab state="MI">
  <ExecutiveProfileCard
    official={governor}
    highlighted={true} // For Governor
  />
  <ExecutivesGrid officials={otherExecutives} />
  <PartyBreakdown data={partyStats} />
  <NextElectionInfo election={nextElection} />
</StateExecutivesTab>
```

**Dependencies**:

- `lucide-react` icons: `Shield`, `Scale`, `Landmark`, `Briefcase`
- SWR for data fetching
- Existing Aicher design system classes

---

#### Step 2: Create State Judiciary Component (2-3 hours)

**File**: `src/features/state-government/components/StateJudiciaryTab.tsx`

**Features**:

- Fetch judiciary from `/api/state-judiciary/[state]`
- Display Supreme Court composition
- Justice profiles with:
  - Photo
  - Name and title (Justice/Chief Justice)
  - Appointed by / Election method
  - Term dates
  - Education background
  - Previous positions
  - Wikipedia link
- Court system information:
  - Selection method (appointment, election, merit)
  - Term length
  - Number of seats
  - Appellate courts (if data available)

**UI Pattern**: Similar to committee members but judicial-themed

**Component Structure**:

```tsx
<StateJudiciaryTab state="MI">
  <CourtSystemInfo court={supremeCourt} selectionMethod="election_nonpartisan" termLength={8} />
  <JusticesGrid>
    <JusticeCard justice={chiefJustice} isChief={true} />
    {justices.map(justice => (
      <JusticeCard />
    ))}
  </JusticesGrid>
</StateJudiciaryTab>
```

**Dependencies**:

- `lucide-react` icons: `Scale`, `Gavel`, `BookOpen`
- State judiciary types from `@/types/state-judiciary`
- SWR for data fetching

---

#### Step 3: Integrate into State Legislature Page (1 hour)

**File**: `src/app/(civic)/state-legislature/[state]/page.tsx`

**Changes**:

1. Import new components
2. Add two new tabs: "Executives", "Judiciary"
3. Update tab state management
4. Add routing/deep linking support

**Updated Tab Structure**:

```tsx
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'upper', label: 'Senate' },
  { id: 'lower', label: 'House' },
  { id: 'executives', label: 'Executives' }, // NEW
  { id: 'judiciary', label: 'Judiciary' }, // NEW
  { id: 'bills', label: 'Recent Bills' },
];
```

**Conditional Rendering**:

```tsx
{
  activeTab === 'executives' && <StateExecutivesTab state={state} />;
}
{
  activeTab === 'judiciary' && <StateJudiciaryTab state={state} />;
}
```

---

#### Step 4: Add Navigation Links (30 minutes)

**Update these pages**:

1. **Landing Page** (`src/app/page.tsx`):
   - Add mention of state executives/judiciary in features section

2. **States Index** (`src/app/(civic)/states/page.tsx`):
   - Update card text to mention "Legislature, Executives, Judiciary"

3. **State Detail** (`src/app/(civic)/states/[state]/page.tsx`):
   - Add links to state legislature page with tab preselection:
     - `/state-legislature/MI?tab=executives`
     - `/state-legislature/MI?tab=judiciary`

---

#### Step 5: Testing & Validation (30 minutes)

**Manual Testing**:

- [ ] Navigate to `/state-legislature/MI`
- [ ] Click "Executives" tab
- [ ] Verify governor and officials displayed
- [ ] Click "Judiciary" tab
- [ ] Verify Supreme Court justices displayed
- [ ] Check responsive design (mobile/tablet)
- [ ] Verify all links work
- [ ] Test with multiple states (MI, CA, TX, NY)

**Automated Testing**:

```bash
npm run type-check  # TypeScript validation
npm run lint        # ESLint checks
npm run build       # Production build
```

---

### File Structure

```
src/
├── features/
│   └── state-government/
│       └── components/
│           ├── StateExecutivesTab.tsx          # NEW (200-250 lines)
│           ├── StateJudiciaryTab.tsx           # NEW (180-220 lines)
│           ├── ExecutiveProfileCard.tsx        # NEW (80-100 lines)
│           └── JusticeCard.tsx                 # NEW (70-90 lines)
├── app/
│   └── (civic)/
│       └── state-legislature/
│           └── [state]/
│               └── page.tsx                    # MODIFIED (add tabs)
└── types/
    ├── state-judiciary.ts                      # EXISTS ✅
    └── state-executives.ts                     # CREATE (if needed)
```

**Total New Lines**: ~600-700 lines of code

---

## 🔍 Feature 2: Unified State Bill Search

### Overview

Create a unified search page for state bills across all 50 states, with advanced filtering and subject browsing.

### Backend Status: ⚠️ NEEDS ENHANCEMENT

- **Existing**: `GET /api/state-bills/[state]` (per-state search works)
- **Missing**: Unified cross-state search endpoint
- **Solution**: Create client-side state selector OR new backend endpoint

### Route Strategy

**Primary Page**: `/state-bills` (no [state] parameter)

**URL Structure**:

```
/state-bills                      # Landing page with state selector
/state-bills?state=MI             # Show Michigan bills
/state-bills?state=MI&subject=Education  # With filter
/state-bills?state=MI&search=climate    # With search
```

---

### Implementation Steps

#### Step 1: Create Unified Bill Search Page (4-5 hours)

**File**: `src/app/(civic)/state-bills/page.tsx`

**Features**:

- State selector dropdown (all 50 states)
- Once state selected, fetch bills from `/api/state-bills/[state]`
- Search bar (bill number, title, sponsor)
- Filter controls:
  - Chamber (Senate/House/Both)
  - Status (Introduced, In Committee, Passed, Signed, Vetoed, Failed)
  - Subject/Topic
  - Date range (optional)
- Results display with:
  - Bill number and title
  - Sponsor name
  - Latest action
  - Status badge
  - Link to detail page
- Pagination (20 bills per page)
- Sort options (date, title, status)

**Component Structure**:

```tsx
<StateBillSearchPage>
  <SearchHeader>
    <StateSelector /> // Dropdown for all states
    <SearchBar /> // Text search
  </SearchHeader>

  <FilterPanel>
    <ChamberFilter />
    <StatusFilter />
    <SubjectFilter />
  </FilterPanel>

  <BillResultsGrid>
    {bills.map(bill => (
      <BillCard bill={bill} state={selectedState} />
    ))}
  </BillResultsGrid>

  <Pagination />
</StateBillSearchPage>
```

---

#### Step 2: Create State Selector Component (1 hour)

**File**: `src/components/shared/StateSelector.tsx`

**Features**:

- Dropdown with all 50 states + DC
- Search/filter within dropdown
- State abbreviation and full name
- Current selection display
- Optional: Recently viewed states

**Usage**:

```tsx
<StateSelector value={selectedState} onChange={handleStateChange} placeholder="Select a state" />
```

---

#### Step 3: Enhanced Bill Search Filters (2-3 hours)

**File**: `src/features/state-legislation/components/BillSearchFilters.tsx`

**Features**:

- Multi-select subjects/topics
- Status checkboxes
- Chamber radio buttons
- Date range picker (optional)
- Active filter badges
- "Clear all filters" button
- Filter count indicator

**Integration**:

- Use URL query params for all filters
- Persist filters in URL for shareable links
- Save filter preferences to localStorage (optional)

---

#### Step 4: Bill Results Display (1-2 hours)

**File**: `src/features/state-legislation/components/BillSearchResults.tsx`

**Features**:

- Grid/list view toggle
- Sort dropdown (relevance, date, title)
- Bill cards with:
  - Bill identifier (HB 1234, SB 567)
  - Title
  - Sponsor with link
  - Latest action
  - Status badge (color-coded)
  - Link to detail page
- Empty state when no results
- Loading skeleton
- Error state

---

#### Step 5: Integration & Navigation (30 minutes)

**Add links from**:

1. Landing page - "Search State Bills"
2. State legislature page - "Search Bills" in header
3. State detail pages - "Browse [State] Bills"
4. Navigation menu - "State Bills" under "Legislation"

---

### File Structure

```
src/
├── app/
│   └── (civic)/
│       └── state-bills/
│           ├── page.tsx                        # NEW (unified search)
│           ├── [state]/
│           │   ├── page.tsx                    # EXISTS (per-state list)
│           │   └── [billId]/
│           │       └── page.tsx                # EXISTS ✅ (detail page)
│           └── loading.tsx                     # NEW
├── features/
│   └── state-legislation/
│       └── components/
│           ├── BillSearchFilters.tsx           # NEW (150-180 lines)
│           ├── BillSearchResults.tsx           # NEW (200-250 lines)
│           └── BillCard.tsx                    # NEW (100-120 lines)
└── components/
    └── shared/
        └── StateSelector.tsx                   # NEW (120-150 lines)
```

**Total New Lines**: ~700-850 lines of code

---

## 🏛️ Feature 3: State Committee Detail Pages

### Overview

Create dedicated pages for state legislative committees showing membership, leadership, jurisdiction, and related bills.

### Backend Status: ⚠️ DATA LIMITED

- **Data Source**: OpenStates v3 API (via existing legislators endpoint)
- **Coverage**: ~30% of committee assignments per CLAUDE.md
- **Limitation**: No dedicated committee endpoint
- **Solution**: Extract committee data from legislator profiles OR create aggregation endpoint

### Route Strategy

**Primary Route**: `/state-committee/[state]/[committeeId]`

**Example**:

```
/state-committee/MI/ocd-organization-abc123    # Committee detail
/state-legislature/MI?tab=committees           # Committee list (optional)
```

---

### Implementation Steps

#### Step 1: Create Committee List View (2-3 hours)

**Option A**: Add "Committees" tab to state legislature page
**Option B**: Create separate `/state-committees/[state]` page

**Recommended**: Option A for consistency

**File**: `src/features/state-legislature/components/StateCommitteesTab.tsx`

**Features**:

- List all committees for the state
- Group by chamber (Senate/House/Joint)
- Show for each committee:
  - Committee name
  - Chair name (if available)
  - Number of members
  - Link to detail page
- Search/filter committees
- Sort by name/chamber

**Data Strategy**:

- Aggregate committee data from all legislators
- Cache committee list client-side
- OR create backend endpoint: `/api/state-legislature/[state]/committees`

---

#### Step 2: Create Committee Detail Page (4-5 hours)

**File**: `src/app/(civic)/state-committee/[state]/[committeeId]/page.tsx`

**Features**:

- Committee header:
  - Committee name
  - Chamber
  - State
  - Jurisdiction/focus areas
- Leadership section:
  - Chair profile card
  - Vice Chair (if any)
  - Ranking Member (if any)
- Members roster:
  - All committee members
  - Party breakdown
  - Links to legislator profiles
  - Role indicators (Chair, Vice Chair, Member)
- Related bills (if data available):
  - Bills referred to this committee
  - Bills reported out
  - Bills marked for hearing
- Committee info:
  - Meeting schedule (if available)
  - Contact information
  - Website link

**Component Structure**:

```tsx
<StateCommitteeDetailPage>
  <CommitteeHeader committee={committee} />

  <div className="grid lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2">
      <LeadershipSection leaders={leaders} />
      <MembersRoster members={members} />
      <RelatedBills bills={committeeBills} />
    </div>

    <div>
      <CommitteeInfoSidebar info={committeeInfo} state={state} />
    </div>
  </div>
</StateCommitteeDetailPage>
```

---

#### Step 3: Backend Committee Aggregation (2-3 hours)

**Create Backend Endpoint** (optional but recommended):

**File**: `src/app/api/state-legislature/[state]/committees/route.ts`

**Features**:

- Fetch all legislators for the state
- Extract and aggregate committee data
- Deduplicate committees
- Add member counts
- Cache for 24 hours
- Return structured committee list

**Response Format**:

```typescript
{
  success: true,
  committees: [
    {
      id: "unique-committee-id",
      name: "Education Committee",
      chamber: "upper",
      members: [
        { legislatorId, name, role: "chair" },
        { legislatorId, name, role: "member" }
      ],
      memberCount: 15,
      chair: { name, legislatorId },
      jurisdiction: ["K-12 education", "Higher education"]
    }
  ],
  total: 42,
  coverage: "30%"  // Based on OpenStates data completeness
}
```

---

#### Step 4: Link Committees from Legislator Profiles (1 hour)

**File**: `src/features/state-legislature/components/SimpleStateLegislatorProfile.tsx`

**Changes**:

- Make committee names clickable
- Link to: `/state-committee/[state]/[committeeId]`
- Generate committee ID from name (or use real ID if available)
- Add hover tooltip: "View committee details"

**Before**:

```tsx
<span className="text-xs">Education Committee</span>
```

**After**:

```tsx
<Link
  href={`/state-committee/${state}/${committeeId}`}
  className="text-xs text-blue-600 hover:underline"
>
  Education Committee
</Link>
```

---

#### Step 5: Testing & Coverage Warning (1 hour)

**Data Limitations**:

- Display coverage warning on committee pages
- Show "Data may be incomplete" notice
- Link to OpenStates for full information
- Highlight well-covered states (if tracking available)

**Testing**:

- Test with states with good committee data (e.g., Michigan, California)
- Test graceful handling when committee data missing
- Verify all links work bidirectionally (legislator ↔ committee)

---

### File Structure

```
src/
├── app/
│   ├── (civic)/
│   │   └── state-committee/
│   │       └── [state]/
│   │           └── [committeeId]/
│   │               ├── page.tsx               # NEW (300-350 lines)
│   │               └── loading.tsx            # NEW
│   └── api/
│       └── state-legislature/
│           └── [state]/
│               └── committees/
│                   └── route.ts               # NEW (optional, 150-200 lines)
├── features/
│   └── state-legislature/
│       └── components/
│           ├── StateCommitteesTab.tsx          # NEW (180-220 lines)
│           ├── CommitteeCard.tsx               # NEW (80-100 lines)
│           ├── CommitteeMembersRoster.tsx      # NEW (120-150 lines)
│           └── SimpleStateLegislatorProfile.tsx # MODIFIED
└── types/
    └── state-committee.ts                      # NEW (60-80 lines)
```

**Total New Lines**: ~900-1100 lines of code

---

## 📅 Implementation Timeline

### Phase 1: State Executives & Judiciary (Week 1)

**Days 1-2** (6-8 hours):

- [x] Day 1 Morning: Create `StateExecutivesTab.tsx` component
- [x] Day 1 Afternoon: Create `StateJudiciaryTab.tsx` component
- [x] Day 2 Morning: Integrate tabs into state legislature page
- [x] Day 2 Afternoon: Add navigation links, test, and validate

**Deliverable**: Working executives and judiciary tabs on state legislature pages

---

### Phase 2: Unified State Bill Search (Week 2)

**Days 3-5** (8-10 hours):

- [x] Day 3 Morning: Create unified search page structure
- [x] Day 3 Afternoon: Build `StateSelector` component
- [x] Day 4 Morning: Implement `BillSearchFilters` component
- [x] Day 4 Afternoon: Build `BillSearchResults` component
- [x] Day 5 Morning: Integration and navigation
- [x] Day 5 Afternoon: Testing and refinement

**Deliverable**: Working state bill search page with filtering

---

### Phase 3: State Committee Pages (Week 3)

**Days 6-8** (10-12 hours):

- [x] Day 6 Morning: Create committee list tab/page
- [x] Day 6 Afternoon: Build committee detail page structure
- [x] Day 7 Morning: Implement committee aggregation (backend)
- [x] Day 7 Afternoon: Build member roster and leadership sections
- [x] Day 8 Morning: Link committees from legislator profiles
- [x] Day 8 Afternoon: Testing, coverage warnings, validation

**Deliverable**: Working committee detail pages with member rosters

---

## 🎨 UI/UX Guidelines

### Design Consistency

- **Use Aicher Geometric Design System** (established in CLAUDE.md)
- Bold borders (`border-2 border-black`)
- Color scheme: CIV.IQ red (#e11d07), green (#0a9338), blue (#3ea2d4)
- Geometric shapes and minimalist layouts
- High contrast for accessibility

### Component Patterns

All new components should follow existing patterns:

1. **Profile Cards**: Similar to legislator cards
   - Photo (if available)
   - Name and title
   - Party/role badge
   - Contact info
   - Action buttons

2. **Tab Navigation**: Consistent with state legislature page
   - Bold active state
   - Clear labels
   - Mobile-responsive

3. **Search/Filter UI**: Match federal search patterns
   - Search bar with icon
   - Filter chips/badges
   - Clear all button
   - Results count

4. **Loading States**: Skeleton screens
   - Animated pulse
   - Maintain layout structure
   - Show early partial content

5. **Error States**: User-friendly messages
   - Clear explanation
   - Actionable next steps
   - Link to alternative pages

---

## 🔧 Technical Considerations

### Performance

- **Data Fetching**: Use SWR for caching and revalidation
- **Cache TTLs**: 24 hours for state data (matches backend)
- **Pagination**: Limit results to 20-50 items per page
- **Lazy Loading**: Load images and non-critical data on-demand

### Type Safety

- **Strict TypeScript**: No `any` types
- **Type Guards**: Validate API responses
- **Null Safety**: Use optional chaining (`?.`)
- **Type Exports**: Export all interfaces for reuse

### Error Handling

- **Graceful Degradation**: Show partial data when available
- **User-Friendly Errors**: Avoid technical jargon
- **Retry Logic**: Implement automatic retry for transient failures
- **Fallback UI**: Show alternative content when data unavailable

### Testing Strategy

```bash
# Before committing each feature:
npm run type-check   # TypeScript validation
npm run lint         # ESLint checks
npm run build        # Production build test

# Manual testing checklist:
# - Desktop (Chrome, Firefox, Safari)
# - Mobile (responsive design)
# - Multiple states (MI, CA, TX, NY, etc.)
# - Edge cases (missing data, long names, no results)
```

---

## 📊 Success Metrics

### Feature Adoption

- [ ] State executives page: 100+ views in first week
- [ ] State judiciary page: 50+ views in first week
- [ ] Unified bill search: 200+ searches in first week
- [ ] Committee pages: 50+ views in first week

### Technical Quality

- [ ] Zero TypeScript compilation errors
- [ ] Zero ESLint errors in new code
- [ ] Production build succeeds
- [ ] All pages load in < 3 seconds (LCP)
- [ ] Mobile responsive score: 90+ (Lighthouse)

### User Experience

- [ ] Navigation intuitive (user testing feedback)
- [ ] Search results relevant (user feedback)
- [ ] No broken links
- [ ] Accessible (WCAG 2.1 AA compliant)

---

## 🚨 Risks & Mitigation

### Risk 1: OpenStates Committee Data Limited (~30% coverage)

**Impact**: Committee pages may be sparse for some states
**Mitigation**:

- Display clear "data coverage" warning
- Show "Data may be incomplete" notice
- Link to OpenStates for full information
- Prioritize states with good data coverage in testing

### Risk 2: Wikidata API Rate Limiting

**Impact**: State executives/judiciary pages may be slow or fail
**Mitigation**:

- Backend already has 24-hour caching
- Monitor API usage
- Implement exponential backoff
- Add fallback to cached/stale data

### Risk 3: No Unified Bill Search Endpoint

**Impact**: Client-side state selection adds complexity
**Mitigation**:

- Use URL query params for state selection
- Pre-load bill data for selected state
- Consider creating backend aggregation endpoint in future

### Risk 4: Mobile Performance on Large Lists

**Impact**: Committee rosters, bill lists may be slow on mobile
**Mitigation**:

- Implement pagination (20 items per page)
- Use virtual scrolling for long lists
- Lazy load images
- Progressive enhancement

---

## 📚 Documentation Updates

After implementation, update these docs:

1. **CLAUDE.md**:
   - Add state executives/judiciary to feature list
   - Update "Production Ready" section
   - Add committee coverage notes

2. **README.md**:
   - Update feature list
   - Add screenshots of new pages
   - Update tech stack (if new dependencies)

3. **API_REFERENCE.md**:
   - Document any new endpoints
   - Update response schemas

4. **PHASE_TRACKER.md**:
   - Mark phases as complete
   - Add completion dates
   - Track feature adoption

---

## 🎯 Next Steps

### Immediate (This Week)

1. Review this plan with stakeholders
2. Create GitHub issues for each feature
3. Set up development branch: `feature/state-executives-judiciary`
4. Begin Phase 1 implementation

### Short-term (2-3 Weeks)

1. Complete all three features
2. Deploy to staging environment
3. Conduct user testing
4. Iterate based on feedback

### Long-term (1-2 Months)

1. Monitor feature adoption and usage
2. Gather user feedback
3. Iterate on UI/UX improvements
4. Consider additional state-level features:
   - Local government pages
   - Federal-to-state navigation
   - State bill comparison tools
   - Analytics/visualizations

---

## 📞 Questions & Decisions Needed

### Design Decisions

- [ ] Should committee pages be separate route or integrated into state legislature page?
- [ ] Should unified bill search have its own navigation menu item?
- [ ] Should we prioritize states with better data coverage?

### Technical Decisions

- [ ] Should we create a backend committee aggregation endpoint?
- [ ] Should we implement URL-based deep linking for all filters?
- [ ] Should we add analytics tracking for feature usage?

### Product Decisions

- [ ] Should we show data coverage warnings prominently?
- [ ] Should we link to external sources (OpenStates, Ballotpedia) for more info?
- [ ] Should we implement "favorite committees" or "watch lists"?

---

## ✅ Definition of Done

Each feature is complete when:

- [ ] All TypeScript compilation passes (zero errors)
- [ ] All ESLint checks pass (zero errors in new code)
- [ ] Production build succeeds
- [ ] Manual testing completed (desktop + mobile)
- [ ] Navigation links added from relevant pages
- [ ] Documentation updated (CLAUDE.md, README.md)
- [ ] Screenshots/demos captured
- [ ] Code reviewed (if team collaboration)
- [ ] Deployed to staging environment
- [ ] User testing feedback incorporated

---

## 📝 Appendix

### A. State Abbreviations Reference

```typescript
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  // ... all 50 states + DC
];
```

### B. Party Color Scheme

```css
.party-democratic {
  background: #3ea2d4;
} /* Blue */
.party-republican {
  background: #e11d07;
} /* Red */
.party-independent {
  background: #9333ea;
} /* Purple */
.party-other {
  background: #6b7280;
} /* Gray */
```

### C. Icon Mapping

```typescript
const ICONS = {
  executives: Shield, // State Executives
  judiciary: Scale, // State Judiciary
  legislature: Users, // State Legislature
  bills: FileText, // State Bills
  committees: Award, // Committees
};
```

### D. API Response Time Targets

- State Executives: < 500ms (cached), < 2s (uncached)
- State Judiciary: < 500ms (cached), < 2s (uncached)
- State Bills: < 300ms (cached), < 1s (uncached)
- State Committees: < 400ms (cached), < 1.5s (uncached)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Next Review**: After Phase 1 completion
