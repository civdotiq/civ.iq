/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useDistrictsData } from '../useDistrictsData';

// Mock the logger first
jest.mock('@/lib/logging/simple-logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock district data
const mockDistrictData = {
  districts: [
    {
      id: 'CA-12',
      state: 'CA',
      number: '12',
      name: 'California 12th',
      representative: {
        name: 'John Doe',
        party: 'D',
        imageUrl: 'https://example.com/image.jpg',
      },
      demographics: {
        population: 750000,
        medianIncome: 85000,
        medianAge: 38,
        diversityIndex: 0.7,
        urbanPercentage: 95,
      },
      political: {
        cookPVI: 'D+35',
        lastElection: {
          winner: 'John Doe',
          margin: 35.2,
          turnout: 68.5,
        },
        registeredVoters: 450000,
      },
      geography: {
        area: 150,
        counties: ['San Francisco'],
        majorCities: ['San Francisco'],
      },
    },
  ],
};

describe('useDistrictsData', () => {
  let useSWRMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    localStorage.clear();

    // Get the mocked useSWR
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    useSWRMock = require('swr').default;
  });

  it('should return districts data when fetch succeeds', async () => {
    useSWRMock.mockReturnValue({
      data: mockDistrictData,
      error: undefined,
      isLoading: false,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useDistrictsData());

    await waitFor(() => {
      expect(result.current.districts).toHaveLength(1);
      expect(result.current.apiLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle loading state', () => {
    useSWRMock.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useDistrictsData());

    expect(result.current.apiLoading).toBe(true);
    expect(result.current.districts).toEqual([]);
  });

  it('should handle network errors', async () => {
    const networkError = new Error('fetch failed');
    networkError.message = 'network error';

    useSWRMock.mockReturnValue({
      data: undefined,
      error: networkError,
      isLoading: false,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useDistrictsData());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error. Please check your internet connection.');
      expect(result.current.errorType).toBe('network');
    });
  });

  it('should handle timeout errors', async () => {
    const timeoutError = new Error('Request timeout');
    timeoutError.name = 'AbortError';

    useSWRMock.mockReturnValue({
      data: undefined,
      error: timeoutError,
      isLoading: false,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useDistrictsData());

    await waitFor(() => {
      expect(result.current.error).toBe('Request timed out. Please check your connection.');
      expect(result.current.errorType).toBe('timeout');
    });
  });

  it('should handle rate limit errors', async () => {
    const rateLimitError = new Error('HTTP 429: Too Many Requests');

    useSWRMock.mockReturnValue({
      data: undefined,
      error: rateLimitError,
      isLoading: false,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useDistrictsData());

    await waitFor(() => {
      expect(result.current.error).toBe('Too many requests. Please wait a moment.');
      expect(result.current.errorType).toBe('rate-limit');
    });
  });

  it('should handle server errors', async () => {
    const serverError = new Error('HTTP 500: Internal Server Error');

    useSWRMock.mockReturnValue({
      data: undefined,
      error: serverError,
      isLoading: false,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useDistrictsData());

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Server error. The service may be temporarily unavailable.'
      );
      expect(result.current.errorType).toBe('server');
    });
  });

  it('should provide retry function that calls mutate', async () => {
    const mutateMock = jest.fn();

    useSWRMock.mockReturnValue({
      data: mockDistrictData,
      error: undefined,
      isLoading: false,
      mutate: mutateMock,
    });

    const { result } = renderHook(() => useDistrictsData());

    await waitFor(() => {
      expect(result.current.retry).toBeDefined();
    });

    result.current.retry();
    expect(mutateMock).toHaveBeenCalledTimes(1);
  });

  it('should use cached data from localStorage as fallback', () => {
    // Set cached data
    const cachedData = {
      districts: mockDistrictData.districts,
      timestamp: Date.now(),
    };
    localStorage.setItem('districts-data-v1', JSON.stringify(cachedData));

    useSWRMock.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useDistrictsData());

    // Should have fallback data
    expect(result.current.districts).toHaveLength(1);
    expect(result.current.cacheStatus).toBe('hit');
  });

  it('should report stale cache status for old data', () => {
    // Set stale cached data (10 minutes old)
    const cachedData = {
      districts: mockDistrictData.districts,
      timestamp: Date.now() - 10 * 60 * 1000,
    };
    localStorage.setItem('districts-data-v1', JSON.stringify(cachedData));

    useSWRMock.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useDistrictsData());

    expect(result.current.cacheStatus).toBe('stale');
  });

  it('should always report circuit state as closed', () => {
    useSWRMock.mockReturnValue({
      data: mockDistrictData,
      error: undefined,
      isLoading: false,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useDistrictsData());

    expect(result.current.circuitState).toBe('closed');
  });
});
