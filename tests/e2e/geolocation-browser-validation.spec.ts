/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Comprehensive browser testing for geolocation functionality
 * Tests across Chrome, Safari, Firefox with various permission scenarios
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Geolocation Browser Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
    await page.waitForSelector('#main-content', { state: 'visible' });
    await expect(page).toHaveTitle(/CIV\.IQ/);
  });

  test.describe('Chrome Geolocation', () => {
    test.use({ ...devices['Desktop Chrome'] });

    test('should request geolocation permission and handle success', async ({ page, context }) => {
      // Grant geolocation permission
      await context.grantPermissions(['geolocation'], {
        origin: page.url(),
      });

      // Mock geolocation to return Washington DC coordinates
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

      // Click the geolocation button
      const geoButton = page.locator('button:has-text("Use my location")');
      await expect(geoButton).toBeVisible();
      await geoButton.click();

      // Should show loading state
      await expect(page.locator('text=Finding your location')).toBeVisible();

      // Wait for geolocation to complete and navigate to results
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });

      // Should show representatives
      await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible({
        timeout: 10000,
      });
    });

    test('should handle geolocation permission denied', async ({ page, context }) => {
      // Deny geolocation permission
      await context.grantPermissions([], { origin: page.url() });

      // Mock geolocation to simulate permission denied
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

      // Click the geolocation button
      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      // Should show error message
      await expect(page.locator('text=Location detection failed')).toBeVisible();
      await expect(page.locator('text=check location permissions')).toBeVisible();
    });

    test('should handle geolocation timeout', async ({ page, context }) => {
      // Grant permission but simulate timeout
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
            }, 500);
          },
        });
      });

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      // Should show timeout error
      await expect(page.locator('text=Location detection failed')).toBeVisible();
    });
  });

  test.describe('Safari-like Mobile Geolocation', () => {
    test.use({ ...devices['iPhone 13'] });

    test('should work on mobile Safari', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: page.url() });

      // Mock successful geolocation
      await page.addInitScript(() => {
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback) => {
            success({
              coords: {
                latitude: 40.7128,
                longitude: -74.006,
                accuracy: 15,
              },
            } as GeolocationPosition);
          },
        });
      });

      // Mobile responsive check
      const geoButton = page.locator('button:has-text("Use my location")');
      await expect(geoButton).toBeVisible();

      // Verify button is touchable on mobile
      const buttonBox = await geoButton.boundingBox();
      expect(buttonBox!.height).toBeGreaterThan(40); // Minimum touch target

      await geoButton.click();

      // Should handle mobile navigation
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });

    test('should handle mobile geolocation position unavailable', async ({ page, context }) => {
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

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      await expect(page.locator('text=Location detection failed')).toBeVisible();
    });
  });

  test.describe('Firefox Geolocation', () => {
    test.use({ ...devices['Desktop Firefox'] });

    test('should work in Firefox with permission prompt', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: page.url() });

      await page.addInitScript(() => {
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback) => {
            success({
              coords: {
                latitude: 41.8781,
                longitude: -87.6298,
                accuracy: 20,
              },
            } as GeolocationPosition);
          },
        });
      });

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible();
    });
  });

  test.describe('Census Geocoding API Integration', () => {
    test('should handle Census API failure gracefully', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: page.url() });

      // Mock successful geolocation but failed geocoding
      await page.route('**/geocoding.geo.census.gov/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

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

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      // Should show geocoding error
      await expect(page.locator('text=Location detection failed')).toBeVisible();
    });

    test('should handle Census API returning no ZIP code', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: page.url() });

      // Mock geocoding API to return empty result
      await page.route('**/geocoding.geo.census.gov/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              addressMatches: [],
            },
          }),
        });
      });

      await page.addInitScript(() => {
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback) => {
            success({
              coords: {
                latitude: 0,
                longitude: 0,
                accuracy: 10,
              },
            } as GeolocationPosition);
          },
        });
      });

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      await expect(page.locator('text=Location detection failed')).toBeVisible();
    });
  });

  test.describe('Geolocation UX Flow', () => {
    test('should show proper loading states and transitions', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: page.url() });

      // Slow down geolocation to test loading states
      await page.addInitScript(() => {
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback) => {
            setTimeout(() => {
              success({
                coords: {
                  latitude: 38.9072,
                  longitude: -77.0369,
                  accuracy: 10,
                },
              } as GeolocationPosition);
            }, 2000);
          },
        });
      });

      const geoButton = page.locator('button:has-text("Use my location")');

      // Initial state
      await expect(geoButton).toBeEnabled();
      await expect(geoButton).toContainText('Use my location');

      await geoButton.click();

      // Loading state
      await expect(geoButton).toBeDisabled();
      await expect(page.locator('text=Finding your location')).toBeVisible();
      await expect(page.locator('.animate-spin')).toBeVisible();

      // Should eventually complete
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });

    test('should handle rapid successive clicks', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: page.url() });

      await page.addInitScript(() => {
        let _callCount = 0;
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback) => {
            _callCount++;
            setTimeout(() => {
              success({
                coords: {
                  latitude: 38.9072,
                  longitude: -77.0369,
                  accuracy: 10,
                },
              } as GeolocationPosition);
            }, 1000);
          },
        });
      });

      const geoButton = page.locator('button:has-text("Use my location")');

      // Click multiple times rapidly
      await geoButton.click();
      await geoButton.click();
      await geoButton.click();

      // Should only trigger once (button disabled after first click)
      await expect(geoButton).toBeDisabled();
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });
  });

  test.describe('Accessibility and Screen Reader Support', () => {
    test('should have proper ARIA labels and announcements', async ({ page }) => {
      const geoButton = page.locator('button:has-text("Use my location")');

      // Check ARIA attributes
      await expect(geoButton).toHaveAttribute('type', 'button');

      // Should have focus states
      await geoButton.focus();
      await expect(geoButton).toBeFocused();

      // Should be keyboard accessible
      await geoButton.press('Enter');

      // Loading state should be announced
      await expect(page.locator('text=Finding your location')).toBeVisible();
    });

    test('should provide clear error messaging for screen readers', async ({ page, context }) => {
      await context.grantPermissions([], { origin: page.url() });

      await page.addInitScript(() => {
        Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
          writable: true,
          value: (success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 1,
              message: 'User denied the request for Geolocation.',
            } as GeolocationPositionError);
          },
        });
      });

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      // Error should be clearly announced
      const errorMessage = page.locator('text=Location detection failed');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });
});
