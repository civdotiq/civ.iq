/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { test, expect } from '@playwright/test';

const BIOGUIDE_ID = 'P000197';
const ROUTE = `/representative/${BIOGUIDE_ID}`;

test.describe('Federal official profile — ProfileHybrid (?v=new)', () => {
  test('renders the redesigned profile chassis at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${ROUTE}?v=new`);
    await page.waitForLoadState('domcontentloaded');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    const tablist = page.getByRole('tablist', { name: 'Profile sections' });
    await expect(tablist).toBeVisible();

    await expect(page.getByRole('tab', { name: 'Voting record' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Money' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Bills sponsored' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Committees' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Lobbyist meetings' })).toBeVisible();

    await page.getByRole('tab', { name: 'Money' }).click();
    await expect(page.getByRole('tab', { name: 'Money' })).toHaveAttribute('aria-selected', 'true');

    await expect(page).toHaveScreenshot('officials-profile-desktop.png', {
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
    await expect(page.getByRole('tablist', { name: 'Profile sections' })).toBeVisible();

    await expect(page).toHaveScreenshot('officials-profile-mobile.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });

  test('without ?v=new flag, the existing design is rendered (no tablist)', async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForLoadState('domcontentloaded');

    const tablist = page.getByRole('tablist', { name: 'Profile sections' });
    await expect(tablist).toHaveCount(0);
  });
});
