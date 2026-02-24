/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Key Management
 * Load keypair from env or generate a new one for initial setup
 */

import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';

/** Load private key from env, return keypair */
export function getNostrKeypair(): { privateKey: Uint8Array; publicKey: string } | null {
  const hex = process.env.NOSTR_PRIVATE_KEY;
  if (!hex || hex.length !== 64) return null;

  const privateKey = hexToBytes(hex);
  const publicKey = getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/** Generate a new keypair (for initial setup only) */
export function generateNostrKeypair(): { privateKey: string; publicKey: string } {
  const sk = generateSecretKey();
  return {
    privateKey: bytesToHex(sk),
    publicKey: getPublicKey(sk),
  };
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
