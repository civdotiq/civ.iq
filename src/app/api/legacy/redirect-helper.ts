/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Legacy API Redirect Helper
 * Provides backwards compatibility by redirecting old API routes to new v2 endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

// Route mapping configuration
export interface LegacyRouteMapping {
  oldPath: string;
  newPath: string;
  queryTransform?: (oldQuery: URLSearchParams) => URLSearchParams;
  method?: 'GET' | 'POST';
  deprecationNotice: string;
}

// Legacy route mappings
export const LEGACY_ROUTE_MAPPINGS: LegacyRouteMapping[] = [
  // Representatives list endpoints
  {
    oldPath: '/api/representatives',
    newPath: '/api/v2/representatives',
    queryTransform: oldQuery => {
      const newQuery = new URLSearchParams();
      // Map old parameters to new format
      if (oldQuery.get('zip')) newQuery.set('zip', oldQuery.get('zip')!);
      if (oldQuery.get('state')) newQuery.set('state', oldQuery.get('state')!);
      if (oldQuery.get('district')) newQuery.set('district', oldQuery.get('district')!);
      if (oldQuery.get('party')) newQuery.set('party', oldQuery.get('party')!);
      if (oldQuery.get('chamber')) newQuery.set('chamber', oldQuery.get('chamber')!);
      newQuery.set('format', 'detailed'); // Default to detailed for legacy compatibility
      return newQuery;
    },
    deprecationNotice:
      'Use /api/v2/representatives instead. New API supports format selection and field filtering.',
  },
  {
    oldPath: '/api/representatives-simple',
    newPath: '/api/v2/representatives',
    queryTransform: oldQuery => {
      const newQuery = new URLSearchParams(oldQuery);
      newQuery.set('format', 'simple');
      return newQuery;
    },
    deprecationNotice: 'Use /api/v2/representatives?format=simple instead.',
  },
  {
    oldPath: '/api/representatives-multi-district',
    newPath: '/api/v2/representatives',
    queryTransform: oldQuery => {
      const newQuery = new URLSearchParams(oldQuery);
      newQuery.set('includeMultiDistrict', 'true');
      newQuery.set('format', 'detailed');
      return newQuery;
    },
    deprecationNotice: 'Use /api/v2/representatives?includeMultiDistrict=true instead.',
  },
  {
    oldPath: '/api/representatives-v2', // Old v2 endpoint
    newPath: '/api/v2/representatives',
    queryTransform: oldQuery => new URLSearchParams(oldQuery),
    deprecationNotice: 'Endpoint moved to /api/v2/representatives for better organization.',
  },

  // Representative detail endpoint
  {
    oldPath: '/api/representative/{id}',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: oldQuery => {
      const newQuery = new URLSearchParams();
      // Map old include parameters to new format
      const includeOptions: string[] = [];
      if (oldQuery.get('includeCommittees') === 'true') includeOptions.push('committees');
      if (oldQuery.get('includeLeadership') === 'true') includeOptions.push('leadership');
      if (oldQuery.get('includeAll') === 'true') {
        includeOptions.push(
          'votes',
          'bills',
          'committees',
          'finance',
          'news',
          'leadership',
          'district'
        );
      }
      if (includeOptions.length > 0) {
        newQuery.set('include', includeOptions.join(','));
      }
      newQuery.set('format', 'full'); // Default to full for legacy compatibility
      return newQuery;
    },
    deprecationNotice:
      'Use /api/v2/representatives/{id} with ?include= parameter instead of individual boolean flags.',
  },
];

// Additional legacy endpoints that map to the consolidated detail endpoint
export const LEGACY_DETAIL_ENDPOINTS: LegacyRouteMapping[] = [
  {
    oldPath: '/api/representative/{id}/votes',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: () => {
      const query = new URLSearchParams();
      query.set('include', 'votes');
      query.set('format', 'simple');
      return query;
    },
    deprecationNotice: 'Use /api/v2/representatives/{id}?include=votes instead.',
  },
  {
    oldPath: '/api/representative/{id}/bills',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: () => {
      const query = new URLSearchParams();
      query.set('include', 'bills');
      query.set('format', 'simple');
      return query;
    },
    deprecationNotice: 'Use /api/v2/representatives/{id}?include=bills instead.',
  },
  {
    oldPath: '/api/representative/{id}/committees',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: () => {
      const query = new URLSearchParams();
      query.set('include', 'committees');
      query.set('format', 'simple');
      return query;
    },
    deprecationNotice: 'Use /api/v2/representatives/{id}?include=committees instead.',
  },
  {
    oldPath: '/api/representative/{id}/finance',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: () => {
      const query = new URLSearchParams();
      query.set('include', 'finance');
      query.set('format', 'simple');
      return query;
    },
    deprecationNotice: 'Use /api/v2/representatives/{id}?include=finance instead.',
  },
  {
    oldPath: '/api/representative/{id}/news',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: () => {
      const query = new URLSearchParams();
      query.set('include', 'news');
      query.set('format', 'simple');
      return query;
    },
    deprecationNotice: 'Use /api/v2/representatives/{id}?include=news instead.',
  },
  {
    oldPath: '/api/representative/{id}/party-alignment',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: () => {
      const query = new URLSearchParams();
      query.set('include', 'partyAlignment');
      query.set('format', 'simple');
      return query;
    },
    deprecationNotice: 'Use /api/v2/representatives/{id}?include=partyAlignment instead.',
  },
  {
    oldPath: '/api/representative/{id}/leadership',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: () => {
      const query = new URLSearchParams();
      query.set('include', 'leadership');
      query.set('format', 'simple');
      return query;
    },
    deprecationNotice: 'Use /api/v2/representatives/{id}?include=leadership instead.',
  },
  {
    oldPath: '/api/representative/{id}/district',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: () => {
      const query = new URLSearchParams();
      query.set('include', 'district');
      query.set('format', 'simple');
      return query;
    },
    deprecationNotice: 'Use /api/v2/representatives/{id}?include=district instead.',
  },
  {
    oldPath: '/api/representative/{id}/lobbying',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: () => {
      const query = new URLSearchParams();
      query.set('include', 'lobbying');
      query.set('format', 'simple');
      return query;
    },
    deprecationNotice: 'Use /api/v2/representatives/{id}?include=lobbying instead.',
  },
  {
    oldPath: '/api/representative/{id}/batch',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: () => {
      const query = new URLSearchParams();
      query.set('include', 'votes,bills,committees,finance,news,leadership');
      query.set('format', 'full');
      return query;
    },
    deprecationNotice:
      'Use /api/v2/representatives/{id}?include=votes,bills,committees,finance,news,leadership instead.',
  },
  {
    oldPath: '/api/representative/{id}/simple',
    newPath: '/api/v2/representatives/{id}',
    queryTransform: () => {
      const query = new URLSearchParams();
      query.set('format', 'simple');
      return query;
    },
    deprecationNotice: 'Use /api/v2/representatives/{id}?format=simple instead.',
  },
];

