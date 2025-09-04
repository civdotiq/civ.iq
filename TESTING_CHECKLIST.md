# Batch API Refactor Testing Checklist

## Pre-Test Setup
- [ ] Run `npm run dev` 
- [ ] Open browser DevTools Network tab
- [ ] Clear browser cache

## Test Cases

### 1. Representative Profile Page Load
**URL**: `/representative/[bioguideId]` (e.g., `/representative/T000488`)

**Expected Behavior**:
- [ ] Only ONE batch API call to `/api/representative/T000488/batch`
- [ ] NO individual calls to `/bills`, `/finance`, `/committees`, or `/votes`
- [ ] All tabs display data correctly
- [ ] Page loads in under 3 seconds

**Network Tab Should Show**:
- ✅ `POST /api/representative/T000488/batch`
- ❌ `GET /api/representative/T000488/bills` (should NOT appear)
- ❌ `GET /api/representative/T000488/finance` (should NOT appear)
- ❌ `GET /api/representative/T000488/committees` (should NOT appear)
- ❌ `GET /api/representative/T000488/voting-record` (should NOT appear)

### 2. Tab Switching Test
**Actions**:
1. Click on "Voting" tab
2. Click on "Legislation" tab  
3. Click on "Finance" tab

**Expected Behavior**:
- [ ] NO additional API calls when switching tabs
- [ ] Data loads instantly from cache
- [ ] No loading spinners after initial load

### 3. Error Handling Test
**Test Representatives Without Data**:
- Test with a representative that has no FEC mapping (like T000488)
- Test with a new representative with limited data

**Expected Behavior**:
- [ ] Finance tab shows empty state (not error)
- [ ] Other tabs still load successfully
- [ ] No console errors
- [ ] Page remains functional

### 4. Performance Metrics
**Measure**:
- [ ] Initial page load time: _____ seconds
- [ ] Batch API response time: _____ seconds
- [ ] Total API calls made: _____ (should be 1)
- [ ] Tab switch time: _____ ms (should be instant)

## Console Checks
Run these in browser console:

```javascript
// Check if old hooks are being called
window.performance.getEntriesByType('resource').filter(r => 
  r.name.includes('/api/representative/') && 
  (r.name.includes('/bills') || r.name.includes('/finance') || 
   r.name.includes('/committees') || r.name.includes('/voting-record'))
)
// Should return empty array []

// Check batch API calls
window.performance.getEntriesByType('resource').filter(r => 
  r.name.includes('/batch')
)
// Should show 1 or more batch calls
```

## Regression Tests
- [ ] Search functionality still works
- [ ] ZIP code lookup still works
- [ ] Representative photos load
- [ ] Committee pages load
- [ ] District pages load

## Edge Cases
- [ ] Multiple representatives (ZIP with multiple districts)
- [ ] Senators vs Representatives
- [ ] Recently elected officials
- [ ] Historical data access

## Sign-off
- [ ] All tests passed
- [ ] No console errors
- [ ] Performance improved
- [ ] Ready for code review
