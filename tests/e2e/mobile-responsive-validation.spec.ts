/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Mobile responsive testing framework for multi-district search functionality
 * Tests UI layouts, touch interactions, and mobile-specific behaviors
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsive Validation', () => {
  const testZips = {
    singleDistrict: '48221', // Detroit - single district
    multiDistrict: '10001', // Manhattan - likely multi-district
    invalid: '00000', // Invalid ZIP
  };

  test.describe('iPhone 13 - Portrait Mode', () => {
    test.use({ ...devices['iPhone 13'] });

    test('should display search form properly on mobile', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/CIV\.IQ/);

      // Verify responsive layout
      const searchForm = page.locator('form');
      await expect(searchForm).toBeVisible();

      // Check input field responsiveness
      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toBeVisible();

      const inputBox = await searchInput.boundingBox();
      expect(inputBox!.width).toBeGreaterThan(250); // Minimum mobile width

      // Check touch target sizes (minimum 44px recommended)
      const searchButton = page.locator('button:has-text("Search")');
      const buttonBox = await searchButton.boundingBox();
      expect(buttonBox!.height).toBeGreaterThan(40);

      const geoButton = page.locator('button:has-text("Use my location")');
      const geoButtonBox = await geoButton.boundingBox();
      expect(geoButtonBox!.height).toBeGreaterThan(40);
    });

    test('should handle touch interactions for ZIP search', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.tap();
      await expect(searchInput).toBeFocused();

      // Test typing on mobile
      await searchInput.fill(testZips.singleDistrict);
      await expect(searchInput).toHaveValue(testZips.singleDistrict);

      // Test touch submission
      const searchButton = page.locator('button:has-text("Search")');
      await searchButton.tap();

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible({
        timeout: 10000,
      });
    });

    test('should handle multi-district selection on mobile', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testZips.multiDistrict);
      await searchInput.press('Enter');

      await page.waitForLoadState('networkidle');

      // Check for multi-district interface or representatives
      const hasMultiDistrictUI = (await page.locator('text=/multiple districts/i').count()) > 0;
      const hasResults = (await page.locator('[data-testid="representative-card"]').count()) > 0;

      if (hasMultiDistrictUI) {
        // Test district selector on mobile
        const districtButtons = page.locator('button:contains("District")');
        if ((await districtButtons.count()) > 0) {
          const firstButton = districtButtons.first();
          const buttonBox = await firstButton.boundingBox();
          expect(buttonBox!.height).toBeGreaterThan(40); // Touch target

          await firstButton.tap();
          await page.waitForLoadState('networkidle');
        }
      }

      expect(hasMultiDistrictUI || hasResults).toBeTruthy();
    });

    test('should display error messages appropriately on mobile', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testZips.invalid);
      await searchInput.press('Enter');

      await page.waitForTimeout(3000);

      const errorMessage = page.locator('text=/no representatives found/i').first();
      if (await errorMessage.isVisible()) {
        // Verify error is readable on mobile
        const errorBox = await errorMessage.boundingBox();
        expect(errorBox!.width).toBeGreaterThan(250);
      }
    });
  });

  test.describe('iPhone 13 - Landscape Mode', () => {
    test.use({
      ...devices['iPhone 13'],
      viewport: { width: 844, height: 390 }, // Landscape orientation
    });

    test('should adapt to landscape mode', async ({ page }) => {
      await page.goto('/');

      const searchForm = page.locator('form');
      await expect(searchForm).toBeVisible();

      // Check that elements are still accessible in landscape
      const searchInput = page.locator('input[type="text"]').first();
      const searchButton = page.locator('button:has-text("Search")');
      const geoButton = page.locator('button:has-text("Use my location")');

      await expect(searchInput).toBeVisible();
      await expect(searchButton).toBeVisible();
      await expect(geoButton).toBeVisible();

      // Test functionality in landscape
      await searchInput.fill(testZips.singleDistrict);
      await searchButton.tap();

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });
  });

  test.describe('iPad - Tablet Layout', () => {
    test.use({ ...devices['iPad Pro'] });

    test('should display tablet layout appropriately', async ({ page }) => {
      await page.goto('/');

      // Tablet should have more spacious layout
      const searchInput = page.locator('input[type="text"]').first();
      const inputBox = await searchInput.boundingBox();
      expect(inputBox!.width).toBeGreaterThan(400); // Wider input on tablet

      // Test search functionality
      await searchInput.fill(testZips.singleDistrict);
      await searchInput.press('Enter');

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });

      // Representative cards should be well-spaced on tablet
      const repCard = page.locator('[data-testid="representative-card"]').first();
      await expect(repCard).toBeVisible();

      const cardBox = await repCard.boundingBox();
      expect(cardBox!.width).toBeGreaterThan(300);
    });

    test('should handle tablet touch interactions', async ({ page }) => {
      await page.goto('/');

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.tap();

      // Should show appropriate feedback for tablet users
      await expect(page.locator('text=Finding your location')).toBeVisible();
    });
  });

  test.describe('Android Device Testing', () => {
    test.use({ ...devices['Pixel 5'] });

    test('should work on Android Chrome', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.tap();

      // Test Android-specific behaviors
      await searchInput.fill(testZips.singleDistrict);

      // Android might have different keyboard behavior
      const searchButton = page.locator('button:has-text("Search")');
      await searchButton.tap();

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible();
    });

    test('should handle Android geolocation', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: page.url() });

      await page.addInitScript(() => {
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback) => {
            success({
              coords: {
                latitude: 37.7749,
                longitude: -122.4194,
                accuracy: 10,
              },
            } as GeolocationPosition);
          },
        });
      });

      await page.goto('/');

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.tap();

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });
  });

  test.describe('Small Screen Device Testing', () => {
    test.use({
      viewport: { width: 320, height: 568 }, // iPhone SE size
    });

    test('should work on very small screens', async ({ page }) => {
      await page.goto('/');

      // Everything should still be accessible
      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toBeVisible();

      const inputBox = await searchInput.boundingBox();
      expect(inputBox!.width).toBeLessThan(300); // Should adapt to small screen

      // Touch targets should still be adequate
      const geoButton = page.locator('button:has-text("Use my location")');
      const geoButtonBox = await geoButton.boundingBox();
      expect(geoButtonBox!.height).toBeGreaterThan(35); // Minimum for very small screens

      // Test functionality
      await searchInput.fill(testZips.singleDistrict);
      await searchInput.press('Enter');

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });
  });

  test.describe('Mobile Results Page Validation', () => {
    test.use({ ...devices['iPhone 13'] });

    test('should display results properly on mobile', async ({ page }) => {
      await page.goto(`/representatives?zip=${testZips.singleDistrict}`);
      await page.waitForLoadState('networkidle');

      // Check mobile layout of results
      const repCards = page.locator('[data-testid="representative-card"]');
      const cardCount = await repCards.count();

      if (cardCount > 0) {
        for (let i = 0; i < Math.min(cardCount, 3); i++) {
          const card = repCards.nth(i);
          await expect(card).toBeVisible();

          // Cards should stack vertically on mobile
          const cardBox = await card.boundingBox();
          expect(cardBox!.width).toBeGreaterThan(250);
        }
      }
    });

    test('should handle mobile navigation', async ({ page }) => {
      await page.goto(`/representatives?zip=${testZips.singleDistrict}`);
      await page.waitForLoadState('networkidle');

      // Test mobile header navigation
      const backLink = page.locator('text=← New Search');
      await expect(backLink).toBeVisible();

      // Should be touchable
      const linkBox = await backLink.boundingBox();
      expect(linkBox!.height).toBeGreaterThan(30);

      await backLink.tap();
      await expect(page).toHaveURL('/');
    });

    test('should handle mobile tabs if present', async ({ page }) => {
      await page.goto(`/representatives?zip=${testZips.singleDistrict}`);
      await page.waitForLoadState('networkidle');

      // Check for tab navigation
      const federalTab = page.locator('button:has-text("Federal Representatives")');
      if (await federalTab.isVisible()) {
        await federalTab.tap();

        const stateTab = page.locator('button:has-text("State Representatives")');
        if (await stateTab.isVisible()) {
          await stateTab.tap();
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Mobile Performance Testing', () => {
    test.use({ ...devices['iPhone 13'] });

    test('should load quickly on mobile', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds

      // Test search performance
      const searchStartTime = Date.now();

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testZips.singleDistrict);
      await searchInput.press('Enter');

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      const searchTime = Date.now() - searchStartTime;
      expect(searchTime).toBeLessThan(10000); // Search should complete in under 10 seconds
    });

    test('should handle slow connections gracefully', async ({ page, context }) => {
      // Simulate slow 3G connection
      await context.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });

      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testZips.singleDistrict);
      await searchInput.press('Enter');

      // Should show loading states appropriately
      const loadingIndicator = page.locator('.animate-spin, text=Loading');
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 20000 });
    });
  });

  test.describe('Mobile Accessibility', () => {
    test.use({ ...devices['iPhone 13'] });

    test('should be accessible with touch navigation', async ({ page }) => {
      await page.goto('/');

      // All interactive elements should be focusable
      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.focus();
      await expect(searchInput).toBeFocused();

      // Tab navigation should work
      await page.keyboard.press('Tab');
      const searchButton = page.locator('button:has-text("Search")');
      await expect(searchButton).toBeFocused();

      await page.keyboard.press('Tab');
      const geoButton = page.locator('button:has-text("Use my location")');
      await expect(geoButton).toBeFocused();
    });

    test('should support voice input simulation', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.tap();

      // Simulate voice input by setting value directly
      await searchInput.fill(testZips.singleDistrict);
      await expect(searchInput).toHaveValue(testZips.singleDistrict);

      await searchInput.press('Enter');
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });
  });
});
