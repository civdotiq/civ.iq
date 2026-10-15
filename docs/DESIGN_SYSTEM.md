# Design system

CIV.IQ follows the Ulm School approach of Otl Aicher: form follows the citizen's task, a strict grid, and no decoration that doesn't do a job.

**The source of truth is [`.claude/rules/design-system.md`](../.claude/rules/design-system.md).** That file covers color roles, border weights, corners and depth, loading states, typography, wayfinding, and banned patterns. It is short and kept current. This page only summarizes it, and the rules file wins wherever the two disagree.

## The rules people most often get wrong

- **Party colors are for party identification only.** Republican is red `#e11d07` and Democrat is blue `#2563eb`. Never use either for system states.
- **Interactive blue `#3ea2d4`** is for links, active tabs, focus rings and CTAs. Never use it to identify a party.
- **System states** (success, error, warning, info) use interactive blue, amber `#d97706`, gray and black.
- **Green `#0a9338` is retired.** It stopped being the Democrat color in 2026-06, and it is not a success color. Avoid it in new UI.
- **Border weights carry meaning:** 1px for dividers, 2px for containers and controls, 3px for emphasis and selected states.
- **Corners:** 0px on layout containers. 2–4px is allowed on interactive elements.
- **Shadows:** for elevation only (modals, dropdowns, tooltips).
- **Type:** Braun Linear on an 8px grid. Use uppercase only for labels of three words or fewer.

## Where it lives in code

| What                                              | File                                                  |
| ------------------------------------------------- | ----------------------------------------------------- |
| Party color classes                               | `src/lib/party-colors.ts`                             |
| Chart colors (`getPartyColor`, `SEMANTIC_COLORS`) | `src/lib/constants/chart-colors.ts`                   |
| Aicher CSS tokens and utilities                   | `src/styles/aicher-system.css`, `src/app/globals.css` |

Always use these helpers. Never write a party hex value inline.

This page used to hold a longer token reference that drifted from the code (it still listed green as the success and Senate color). That version is in git history.
