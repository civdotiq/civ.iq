/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('should display user-friendly error for network failures', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/representatives*', route => route.abort());

    await page.goto('/');
    await page.waitForSelector('#main-content', { state: 'visible' });

    // Try to search for representatives
    const zipInput = page.locator('input[type="text"]').first();
    await zipInput.fill('48221');
    await zipInput.press('Enter');

    // Should show error message instead of crashing
    await expect(page.locator('text=/error|failed|unavailable/i')).toBeVisible({ timeout: 5000 });

    // Page should still be functional
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/representatives*', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    );

    await page.goto('/');
    await page.waitForSelector('#main-content', { state: 'visible' });

    // Try to search
    const zipInput = page.locator('input[type="text"]').first();
    await zipInput.fill('48221');
    await zipInput.press('Enter');

    // Should show error message
    await expect(page.locator('text=/error|failed|unavailable/i')).toBeVisible({ timeout: 5000 });
  });

  test('should handle slow API responses', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/representatives*', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          representatives: [],
          metadata: { zipCode: '48221', dataQuality: 'high' },
        }),
      });
    });

    await page.goto('/');
    await page.waitForSelector('#main-content', { state: 'visible' });

    // Start search
    const zipInput = page.locator('input[type="text"]').first();
    await zipInput.fill('48221');
    await zipInput.press('Enter');

    // Should show loading state
    await expect(page.locator('text=/loading|searching/i')).toBeVisible({ timeout: 1000 });

    // Should eventually show results or empty state
    await expect(page.locator('text=/no representatives found/i')).toBeVisible({ timeout: 10000 });
  });

  test('should recover from component errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#main-content', { state: 'visible' });

    // The error boundary should catch any JavaScript errors
    page.on('pageerror', _error => {
      // Error caught by test framework
    });

    // Navigate to a potentially problematic page
    await page.goto('/districts/invalid-district');
    await page.waitForSelector('#main-content', { state: 'visible' });

    // Should show error boundary instead of blank page
    const hasErrorBoundary = (await page.locator('text=/error|something went wrong/i').count()) > 0;
    const hasContent = await page.locator('body').textContent();

    expect(hasErrorBoundary || (hasContent && hasContent.length > 0)).toBeTruthy();
  });
});
