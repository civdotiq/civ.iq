/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Complete end-to-end user flow validation tests
 * Tests the entire user journey from search to representative details
 */

import { test, expect } from '@playwright/test';

test.describe('Complete User Flow Validation', () => {
  const testData = {
    singleDistrictZip: '48221', // Detroit - should have clear representatives
    multiDistrictZip: '10001', // Manhattan - likely multi-district
    address: '1600 Pennsylvania Avenue, Washington DC',
    invalidZip: '00000',
    partialAddress: '123 Main Street', // Incomplete address
  };

  test.describe('Single District ZIP Code Journey', () => {
    test('should complete full single-district search journey', async ({ page }) => {
      // Step 1: Land on homepage
      await page.goto('/');
      await expect(page).toHaveTitle(/CIV\.IQ/);
      await expect(page.locator('#main-content')).toBeVisible();

      // Step 2: Enter ZIP code
      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toBeVisible();
      await searchInput.fill(testData.singleDistrictZip);

      // Step 3: Submit search
      await searchInput.press('Enter');

      // Step 4: Wait for results page
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      // Step 5: Verify results page layout
      await expect(page.locator('h1:has-text("Your Representatives")')).toBeVisible();
      await expect(page.locator(`text=ZIP code ${testData.singleDistrictZip}`)).toBeVisible();

      // Step 6: Verify representative cards
      const repCards = page.locator('[data-testid="representative-card"]');
      await expect(repCards.first()).toBeVisible({ timeout: 10000 });

      const cardCount = await repCards.count();
      expect(cardCount).toBeGreaterThan(0);
      expect(cardCount).toBeLessThanOrEqual(3); // 2 Senators + 1 House Rep max

      // Step 7: Verify representative information
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = repCards.nth(i);
        await expect(card).toContainText(/Senator|Rep\.|Representative/);
        await expect(card.locator('text=/Democrat|Republican|Independent/')).toBeVisible();
      }

      // Step 8: Test representative profile navigation
      const firstCard = repCards.first();
      const profileLink = firstCard.locator('a:has-text("View Profile")');
      if (await profileLink.isVisible()) {
        await profileLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1')).toContainText(/Senator|Rep\./);
      }
    });

    test('should handle tab navigation in results', async ({ page }) => {
      await page.goto(`/representatives?zip=${testData.singleDistrictZip}`);
      await page.waitForLoadState('networkidle');

      // Test Federal Representatives tab
      const federalTab = page.locator('button:has-text("Federal Representatives")');
      if (await federalTab.isVisible()) {
        await expect(federalTab).toHaveClass(/border-civiq-blue|text-civiq-blue/);

        // Test State Representatives tab
        const stateTab = page.locator('button:has-text("State Representatives")');
        if (await stateTab.isVisible()) {
          await stateTab.click();
          await page.waitForTimeout(2000);
          await expect(stateTab).toHaveClass(/border-civiq-blue|text-civiq-blue/);

          // Should show state legislators or loading
          const stateContent = page.locator('text=/State Senate|State House|Finding your state/');
          await expect(stateContent).toBeVisible({ timeout: 10000 });
        }

        // Test District Map tab
        const mapTab = page.locator('button:has-text("District Map")');
        if (await mapTab.isVisible()) {
          await mapTab.click();
          await page.waitForTimeout(2000);
          await expect(page.locator('text=District Boundaries')).toBeVisible();
        }
      }
    });
  });

  test.describe('Multi-District ZIP Code Journey', () => {
    test('should handle multi-district selection flow', async ({ page }) => {
      await page.goto('/');

      // Step 1: Search multi-district ZIP
      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testData.multiDistrictZip);
      await searchInput.press('Enter');

      await page.waitForLoadState('networkidle');

      // Step 2: Handle multi-district response
      const hasMultiDistrictInterface = await page
        .locator('text=/multiple districts|Multi-District/i')
        .isVisible();
      const hasDirectResults =
        (await page.locator('[data-testid="representative-card"]').count()) > 0;

      if (hasMultiDistrictInterface) {
        // Step 3: Test district selection
        const districtButtons = page.locator('button:contains("District")');
        if ((await districtButtons.count()) > 0) {
          await districtButtons.first().click();
          await page.waitForLoadState('networkidle');

          // Should show representatives for selected district
          await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible({
            timeout: 10000,
          });
        }

        // Step 4: Test address refinement option
        const addressRefinementButton = page.locator('button:has-text("Enter Full Address")');
        if (await addressRefinementButton.isVisible()) {
          await addressRefinementButton.click();

          const addressInput = page.locator('input[placeholder*="address"]');
          if (await addressInput.isVisible()) {
            await addressInput.fill('123 Broadway, New York, NY');
            const submitButton = page.locator('button:has-text("Find My District")');
            if (await submitButton.isVisible()) {
              await submitButton.click();
              await page.waitForLoadState('networkidle');
            }
          }
        }
      } else if (hasDirectResults) {
        // If direct results, verify they're valid
        await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible();
      }

      // Either path should end with representatives or clear guidance
      const hasResults = (await page.locator('[data-testid="representative-card"]').count()) > 0;
      const hasGuidance = await page
        .locator('text=/select your district|choose your/i')
        .isVisible();
      expect(hasResults || hasGuidance).toBeTruthy();
    });
  });

  test.describe('Address Search Journey', () => {
    test('should handle full address search', async ({ page }) => {
      await page.goto('/');

      // Step 1: Enter full address
      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testData.address);

      // Step 2: Submit search
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');

      // Step 3: Should navigate to results
      await page.waitForURL(/\/representatives\?/, { timeout: 15000 });

      // Step 4: Verify address-based results
      await expect(page.locator('text=address')).toBeVisible();
      await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible({
        timeout: 15000,
      });

      // Step 5: Verify Washington DC representatives
      const dcIndicator = page.locator('text=/DC|District of Columbia|Washington/i');
      await expect(dcIndicator).toBeVisible({ timeout: 5000 });
    });

    test('should handle partial address gracefully', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testData.partialAddress);
      await searchInput.press('Enter');

      await page.waitForTimeout(3000);

      // Should either show results, error, or request more info
      const hasResults = (await page.locator('[data-testid="representative-card"]').count()) > 0;
      const hasError = await page.locator('text=/error|not found|more specific/i').isVisible();
      const hasGuidance = await page.locator('text=/enter|provide|specify/i').isVisible();

      expect(hasResults || hasError || hasGuidance).toBeTruthy();
    });
  });

  test.describe('Geolocation Journey', () => {
    test('should complete geolocation-based search', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: page.url() });

      // Mock successful geolocation
      await page.addInitScript(() => {
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback) => {
            success({
              coords: {
                latitude: 38.9072, // Washington DC
                longitude: -77.0369,
                accuracy: 10,
              },
            } as GeolocationPosition);
          },
        });
      });

      await page.goto('/');

      // Step 1: Click geolocation button
      const geoButton = page.locator('button:has-text("Use my location")');
      await expect(geoButton).toBeVisible();
      await geoButton.click();

      // Step 2: Verify loading state
      await expect(page.locator('text=Finding your location')).toBeVisible();
      await expect(geoButton).toBeDisabled();

      // Step 3: Wait for results
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      // Step 4: Verify geolocation results
      await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible({
        timeout: 10000,
      });

      // Step 5: Should show DC area representatives
      const dcContent = page.locator('text=/DC|District of Columbia|Washington/i');
      await expect(dcContent).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Recovery Journey', () => {
    test('should guide user through error recovery', async ({ page }) => {
      await page.goto('/');

      // Step 1: Enter invalid ZIP
      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testData.invalidZip);
      await searchInput.press('Enter');

      await page.waitForTimeout(3000);

      // Step 2: Verify error handling
      const errorMessage = page.locator('text=/no representatives found|invalid|error/i');
      if (await errorMessage.isVisible()) {
        // Step 3: Test error recovery options
        const retryButton = page.locator('button:has-text("Try Again")');
        const newSearchLink = page.locator('a:has-text("New Search")');

        if (await retryButton.isVisible()) {
          await retryButton.click();
          await page.waitForTimeout(1000);
        } else if (await newSearchLink.isVisible()) {
          await newSearchLink.click();
          await expect(page).toHaveURL('/');
        }

        // Step 4: Try valid search after error
        const newSearchInput = page.locator('input[type="text"]').first();
        await newSearchInput.clear();
        await newSearchInput.fill(testData.singleDistrictZip);
        await newSearchInput.press('Enter');

        await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
        await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible({
          timeout: 10000,
        });
      }
    });
  });

  test.describe('Cross-Device User Journey', () => {
    test('should work consistently across devices', async ({ page }) => {
      // Test on desktop first
      await page.goto('/');
      await page.setViewportSize({ width: 1200, height: 800 });

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testData.singleDistrictZip);
      await searchInput.press('Enter');

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      const desktopCards = await page.locator('[data-testid="representative-card"]').count();

      // Switch to mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);

      // Verify mobile layout
      const mobileCards = await page.locator('[data-testid="representative-card"]').count();
      expect(mobileCards).toBe(desktopCards); // Same data, different layout

      // Test mobile navigation
      const backLink = page.locator('text=← New Search');
      if (await backLink.isVisible()) {
        await backLink.click();
        await expect(page).toHaveURL('/');
      }
    });
  });

  test.describe('User Flow Performance', () => {
    test('should complete user journey within performance budgets', async ({ page }) => {
      const metrics = {
        homepageLoad: 0,
        searchSubmission: 0,
        resultsDisplay: 0,
        profileNavigation: 0,
      };

      // Homepage load
      const homepageStart = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      metrics.homepageLoad = Date.now() - homepageStart;

      // Search submission
      const searchStart = Date.now();
      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testData.singleDistrictZip);
      await searchInput.press('Enter');
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      metrics.searchSubmission = Date.now() - searchStart;

      // Results display
      const resultsStart = Date.now();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible({
        timeout: 10000,
      });
      metrics.resultsDisplay = Date.now() - resultsStart;

      // Profile navigation
      const profileStart = Date.now();
      const profileLink = page.locator('a:has-text("View Profile")').first();
      if (await profileLink.isVisible()) {
        await profileLink.click();
        await page.waitForLoadState('networkidle');
        metrics.profileNavigation = Date.now() - profileStart;
      }

      // Verify performance budgets
      expect(metrics.homepageLoad).toBeLessThan(5000); // 5 seconds
      expect(metrics.searchSubmission).toBeLessThan(10000); // 10 seconds
      expect(metrics.resultsDisplay).toBeLessThan(5000); // 5 seconds
      if (metrics.profileNavigation > 0) {
        expect(metrics.profileNavigation).toBeLessThan(8000); // 8 seconds
      }

      // Performance metrics logged for debugging
      // console.log('Performance Metrics:', metrics);
    });
  });

  test.describe('User Flow Accessibility', () => {
    test('should be navigable with keyboard only', async ({ page }) => {
      await page.goto('/');

      // Navigate with Tab key
      await page.keyboard.press('Tab'); // Focus search input
      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toBeFocused();

      // Enter search term
      await page.keyboard.type(testData.singleDistrictZip);

      // Submit with Enter
      await page.keyboard.press('Enter');
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });

      // Continue tab navigation in results
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to reach representative cards
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
    });

    test('should provide clear focus indicators', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.focus();

      // Should have visible focus state
      await expect(searchInput).toHaveClass(/focus:|ring-|outline-|border-.*focus/);

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.focus();
      await expect(geoButton).toHaveClass(/focus:|ring-|outline-|border-.*focus/);
    });
  });
});
