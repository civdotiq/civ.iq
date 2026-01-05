/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/floor-schedule/route';
import { createMockRequest } from '../../utils/test-helpers';

// Mock the cache module
jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((key, fetcher) => fetcher()),
}));

// Mock the logger
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    metric: jest.fn(),
  },
}));

// Mock House XML response
const mockHouseXml = `<?xml version="1.0" encoding="UTF-8"?>
<floor-items week-date="January 6, 2025" update-date="2025-01-06T10:00:00">
  <category sort-order="1">Bills Under Suspension of the Rules</category>
  <floor-item id="item1" add-date="2025-01-04" publish-date="2025-01-05">
    <legis-num>H.R. 123</legis-num>
    <floor-text>A bill to improve national security</floor-text>
    <files>
      <file doc-url="https://docs.house.gov/hr123.pdf" doc-type="PDF" />
    </files>
  </floor-item>
  <category sort-order="2">Bills Pursuant to a Rule</category>
  <floor-item id="item2" add-date="2025-01-05" publish-date="2025-01-06">
    <legis-num>H.R. 456</legis-num>
    <floor-text>A bill to fund infrastructure</floor-text>
    <files>
      <file doc-url="https://docs.house.gov/hr456.pdf" doc-type="PDF" />
    </files>
  </floor-item>
</floor-items>`;

// Mock Senate JSON response
const mockSenateJson = {
  floorProceedings: [
    {
      conveneHour: '10',
      conveneMinutes: '00',
      conveneYear: '2025',
      conveneMonth: '01',
      conveneDay: '06',
      convenedSessionStream: 'https://www.senate.gov/floor/live-stream',
      lastUpdated: '2025-01-06T09:00:00Z',
    },
  ],
};

describe('/api/floor-schedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('docs.house.gov')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockHouseXml),
        });
      }
      if (url.includes('senate.gov')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockSenateJson),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });
  });

  describe('Success Cases', () => {
    it('should return floor schedule data for both chambers', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('house');
      expect(data).toHaveProperty('senate');
      expect(data).toHaveProperty('liveStreams');
      expect(data).toHaveProperty('metadata');
    });

    it('should return only house schedule when chamber=house', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule?chamber=house');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.house.items.length).toBeGreaterThanOrEqual(0);
      expect(data.senate.session).toBeNull();
    });

    it('should return only senate schedule when chamber=senate', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule?chamber=senate');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.house.items).toEqual([]);
    });
  });

  describe('House Schedule Parsing', () => {
    it('should parse House XML correctly', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(data.house.weekOf).toBe('January 6, 2025');
      expect(data.house.lastUpdated).toBe('2025-01-06T10:00:00');
    });

    it('should extract floor items from XML', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(data.house.items.length).toBeGreaterThan(0);
      if (data.house.items.length > 0) {
        const item = data.house.items[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('legisNum');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('documents');
      }
    });

    it('should categorize items (suspension, rule, other)', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(data.house.categories).toHaveProperty('suspension');
      expect(data.house.categories).toHaveProperty('rule');
      expect(data.house.categories).toHaveProperty('other');
      expect(Array.isArray(data.house.categories.suspension)).toBe(true);
      expect(Array.isArray(data.house.categories.rule)).toBe(true);
      expect(Array.isArray(data.house.categories.other)).toBe(true);
    });
  });

  describe('Senate Schedule Parsing', () => {
    it('should parse Senate JSON correctly', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      if (data.senate.session) {
        expect(data.senate.session.conveneTime).toBe('10:00 AM');
        expect(data.senate.session.conveneDate).toBe('2025-01-06');
      }
    });

    it('should include stream URL when available', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      if (data.senate.session) {
        expect(data.senate.session).toHaveProperty('streamUrl');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle House API errors gracefully', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('docs.house.gov')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        if (url.includes('senate.gov')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockSenateJson),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.house.items).toEqual([]);
    });

    it('should handle Senate API errors gracefully', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('docs.house.gov')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(mockHouseXml),
          });
        }
        if (url.includes('senate.gov')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.senate.session).toBeNull();
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(data.house.items).toEqual([]);
      expect(data.senate.session).toBeNull();
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields in response', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('house');
      expect(data).toHaveProperty('senate');
      expect(data).toHaveProperty('liveStreams');
      expect(data).toHaveProperty('metadata');
    });

    it('should include house structure fields', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(data.house).toHaveProperty('weekOf');
      expect(data.house).toHaveProperty('lastUpdated');
      expect(data.house).toHaveProperty('items');
      expect(data.house).toHaveProperty('categories');
      expect(data.house).toHaveProperty('sourceUrl');
    });

    it('should include senate structure fields', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(data.senate).toHaveProperty('session');
      expect(data.senate).toHaveProperty('sourceUrl');
    });

    it('should include live stream URLs', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(data.liveStreams).toHaveProperty('house');
      expect(data.liveStreams).toHaveProperty('senate');
      expect(data.liveStreams).toHaveProperty('houseYouTube');
      expect(data.liveStreams.house).toBe('https://live.house.gov/');
      expect(data.liveStreams.senate).toBe('https://www.senate.gov/floor/');
    });

    it('should include metadata with data sources', async () => {
      const request = createMockRequest('http://localhost:3000/api/floor-schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(data.metadata?.dataSources).toContain('docs.house.gov');
      expect(data.metadata?.dataSources).toContain('senate.gov');
      expect(data.metadata?.generatedAt).toBeDefined();
    });
  });
});
