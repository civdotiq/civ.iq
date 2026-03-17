/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Civic Intelligence Feed API
 *
 * Queries Nostr relays for published civic intelligence events,
 * filtered by entity type prefix.
 *
 * GET /api/mesh/feed/representative?since=2026-03-10&limit=50
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getNostrKeypair } from '@/lib/nostr/keys';
import { queryRelays } from '@/lib/nostr/relay-reader';
import { GRAPH_NODE_TYPES, type GraphNodeType } from '@/types/graph';
import { ApiErrors } from '@/lib/api/error-responses';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const VALID_ENTITY_TYPES = new Set<string>(GRAPH_NODE_TYPES);

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
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);

  const keypair = getNostrKeypair();
  if (!keypair) {
    return NextResponse.json({
      entityType,
      events: [],
      message: 'Nostr publishing not configured',
      meta: { generatedAt: new Date().toISOString() },
    });
  }

  try {
    logger.info('[Mesh:Feed API] Query', { entityType, limit });

    // Query for NIP-78 civic intelligence events (Kind 30078)
    const result = await queryRelays(keypair.publicKey, 30078, limit);

    return NextResponse.json({
      entityType,
      totalEvents: result.totalUniqueEvents,
      relays: result.relayResults.length,
      eventIds: result.eventIds,
      meta: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    logger.error('[Mesh:Feed API] Error', error as Error, { entityType });
    return ApiErrors.serverError(error as Error);
  }
}
