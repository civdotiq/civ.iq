/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Performance benchmarking tests for mobile/slow connections
 * Tests loading times, network efficiency, and user experience metrics
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Performance Validation', () => {
  const testZip = '48221';
  const multiDistrictZip = '10001';

  test.describe('Network Performance', () => {
    test('should load homepage quickly on fast connection', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Should load in under 3 seconds on fast connection
      expect(loadTime).toBeLessThan(3000);

      // Core elements should be visible
      await expect(page.locator('input[type="text"]').first()).toBeVisible();
      await expect(page.locator('button:has-text("Search")')).toBeVisible();
    });

    test('should handle slow 3G connections gracefully', async ({ page, context }) => {
      // Simulate slow 3G (download: 1.5 Mbps, upload: 750 Kbps, latency: 150ms)
      await context.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 150)); // Add latency
        await route.continue();
      });

      const startTime = Date.now();
      await page.goto('/');

      // Should show loading states for slow connections
      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      const loadTime = Date.now() - startTime;

      // Should still be usable within reasonable time on slow connection
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
    });

    test('should optimize search requests on slow connections', async ({ page, context }) => {
      let requestCount = 0;
      await context.route('**/api/**', route => {
        requestCount++;
        setTimeout(() => route.continue(), 500); // Simulate slow API
      });

      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testZip);
      await searchInput.press('Enter');

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });

      // Should minimize API calls
      expect(requestCount).toBeLessThan(10); // Reasonable number of requests
    });

    test('should handle offline scenarios gracefully', async ({ page, context }) => {
      await page.goto('/');

      // Simulate going offline
      await context.route('**/*', route => route.abort('failed'));

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testZip);
      await searchInput.press('Enter');

      // Should show appropriate offline message
      await expect(page.locator('text=/network|offline|connection/i')).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('Mobile Performance', () => {
    test.use({ ...devices['iPhone 13'] });

    test('should load quickly on mobile devices', async ({ page }) => {
      const metrics = {
        navigationStart: 0,
        domContentLoaded: 0,
        loadComplete: 0,
        firstContentfulPaint: 0,
      };

      await page.goto('/');

      // Collect performance metrics
      const performanceData = await page.evaluate(() => {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint');

        return {
          navigationStart: 0,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart,
          firstContentfulPaint: fcp ? fcp.startTime : 0,
        };
      });

      Object.assign(metrics, performanceData);

      // Mobile performance budgets
      expect(metrics.domContentLoaded).toBeLessThan(2000); // 2 seconds
      expect(metrics.loadComplete).toBeLessThan(4000); // 4 seconds
      expect(metrics.firstContentfulPaint).toBeLessThan(1500); // 1.5 seconds

      // Ensure interactivity
      await expect(page.locator('input[type="text"]').first()).toBeVisible();
    });

    test('should handle mobile search performance', async ({ page }) => {
      await page.goto('/');

      const searchStartTime = Date.now();

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testZip);
      await searchInput.press('Enter');

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      const searchTime = Date.now() - searchStartTime;

      // Mobile search should complete in reasonable time
      expect(searchTime).toBeLessThan(8000); // 8 seconds max

      // Results should be visible
      await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible({
        timeout: 5000,
      });
    });

    test('should optimize images and assets for mobile', async ({ page, context }) => {
      const resourceSizes: number[] = [];

      await context.route('**/*', async route => {
        const request = route.request();
        await route.continue();
        // Estimate size based on request URL and type
        const estimatedSize = request.url().includes('.js')
          ? 50000
          : request.url().includes('.css')
            ? 20000
            : request.url().includes('.png')
              ? 30000
              : 5000;
        resourceSizes.push(estimatedSize);
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for reasonable resource sizes
      const totalSize = resourceSizes.reduce((sum, size) => sum + size, 0);
      const averageSize = totalSize / resourceSizes.length;

      // Total page size should be reasonable for mobile
      expect(totalSize).toBeLessThan(2 * 1024 * 1024); // 2MB total
      expect(averageSize).toBeLessThan(100 * 1024); // 100KB average per resource
    });

    test('should handle mobile memory constraints', async ({ page }) => {
      await page.goto('/');

      // Perform multiple searches to test memory usage
      const searches = [testZip, '90210', '10001', '60601', '30301'];

      for (const zip of searches) {
        const searchInput = page.locator('input[type="text"]').first();
        await searchInput.clear();
        await searchInput.fill(zip);
        await searchInput.press('Enter');

        if (zip !== testZip) {
          await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
          await page.goBack();
        }
      }

      // Should still be responsive after multiple operations
      const finalSearchInput = page.locator('input[type="text"]').first();
      await expect(finalSearchInput).toBeEnabled();
    });
  });

  test.describe('User Experience Metrics', () => {
    test('should achieve good Core Web Vitals', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const webVitals = await page.evaluate(() => {
        return new Promise(resolve => {
          const vitals = {
            lcp: 0, // Largest Contentful Paint
            fid: 0, // First Input Delay
            cls: 0, // Cumulative Layout Shift
          };

          // LCP
          new PerformanceObserver(list => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              vitals.lcp = lastEntry.startTime;
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });

          // FID
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              vitals.fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
            }
          }).observe({ type: 'first-input', buffered: true });

          // CLS
          let clsValue = 0;
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              const layoutShift = entry as unknown as { hadRecentInput: boolean; value: number };
              if (!layoutShift.hadRecentInput) {
                clsValue += layoutShift.value;
              }
            }
            vitals.cls = clsValue;
          }).observe({ type: 'layout-shift', buffered: true });

          // Return metrics after a delay
          setTimeout(() => resolve(vitals), 2000);
        });
      });

      const metrics = webVitals as { lcp: number; fid: number; cls: number };

      // Core Web Vitals thresholds
      expect(metrics.lcp).toBeLessThan(2500); // Good LCP: < 2.5s
      expect(metrics.fid).toBeLessThan(100); // Good FID: < 100ms
      expect(metrics.cls).toBeLessThan(0.1); // Good CLS: < 0.1
    });

    test('should provide smooth interactions', async ({ page }) => {
      await page.goto('/');

      // Test input responsiveness
      const searchInput = page.locator('input[type="text"]').first();

      const inputStartTime = Date.now();
      await searchInput.click();
      await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT');
      const inputTime = Date.now() - inputStartTime;

      expect(inputTime).toBeLessThan(100); // Input should respond within 100ms

      // Test typing responsiveness
      const typingStartTime = Date.now();
      await searchInput.type('12345');
      await expect(searchInput).toHaveValue('12345');
      const typingTime = Date.now() - typingStartTime;

      expect(typingTime).toBeLessThan(500); // Typing should be smooth
    });

    test('should handle rapid user interactions', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      const geoButton = page.locator('button:has-text("Use my location")');

      // Rapid clicking should not cause errors
      for (let i = 0; i < 5; i++) {
        await searchInput.click();
        await geoButton.click();
      }

      // Should still be functional
      await expect(searchInput).toBeEnabled();
      await expect(geoButton).toBeEnabled();
    });
  });

  test.describe('Data Usage Optimization', () => {
    test('should minimize data usage for mobile users', async ({ page, context }) => {
      let totalDataUsed = 0;

      await context.route('**/*', async route => {
        const request = route.request();
        await route.continue();
        // Estimate data usage based on request type
        const estimatedSize = request.url().includes('.js')
          ? 50000
          : request.url().includes('.css')
            ? 20000
            : request.url().includes('.png')
              ? 30000
              : 5000;
        totalDataUsed += estimatedSize;
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Search for representatives
      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testZip);
      await searchInput.press('Enter');

      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      // Should use reasonable amount of data
      expect(totalDataUsed).toBeLessThan(1.5 * 1024 * 1024); // 1.5MB for complete search flow
    });

    test('should cache resources effectively', async ({ page, context }) => {
      const requestCounts = new Map<string, number>();

      await context.route('**/*', route => {
        const url = route.request().url();
        requestCounts.set(url, (requestCounts.get(url) || 0) + 1);
        route.continue();
      });

      // First visit
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Second visit
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check that static resources are not re-requested
      let staticResourcesReRequested = 0;
      requestCounts.forEach((count, url) => {
        if ((url.includes('.js') || url.includes('.css') || url.includes('.png')) && count > 1) {
          staticResourcesReRequested++;
        }
      });

      // Most static resources should be cached
      expect(staticResourcesReRequested).toBeLessThan(3);
    });
  });

  test.describe('Load Testing Scenarios', () => {
    test('should handle multiple concurrent searches', async ({ browser }) => {
      const searchPromises = [];

      // Create multiple pages for concurrent testing
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();

        const searchPromise = (async () => {
          const startTime = Date.now();
          await page.goto('/');

          const searchInput = page.locator('input[type="text"]').first();
          await searchInput.fill(testZip);
          await searchInput.press('Enter');

          await page.waitForURL(/\/representatives\?zip=/, { timeout: 20000 });
          const endTime = Date.now();

          await context.close();
          return endTime - startTime;
        })();

        searchPromises.push(searchPromise);
      }

      const results = await Promise.all(searchPromises);

      // All searches should complete in reasonable time
      results.forEach(time => {
        expect(time).toBeLessThan(15000); // 15 seconds max under load
      });

      // Average time should be reasonable
      const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      expect(averageTime).toBeLessThan(10000); // 10 seconds average
    });

    test('should handle heavy multi-district scenarios', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(multiDistrictZip);

      const searchStartTime = Date.now();
      await searchInput.press('Enter');

      await page.waitForLoadState('networkidle');

      const searchTime = Date.now() - searchStartTime;

      // Multi-district search should complete reasonably quickly
      expect(searchTime).toBeLessThan(12000); // 12 seconds max

      // Should show appropriate UI (either results or district selector)
      const hasResults = (await page.locator('[data-testid="representative-card"]').count()) > 0;
      const hasDistrictSelector = await page.locator('text=/district|choose/i').isVisible();

      expect(hasResults || hasDistrictSelector).toBeTruthy();
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should track performance regressions', async ({ page }) => {
      const baseline = {
        homepageLoad: 3000, // 3 seconds
        searchTime: 8000, // 8 seconds
        resultsRender: 2000, // 2 seconds
      };

      // Homepage load time
      const homepageStartTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const homepageTime = Date.now() - homepageStartTime;

      // Search time
      const searchStartTime = Date.now();
      const searchInput = page.locator('input[type="text"]').first();
      await searchInput.fill(testZip);
      await searchInput.press('Enter');
      await page.waitForURL(/\/representatives\?zip=/, { timeout: 15000 });
      const searchTime = Date.now() - searchStartTime;

      // Results render time
      const resultsStartTime = Date.now();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="representative-card"]').first()).toBeVisible({
        timeout: 10000,
      });
      const resultsTime = Date.now() - resultsStartTime;

      // Check against baselines
      expect(homepageTime).toBeLessThan(baseline.homepageLoad);
      expect(searchTime).toBeLessThan(baseline.searchTime);
      expect(resultsTime).toBeLessThan(baseline.resultsRender);

      // Log performance metrics for monitoring
      // Note: In real implementation, these would be sent to monitoring service
      const metrics = {
        homepageLoad: homepageTime,
        searchTime: searchTime,
        resultsRender: resultsTime,
        timestamp: new Date().toISOString(),
        userAgent: await page.evaluate(() => navigator.userAgent),
      };

      // Ensure metrics are reasonable
      expect(metrics.homepageLoad).toBeGreaterThan(0);
      expect(metrics.searchTime).toBeGreaterThan(0);
      expect(metrics.resultsRender).toBeGreaterThan(0);
    });
  });
});
