/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { ApiErrors, ErrorCodes, createErrorResponse, isError } from '@/lib/api/error-responses';

describe('ApiErrors', () => {
  describe('notFound', () => {
    it('returns 404 response with resource name', () => {
      const response = ApiErrors.notFound('Representative');
      expect(response.status).toBe(404);
    });

    it('returns 404 response with resource name and id', async () => {
      const response = ApiErrors.notFound('Representative', 'K000367');
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(body.error.message).toBe("Representative 'K000367' not found");
    });
  });

  describe('validation', () => {
    it('returns 400 response with validation message', async () => {
      const response = ApiErrors.validation('Invalid bioguide ID format');
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(body.error.message).toBe('Invalid bioguide ID format');
    });

    it('includes details when provided', async () => {
      const response = ApiErrors.validation('Invalid format', 'Must be alphanumeric');
      const body = await response.json();
      expect(body.error.details).toBe('Must be alphanumeric');
    });
  });

  describe('badRequest', () => {
    it('returns 400 response with message', async () => {
      const response = ApiErrors.badRequest('Missing required parameter');
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe(ErrorCodes.BAD_REQUEST);
    });
  });

  describe('serverError', () => {
    it('returns 500 response', async () => {
      const response = ApiErrors.serverError();
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(body.error.message).toBe('An internal error occurred');
    });

    it('does not include error details by default', async () => {
      const error = new Error('Sensitive database error');
      const response = ApiErrors.serverError(error);
      const body = await response.json();
      expect(body.error.details).toBeUndefined();
    });
  });

  describe('serviceUnavailable', () => {
    it('returns 503 response with service name', async () => {
      const response = ApiErrors.serviceUnavailable('FEC API');
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
      expect(body.error.message).toBe('FEC API is temporarily unavailable');
    });
  });

  describe('rateLimited', () => {
    it('returns 429 response', async () => {
      const response = ApiErrors.rateLimited();
      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error.code).toBe(ErrorCodes.RATE_LIMITED);
    });

    it('accepts optional retry-after parameter', () => {
      // Note: The actual header functionality depends on NextResponse implementation
      // which is mocked in jest.setup.js. This test verifies the function accepts the param.
      const response = ApiErrors.rateLimited(60);
      expect(response.status).toBe(429);
    });
  });

  describe('noData', () => {
    it('returns 200 response with empty data structure', async () => {
      const emptyData = { items: [], count: 0 };
      const response = ApiErrors.noData(emptyData);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toEqual([]);
      expect(body.count).toBe(0);
      expect(body.metadata.dataAvailable).toBe(false);
    });

    it('includes custom metadata', async () => {
      const emptyData = { items: [] };
      const metadata = { bioguideId: 'K000367', cycle: 2024 };
      const response = ApiErrors.noData(emptyData, metadata);
      const body = await response.json();
      expect(body.metadata.bioguideId).toBe('K000367');
      expect(body.metadata.cycle).toBe(2024);
    });
  });
});

describe('createErrorResponse', () => {
  it('creates custom error response with specified status', async () => {
    const response = createErrorResponse(
      ErrorCodes.FORBIDDEN,
      'Access denied',
      403,
      'Insufficient permissions'
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe(ErrorCodes.FORBIDDEN);
    expect(body.error.message).toBe('Access denied');
    expect(body.error.details).toBe('Insufficient permissions');
  });
});

describe('isError', () => {
  it('returns true for Error instances', () => {
    expect(isError(new Error('test'))).toBe(true);
    expect(isError(new TypeError('type error'))).toBe(true);
  });

  it('returns false for non-Error values', () => {
    expect(isError('error string')).toBe(false);
    expect(isError(null)).toBe(false);
    expect(isError(undefined)).toBe(false);
    expect(isError({ message: 'error-like object' })).toBe(false);
  });
});
