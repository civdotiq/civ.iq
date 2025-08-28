/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * E2E Campaign Finance Tests - Validating the "$0" Bug Fix
 *
 * This test suite verifies that our FEC API committee_id fix correctly
 * displays campaign finance data instead of showing "$0" for all representatives.
 *
 * Tests cover three critical scenarios:
 * 1. On-cycle senator (should show current cycle data)
 * 2. Off-cycle senator (should show most recent election cycle data)
 * 3. House representative (should show current cycle data)
 *
 * Note: These tests validate the technical implementation but may be skipped
 * in WSL2/CI environments due to dev server limitations.
 */

import { test, expect } from '@playwright/test';

// Test timeout for finance data loading
const FINANCE_TIMEOUT = 30000;

test.describe('Campaign Finance Data Display', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for finance API calls
    page.setDefaultTimeout(FINANCE_TIMEOUT);
  });

  test('should display 2024 finance data for an on-cycle senator (Bernie Sanders)', async ({
    page,
  }) => {
    await test.step('Navigate to Bernie Sanders profile', async () => {
      await page.goto('/representative/S000033');
      await page.waitForSelector('#main-content', { state: 'visible' });
    });

    await test.step('Open Campaign Finance tab', async () => {
      await page.waitForLoadState('networkidle');
      await page.click('button:has-text("Campaign Finance")');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify Total Raised is visible and not $0', async () => {
      const totalRaisedElement = page
        .locator('[data-testid="total-raised"], .total-raised, :text("Total Raised")')
        .first();
      await expect(totalRaisedElement).toBeVisible({ timeout: FINANCE_TIMEOUT });

      const financeSection = page
        .locator('[data-testid="finance-summary"], .finance-summary, .campaign-finance')
        .first();
      await expect(financeSection).toBeVisible();

      // Verify we're not seeing "$0" which was the bug
      const pageContent = await page.content();
      const hasNonZeroAmount =
        pageContent.includes('$') && !pageContent.match(/Total Raised[:\s]*\$0(?:[^0-9]|$)/);
      expect(hasNonZeroAmount).toBeTruthy();
    });

    await test.step('Verify 2024 cycle is displayed', async () => {
      const cycleIndicator = page.locator(':text("2024")');
      await expect(cycleIndicator).toBeVisible();
    });
  });

  test('should display 2020 finance data for an off-cycle senator (Susan Collins)', async ({
    page,
  }) => {
    await test.step('Navigate to Susan Collins profile', async () => {
      await page.goto('/representative/C001035');
      await page.waitForSelector('#main-content', { state: 'visible' });
    });

    await test.step('Open Campaign Finance tab', async () => {
      await page.waitForLoadState('networkidle');
      await page.click('button:has-text("Campaign Finance")');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify Total Raised is visible and not $0', async () => {
      const totalRaisedElement = page
        .locator('[data-testid="total-raised"], .total-raised, :text("Total Raised")')
        .first();
      await expect(totalRaisedElement).toBeVisible({ timeout: FINANCE_TIMEOUT });

      const financeSection = page
        .locator('[data-testid="finance-summary"], .finance-summary, .campaign-finance')
        .first();
      await expect(financeSection).toBeVisible();

      // Verify we're not seeing "$0" which was the bug
      const pageContent = await page.content();
      const hasNonZeroAmount =
        pageContent.includes('$') && !pageContent.match(/Total Raised[:\s]*\$0(?:[^0-9]|$)/);
      expect(hasNonZeroAmount).toBeTruthy();
    });

    await test.step('Verify 2020 cycle is displayed', async () => {
      const cycleIndicator = page.locator(':text("2020")');
      await expect(cycleIndicator).toBeVisible();
    });
  });

  test('should display 2026 finance data for a House member (Shri Thanedar)', async ({ page }) => {
    await test.step('Navigate to Shri Thanedar profile', async () => {
      await page.goto('/representative/S001208');
      await page.waitForSelector('#main-content', { state: 'visible' });
    });

    await test.step('Open Campaign Finance tab', async () => {
      await page.waitForLoadState('networkidle');
      await page.click('button:has-text("Campaign Finance")');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify Total Raised is visible and not $0', async () => {
      const totalRaisedElement = page
        .locator('[data-testid="total-raised"], .total-raised, :text("Total Raised")')
        .first();
      await expect(totalRaisedElement).toBeVisible({ timeout: FINANCE_TIMEOUT });

      const financeSection = page
        .locator('[data-testid="finance-summary"], .finance-summary, .campaign-finance')
        .first();
      await expect(financeSection).toBeVisible();

      // Verify we're not seeing "$0" which was the bug
      const pageContent = await page.content();
      const hasNonZeroAmount =
        pageContent.includes('$') && !pageContent.match(/Total Raised[:\s]*\$0(?:[^0-9]|$)/);
      expect(hasNonZeroAmount).toBeTruthy();
    });

    await test.step('Verify 2026 cycle is displayed', async () => {
      const cycleIndicator = page.locator(':text("2026")');
      await expect(cycleIndicator).toBeVisible();
    });
  });

  test('should handle finance data gracefully when no data exists', async ({ page }) => {
    await test.step('Navigate to representative with potentially no finance data', async () => {
      // Test with a representative who might not have finance data
      // This ensures our fix doesn't break when there's legitimately no data
      await page.goto('/representative/M001230'); // Example: newer representative
      await page.waitForSelector('#main-content', { state: 'visible' });
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify graceful handling of no-data scenario', async () => {
      // Try to click finance tab - it should exist even if no data
      const financeTab = page.locator('button:has-text("Campaign Finance")');
      if (await financeTab.isVisible()) {
        await financeTab.click();
        await page.waitForLoadState('networkidle');

        // Should show a proper "no data" message, not crash or show undefined
        const content = await page.content();
        const hasValidResponse =
          content.includes('No campaign finance data') ||
          content.includes('$0') ||
          content.includes('Total Raised');
        expect(hasValidResponse).toBeTruthy();
      }
    });
  });
});

test.describe('Campaign Finance API Integration', () => {
  test('should return 200 OK for finance endpoints (not 404)', async ({ page }) => {
    const apiResponses: Array<{ url: string; status: number }> = [];

    await test.step('Set up network monitoring', async () => {
      page.on('response', response => {
        if (
          response.url().includes('/api/representative/') &&
          response.url().includes('/finance')
        ) {
          apiResponses.push({
            url: response.url(),
            status: response.status(),
          });
        }
      });
    });

    await test.step('Navigate to Bernie Sanders and trigger finance data load', async () => {
      await page.goto('/representative/S000033');
      await page.waitForSelector('#main-content', { state: 'visible' });
      await page.waitForLoadState('networkidle');
      await page.click('button:has-text("Campaign Finance")');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify finance API calls returned 200, not 404', async () => {
      const financeApiCalls = apiResponses.filter(r => r.url.includes('/finance'));
      expect(financeApiCalls.length).toBeGreaterThan(0);

      for (const call of financeApiCalls) {
        expect(call.status).toBe(200);
      }
    });
  });
});
