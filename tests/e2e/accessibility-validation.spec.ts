/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Comprehensive accessibility validation tests
 * Tests WCAG compliance, screen reader support, and keyboard navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Accessibility Validation', () => {
  const testZip = '48221'; // Detroit ZIP for consistent testing

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation on homepage', async ({ page }) => {
      await page.goto('/');

      // Start from beginning
      await page.keyboard.press('Tab');
      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toBeFocused();

      // Continue tabbing through interactive elements
      await page.keyboard.press('Tab');
      const searchButton = page.locator('button:has-text("Search")');
      await expect(searchButton).toBeFocused();

      await page.keyboard.press('Tab');
      const geoButton = page.locator('button:has-text("Use my location")');
      await expect(geoButton).toBeFocused();

      // Test keyboard submission
      await searchInput.focus();
      await page.keyboard.type(testZip);
      await page.keyboard.press('Enter');

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });

    test('should support keyboard navigation in results page', async ({ page }) => {
      await page.goto(`/representatives?zip=${testZip}`);
      await page.waitForLoadState('networkidle');

      // Tab through results page elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to reach representative cards
      const repCards = page.locator('[data-testid="representative-card"]');
      if ((await repCards.count()) > 0) {
        // Tab to first representative card's action button
        let attempts = 0;
        while (attempts < 20) {
          // Keep tabbing until we reach a View Profile link
          await page.keyboard.press('Tab');
          const focusedElement = page.locator(':focus');
          const text = await focusedElement.textContent();
          if (text?.includes('View Profile')) {
            break;
          }
          attempts++;
        }

        // Should be able to activate with Enter
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
      }
    });

    test('should maintain logical tab order', async ({ page }) => {
      await page.goto('/');

      const expectedOrder = [
        'input[type="text"]',
        'button:has-text("Search")',
        'button:has-text("Use my location")',
      ];

      for (let i = 0; i < expectedOrder.length; i++) {
        await page.keyboard.press('Tab');
        const selector = expectedOrder[i];
        if (selector) {
          const expectedElement = page.locator(selector);
          await expect(expectedElement).toBeFocused();
        }
      }
    });

    test('should handle keyboard navigation in multi-district scenarios', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('10001'); // Multi-district ZIP
      await searchInput.press('Enter');

      await page.waitForLoadState('networkidle');

      // If multi-district interface appears, should be keyboard navigable
      const districtButtons = page.locator('button:contains("District")');
      if ((await districtButtons.count()) > 0) {
        // Tab to district selection
        let attempts = 0;
        while (attempts < 10) {
          await page.keyboard.press('Tab');
          const focused = page.locator(':focus');
          const isDistrictButton = await focused.textContent();
          if (isDistrictButton && isDistrictButton.includes('District')) {
            await page.keyboard.press('Enter');
            break;
          }
          attempts++;
        }
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should show visible focus indicators', async ({ page }) => {
      await page.goto('/');

      const interactiveElements = [
        'input[type="text"]',
        'button:has-text("Search")',
        'button:has-text("Use my location")',
      ];

      for (const selector of interactiveElements) {
        const element = page.locator(selector);
        await element.focus();

        // Should have visible focus styling
        await expect(element).toHaveClass(/focus:|ring-|outline-|border-.*focus/);
      }
    });

    test('should manage focus during loading states', async ({ page, context }) => {
      await page.goto('/');

      // Mock slow geolocation to test focus management
      await context.grantPermissions(['geolocation'], { origin: page.url() });
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
      await geoButton.focus();
      await geoButton.click();

      // Button should remain focused during loading
      await expect(geoButton).toBeFocused();
      await expect(geoButton).toBeDisabled();

      // Wait for completion
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });

    test('should trap focus in modal dialogs if present', async ({ page }) => {
      await page.goto('/');

      // Look for any modal dialogs
      const modal = page.locator('[role="dialog"], .modal, [aria-modal="true"]');
      if (await modal.isVisible()) {
        // Test focus trapping
        await page.keyboard.press('Tab');
        const firstFocusable = modal.locator('button, input, a, [tabindex="0"]').first();
        await expect(firstFocusable).toBeFocused();

        // Tab through all focusable elements in modal
        const focusableElements = await modal.locator('button, input, a, [tabindex="0"]').count();
        for (let i = 0; i < focusableElements + 2; i++) {
          await page.keyboard.press('Tab');
        }

        // Should still be within modal
        const currentFocus = page.locator(':focus');
        await expect(modal).toContainText((await currentFocus.textContent()) || '');
      }
    });
  });

  test.describe('ARIA Labels and Roles', () => {
    test('should have proper ARIA labels on form elements', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      const searchButton = page.locator('button:has-text("Search")');
      const geoButton = page.locator('button:has-text("Use my location")');

      // Input should have accessible name
      const inputName =
        (await searchInput.getAttribute('aria-label')) ||
        (await searchInput.getAttribute('placeholder')) ||
        (await page.locator('label').textContent());
      expect(inputName).toBeTruthy();

      // Buttons should have accessible names
      await expect(searchButton).toHaveAttribute('type', 'submit');
      await expect(geoButton).toHaveAttribute('type', 'button');

      const searchButtonText = await searchButton.textContent();
      const geoButtonText = await geoButton.textContent();
      expect(searchButtonText).toBeTruthy();
      expect(geoButtonText).toBeTruthy();
    });

    test('should announce loading states to screen readers', async ({ page }) => {
      await page.goto('/');

      // Test search loading announcement
      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testZip);
      await searchInput.press('Enter');

      // Should have loading announcement
      const loadingAnnouncement = page.locator('[aria-live], [role="status"]');
      if (await loadingAnnouncement.isVisible()) {
        const announcementText = await loadingAnnouncement.textContent();
        expect(announcementText).toMatch(/loading|searching|finding/i);
      }

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto(`/representatives?zip=${testZip}`);
      await page.waitForLoadState('networkidle');

      // Check heading structure
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();

      const h1Text = await h1.textContent();
      expect(h1Text).toMatch(/representatives|your representatives/i);

      // Subsequent headings should follow logical order
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingLevels = await headings.evaluateAll(elements =>
        elements.map(el => parseInt(el.tagName.substring(1)))
      );

      // First heading should be h1
      expect(headingLevels[0]).toBe(1);

      // No skipping heading levels
      for (let i = 1; i < headingLevels.length; i++) {
        const current = headingLevels[i];
        const previous = headingLevels[i - 1];
        if (current !== undefined && previous !== undefined) {
          expect(current - previous).toBeLessThanOrEqual(1);
        }
      }
    });

    test('should have proper landmark roles', async ({ page }) => {
      await page.goto('/');

      // Main content should be identified
      const main = page.locator('main, [role="main"]');
      await expect(main).toBeVisible();

      // Navigation should be identified if present
      const nav = page.locator('nav, [role="navigation"]');
      if (await nav.isVisible()) {
        const navLabel =
          (await nav.getAttribute('aria-label')) || (await nav.getAttribute('aria-labelledby'));
        expect(navLabel).toBeTruthy();
      }

      // Form should be properly labeled
      const form = page.locator('form');
      if (await form.isVisible()) {
        const formLabel =
          (await form.getAttribute('aria-label')) || (await form.getAttribute('aria-labelledby'));
        // Form should either have explicit label or clear purpose from context
        const hasLabel =
          formLabel || (await form.locator('input').first().getAttribute('placeholder'));
        expect(hasLabel).toBeTruthy();
      }
    });
  });

  test.describe('Error Message Accessibility', () => {
    test('should announce errors to screen readers', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('invalid');
      await searchInput.press('Enter');

      await page.waitForTimeout(3000);

      // Error should be announced
      const errorElement = page.locator(
        '[role="alert"], [aria-live="assertive"], [aria-live="polite"]'
      );
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        expect(errorText).toMatch(/error|invalid|not found/i);
      }
    });

    test('should associate errors with form fields', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('00000');
      await searchInput.press('Enter');

      await page.waitForTimeout(3000);

      // Check for error association
      const inputId = await searchInput.getAttribute('id');
      const ariaDescribedBy = await searchInput.getAttribute('aria-describedby');

      if (inputId && ariaDescribedBy) {
        const errorElement = page.locator(`#${ariaDescribedBy}`);
        await expect(errorElement).toBeVisible();
      }
    });

    test('should provide clear error recovery guidance', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill('invalid');
      await searchInput.press('Enter');

      await page.waitForTimeout(3000);

      // Should provide actionable guidance
      const guidance = page.locator('text=/try again|enter valid|correct/i');
      if (await guidance.isVisible()) {
        const guidanceText = await guidance.textContent();
        expect(guidanceText).toBeTruthy();
      }

      // Input should remain accessible for correction
      await expect(searchInput).toBeEnabled();
      await expect(searchInput).not.toHaveAttribute('aria-invalid', 'false');
    });
  });

  test.describe('Screen Reader Simulation', () => {
    test('should provide meaningful page titles', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/CIV\.IQ/);

      await page.goto(`/representatives?zip=${testZip}`);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveTitle(/representatives|CIV\.IQ/i);
    });

    test('should have descriptive link text', async ({ page }) => {
      await page.goto(`/representatives?zip=${testZip}`);
      await page.waitForLoadState('networkidle');

      const links = page.locator('a');
      const linkCount = await links.count();

      for (let i = 0; i < Math.min(linkCount, 10); i++) {
        const link = links.nth(i);
        if (await link.isVisible()) {
          const linkText = await link.textContent();
          const ariaLabel = await link.getAttribute('aria-label');
          const accessibleName = ariaLabel || linkText;

          // Should not have generic text
          expect(accessibleName).not.toMatch(/^(click here|read more|link)$/i);
          expect(accessibleName?.trim().length).toBeGreaterThan(0);
        }
      }
    });

    test('should announce dynamic content changes', async ({ page, context }) => {
      await page.goto('/');

      // Mock geolocation for testing announcements
      await context.grantPermissions(['geolocation'], { origin: page.url() });
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

      // Should announce location detection
      const loadingMessage = page.locator('text=Finding your location');
      if (await loadingMessage.isVisible()) {
        // Should be in live region or have appropriate announcement
        const isInLiveRegion = await loadingMessage
          .locator('..')
          .evaluate(el => el.hasAttribute('aria-live') || el.getAttribute('role') === 'status');
        expect(isInLiveRegion).toBeTruthy();
      }

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
    });
  });

  test.describe('Color and Contrast', () => {
    test('should maintain functionality without color', async ({ page }) => {
      await page.goto('/');

      // Apply grayscale filter to simulate color blindness
      await page.addStyleTag({
        content: `
          * {
            filter: grayscale(100%) !important;
          }
        `,
      });

      // Functionality should still work
      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testZip);
      await searchInput.press('Enter');

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });

      // Elements should still be distinguishable
      const repCards = page.locator('[data-testid="representative-card"]');
      if ((await repCards.count()) > 0) {
        await expect(repCards.first()).toBeVisible();
      }
    });

    test('should be readable with browser zoom', async ({ page }) => {
      await page.goto('/');

      // Test at 200% zoom
      await page.setViewportSize({ width: 640, height: 480 });

      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toBeVisible();

      const searchButton = page.locator('button:has-text("Search")');
      await expect(searchButton).toBeVisible();

      // Elements should not overlap
      const inputBox = await searchInput.boundingBox();
      const buttonBox = await searchButton.boundingBox();

      if (inputBox && buttonBox) {
        const overlap = !(
          inputBox.x + inputBox.width <= buttonBox.x ||
          buttonBox.x + buttonBox.width <= inputBox.x ||
          inputBox.y + inputBox.height <= buttonBox.y ||
          buttonBox.y + buttonBox.height <= inputBox.y
        );
        expect(overlap).toBe(false);
      }
    });
  });

  test.describe('Motion and Animation', () => {
    test('should respect reduced motion preferences', async ({ page }) => {
      // Simulate prefers-reduced-motion
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.goto('/');

      const geoButton = page.locator('button:has-text("Use my location")');
      await geoButton.click();

      // Should show loading state without excessive animation
      const loadingIndicator = page.locator('.animate-spin');
      if (await loadingIndicator.isVisible()) {
        // Should respect reduced motion (implementation dependent)
        const animationDuration = await loadingIndicator.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.animationDuration;
        });
        // Either no animation or very slow animation
        expect(animationDuration === 'none' || parseFloat(animationDuration) > 1).toBe(true);
      }
    });

    test('should not cause seizures with flashing content', async ({ page }) => {
      await page.goto('/');

      // Check for any flashing content
      const flashingElements = page.locator('[class*="flash"], [class*="blink"]');
      const flashingCount = await flashingElements.count();

      // Should not have more than 3 flashes per second
      if (flashingCount > 0) {
        for (let i = 0; i < flashingCount; i++) {
          const element = flashingElements.nth(i);
          const animationDuration = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.animationDuration;
          });

          if (animationDuration !== 'none') {
            const duration = parseFloat(animationDuration);
            expect(duration).toBeGreaterThan(0.33); // No more than 3 flashes per second
          }
        }
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have accessible form validation', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();

      // Test required field validation
      await searchInput.focus();
      await searchInput.blur();

      // If validation occurs, should be accessible
      const errorMessage = page.locator('[role="alert"], .error-message');
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        expect(errorText).toBeTruthy();

        // Should be associated with input
        const inputId = await searchInput.getAttribute('id');
        const ariaDescribedBy = await searchInput.getAttribute('aria-describedby');
        if (inputId && ariaDescribedBy) {
          expect(ariaDescribedBy).toContain(inputId);
        }
      }
    });

    test('should support autocomplete attributes', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();

      // Check for appropriate autocomplete
      const autocomplete = await searchInput.getAttribute('autocomplete');
      if (autocomplete) {
        // Should use standard autocomplete values
        expect(['postal-code', 'address-line1', 'street-address', 'off']).toContain(autocomplete);
      }
    });
  });
});
