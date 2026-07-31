/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Profile section nav
 *
 * Regression cover for a reported bug: clicking Campaign finance, Bills,
 * Lobbying & influence or News on a representative profile snapped the active
 * tab back to Voting record, so those sections were unreachable by nav.
 *
 * Two causes, both fixed:
 *   1. #overview wrapped every other section, so the scroll-spy saw it
 *      intersecting at all times and it outranked its own children.
 *   2. The observer reacted to sections crossed *during* the click scroll,
 *      overwriting the section the user actually asked for.
 */

import { test, expect } from '@playwright/test';

// Hakeem Jeffries — the profile in the original bug report.
const PROFILE = '/representative/J000294';

const SECTIONS = [
  { label: 'Campaign finance', id: 'money' },
  { label: 'Bills', id: 'bills' },
  { label: 'Lobbying & influence', id: 'influence' },
  { label: 'News', id: 'news' },
];

test.describe('representative profile section nav', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PROFILE);
    await expect(page.getByRole('navigation', { name: 'Page sections' })).toBeVisible();
  });

  test('every section has a matching anchor in the document', async ({ page }) => {
    for (const section of [{ label: 'Overview', id: 'overview' }, ...SECTIONS]) {
      await expect(page.locator(`#${section.id}`)).toHaveCount(1);
    }
  });

  test('#overview does not contain the other section anchors', async ({ page }) => {
    // The original defect. If overview is an ancestor it always intersects,
    // and no other section can ever win the scroll-spy comparison.
    for (const section of SECTIONS) {
      const nested = await page.locator(`#overview #${section.id}`).count();
      expect(nested, `#${section.id} must not be nested inside #overview`).toBe(0);
    }
  });

  for (const section of SECTIONS) {
    test(`clicking "${section.label}" keeps it active and scrolls to it`, async ({ page }) => {
      const link = page.getByRole('link', { name: section.label, exact: true });
      await link.click();

      // Let the smooth scroll finish and the observer settle.
      await page.waitForTimeout(1800);

      await expect(link).toHaveAttribute('aria-current', 'true');

      // And the section is actually in view, not just highlighted.
      await expect(page.locator(`#${section.id}`)).toBeInViewport();
    });
  }
});
