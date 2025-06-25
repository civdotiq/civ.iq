# 🚨 ACTIVE CIV.IQ PROJECT - CIVIC INTEL HUB 🚨

You are working in: /mnt/d/civic-intel-hub

This is the ONLY active CIV.IQ project. Ignore any other folders with similar names.

## Project Identity
- **Folder**: civic-intel-hub
- **Location**: D:\ drive (/mnt/d/civic-intel-hub in WSL)
- **Version**: 2025 MVP Implementation
- **Status**: ACTIVE DEVELOPMENT

## Critical Rules
1. ONLY use approved APIs (Census, Congress, FEC, OpenStates, GDELT)
2. NEVER use Google Civic or ProPublica APIs
3. This is a fresh start - ignore patterns from other civiq folders

## If Confused About Location
Always run: pwd and confirm you see /mnt/d/civic-intel-hub

## Brand Colors
- Red: #e11d07 (logo circle)
- Green: #0b983c (logo rectangle)
- Blue: #3ea2d4 (accents)

## Phase 1 MVP Scope
- Federal representatives ONLY
- ZIP code lookup (no full address yet)
- Basic profile pages
- No state/local data in Phase 1

## Tech Stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js with Express
- Database: PostgreSQL + Redis caching
- Testing: Jest, React Testing Library, Playwright

## Key Features from Mockups
- Landing: 'Know Your Representatives' hero with ZIP input
- Representative cards with photo, party, contact info
- Profile pages with voting records, bills, campaign finance
- Data completeness indicator (e.g., 93% complete)
