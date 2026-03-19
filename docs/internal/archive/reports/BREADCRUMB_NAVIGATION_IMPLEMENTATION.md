# Breadcrumb Navigation Implementation

## Summary

Implemented breadcrumb navigation system for profile pages that allows users to navigate back through their journey instead of jumping directly to the home page.

## Navigation Flow

### Before

- Home → Search → Results → Profile → **"Back to Search" → Home** ❌

### After

- Home → Search → Results → Profile → **Breadcrumbs:**
  - **Search** → Home
  - **Your Representatives** → Results page with preserved search
  - **[Name]** → Current page

## Files Created

### 1. `src/components/shared/navigation/Breadcrumbs.tsx`

Basic breadcrumb component with:

- Hierarchical navigation display
- Clickable links with hover states
- ChevronRight separators
- Accessible aria-label

### 2. `src/components/shared/navigation/BreadcrumbsWithContext.tsx`

Enhanced breadcrumb component with search context preservation:

- Stores last search query in sessionStorage
- Automatically appends search params to "Your Representatives" link
- Works with ZIP codes, addresses, and general queries
- Includes `saveSearchContext()` helper function

## Files Modified

### Profile Pages

1. **State Legislator Profile** (`src/app/(civic)/state-legislature/[state]/legislator/[id]/page.tsx`)
   - Added breadcrumb navigation
   - Links back to results page with preserved search

2. **Federal Representative Profile** (`src/app/(civic)/representative/[bioguideId]/page.tsx`)
   - Added breadcrumb navigation
   - Links back to results page with preserved search

### Results Page

3. **Results Page** (`src/app/(public)/results/page.tsx`)
   - Added `saveSearchContext()` calls after successful data fetch
   - Preserves search parameters (zip, address, q) in sessionStorage
   - Works with all data fetch paths (single district, multi-district, geocode)

## How It Works

### Search Context Preservation

1. **User searches** on home page with address "20185 Briarcliff Road, Detroit, MI 48221"
2. **Results page loads** at `/results?q=20185+Briarcliff+Road%2C+Detroit%2C+MI+48221`
3. **saveSearchContext()** stores `?q=20185+Briarcliff+Road%2C+Detroit%2C+MI+48221` in sessionStorage
4. **User clicks** on "Mallory McMorrow"
5. **Profile page shows** breadcrumbs:
   ```
   Search > Your Representatives > Mallory McMorrow
   ```
6. **Clicking "Your Representatives"** navigates to `/results?q=20185+Briarcliff+Road%2C+Detroit%2C+MI+48221`
7. **User sees** their original search results with Federal/State tabs

### Benefits

✅ **No lost context** - Users return to their exact search results
✅ **Natural navigation** - Matches user mental model of their journey
✅ **Works with all search types** - ZIP codes, addresses, general queries
✅ **Session-based** - Context cleared when browser closed
✅ **Fallback graceful** - If no context, defaults to `/results` page

## Testing

To test the implementation:

1. Go to home page
2. Enter your address: "20185 Briarcliff Road, Detroit, MI 48221"
3. Click search
4. View your representatives (Federal tab shows by default)
5. Click "State Representatives" tab
6. Click on any state legislator
7. **Verify breadcrumbs show:** Search > Your Representatives > [Name]
8. Click "Your Representatives" breadcrumb
9. **Verify:** You return to the results page with both your Federal and State representatives visible

## Future Enhancements

Potential improvements:

- Store more context (selected tab, scroll position)
- Add district-level breadcrumbs for state legislature overview pages
- Support local government official breadcrumbs
- Add URL-based context as backup to sessionStorage
- Show address in breadcrumb instead of "Your Representatives"

## Technical Details

- **Storage**: sessionStorage (cleared on browser close)
- **Key**: `civiq_last_search`
- **Format**: Query string (e.g., `?q=address` or `?zip=48221`)
- **Fallback**: If no context, links to `/results` without params
- **TypeScript**: Fully typed with proper interfaces
- **Accessibility**: Proper aria-labels for screen readers

## Files Summary

- ✅ 2 new components created
- ✅ 3 pages updated
- ✅ 0 TypeScript errors
- ✅ 0 ESLint warnings
- ✅ All quality checks passed
