---
name: civiq-design
description: Use this skill to generate well-branded interfaces and assets for CIV.IQ (civic intelligence platform — representatives, voting, campaign finance), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. The brand is Otl Aicher / Ulm School / 1972 Munich Olympics — strict 8px grid, Braun Linear type, three primaries (red/green/blue from the logo), uppercase labels, 2px black borders, square corners, pictogram icons, no gradients/shadows/emoji.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

Key entry points:

- `README.md` — full content + visual foundations + iconography rules
- `colors_and_type.css` — drop-in CSS vars (`--civiq-blue`, `--grid`, `--type-*`, `--tracking-*`) and `@font-face` for Braun Linear
- `fonts/` — Braun Linear .woff2 (5 weights)
- `assets/icons.jsx` — the full 27-icon Aicher pictogram set as React components (`window.RepresentativeIcon`, etc.)
- `assets/civiq-logo-hero.webp` + `assets/civiq-logo.png` — brand mark
- `ui_kits/web/` — landing, representative profile, bill detail, search — pixel-faithful recreations of civdotiq.org
- `preview/` — design-system cards (cards, buttons, type, color swatches)

**Non-negotiables when designing for CIV.IQ:**

- 8px grid for every spacing value.
- 2px solid black borders on every card/container. Square corners. No rounded cards.
- Labels + nav + CTAs are UPPERCASE with letter-spacing 0.08em.
- No gradients. No drop-shadows on cards (shadows only for modals/tooltips). No emoji. No stock icons — use `assets/icons.jsx`.
- Red = Republican. Green = Democrat. **Blue is the product's action/success color** (blue, not green). **Amber is error** (amber, not red).
- Copy is 8th-grade, factual, uppercase-label-forward, never exclaims. Every analytic insight carries confidence + methodology + a correlation-not-causation disclaimer.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. Include `colors_and_type.css` and reference `fonts/` + `assets/` with relative paths. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts or production code, depending on the need.
