/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * HTTP Signatures Tests
 *
 * Verifies signRequest() and verifySignature() for ActivityPub federation.
 * Uses a real RSA keypair to test sign/verify round-trips.
 */

import crypto from 'crypto';

// Generate a test RSA keypair
const { publicKey: testPublicKeyPem, privateKey: testPrivateKeyPem } = crypto.generateKeyPairSync(
  'rsa',
  {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }
);

jest.mock('@/lib/activitypub/actor', () => ({
  getPrivateKeyPem: () => testPrivateKeyPem,
  getPublicKeyPem: () => testPublicKeyPem,
}));

jest.mock('@/config/activitypub.config', () => ({
  activitypubConfig: {
    actor: {
      id: 'https://civdotiq.org/api/activitypub/actor',
      keyId: 'https://civdotiq.org/api/activitypub/actor#main-key',
    },
  },
}));

const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockCacheGet,
    set: mockCacheSet,
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch for actor key retrieval
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { describe, test, expect, beforeEach } from '@jest/globals';
import { signRequest, verifySignature } from '@/lib/activitypub/http-signatures';

describe('HTTP Signatures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
  });

  describe('signRequest', () => {
    test('produces valid signature header format', () => {
      const result = signRequest('POST', 'https://example.com/inbox', '{"type":"Create"}');

      expect(result).not.toBeNull();
      expect(result!.Signature).toContain(
        'keyId="https://civdotiq.org/api/activitypub/actor#main-key"'
      );
      expect(result!.Signature).toContain('algorithm="rsa-sha256"');
      expect(result!.Signature).toContain('headers="(request-target) host date digest"');
      expect(result!.Signature).toContain('signature="');
    });

    test('computes correct SHA-256 digest', () => {
      const body = '{"type":"Create"}';
      const result = signRequest('POST', 'https://example.com/inbox', body);

      const expectedDigest = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
      expect(result!.Digest).toBe(expectedDigest);
    });

    test('includes Date header in UTC format', () => {
      const result = signRequest('POST', 'https://example.com/inbox', '{}');

      expect(result!.Date).toBeDefined();
      expect(result!.Date).toMatch(/GMT$/);
    });
  });

  describe('verifySignature', () => {
    test('round-trip: sign then verify succeeds', async () => {
      const body = '{"type":"Create","id":"test"}';
      const targetUrl = 'https://example.com/inbox';
      const signed = signRequest('POST', targetUrl, body);
      expect(signed).not.toBeNull();

      // Mock actor fetch to return our public key
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          publicKey: {
            publicKeyPem: testPublicKeyPem,
          },
        }),
      });

      const headers: Record<string, string> = {
        signature: signed!.Signature,
        date: signed!.Date,
        digest: signed!.Digest,
        host: 'example.com',
      };

      const result = await verifySignature('POST', '/inbox', headers, body);
      expect(result.valid).toBe(true);
      expect(result.actor).toBe('https://civdotiq.org/api/activitypub/actor');
    });

    test('round-trip with query string in URL', async () => {
      const body = '{"type":"Create"}';
      const targetUrl = 'https://example.com/inbox?page=1&filter=new';
      const signed = signRequest('POST', targetUrl, body);
      expect(signed).not.toBeNull();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          publicKey: { publicKeyPem: testPublicKeyPem },
        }),
      });

      const headers: Record<string, string> = {
        signature: signed!.Signature,
        date: signed!.Date,
        digest: signed!.Digest,
        host: 'example.com',
      };

      // Path must include query string to match what was signed
      const result = await verifySignature('POST', '/inbox?page=1&filter=new', headers, body);
      expect(result.valid).toBe(true);

      // Verify it fails with just the path (no query string)
      mockCacheGet.mockResolvedValueOnce({ publicKeyPem: testPublicKeyPem });
      const resultNoQs = await verifySignature('POST', '/inbox', headers, body);
      expect(resultNoQs.valid).toBe(false);
    });

    test('uses cached actor key on second verification', async () => {
      const body = '{"type":"Create"}';
      const signed = signRequest('POST', 'https://example.com/inbox', body);

      // First call: cache miss, fetch actor
      mockCacheGet.mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          publicKey: { publicKeyPem: testPublicKeyPem },
        }),
      });

      const headers: Record<string, string> = {
        signature: signed!.Signature,
        date: signed!.Date,
        digest: signed!.Digest,
        host: 'example.com',
      };

      await verifySignature('POST', '/inbox', headers, body);
      expect(mockCacheSet).toHaveBeenCalled();

      // Second call: cache hit
      mockCacheGet.mockResolvedValueOnce({ publicKeyPem: testPublicKeyPem });

      const result2 = await verifySignature('POST', '/inbox', headers, body);
      expect(result2.valid).toBe(true);
      // fetch should only have been called once (first verification)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('body digest mismatch fails verification', async () => {
      const body = '{"type":"Create"}';
      const signed = signRequest('POST', 'https://example.com/inbox', body);

      const headers: Record<string, string> = {
        signature: signed!.Signature,
        date: signed!.Date,
        digest: signed!.Digest,
        host: 'example.com',
      };

      // Pass a different body than what was signed
      const result = await verifySignature('POST', '/inbox', headers, '{"type":"TAMPERED"}');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Digest mismatch');
    });

    test('missing signature header fails', async () => {
      const result = await verifySignature('POST', '/inbox', {});
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No Signature header');
    });

    test('incomplete signature header fails', async () => {
      const result = await verifySignature('POST', '/inbox', {
        signature: 'keyId="test"',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Incomplete Signature header');
    });

    test('unsupported algorithm fails', async () => {
      const result = await verifySignature('POST', '/inbox', {
        signature:
          'keyId="https://example.com/actor#key",algorithm="hs2019",headers="(request-target)",signature="abc"',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported algorithm');
    });

    test('invalid keyId format fails', async () => {
      const result = await verifySignature('POST', '/inbox', {
        signature:
          'keyId="#fragment-only",algorithm="rsa-sha256",headers="(request-target)",signature="abc"',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid keyId format');
    });

    test('failed actor fetch returns error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await verifySignature('POST', '/inbox', {
        signature:
          'keyId="https://example.com/actor#key",algorithm="rsa-sha256",headers="(request-target)",signature="abc"',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No public key found on actor');
    });

    test('handles capitalized header keys (case-insensitive)', async () => {
      const body = '{"type":"Create"}';
      const signed = signRequest('POST', 'https://example.com/inbox', body);
      expect(signed).not.toBeNull();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          publicKey: { publicKeyPem: testPublicKeyPem },
        }),
      });

      // Pass headers with mixed/capitalized keys (as raw HTTP would)
      const headers: Record<string, string> = {
        Signature: signed!.Signature,
        Date: signed!.Date,
        Digest: signed!.Digest,
        Host: 'example.com',
      };

      const result = await verifySignature('POST', '/inbox', headers, body);
      expect(result.valid).toBe(true);
    });

    test('parses signature header with base64 padding characters', async () => {
      // Signature values often end with = or == (base64 padding)
      // The parser must not choke on these
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          publicKey: { publicKeyPem: testPublicKeyPem },
        }),
      });

      // Construct a header with a known base64-padded signature
      const paddedSig = 'abc123+/def==';
      const sigHeader = `keyId="https://example.com/actor#key",algorithm="rsa-sha256",headers="(request-target)",signature="${paddedSig}"`;

      const result = await verifySignature('POST', '/inbox', {
        signature: sigHeader,
      });

      // It will fail crypto verification (wrong signature), but the point is
      // it should NOT fail with "Incomplete Signature header" — parsing succeeded
      expect(result.error).not.toBe('Incomplete Signature header');
      expect(result.error).not.toBe('No Signature header');
    });
  });
});
