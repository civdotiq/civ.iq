/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the Civic Mesh Registry.
 *
 * Uses a fresh MeshRegistry instance with mock hydrators to avoid
 * importing real hydrators (which pull in AI SDK / TransformStream).
 */

import { REPRESENTATIVE_SCHEMA, BILL_SCHEMA, ENTITY_SCHEMAS } from '@/lib/mesh/schema';
import type { EntitySchema } from '@/lib/mesh/schema';
import { GRAPH_NODE_TYPES } from '@/types/graph';
import type { GraphNodeType } from '@/types/graph';

// We can't import the real registry+init because init.ts imports real hydrators.
// Instead, test the MeshRegistry class directly by re-creating it.
// Import the class constructor via the module.
// Since MeshRegistry is not exported as a class, we test via the registry API
// by creating a minimal mock setup.

describe('Civic Mesh Registry', () => {
  // Create a fresh registry for testing (avoid importing init.ts)
  let meshRegistry: {
    register: (schema: EntitySchema, hydrator: unknown) => void;
    getSchema: (nodeType: GraphNodeType) => EntitySchema | undefined;
    getHydrator: (nodeType: GraphNodeType) => unknown;
    hasHydrator: (nodeType: GraphNodeType) => boolean;
    getAllSchemas: () => EntitySchema[];
    getRegisteredTypes: () => GraphNodeType[];
    getRelationships: (from: GraphNodeType, to: GraphNodeType) => unknown[];
    isRegistered: (nodeType: GraphNodeType) => boolean;
    size: number;
  };

  beforeEach(() => {
    // Reset module cache to get a fresh registry
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/lib/mesh/registry');
    meshRegistry = mod.meshRegistry;
  });

  function registerAllWithMocks() {
    const mockHydrator = jest.fn();
    for (const schema of Object.values(ENTITY_SCHEMAS)) {
      const hasHydrator = !['contract', 'regulation'].includes(schema.nodeType);
      meshRegistry.register(schema, hasHydrator ? mockHydrator : null);
    }
  }

  it('registers all 8 entity types', () => {
    registerAllWithMocks();
    expect(meshRegistry.size).toBe(8);
    for (const nodeType of GRAPH_NODE_TYPES) {
      expect(meshRegistry.isRegistered(nodeType)).toBe(true);
    }
  });

  it('returns correct schemas', () => {
    registerAllWithMocks();
    expect(meshRegistry.getSchema('representative')).toBe(REPRESENTATIVE_SCHEMA);
    expect(meshRegistry.getSchema('bill')).toBe(BILL_SCHEMA);
  });

  it('has hydrators for 6 entity types', () => {
    registerAllWithMocks();
    const typesWithHydrators: GraphNodeType[] = [
      'representative',
      'bill',
      'committee',
      'organization',
      'agency',
      'sector',
    ];
    for (const nodeType of typesWithHydrators) {
      expect(meshRegistry.hasHydrator(nodeType)).toBe(true);
      expect(meshRegistry.getHydrator(nodeType)).toBeDefined();
    }
  });

  it('contract and regulation have no hydrators', () => {
    registerAllWithMocks();
    expect(meshRegistry.hasHydrator('contract')).toBe(false);
    expect(meshRegistry.hasHydrator('regulation')).toBe(false);
  });

  it('getAllSchemas returns all 8', () => {
    registerAllWithMocks();
    const schemas = meshRegistry.getAllSchemas();
    expect(schemas.length).toBe(8);
  });

  it('getRegisteredTypes returns all 8 node types', () => {
    registerAllWithMocks();
    const types = meshRegistry.getRegisteredTypes();
    expect(types.length).toBe(8);
    for (const nodeType of GRAPH_NODE_TYPES) {
      expect(types).toContain(nodeType);
    }
  });

  it('getRelationships finds representative → committee connections', () => {
    registerAllWithMocks();
    const rels = meshRegistry.getRelationships('representative', 'committee');
    expect(rels.length).toBeGreaterThan(0);
  });

  it('returns undefined schema for unregistered type', () => {
    // Fresh registry, nothing registered
    expect(meshRegistry.getSchema('representative')).toBeUndefined();
  });
});
