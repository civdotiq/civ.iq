/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { test, expect } from '@playwright/test';

test.describe('Representative Detail Page', () => {
  test('should display representative information', async ({ page }) => {
    // Navigate to a known representative (using a common bioguide ID)
    await page.goto('/representative/P000197'); // Pelosi as example

    // Wait for stable anchor element to be visible
    await page.waitForSelector('#main-content', { state: 'visible' });

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that basic information is displayed
    await expect(page.locator('[data-testid="representative-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="representative-party"]')).toBeVisible();
    await expect(page.locator('[data-testid="representative-state"]')).toBeVisible();

    // Check that photo is displayed
    await expect(page.locator('[data-testid="representative-photo"]')).toBeVisible();

    // Check that contact information is displayed
    await expect(page.locator('[data-testid="contact-info"]')).toBeVisible();
  });

  test('should display voting records', async ({ page }) => {
    await page.goto('/representative/P000197');

    // Wait for stable anchor element to be visible
    await page.waitForSelector('#main-content', { state: 'visible' });

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for voting tab or section
    const votingTab = page.locator('button:has-text("Voting")');
    if ((await votingTab.count()) > 0) {
      await votingTab.click();
    }

    // Should display voting records
    await expect(page.locator('[data-testid="voting-record"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Check that vote positions are displayed
    await expect(page.locator('text=/Yea|Nay|Present/').first()).toBeVisible();
  });

  test('should display campaign finance data', async ({ page }) => {
    await page.goto('/representative/P000197');

    // Wait for stable anchor element to be visible
    await page.waitForSelector('#main-content', { state: 'visible' });

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for finance tab or section
    const financeTab = page.locator('button:has-text("Finance")');
    if ((await financeTab.count()) > 0) {
      await financeTab.click();
    }

    // Should display financial information
    await expect(page.locator('[data-testid="finance-data"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should handle 404 for invalid bioguide ID', async ({ page }) => {
    await page.goto('/representative/INVALID123');

    // Wait for stable anchor element to be visible (or 404 page to load)
    await page.waitForSelector('#main-content', { state: 'visible' });

    // Should show 404 or error message
    await expect(page.locator('text=/not found/i')).toBeVisible();
  });
});
