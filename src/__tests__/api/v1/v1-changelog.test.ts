/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * V1 Changelog Route Tests
 */

import { GET } from '@/app/api/v1/changelog/route';

describe('GET /api/v1/changelog', () => {
  it('should return 200', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('should return v1 envelope with data and meta', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
  });

  it('should include currentVersion string', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.data.currentVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should include versions array with at least one entry', async () => {
    const response = await GET();
    const body = await response.json();
    expect(Array.isArray(body.data.versions)).toBe(true);
    expect(body.data.versions.length).toBeGreaterThanOrEqual(1);
  });

  it('should have version, date, and changes in each version entry', async () => {
    const response = await GET();
    const body = await response.json();
    const version = body.data.versions[0];
    expect(version).toHaveProperty('version');
    expect(version).toHaveProperty('date');
    expect(version).toHaveProperty('changes');
    expect(Array.isArray(version.changes)).toBe(true);
    expect(version.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should set X-API-Version header', async () => {
    const response = await GET();
    expect(response.headers.get('X-API-Version')).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
