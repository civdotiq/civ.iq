/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Mesh API Documentation Endpoint
 *
 * Auto-generates API documentation from Civic Mesh schema definitions.
 * Lists all entity types, properties, relationships, and available endpoints.
 *
 * GET /api/mesh/docs
 */

import { NextResponse } from 'next/server';
import { ensureMeshInitialized } from '@/lib/mesh/init';
import { meshRegistry } from '@/lib/mesh/registry';

export const revalidate = 86400; // 24 hours

export async function GET(): Promise<NextResponse> {
  ensureMeshInitialized();

  const schemas = meshRegistry.getAllSchemas();

  const entityTypes = schemas.map(schema => ({
    nodeType: schema.nodeType,
    displayName: schema.displayName,
    description: schema.description,
    idPrefix: schema.idPrefix,
    idExample: `${schema.idPrefix}:example`,
    properties: Object.entries(schema.properties).map(([name, def]) => ({
      name,
      type: def.type,
      required: def.required,
      description: def.description,
    })),
    relationships: schema.relationships.map(rel => ({
      edgeType: rel.edgeType,
      targetType: rel.targetType,
      direction: rel.direction,
      description: rel.description,
    })),
    hasHydrator: meshRegistry.hasHydrator(schema.nodeType),
  }));

  const endpoints = [
    {
      path: '/api/mesh/entity/{type}:{id}',
      method: 'GET',
      description: 'Unified entity endpoint — returns full mesh context for any entity',
      cache: '1 hour',
      example: '/api/mesh/entity/rep:A000360',
    },
    {
      path: '/api/mesh/temporal/{type}:{id}',
      method: 'GET',
      description: 'Temporal profile — quarterly time-series on graph edges',
      cache: '1 hour',
      example: '/api/mesh/temporal/rep:A000360',
    },
    {
      path: '/api/mesh/district/{districtId}',
      method: 'GET',
      description: 'District intelligence profile — alignment scoring and peer comparison',
      cache: '6 hours',
      example: '/api/mesh/district/CA-12',
    },
    {
      path: '/api/mesh/influence/path',
      method: 'GET',
      description: 'Influence path scoring between two entities',
      cache: '1 hour',
      example: '/api/mesh/influence/path?from=org:lockheed-martin&to=rep:A000360',
    },
    {
      path: '/api/mesh/influence/counterfactual',
      method: 'POST',
      description: 'Counterfactual query — mask donor sectors and re-predict votes',
      cache: 'none',
    },
    {
      path: '/api/mesh/influence/cascade',
      method: 'POST',
      description: 'Cascade simulation — perturb sector funding and measure vote shifts',
      cache: 'none',
    },
    {
      path: '/api/mesh/feed/{entityType}',
      method: 'GET',
      description: 'Nostr civic intelligence feed — signed, verifiable events',
      cache: 'none',
    },
    {
      path: '/api/mesh/bulk/{entityType}',
      method: 'GET',
      description: 'Bulk export — schema and methodology for entity type (rate limited: 10/hr)',
      cache: '24 hours',
    },
    {
      path: '/api/mesh/embed/scorecard/{bioguideId}',
      method: 'GET',
      description: 'Embeddable representative scorecard (HTML iframe)',
      cache: '1 hour',
    },
    {
      path: '/api/mesh/embed/district/{districtId}',
      method: 'GET',
      description: 'Embeddable district card (HTML iframe)',
      cache: '6 hours',
    },
  ];

  return NextResponse.json(
    {
      title: 'CIV.IQ Civic Mesh API',
      version: '1.0.0',
      description:
        'Open civic intelligence infrastructure. All data sourced from public government APIs. ' +
        'Computed intelligence carries confidence scores, methodology, and disclaimers.',
      methodology:
        'Statistics first, AI second. Every insight computes numbers before generating narrative. ' +
        'Correlation does not imply causation.',
      dataSources: [
        'Congress.gov API v3',
        'FEC.gov API',
        'USASpending.gov API v2',
        'Federal Register API v1',
        'OpenStates GraphQL',
        'Census Bureau ACS',
        'BLS API',
        'Senate LDA API',
      ],
      entityTypes,
      endpoints,
      embedding: {
        description: 'Embed CIV.IQ widgets on your site using iframes',
        example:
          '<iframe src="https://civ.iq/api/mesh/embed/scorecard/A000360" width="380" height="200" frameborder="0"></iframe>',
      },
      nostr: {
        description: 'Subscribe to civic intelligence updates via Nostr (NIP-78, Kind 30078)',
        tags: ['civic-intelligence', 'entity:{id}', 'confidence:{0-1}', 'mesh-version:1.0.0'],
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    }
  );
}
