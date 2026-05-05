/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { test, expect } from '@playwright/test';

// Infrastructure Investment and Jobs Act — a stable, archived bill that exists
// independent of the current Congress and exercises every panel (sponsor,
// timeline, vote breakdown, full text, related bills).
const BILL_ID = '117-hr-3684';
const ROUTE = `/bill/${BILL_ID}`;

test.describe('Federal bill detail — BillDetail (?v=new)', () => {
  test('renders the redesigned bill page at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${ROUTE}?v=new`);
    await page.waitForLoadState('domcontentloaded');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    // Five stacked panels — verify each section header by its visible title.
    await expect(page.getByText('What this bill does').first()).toBeVisible();
    await expect(page.getByText('Legislative timeline').first()).toBeVisible();
    await expect(page.getByText('Roll-call vote').first()).toBeVisible();
    await expect(page.getByText('Bill text').first()).toBeVisible();
    await expect(page.getByText('Related bills').first()).toBeVisible();

    await expect(page).toHaveScreenshot('bill-detail-desktop.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });

  test('renders at mobile width (390px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${ROUTE}?v=new`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('What this bill does').first()).toBeVisible();

    await expect(page).toHaveScreenshot('bill-detail-mobile.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });

  test('without ?v=new flag, the existing design is rendered', async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForLoadState('domcontentloaded');

    // The redesigned page renders the section title "What this bill does" in
    // the SummaryPanel. The legacy ClientBillContent does not.
    const newHeader = page.getByText('What this bill does');
    await expect(newHeader).toHaveCount(0);
  });
});
