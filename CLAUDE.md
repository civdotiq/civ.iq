# 🚨 ACTIVE CIV.IQ PROJECT - CIVIC INTEL HUB 🚨

You are working in: /mnt/d/civic-intel-hub

This is the ONLY active CIV.IQ project. Ignore any other folders with similar names.

## Project Identity
- **Folder**: civic-intel-hub
- **Location**: D:\ drive (/mnt/d/civic-intel-hub in WSL)
- **Version**: 2025 Advanced Civic Intelligence Platform (Phase 6 Complete)
- **Status**: PRODUCTION READY WITH ADVANCED FEATURES

## Quick Reference

### Brand Colors
```css
--civiq-red: #e11d07;    /* Logo circle, errors */
--civiq-green: #0a9338;  /* Logo rectangle, success */
--civiq-blue: #3ea2d4;   /* Links, accents */
```

### Key Files
- `src/app/page.tsx` - Landing page (clean design)
- `src/app/representatives/page.tsx` - Representatives list
- `src/app/representative/[bioguideId]/page.tsx` - Enhanced profile pages
- `src/lib/congress-legislators.ts` - Enhanced representative data service
- `src/lib/api/` - API client functions
- `src/types/representative.ts` - Enhanced TypeScript definitions
- `src/components/BillSummary.tsx` - AI-powered bill summaries

### API Endpoints
```
GET /api/representatives?zip=48221             # Enhanced with congress-legislators
GET /api/representative/[bioguideId]           # Enhanced profiles with social media
GET /api/representative/[bioguideId]/votes     # Real voting records
GET /api/representative/[bioguideId]/bills     # Real bills with categorization
GET /api/representative/[bioguideId]/finance   # Real FEC data
GET /api/representative/[bioguideId]/news      # GDELT news with deduplication
GET /api/representative/[bioguideId]/party-alignment # Real party voting analysis
POST /api/representative/[bioguideId]/batch    # Batch API for multiple endpoints
GET /api/districts/[districtId]                # Districts with real Census data
GET /api/district-map?zip=48221                # Interactive maps with GeoJSON
GET /api/search                                # Advanced representative search
GET /api/health                                # Service health monitoring
```

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run linter
npm test         # Run tests
```

### Critical Rules
1. ONLY use approved APIs (Congress-Legislators, Census, Congress, FEC, OpenStates, GDELT)
2. NEVER use Google Civic or ProPublica APIs
3. Keep the clean, minimalist design
4. TypeScript for all new code with null safety
5. Cache API responses with intelligent TTL
6. Always implement null-safe patterns (use optional chaining)

### Current Phase: Advanced Civic Intelligence (Phase 6 Complete)
- ✅ Federal representatives with enhanced congress-legislators data
- ✅ ZIP code lookup with real Census API
- ✅ Enhanced profiles with social media and biographical data
- ✅ Real voting records from Congress.gov
- ✅ Campaign finance with real FEC data
- ✅ GDELT news integration with AI deduplication
- ✅ AI-powered bill summarization
- ✅ **Real party line voting analysis with peer comparisons**
- ✅ **Interactive district maps with live GeoJSON boundaries**
- ✅ **Live Census ACS demographics for all districts**
- ✅ **Batch API system reducing round-trips by 80%**
- ✅ **Advanced search with comprehensive filtering**
- ✅ **Legislative partnerships and collaboration tracking**
- ✅ Comprehensive null-safe error handling
- ✅ Production-ready PWA features
- ❌ State/local (Phase 2+)

### Environment Variables
```env
CONGRESS_API_KEY=
FEC_API_KEY=
CENSUS_API_KEY=
```

### Design Principles
- Clean, minimalist interface
- Data clarity over decoration
- Fast, responsive performance
- Accessible to all users
- Mobile-first approach

### Git Workflow
1. Feature branch from `main`
2. Clear commit messages (feat/fix/docs)
3. Test before pushing
4. PR with description

## If Confused
- Check `README.md` for full documentation
- Run `pwd` to verify location
- Check `git status` for current branch
- Review mockups in project root

Remember: This is a civic utility, not a commercial product. Keep it clean, fast, and focused on serving citizens.
