# Committee Data Implementation Strategy

## Overview
We need to populate all House, Senate, and Joint committees for the 119th Congress with accurate member data.

## Implementation Plan

### Phase 1: Infrastructure (COMPLETED)
- ✅ Created committee data structure
- ✅ Set up directory organization
- ✅ Created template for committee data
- ✅ Implemented lazy-loading system
- ✅ Updated API to use new system

### Phase 2: Data Collection (IN PROGRESS)
We need to collect data for ~40+ committees. Here's the approach:

1. **Automated Data Collection**
   - Create web scraping scripts for committee websites
   - Use Congress.gov API where available
   - Extract from Wikipedia as a starting point

2. **Manual Verification**
   - Verify bioguide IDs for each member
   - Confirm current committee assignments
   - Update roles (Chair, Ranking Member, etc.)

3. **Priority Committees** (by importance/activity):
   - House: Judiciary, Ways & Means, Appropriations, Energy & Commerce
   - Senate: Judiciary, Finance, Appropriations, Foreign Relations

### Phase 3: Data Sources

#### Primary Sources (Most Accurate):
1. **Official Committee Websites**
   - house.gov/committees/[committee-name]
   - [committee].senate.gov
   - Direct member listings with photos

2. **Congress.gov API**
   - /member endpoint for member details
   - /committee endpoint (limited data)
   - Bioguide ID verification

3. **House/Senate Clerk Sites**
   - clerk.house.gov
   - senate.gov/legislative

#### Secondary Sources:
1. **Wikipedia** - Good for initial structure
2. **GovTrack.us** - Committee membership data
3. **Congressional directory** - Official printed directory

### Phase 4: Implementation Steps

For each committee:

1. **Create committee file**: `/lib/data/committees/[chamber]/[name].ts`
2. **Populate member data**:
   ```typescript
   const houseJudiciaryCommittee: Committee = {
     id: 'HSJU',
     name: 'House Committee on the Judiciary',
     // ... full member list
   };
   ```

3. **Update index.ts** to include new committee
4. **Test** the committee page loads correctly

### Phase 5: Automation Tools Needed

1. **Bioguide ID Lookup Tool**
   - Input: Member name
   - Output: Bioguide ID, state, district, party

2. **Committee Website Scraper**
   - Extract member lists from official sites
   - Parse subcommittee assignments

3. **Data Validator**
   - Check for missing bioguide IDs
   - Verify member counts match official records
   - Flag potential errors

## Next Steps

1. **Immediate**: Implement 5 most important committees
2. **This Week**: Complete all House standing committees
3. **Next Week**: Complete all Senate committees
4. **Future**: Add joint committees and update system

## Committee Data Format Example

```typescript
export const houseJudiciaryCommittee: Committee = {
  id: 'HSJU',
  thomas_id: 'HSJU',
  name: 'House Committee on the Judiciary',
  chamber: 'House',
  type: 'Standing',
  jurisdiction: 'The judiciary and judicial proceedings...',
  
  leadership: {
    chair: createCommitteeMember(jimJordan, 'Chair', 1),
    rankingMember: createCommitteeMember(jerryNadler, 'Ranking Member', 2),
  },
  
  members: [
    // All 40+ members with correct bioguide IDs
  ],
  
  subcommittees: [
    // 5 subcommittees with their members
  ],
  
  url: 'https://judiciary.house.gov',
  phone: '(202) 225-3951',
  address: '2138 Rayburn House Office Building',
  established: '1813-06-01',
  lastUpdated: new Date().toISOString(),
};
```

## Resources

- Bioguide Search: https://bioguide.congress.gov/search
- House Committees: https://www.house.gov/committees
- Senate Committees: https://www.senate.gov/committees
- Wikipedia 119th Congress: https://en.wikipedia.org/wiki/119th_United_States_Congress
