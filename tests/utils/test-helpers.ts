/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Page } from '@playwright/test';
import { mockRepresentativeData, mockVotingData, mockFinanceData } from '../fixtures/representative-data';

export class TestHelper {
  constructor(private page: Page) {}

  // Mock all API endpoints with success responses
  async mockSuccessfulAPIs() {
    await this.page.route('**/api/representatives*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRepresentativeData)
      })
    );

    await this.page.route('**/api/representative/*/votes*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVotingData)
      })
    );

    await this.page.route('**/api/representative/*/finance*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFinanceData)
      })
    );
  }

  // Mock API failures
  async mockAPIFailures() {
    await this.page.route('**/api/**', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      })
    );
  }

  // Mock slow API responses
  async mockSlowAPIs(delay: number = 3000) {
    await this.page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });
  }

  // Fill ZIP code and submit
  async searchZipCode(zipCode: string) {
    const zipInput = this.page.locator('input[type="text"]').first();
    await zipInput.fill(zipCode);
    await zipInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  // Wait for representatives to load
  async waitForRepresentatives() {
    await this.page.waitForSelector('[data-testid="representative-card"]', { timeout: 10000 });
  }

  // Check if error message is displayed
  async hasErrorMessage() {
    return await this.page.locator('text=/error|failed|unavailable/i').count() > 0;
  }

  // Check if loading state is displayed
  async hasLoadingState() {
    return await this.page.locator('text=/loading|searching/i').count() > 0;
  }

  // Navigate to representative detail page
  async goToRepresentativeDetail(bioguideId: string) {
    await this.page.goto(`/representative/${bioguideId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // Click on a tab (if tabs exist)
  async clickTab(tabName: string) {
    const tab = this.page.locator(`button:has-text("${tabName}")`);
    if (await tab.count() > 0) {
      await tab.click();
    }
  }

  // Check if data is displayed
  async hasDataDisplayed(selector: string) {
    return await this.page.locator(selector).count() > 0;
  }

  // Get page title
  async getTitle() {
    return await this.page.title();
  }

  // Check if page has specific content
  async hasContent(text: string) {
    return await this.page.locator(`text=${text}`).count() > 0;
  }

  // Take screenshot for debugging
  async screenshot(name: string) {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }
}

export { mockRepresentativeData, mockVotingData, mockFinanceData };