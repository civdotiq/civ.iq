/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { test, expect } from '@playwright/test';

test.describe('ZIP Code Lookup', () => {
  test('should find representatives for valid ZIP code', async ({ page }) => {
    await page.goto('/');

    // Wait for stable anchor element to be visible
    await page.waitForSelector('#main-content', { state: 'visible' });

    // Wait for the page to load
    await expect(page).toHaveTitle(/CIV\.IQ/);

    // Look for ZIP code input
    const zipInput = page.locator('input[type="text"]').first();
    await expect(zipInput).toBeVisible();

    // Enter a valid ZIP code
    await zipInput.fill('48221');

    // Submit the form (look for submit button or press Enter)
    await zipInput.press('Enter');

    // Wait for results to load
    await page.waitForLoadState('networkidle');

    // Check that representatives are displayed
    await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Verify we have both House and Senate representatives
    const representatives = page.locator('[data-testid="representative-card"]');
    await expect(representatives).toHaveCount(3); // 2 Senators + 1 House Rep

    // Check that representative names are displayed
    await expect(representatives.first()).toContainText(/Senator|Rep\./);
  });

  test('should handle invalid ZIP code gracefully', async ({ page }) => {
    await page.goto('/');

    // Wait for stable anchor element to be visible
    await page.waitForSelector('#main-content', { state: 'visible' });

    // Enter an invalid ZIP code
    const zipInput = page.locator('input[type="text"]').first();
    await zipInput.fill('00000');
    await zipInput.press('Enter');

    // Wait for response
    await page.waitForTimeout(2000);

    // Should show error message
    await expect(page.locator('text=/no representatives found/i')).toBeVisible();
  });

  test('should handle multi-district ZIP codes', async ({ page }) => {
    await page.goto('/');

    // Wait for stable anchor element to be visible
    await page.waitForSelector('#main-content', { state: 'visible' });

    // Use a ZIP code that spans multiple districts
    const zipInput = page.locator('input[type="text"]').first();
    await zipInput.fill('10001'); // Manhattan ZIP that might span districts
    await zipInput.press('Enter');

    // Wait for results
    await page.waitForLoadState('networkidle');

    // Should either show representatives or a multi-district message
    const hasResults = (await page.locator('[data-testid="representative-card"]').count()) > 0;
    const hasMultiDistrictMsg = (await page.locator('text=/multiple districts/i').count()) > 0;

    expect(hasResults || hasMultiDistrictMsg).toBeTruthy();
  });
});
