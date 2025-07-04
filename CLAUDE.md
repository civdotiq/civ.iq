# 🚨 ACTIVE CIV.IQ PROJECT - CIVIC INTEL HUB 🚨

You are working in: /mnt/d/civic-intel-hub

This is the ONLY active CIV.IQ project. Ignore any other folders with similar names.

## Project Identity
- **Folder**: civic-intel-hub
- **Location**: D:\ drive (/mnt/d/civic-intel-hub in WSL)
- **Version**: 2025 Production-Ready PWA (Phase 5 Complete)
- **Status**: PRODUCTION READY

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
- `src/app/representative/[bioguideId]/page.tsx` - Profile pages
- `src/lib/api/` - API client functions
- `src/types/` - TypeScript definitions

### API Endpoints
```
GET /api/representatives?zip=48221
GET /api/representative/[bioguideId]
GET /api/representative/[bioguideId]/votes
GET /api/representative/[bioguideId]/bills
GET /api/representative/[bioguideId]/finance
```

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run linter
npm test         # Run tests
```

### Critical Rules
1. ONLY use approved APIs (Census, Congress, FEC, OpenStates, GDELT)
2. NEVER use Google Civic or ProPublica APIs
3. Keep the clean, minimalist design
4. TypeScript for all new code
5. Cache API responses

### Current Phase: MVP (Phase 1)
- ✅ Federal representatives only
- ✅ ZIP code lookup
- ✅ Basic profiles
- ⏳ Voting records
- ⏳ Campaign finance
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
