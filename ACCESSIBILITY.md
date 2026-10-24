# Accessibility

CIV.IQ should work for everyone, including people who use a screen reader, a keyboard instead of a mouse, browser zoom, or high-contrast settings.

This statement is also published at [civdotiq.org/accessibility](https://civdotiq.org/accessibility).

## Target

Our target is [WCAG 2.2](https://www.w3.org/TR/WCAG22/) Level AA. **The site does not meet that target yet.** The problems we know about are listed below. We will not claim conformance until a test shows it.

## How we tested

Last tested: **October 15, 2026.**

- **Automated scan.** axe-core 4.13.0, WCAG 2.0, 2.1 and 2.2 Level A and AA rules, in Chrome at 1280px wide, against the live site. Pages: the home page, a representative profile (`/representative/T000481`), a bill (`/bill/119-hr-1`), a district (`/districts/MI-12`), a state (`/states/mi`), `/developers`, and the results of a full-address lookup on the home page.
- **Keyboard and screen-reader tests.** The repository's Playwright suite, `tests/e2e/accessibility-validation.spec.ts`, run locally in Chrome. 7 of 23 tests passed. Most of the 16 failures come from the tests being out of date: they look for an older ZIP-code search form and selectors that no longer match. Two failures point to real problems, listed below (items 5 and 6).
- **Not yet done.** Automated tools catch only part of what matters. There has been no full manual audit and no testing with screen-reader users.

## Known issues

| #   | Problem                                                                                                                                                                                                                                                                                                                                                                                            | WCAG criterion                         | Where                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| 1   | **Low-contrast text.** The blue used for links, breadcrumbs, tabs and buttons (`#3ea2d4`) has a 2.86:1 contrast ratio on white; AA needs 4.5:1 for normal text. It accounts for 263 of the 593 failing elements. Other failures: light gray captions (`#9ca3af`, 2.53:1), white text on blue buttons, amber warning text, and party labels on tinted backgrounds (the Democratic label is 4.48:1). | 1.4.3 Contrast (Minimum), AA           | Every page tested, 23 to 244 elements per page                 |
| 2   | **Links inside text are shown by color alone.** Source links and "See methodology" links have no underline, and their color is too close to the surrounding text.                                                                                                                                                                                                                                  | 1.4.1 Use of Color, A                  | Home, representative profile, district, address lookup results |
| 3   | **ARIA attribute not allowed.** The search box in the site header sets `aria-expanded` without a combobox role, so screen readers may misreport it. A dropdown container on some pages has the same problem.                                                                                                                                                                                       | 4.1.2 Name, Role, Value, A             | Every page tested                                              |
| 4   | **Demographic bar labels are unreliable.** The race and ethnicity bars put `aria-label` on plain `div` elements, which screen readers may ignore.                                                                                                                                                                                                                                                  | 4.1.2 Name, Role, Value, A             | District pages                                                 |
| 5   | **Location status is not announced.** After "Use my location" is pressed, "Finding your location…" appears inside the button but is not in a live region, so screen readers may not read it.                                                                                                                                                                                                       | 4.1.3 Status Messages, AA              | Home page search                                               |
| 6   | **Spinner keeps moving when reduced motion is on.** The loading spinner ignores the reduced-motion setting. This is beyond our AA target and is listed for completeness.                                                                                                                                                                                                                           | 2.3.3 Animation from Interactions, AAA | Home page search                                               |

## Report a problem

If something on CIV.IQ stops you from using it, please tell us:

- [Open an accessibility issue](https://github.com/civdotiq/civ.iq/issues/new?template=accessibility.yml) on GitHub, or
- email contact@civdotiq.org if you do not use GitHub.

Please include the page address and, if you can, the browser and assistive technology you use.

## Updates

When an issue is fixed or a new test is run, this page and the date above are updated.
