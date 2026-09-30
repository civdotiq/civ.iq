/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * The homepage lookup (search-growth Phase 4b): address or device location
 * in, members of Congress and state legislators out, on the same page. A bare
 * ZIP asks for the street address. The old ZIP/address result pages 308 to
 * /your-reps without carrying the query.
 */

import { test, expect } from '@playwright/test';

const bar = (page: import('@playwright/test').Page) => page.getByLabel('Your home address');

test.describe('Address lookup', () => {
  test('a bare ZIP asks for the street address', async ({ page }) => {
    await page.goto('/');
    await bar(page).fill('48933');
    await page.getByRole('button', { name: 'SEARCH' }).click();

    await expect(page.getByText(/Add your street address/)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('an address shows Congress and the state legislature in place', async ({ page }) => {
    await page.goto('/');
    await bar(page).fill('100 N Capitol Ave, Lansing, MI 48933');
    await page.getByRole('button', { name: 'SEARCH' }).click();

    await expect(page.getByRole('heading', { name: 'Your members of Congress' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: /Your State Senator/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Your State Representative/ })).toBeVisible();
    // The address never lands in the URL.
    await expect(page).toHaveURL(/\/$/);
  });

  test('"Use my location" answers from the device position', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 42.7336, longitude: -84.5555 }); // Lansing
    await page.goto('/');
    await page.getByRole('button', { name: /Use my location/ }).click();

    await expect(page.getByText(/Results for your device’s location/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: 'Your members of Congress' })).toBeVisible();
  });

  for (const from of [
    '/results?q=100%20Main%20St%2C%20Detroit%2C%20MI',
    '/results?zip=48221',
    '/representatives?zip=48221',
    '/representatives?address=100%20Main%20St',
  ]) {
    test(`${from} 308s to /your-reps without the query`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status()).toBe(308);
      expect(new URL(res.headers()['location'] ?? '', 'http://x').pathname).toBe('/your-reps');
      expect(res.headers()['location']).not.toContain('?');
    });
  }

  test('the /representatives directory itself stays', async ({ request }) => {
    const res = await request.get('/representatives', { maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });
});