// Helper to find matching route mapping
export function findRouteMapping(pathname: string): LegacyRouteMapping | null {
  // Check main route mappings
  for (const mapping of LEGACY_ROUTE_MAPPINGS) {
    if (mapping.oldPath === pathname) {
      return mapping;
    }
  }

  // Check detail endpoint mappings (with parameter substitution)
  for (const mapping of LEGACY_DETAIL_ENDPOINTS) {
    const pattern = mapping.oldPath.replace('{id}', '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(pathname)) {
      return mapping;
    }
  }

  return null;
}

// Helper to transform path with parameters
export function transformPath(oldPath: string, newPath: string, pathname: string): string {
  if (!newPath.includes('{id}')) {
    return newPath;
  }

  // Extract ID from the old pathname
  const pattern = oldPath.replace('{id}', '([^/]+)');
  const regex = new RegExp(`^${pattern.replace(/\//g, '\\/')}`);
  const match = pathname.match(regex);

  if (match && match[1]) {
    return newPath.replace('{id}', match[1]);
  }

  return newPath;
}

// Main redirect handler
export function createLegacyRedirectHandler(mapping: LegacyRouteMapping) {
  return async (request: NextRequest, _context?: { params: Promise<{ id?: string }> }) => {
    const { pathname, search } = new URL(request.url);
    const oldQuery = new URLSearchParams(search);

    // Transform the path
    const newPath = transformPath(mapping.oldPath, mapping.newPath, pathname);

    // Transform query parameters
    const newQuery = mapping.queryTransform ? mapping.queryTransform(oldQuery) : oldQuery;

    // Build new URL
    const baseUrl = request.url.split('/api/')[0];
    const newUrl = `${baseUrl}${newPath}${newQuery.toString() ? `?${newQuery.toString()}` : ''}`;

    logger.info('Legacy API redirect', {
      oldPath: pathname,
      newPath,
      oldQuery: oldQuery.toString(),
      newQuery: newQuery.toString(),
      userAgent: request.headers.get('user-agent'),
    });

    try {
      // Forward the request to the new endpoint
      const forwardedRequest = new Request(newUrl, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'X-Legacy-Redirect': 'true',
          'X-Original-Path': pathname,
        },
        body: request.method !== 'GET' ? request.body : undefined,
      });

      // Make the internal request
      const response = await fetch(forwardedRequest);
      const data = await response.json();

      // Add deprecation headers and modify response
      const legacyResponse = {
        ...data,
        _deprecated: {
          message: mapping.deprecationNotice,
          oldEndpoint: pathname,
          newEndpoint: newPath,
          migrationGuide: 'https://docs.civiq.app/api/v2/migration',
          sunsetDate: '2026-12-31',
        },
      };

      return NextResponse.json(legacyResponse, {
        status: response.status,
        headers: {
          'X-API-Deprecated': 'true',
          'X-API-Sunset-Date': '2026-12-31',
          'X-API-New-Endpoint': newPath,
          Link: `<${newPath}>; rel="successor-version"`,
          Warning: `299 - "Deprecated API. ${mapping.deprecationNotice}"`,
          'Cache-Control': 'max-age=300, must-revalidate', // Shorter cache for deprecated endpoints
        },
      });
    } catch (error) {
      logger.error('Legacy redirect failed', error as Error, {
        oldPath: pathname,
        newPath,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LEGACY_REDIRECT_FAILED',
            message: 'Failed to redirect to new API endpoint',
            details: mapping.deprecationNotice,
          },
          _deprecated: {
            message: mapping.deprecationNotice,
            oldEndpoint: pathname,
            newEndpoint: newPath,
          },
        },
        { status: 500 }
      );
    }
  };
}

// Helper to check if a request is from a legacy endpoint
export function isLegacyRequest(request: NextRequest): boolean {
  return request.headers.get('X-Legacy-Redirect') === 'true';
}

// Helper to add deprecation warnings to v2 responses when accessed via legacy routes
export function addLegacyWarning(
  response: Record<string, unknown>,
  originalPath?: string
): Record<string, unknown> {
  if (!originalPath) return response;

  return {
    ...response,
    _legacy: {
      accessed_via_legacy_route: true,
      original_path: originalPath,
      recommendation: 'Please update your application to use the v2 API endpoints directly',
    },
  };
}
