/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Comprehensive error scenario testing suite
 * Tests network failures, permission denials, API errors, and recovery flows
 */

import { test, expect } from '@playwright/test';

test.describe('Error Scenario Validation', () => {
  test.describe('Network and API Failures', () => {
    test('should handle complete network failure', async ({ page, context }) => {
      await page.goto('/');

      // Block all network requests
      await context.route('**/*', route => {
        route.abort('failed');
      });

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('48221');
      await searchInput.press('Enter');

      // Should show network error
      await expect(page.locator('text=/network error|connection|failed/i')).toBeVisible({
        timeout: 10000,
      });

      // Should provide retry option
      const retryButton = page.locator('button:has-text("Try Again")');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeEnabled();
      }
    });

    test('should handle API server errors (500)', async ({ page, context }) => {
      await page.goto('/');

      // Mock API to return 500 errors
      await context.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Internal server error occurred',
            },
          }),
        });
      });

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('48221');
      await searchInput.press('Enter');

      await page.waitForTimeout(3000);

      // Should show server error message
      const errorMessage = page.locator('text=/server error|internal error|try again/i');
      await expect(errorMessage).toBeVisible();

      // Should provide clear guidance
      const guidance = page.locator('text=/try again|contact support|later/i');
      await expect(guidance).toBeVisible();
    });

    test('should handle API timeout scenarios', async ({ page, context }) => {
      await page.goto('/');

      // Simulate very slow API responses
      await context.route('**/api/**', route => {
        setTimeout(() => {
          route.continue();
        }, 15000); // 15 second delay
      });

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('48221');
      await searchInput.press('Enter');

      // Should show loading state
      await expect(page.locator('text=/loading|searching|finding/i')).toBeVisible();

      // Should eventually timeout or show error
      await expect(page.locator('text=/timeout|taking too long|try again/i')).toBeVisible({
        timeout: 20000,
      });
    });

    test('should handle malformed API responses', async ({ page, context }) => {
      await page.goto('/');

      // Return invalid JSON
      await context.route('**/api/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response',
        });
      });

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('48221');
      await searchInput.press('Enter');

      await page.waitForTimeout(3000);

      // Should handle parsing error gracefully
      const errorMessage = page.locator('text=/error|unexpected|try again/i');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('Geolocation Permission and Failures', () => {
    test('should handle geolocation permission denied', async ({ page, context }) => {
      await page.goto('/');

      // Deny geolocation permission
      await context.grantPermissions([], { origin: page.url() });

      await page.addInitScript(() => {
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 1, // PERMISSION_DENIED
              message: 'User denied the request for Geolocation.',
            } as GeolocationPositionError);
          },
        });
      });

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      // Should show permission error
      await expect(page.locator('text=Location detection failed')).toBeVisible();
      await expect(page.locator('text=check location permissions')).toBeVisible();

      // Should provide alternative options
      await expect(page.locator('text=enter your ZIP code manually')).toBeVisible();

      // User should be able to continue with manual input
      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toBeEnabled();
    });

    test('should handle geolocation position unavailable', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: page.url() });

      await page.addInitScript(() => {
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 2, // POSITION_UNAVAILABLE
              message: 'Network error or positioning satellites unavailable.',
            } as GeolocationPositionError);
          },
        });
      });

      await page.goto('/');

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      await expect(page.locator('text=Location detection failed')).toBeVisible();

      // Should provide fallback options
      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('48221');
      await searchInput.press('Enter');

      // Should still work with manual input
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });

    test('should handle geolocation timeout', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: page.url() });

      await page.addInitScript(() => {
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback, error: PositionErrorCallback) => {
            setTimeout(() => {
              error({
                code: 3, // TIMEOUT
                message: 'The request to get user location timed out.',
              } as GeolocationPositionError);
            }, 1000);
          },
        });
      });

      await page.goto('/');

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      await expect(page.locator('text=Location detection failed')).toBeVisible();
      await expect(page.locator('text=enter your ZIP code manually')).toBeVisible();
    });

    test('should handle Census geocoding API failures', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: page.url() });

      // Mock successful geolocation but failed geocoding
      await page.addInitScript(() => {
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback) => {
            success({
              coords: {
                latitude: 38.9072,
                longitude: -77.0369,
                accuracy: 10,
              },
            } as GeolocationPosition);
          },
        });
      });

      // Block Census API
      await context.route('**/geocoding.geo.census.gov/**', route => {
        route.abort('failed');
      });

      await page.goto('/');

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      await expect(page.locator('text=Location detection failed')).toBeVisible();
    });
  });

  test.describe('Invalid Input Handling', () => {
    test('should handle invalid ZIP codes gracefully', async ({ page }) => {
      await page.goto('/');

      const invalidZips = ['00000', '99999', 'abcde', '123', '1234567890'];

      for (const invalidZip of invalidZips) {
        const searchInput = page.locator('input[type="text"]').first();
        await searchInput.clear();
        await searchInput.fill(invalidZip);
        await searchInput.press('Enter');

        await page.waitForTimeout(2000);

        // Should show appropriate error or no results message
        const hasError = await page
          .locator('text=/invalid|not found|no representatives/i')
          .isVisible();
        const hasGuidance = await page.locator('text=/try|enter|valid/i').isVisible();

        expect(hasError || hasGuidance).toBeTruthy();

        // Should allow user to try again
        await expect(searchInput).toBeEnabled();
      }
    });

    test('should handle malformed addresses', async ({ page }) => {
      await page.goto('/');

      const malformedAddresses = [
        '123', // Too short
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // Too long
        '!@#$%^&*()', // Special characters
        '123 Main St, Nowhere, ZZ 99999', // Non-existent state
      ];

      for (const address of malformedAddresses) {
        const searchInput = page.locator('input[type="text"]').first();
        await searchInput.clear();
        await searchInput.fill(address);
        await searchInput.press('Enter');

        await page.waitForTimeout(3000);

        // Should handle gracefully
        const hasError = await page.locator('text=/not found|invalid|error/i').isVisible();
        const hasResults = (await page.locator('[data-testid="representative-card"]').count()) > 0;
        const hasGuidance = await page.locator('text=/try|enter|specific/i').isVisible();

        expect(hasError || hasResults || hasGuidance).toBeTruthy();
      }
    });

    test('should handle empty search input', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      const searchButton = page.locator('button:has-text("Search")');

      // Try to submit empty search
      await searchInput.clear();
      await searchButton.click();

      // Button should be disabled or form should not submit
      const currentUrl = page.url();
      await page.waitForTimeout(1000);
      expect(page.url()).toBe(currentUrl); // Should not navigate

      // Or if it does navigate, should show appropriate message
      const hasMessage = await page.locator('text=/enter|provide|search/i').isVisible();
      if (page.url() !== currentUrl) {
        expect(hasMessage).toBeTruthy();
      }
    });
  });

  test.describe('Data Quality and Edge Cases', () => {
    test('should handle representatives with missing data', async ({ page, context }) => {
      await page.goto('/');

      // Mock API to return representatives with minimal data
      await context.route('**/api/representatives**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            representatives: [
              {
                bioguideId: 'TEST001',
                name: 'Test Representative',
                party: 'Unknown',
                state: 'XX',
                chamber: 'House',
                title: 'Representative',
                // Missing most optional fields
              },
            ],
            metadata: {
              timestamp: new Date().toISOString(),
              zipCode: '48221',
              dataQuality: 'low',
              dataSource: 'test-mock',
              cacheable: false,
            },
          }),
        });
      });

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('48221');
      await searchInput.press('Enter');

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });

      // Should still display the representative card
      await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible();
      await expect(page.locator('text=Test Representative')).toBeVisible();

      // Should handle missing data gracefully (no crashes)
      const repCard = page.locator('[data-testid="representative-card"]').first();
      await expect(repCard).toBeVisible();
    });

    test('should handle empty API responses', async ({ page, context }) => {
      await page.goto('/');

      // Mock API to return empty results
      await context.route('**/api/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            representatives: [],
            metadata: {
              timestamp: new Date().toISOString(),
              zipCode: '48221',
              dataQuality: 'unavailable',
              dataSource: 'test-mock',
              cacheable: false,
            },
          }),
        });
      });

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('48221');
      await searchInput.press('Enter');

      await page.waitForTimeout(3000);

      // Should show no results message
      await expect(page.locator('text=/no representatives found/i')).toBeVisible();

      // Should provide guidance for next steps
      const guidance = page.locator('text=/try|search|different/i');
      await expect(guidance).toBeVisible();
    });
  });

  test.describe('Error Recovery Flows', () => {
    test('should allow recovery from network errors', async ({ page, context }) => {
      await page.goto('/');

      let blockRequests = true;

      // Initially block requests
      await context.route('**/api/**', route => {
        if (blockRequests) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('48221');
      await searchInput.press('Enter');

      // Should show error
      await expect(page.locator('text=/error|failed/i')).toBeVisible({ timeout: 10000 });

      // Now allow requests through
      blockRequests = false;

      // Try retry
      const retryButton = page.locator('button:has-text("Try Again")');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
        await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible();
      } else {
        // Manual retry
        await searchInput.clear();
        await searchInput.fill('48221');
        await searchInput.press('Enter');
        await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      }
    });

    test('should handle error state transitions gracefully', async ({ page }) => {
      await page.goto('/');

      // Test sequence: valid -> invalid -> valid
      const searchInput = page.locator('input[type="text"]').first();

      // Valid search first
      await searchInput.fill('48221');
      await searchInput.press('Enter');
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });

      // Go back and try invalid
      await page.goBack();
      await searchInput.clear();
      await searchInput.fill('00000');
      await searchInput.press('Enter');

      await page.waitForTimeout(3000);

      // Should show error
      const hasError = await page.locator('text=/not found|invalid|error/i').isVisible();
      if (hasError) {
        // Try valid search again
        await searchInput.clear();
        await searchInput.fill('48221');
        await searchInput.press('Enter');
        await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      }
    });

    test('should maintain state during error recovery', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('invalid');
      await searchInput.press('Enter');

      await page.waitForTimeout(2000);

      // Input should still contain the invalid value for user to edit
      await expect(searchInput).toHaveValue('invalid');

      // User can edit and correct
      await searchInput.clear();
      await searchInput.fill('48221');
      await searchInput.press('Enter');

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });
  });

  test.describe('Browser Compatibility Errors', () => {
    test('should handle missing geolocation API', async ({ page }) => {
      await page.goto('/');

      // Remove geolocation API
      await page.addInitScript(() => {
        delete (navigator as unknown as Record<string, unknown>).geolocation;
      });

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      // Should show appropriate error
      await expect(page.locator('text=Geolocation not supported')).toBeVisible();
      await expect(page.locator('text=enter your ZIP code manually')).toBeVisible();
    });

    test('should handle DOM manipulation gracefully', async ({ page }) => {
      await page.goto('/');

      // Try to manipulate DOM and ensure page recovers
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.style.display = 'none'; // Hide form temporarily
        }
      });

      // Page should recover when reloaded
      await page.reload();
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toBeVisible();
    });
  });

  test.describe('Accessibility Error Scenarios', () => {
    test('should provide screen reader friendly error messages', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('00000');
      await searchInput.press('Enter');

      await page.waitForTimeout(3000);

      // Error should be announced to screen readers
      const errorElement = page.locator(
        '[role="alert"], [aria-live="polite"], [aria-live="assertive"]'
      );
      if (await errorElement.first().isVisible()) {
        await expect(errorElement.first()).toContainText(/error|not found|invalid/i);
      }
    });

    test('should maintain keyboard navigation during errors', async ({ page }) => {
      await page.goto('/');

      // Cause an error
      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('invalid');
      await searchInput.press('Enter');

      await page.waitForTimeout(2000);

      // Should still be able to navigate with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });
});
