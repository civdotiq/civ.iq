/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { describe, test, expect } from '@jest/globals';
import { buildActorDocument } from '@/lib/activitypub/actor';

describe('ActivityPub Actor', () => {
  test('builds valid actor document', () => {
    const actor = buildActorDocument();

    expect(actor['@context']).toBeDefined();
    expect(actor.type).toBe('Service');
    expect(actor.preferredUsername).toBe('civiq');
    expect(actor.inbox).toContain('/api/activitypub/inbox');
    expect(actor.outbox).toContain('/api/activitypub/outbox');
    expect(actor.followers).toContain('/api/activitypub/followers');
  });

  test('actor has required ActivityPub fields', () => {
    const actor = buildActorDocument();

    expect(actor.id).toBeDefined();
    expect(actor.name).toBeDefined();
    expect(actor.summary).toBeDefined();
    expect(actor.url).toBeDefined();
    expect(actor.publicKey).toBeDefined();
    expect(actor.publicKey.id).toContain('#main-key');
    expect(actor.publicKey.owner).toBe(actor.id);
  });

  test('actor context includes ActivityStreams and security', () => {
    const actor = buildActorDocument();
    const contexts = actor['@context'];

    expect(contexts).toContain('https://www.w3.org/ns/activitystreams');
    expect(contexts).toContain('https://w3id.org/security/v1');
  });
});
