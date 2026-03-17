/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Schema & Methodology Export API
 *
 * Exports the Civic Mesh schema and methodology for a given entity type.
 * Intended for researchers and journalists to understand the data model.
 *
 * GET /api/mesh/bulk/representative?format=json
 * GET /api/mesh/bulk/representative?format=csv
 *
 * Rate limited: 10 requests/hour per IP.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { GRAPH_NODE_TYPES, type GraphNodeType } from '@/types/graph';
import { ensureMeshInitialized } from '@/lib/mesh/init';
import { meshRegistry } from '@/lib/mesh/registry';
import { ApiErrors } from '@/lib/api/error-responses';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const VALID_ENTITY_TYPES = new Set<string>(GRAPH_NODE_TYPES);
const VALID_FORMATS = new Set(['json', 'csv']);

/** Simple in-memory rate limiter (resets on restart — acceptable for this use case) */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string }> }
): Promise<NextResponse> {
  const { entityType } = await params;

  if (!VALID_ENTITY_TYPES.has(entityType)) {
    return ApiErrors.validation(
      `Invalid entity type "${entityType}". Valid types: ${GRAPH_NODE_TYPES.join(', ')}`
    );
  }

  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') ?? 'json';
  if (!VALID_FORMATS.has(format)) {
    return ApiErrors.validation('Invalid format. Use "json" or "csv".');
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return ApiErrors.rateLimited(3600);
  }

  try {
    logger.info('[Mesh:Bulk API] Export request', { entityType, format });

    ensureMeshInitialized();
    const schema = meshRegistry.getSchema(entityType as GraphNodeType);
    if (!schema) {
      return ApiErrors.notFound('Entity type', entityType);
    }

    // Build export metadata
    const exportData = {
      entityType,
      schema: {
        nodeType: schema.nodeType,
        displayName: schema.displayName,
        description: schema.description,
        properties: Object.keys(schema.properties),
        relationships: schema.relationships.map(r => ({
          edgeType: r.edgeType,
          targetType: r.targetType,
          direction: r.direction,
        })),
      },
      methodology:
        'All data sourced from public government APIs (Congress.gov, FEC.gov, USASpending.gov, Federal Register). ' +
        'Computed intelligence uses statistical analysis. Correlation does not imply causation.',
      disclaimer:
        'This data is provided for informational purposes only. ' +
        'Statistical patterns do not establish causal relationships. ' +
        'Verify findings against primary sources.',
      exportedAt: new Date().toISOString(),
      meshVersion: '1.0.0',
      note: 'This endpoint exports the entity schema and methodology. Individual entity data is available via /api/mesh/entity/[type]:[id].',
    };

    if (format === 'csv') {
      const csvHeader = 'entityType,displayName,description,exportedAt\n';
      const csvRow = `${schema.nodeType},${csvQuote(schema.displayName)},${csvQuote(schema.description)},${exportData.exportedAt}\n`;
      return new NextResponse(csvHeader + csvRow, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="civiq-${entityType}-export.csv"`,
          'X-Methodology': 'See https://civ.iq/api/mesh/docs for methodology',
          'X-Disclaimer': 'Correlation does not imply causation',
          'Cache-Control': 'public, s-maxage=86400',
        },
      });
    }

    return NextResponse.json(exportData, {
      headers: {
        'X-Methodology': 'See https://civ.iq/api/mesh/docs for methodology',
        'X-Disclaimer': 'Correlation does not imply causation',
        'Cache-Control': 'public, s-maxage=86400',
      },
    });
  } catch (error) {
    logger.error('[Mesh:Bulk API] Error', error as Error, { entityType });
    return ApiErrors.serverError(error as Error);
  }
}

function csvQuote(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
