/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/representative/[bioguideId]/news/route';
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

// Mock the congress service
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: jest.fn(),
}));

// Mock NewsAPI service
jest.mock('@/lib/services/newsapi', () => ({
  fetchRepresentativeNewsAPI: jest.fn(),
}));

// Mock Google News service
jest.mock('@/lib/services/google-news-rss', () => ({
  fetchRepresentativeGoogleNews: jest.fn(),
}));

import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { fetchRepresentativeNewsAPI } from '@/lib/services/newsapi';
import { fetchRepresentativeGoogleNews } from '@/lib/services/google-news-rss';

const mockGetEnhancedRepresentative = getEnhancedRepresentative as jest.Mock;
const mockFetchNewsAPI = fetchRepresentativeNewsAPI as jest.Mock;
const mockFetchGoogleNews = fetchRepresentativeGoogleNews as jest.Mock;

// Mock representative
const mockRepresentative = {
  bioguideId: 'K000367',
  name: 'Amy Klobuchar',
  state: 'MN',
  chamber: 'Senate',
  party: 'D',
};

// Mock news articles
const mockNewsAPIArticles = [
  {
    title: 'Senator Klobuchar Introduces New Bill',
    url: 'https://example.com/article1',
    source: 'Minnesota Star Tribune',
    publishedDate: '2025-01-05T10:00:00Z',
    language: 'en',
    domain: 'startribune.com',
    imageUrl: 'https://example.com/image1.jpg',
    summary: 'Senator Amy Klobuchar introduced new legislation...',
  },
  {
    title: 'Klobuchar on Senate Floor',
    url: 'https://example.com/article2',
    source: 'WCCO',
    publishedDate: '2025-01-04T15:30:00Z',
    language: 'en',
    domain: 'wcco.com',
  },
];

const mockGoogleNewsArticles = [
  {
    title: 'Klobuchar Speaks at Event',
    url: 'https://example.com/article3',
    source: 'MPR News',
    seendate: '2025-01-03T12:00:00Z',
    domain: 'mprnews.org',
    socialimage: 'https://example.com/image3.jpg',
    description: 'Senator spoke at local event...',
  },
];

describe('/api/representative/[bioguideId]/news', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEnhancedRepresentative.mockResolvedValue(mockRepresentative);
    mockFetchNewsAPI.mockResolvedValue(mockNewsAPIArticles);
    mockFetchGoogleNews.mockResolvedValue(mockGoogleNewsArticles);
  });

  describe('Success Cases', () => {
    it('should return news articles for valid bioguide ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/news');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('articles');
      expect(data).toHaveProperty('totalResults');
      expect(data).toHaveProperty('dataSource');
    });

    it('should prefer NewsAPI results', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/news');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.dataSource).toBe('newsapi');
      expect(data.articles.length).toBe(2);
    });

    it('should fall back to Google News when NewsAPI fails', async () => {
      mockFetchNewsAPI.mockResolvedValue([]);

      const request = createMockRequest('http://localhost:3000/api/representative/K000367/news');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.dataSource).toBe('google-news');
    });

    it('should support pagination', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/news?limit=10&page=2'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination).toHaveProperty('currentPage');
      expect(data.pagination).toHaveProperty('limit');
    });

    it('should use default limit of 15', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/news');
      await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });

      expect(mockFetchNewsAPI).toHaveBeenCalledWith(
        mockRepresentative.name,
        mockRepresentative.state,
        mockRepresentative.chamber,
        expect.objectContaining({ pageSize: 30 }) // limit * 2
      );
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing bioguide ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative//news');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: '' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Bioguide ID is required');
    });

    it('should return 404 for non-existent representative', async () => {
      mockGetEnhancedRepresentative.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/representative/INVALID/news');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'INVALID' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Representative not found');
    });
  });

  describe('Error Handling', () => {
    it('should return empty results when all sources fail', async () => {
      mockFetchNewsAPI.mockRejectedValue(new Error('NewsAPI failed'));
      mockFetchGoogleNews.mockRejectedValue(new Error('Google News failed'));

      const request = createMockRequest('http://localhost:3000/api/representative/K000367/news');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles).toEqual([]);
      expect(data.dataSource).toBe('none');
    });

    it('should handle NewsAPI returning empty array', async () => {
      mockFetchNewsAPI.mockResolvedValue([]);

      const request = createMockRequest('http://localhost:3000/api/representative/K000367/news');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dataSource).toBe('google-news');
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/news');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data).toHaveProperty('articles');
      expect(data).toHaveProperty('totalResults');
      expect(data).toHaveProperty('searchTerms');
      expect(data).toHaveProperty('dataSource');
      expect(data).toHaveProperty('pagination');
    });

    it('should include pagination details', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/news');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.pagination).toHaveProperty('currentPage');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('hasNextPage');
      expect(data.pagination).toHaveProperty('totalPages');
    });

    it('should transform articles to expected format', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/news');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      if (data.articles.length > 0) {
        const article = data.articles[0];
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('url');
        expect(article).toHaveProperty('source');
        expect(article).toHaveProperty('publishedDate');
        expect(article).toHaveProperty('domain');
      }
    });
  });

  describe('Source Handling', () => {
    it('should fetch from both sources in parallel', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/news');
      await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });

      expect(mockFetchNewsAPI).toHaveBeenCalled();
      expect(mockFetchGoogleNews).toHaveBeenCalled();
    });

    it('should handle NewsAPI error and use Google News', async () => {
      mockFetchNewsAPI.mockRejectedValue(new Error('API error'));

      const request = createMockRequest('http://localhost:3000/api/representative/K000367/news');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dataSource).toBe('google-news');
    });
  });
});
