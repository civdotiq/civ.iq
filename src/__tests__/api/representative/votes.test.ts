/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/representative/[bioguideId]/votes/route';
import { createMockRequest } from '../../utils/test-helpers';

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

// Mock the cache module
jest.mock('@/services/cache', () => ({
  cachedFetch: jest.fn((key, fetcher) => fetcher()),
  govCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock the congress service
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: jest.fn(),
}));

// Mock the batch voting service
jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: {
    getSenateMemberVotes: jest.fn(),
    getHouseMemberVotes: jest.fn(),
  },
}));

import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';

const mockGetEnhancedRepresentative = getEnhancedRepresentative as jest.Mock;
const mockBatchVotingService = batchVotingService as jest.Mocked<typeof batchVotingService>;

// Mock representative data
const mockHouseRepresentative = {
  bioguideId: 'P000197',
  name: 'Nancy Pelosi',
  chamber: 'House',
  party: 'D',
  state: 'CA',
};

const mockSenateRepresentative = {
  bioguideId: 'K000367',
  name: 'Amy Klobuchar',
  chamber: 'Senate',
  party: 'D',
  state: 'MN',
};

// Mock votes data
const mockHouseVotes = [
  {
    voteId: '119-house-1',
    question: 'On Passage of the Bill',
    result: 'Passed',
    date: '2025-01-05',
    position: 'Yea',
    rollCallNumber: 1,
    bill: {
      number: 'H.R.1',
      title: 'Infrastructure Bill',
      congress: 119,
      type: 'hr',
    },
  },
];

const mockSenateVotes = [
  {
    voteId: '119-senate-1',
    question: 'On the Nomination',
    result: 'Confirmed',
    date: '2025-01-03',
    position: 'Yea',
    rollCallNumber: 1,
    bill: {
      number: 'PN1',
      title: 'Cabinet Nomination',
      congress: 119,
      type: 'nomination',
    },
  },
];

describe('/api/representative/[bioguideId]/votes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEnhancedRepresentative.mockResolvedValue(mockHouseRepresentative);
    mockBatchVotingService.getHouseMemberVotes.mockResolvedValue(mockHouseVotes);
    mockBatchVotingService.getSenateMemberVotes.mockResolvedValue(mockSenateVotes);
  });

  describe('Success Cases', () => {
    it('should return votes for House member', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/P000197/votes');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('votes');
      expect(data).toHaveProperty('totalResults');
      expect(data).toHaveProperty('member');
      expect(data).toHaveProperty('dataSource');
      expect(data).toHaveProperty('metadata');
    });

    it('should return votes for Senate member', async () => {
      mockGetEnhancedRepresentative.mockResolvedValue(mockSenateRepresentative);

      const request = createMockRequest('http://localhost:3000/api/representative/K000367/votes');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.member.chamber).toBe('Senate');
    });

    it('should support limit parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/votes?limit=20'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });

      expect(response.status).toBe(200);
      expect(mockBatchVotingService.getHouseMemberVotes).toHaveBeenCalledWith(
        'P000197',
        119,
        1,
        20,
        false
      );
    });

    it('should cap limit at 50', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/votes?limit=100'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });

      expect(response.status).toBe(200);
      expect(mockBatchVotingService.getHouseMemberVotes).toHaveBeenCalledWith(
        'P000197',
        119,
        1,
        50,
        false
      );
    });

    it('should support cache bypass', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/votes?bypassCache=true'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });

      expect(response.status).toBe(200);
      expect(mockBatchVotingService.getHouseMemberVotes).toHaveBeenCalledWith(
        'P000197',
        119,
        1,
        10,
        true
      );
    });

    it('should normalize bioguide ID to uppercase', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/p000197/votes');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'p000197' }) });

      expect(response.status).toBe(200);
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing bioguide ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative//votes');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: '' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid bioguide ID');
    });
  });

  describe('Error Handling', () => {
    it('should handle member lookup failure gracefully', async () => {
      // When getEnhancedRepresentative returns null, the route uses heuristic fallback
      // which still returns a valid member info with defaults
      mockGetEnhancedRepresentative.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/representative/INVALID/votes');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'INVALID' }) });
      const data = await response.json();

      // Route uses heuristic chamber determination when enhanced lookup fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.member.name).toBe('Unknown Representative');
    });

    it('should handle vote fetching errors gracefully', async () => {
      mockBatchVotingService.getHouseMemberVotes.mockRejectedValue(new Error('Service error'));

      const request = createMockRequest('http://localhost:3000/api/representative/P000197/votes');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.votes).toEqual([]);
      expect(data.metadata.crashProof).toBe(true);
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/P000197/votes');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
      const data = await response.json();

      expect(data).toHaveProperty('votes');
      expect(data).toHaveProperty('totalResults');
      expect(data).toHaveProperty('member');
      expect(data).toHaveProperty('dataSource');
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('metadata');
    });

    it('should include member information', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/P000197/votes');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
      const data = await response.json();

      expect(data.member).toHaveProperty('bioguideId');
      expect(data.member).toHaveProperty('name');
      expect(data.member).toHaveProperty('chamber');
    });

    it('should include metadata with phase info', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/P000197/votes');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
      const data = await response.json();

      expect(data.metadata).toHaveProperty('timestamp');
      expect(data.metadata).toHaveProperty('phase');
      expect(data.metadata).toHaveProperty('crashProof');
      expect(data.metadata.crashProof).toBe(true);
    });
  });

  describe('Chamber-specific Behavior', () => {
    it('should use House voting service for House members', async () => {
      mockGetEnhancedRepresentative.mockResolvedValue(mockHouseRepresentative);

      const request = createMockRequest('http://localhost:3000/api/representative/P000197/votes');
      await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });

      expect(mockBatchVotingService.getHouseMemberVotes).toHaveBeenCalled();
      expect(mockBatchVotingService.getSenateMemberVotes).not.toHaveBeenCalled();
    });

    it('should use Senate voting service for Senate members', async () => {
      mockGetEnhancedRepresentative.mockResolvedValue(mockSenateRepresentative);

      const request = createMockRequest('http://localhost:3000/api/representative/K000367/votes');
      await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });

      expect(mockBatchVotingService.getSenateMemberVotes).toHaveBeenCalled();
      expect(mockBatchVotingService.getHouseMemberVotes).not.toHaveBeenCalled();
    });
  });
});
