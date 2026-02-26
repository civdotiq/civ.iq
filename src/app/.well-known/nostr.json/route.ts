/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NIP-05 Verification Endpoint
 *
 * Returns the Nostr public key for the civiq identity.
 * Allows Nostr clients to verify civiq@civ.iq via
 * GET /.well-known/nostr.json?name=civiq
 */

import { NextResponse } from 'next/server';
import { getNostrKeypair } from '@/lib/nostr/keys';
import { nostrConfig } from '@/config/nostr.config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const keypair = getNostrKeypair();

  if (!keypair) {
    return NextResponse.json({ error: 'Nostr keypair not configured' }, { status: 404 });
  }

  const nip05 = {
    names: {
      civiq: keypair.publicKey,
    },
    relays: {
      [keypair.publicKey]: nostrConfig.relays,
    },
  };

  return NextResponse.json(nip05, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
