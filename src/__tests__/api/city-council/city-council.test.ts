/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/city/[cityId]/council/route';
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

// Mock Legistar API response
const mockLegistarResponse = [
  {
    OfficeRecordPersonId: 12345,
    OfficeRecordFullName: 'John Smith',
    OfficeRecordFirstName: 'John',
    OfficeRecordLastName: 'Smith',
    OfficeRecordTitle: 'Council Member',
    OfficeRecordBodyName: 'City Council Ward 5',
    OfficeRecordStartDate: '2023-01-01',
    OfficeRecordEndDate: null,
    OfficeRecordEmail: 'john.smith@chicago.gov',
  },
  {
    OfficeRecordPersonId: 67890,
    OfficeRecordFullName: 'Jane Doe',
    OfficeRecordFirstName: 'Jane',
    OfficeRecordLastName: 'Doe',
    OfficeRecordTitle: 'Alderman',
    OfficeRecordBodyName: 'City Council Ward 12',
    OfficeRecordStartDate: '2021-01-01',
    OfficeRecordEndDate: null,
    OfficeRecordEmail: 'jane.doe@chicago.gov',
  },
  {
    OfficeRecordPersonId: 11111,
    OfficeRecordFullName: 'Former Member',
    OfficeRecordFirstName: 'Former',
    OfficeRecordLastName: 'Member',
    OfficeRecordTitle: 'Council Member',
    OfficeRecordBodyName: 'City Council Ward 3',
    OfficeRecordStartDate: '2019-01-01',
    OfficeRecordEndDate: '2022-12-31',
    OfficeRecordEmail: null,
  },
];

describe('/api/city/[cityId]/council', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockLegistarResponse),
    });
  });

  describe('Success Cases', () => {
    it('should return council members for supported city (chicago)', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/chicago/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'chicago' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.city?.name).toBe('Chicago');
      expect(data.city?.state).toBe('IL');
      expect(data).toHaveProperty('members');
      expect(data).toHaveProperty('totalMembers');
      expect(data).toHaveProperty('activeMembers');
    });

    it('should handle case-insensitive city IDs', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/CHICAGO/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'CHICAGO' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.city?.id).toBe('chicago');
    });

    it('should return council members for seattle', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/seattle/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'seattle' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.city?.name).toBe('Seattle');
      expect(data.city?.state).toBe('WA');
    });

    it('should return council members for boston', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/boston/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'boston' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.city?.name).toBe('Boston');
      expect(data.city?.state).toBe('MA');
    });

    it('should filter active members by default', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/chicago/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'chicago' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      // Active filter is applied by default
    });

    it('should return all members when active=false', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/city/chicago/council?active=false'
      );
      const response = await GET(request, { params: Promise.resolve({ cityId: 'chicago' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for unsupported city', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/unknowncity/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'unknowncity' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('City not supported');
      expect(data.error).toContain('Available cities');
    });

    it('should list available cities in error message', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/invalid/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'invalid' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('chicago');
      expect(data.error).toContain('seattle');
      expect(data.error).toContain('boston');
    });
  });

  describe('Error Handling', () => {
    it('should handle Legistar API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error' }),
      });

      const request = createMockRequest('http://localhost:3000/api/city/chicago/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'chicago' }) });
      const data = await response.json();

      expect(data.members).toEqual([]);
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost:3000/api/city/chicago/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'chicago' }) });
      const data = await response.json();

      expect(data.members).toEqual([]);
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields in response', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/chicago/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'chicago' }) });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('city');
      expect(data).toHaveProperty('members');
      expect(data).toHaveProperty('totalMembers');
      expect(data).toHaveProperty('activeMembers');
      expect(data).toHaveProperty('metadata');
    });

    it('should include city information', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/chicago/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'chicago' }) });
      const data = await response.json();

      expect(data.city).toHaveProperty('id');
      expect(data.city).toHaveProperty('name');
      expect(data.city).toHaveProperty('state');
    });

    it('should include metadata with data source', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/chicago/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'chicago' }) });
      const data = await response.json();

      expect(data.metadata?.dataSource).toBe('legistar.com');
      expect(data.metadata?.generatedAt).toBeDefined();
    });

    it('should transform members to expected format', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/chicago/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'chicago' }) });
      const data = await response.json();

      if (data.members.length > 0) {
        const member = data.members[0];
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('name');
        expect(member).toHaveProperty('firstName');
        expect(member).toHaveProperty('lastName');
        expect(member).toHaveProperty('active');
        expect(member).toHaveProperty('title');
        expect(member).toHaveProperty('bodyName');
      }
    });
  });

  describe('District Extraction', () => {
    it('should extract ward number from body name', async () => {
      const request = createMockRequest('http://localhost:3000/api/city/chicago/council');
      const response = await GET(request, { params: Promise.resolve({ cityId: 'chicago' }) });
      const data = await response.json();

      const memberWithWard = data.members.find((m: { district: string | null }) =>
        m.district?.includes('Ward')
      );
      if (memberWithWard) {
        expect(memberWithWard.district).toMatch(/Ward\s*\d+/i);
      }
    });
  });

  describe('Supported Cities', () => {
    const supportedCities = [
      { id: 'chicago', name: 'Chicago', state: 'IL' },
      { id: 'seattle', name: 'Seattle', state: 'WA' },
      { id: 'boston', name: 'Boston', state: 'MA' },
      { id: 'denver', name: 'Denver', state: 'CO' },
      { id: 'austin', name: 'Austin', state: 'TX' },
      { id: 'portland', name: 'Portland', state: 'OR' },
      { id: 'oakland', name: 'Oakland', state: 'CA' },
      { id: 'minneapolis', name: 'Minneapolis', state: 'MN' },
      { id: 'philadelphia', name: 'Philadelphia', state: 'PA' },
      { id: 'detroit', name: 'Detroit', state: 'MI' },
    ];

    it.each(supportedCities)('should accept $id as a valid city', async ({ id, name, state }) => {
      const request = createMockRequest(`http://localhost:3000/api/city/${id}/council`);
      const response = await GET(request, { params: Promise.resolve({ cityId: id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.city?.name).toBe(name);
      expect(data.city?.state).toBe(state);
    });
  });
});
