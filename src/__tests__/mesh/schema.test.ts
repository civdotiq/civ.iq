/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  ENTITY_SCHEMAS,
  REPRESENTATIVE_SCHEMA,
  BILL_SCHEMA,
  COMMITTEE_SCHEMA,
  AGENCY_SCHEMA,
  ORGANIZATION_SCHEMA,
  SECTOR_SCHEMA,
  CONTRACT_SCHEMA,
  REGULATION_SCHEMA,
  getEntitySchema,
  getRelationshipsBetween,
  getAllReferencedEdgeTypes,
} from '@/lib/mesh/schema';
import type { EntitySchema } from '@/lib/mesh/schema';
import { GRAPH_NODE_TYPES, GRAPH_EDGE_TYPES } from '@/types/graph';

describe('Civic Mesh Schema', () => {
  // ── Coverage ──────────────────────────────────────────────────────

  it('defines schemas for all 8 graph node types', () => {
    for (const nodeType of GRAPH_NODE_TYPES) {
      expect(ENTITY_SCHEMAS[nodeType]).toBeDefined();
      expect(ENTITY_SCHEMAS[nodeType].nodeType).toBe(nodeType);
    }
  });

  it('references all 14 edge types across schemas', () => {
    const referencedEdgeTypes = getAllReferencedEdgeTypes();

    for (const edgeType of GRAPH_EDGE_TYPES) {
      expect(referencedEdgeTypes.has(edgeType)).toBe(true);
    }
  });

  // ── Schema Structure ──────────────────────────────────────────────

  it('all schemas have required fields', () => {
    for (const schema of Object.values(ENTITY_SCHEMAS)) {
      expect(schema.nodeType).toBeTruthy();
      expect(schema.displayName).toBeTruthy();
      expect(schema.description).toBeTruthy();
      expect(schema.primaryKey).toBeTruthy();
      expect(schema.idPrefix).toBeTruthy();
      expect(schema.properties).toBeDefined();
      expect(schema.relationships).toBeDefined();
    }
  });

  it('all schemas have at least one property', () => {
    for (const schema of Object.values(ENTITY_SCHEMAS)) {
      expect(Object.keys(schema.properties).length).toBeGreaterThan(0);
    }
  });

  it('all schemas have at least one relationship', () => {
    for (const schema of Object.values(ENTITY_SCHEMAS)) {
      expect(schema.relationships.length).toBeGreaterThan(0);
    }
  });

  it('property types are valid', () => {
    const validTypes = ['string', 'number', 'boolean', 'string[]', 'number[]'];
    for (const schema of Object.values(ENTITY_SCHEMAS)) {
      for (const [name, prop] of Object.entries(schema.properties)) {
        expect(validTypes).toContain(prop.type);
        expect(typeof prop.required).toBe('boolean');
        expect(prop.description).toBeTruthy();
      }
    }
  });

  it('relationship directions are valid', () => {
    for (const schema of Object.values(ENTITY_SCHEMAS)) {
      for (const rel of schema.relationships) {
        expect(['outgoing', 'incoming']).toContain(rel.direction);
        expect(GRAPH_NODE_TYPES).toContain(rel.targetType);
        expect(GRAPH_EDGE_TYPES).toContain(rel.edgeType);
        expect(rel.description).toBeTruthy();
      }
    }
  });

  // ── ID Prefixes Match normalize.ts ────────────────────────────────

  it('id prefixes match the canonical ID format from normalize.ts', () => {
    const expectedPrefixes: Record<string, string> = {
      representative: 'rep',
      bill: 'bill',
      committee: 'cmte',
      agency: 'agency',
      organization: 'org',
      sector: 'sector',
      contract: 'contract',
      regulation: 'reg',
      facility: 'fac',
      disaster: 'dis',
      institution: 'inst',
      complaint: 'cmp',
    };

    for (const schema of Object.values(ENTITY_SCHEMAS)) {
      expect(schema.idPrefix).toBe(expectedPrefixes[schema.nodeType]);
    }
  });

  // ── Individual Schema Spot Checks ─────────────────────────────────

  it('representative schema has expected properties', () => {
    expect(REPRESENTATIVE_SCHEMA.properties['name']?.required).toBe(true);
    expect(REPRESENTATIVE_SCHEMA.properties['party']?.required).toBe(true);
    expect(REPRESENTATIVE_SCHEMA.properties['state']?.required).toBe(true);
    expect(REPRESENTATIVE_SCHEMA.properties['chamber']?.required).toBe(true);
    expect(REPRESENTATIVE_SCHEMA.properties['district']?.required).toBe(false);
  });

  it('bill schema has expected properties', () => {
    expect(BILL_SCHEMA.properties['title']?.required).toBe(true);
    expect(BILL_SCHEMA.properties['number']?.required).toBe(true);
    expect(BILL_SCHEMA.properties['congress']?.type).toBe('number');
    expect(BILL_SCHEMA.properties['policyArea']?.required).toBe(false);
  });

  it('representative has outgoing serves_on relationship', () => {
    const servesOn = REPRESENTATIVE_SCHEMA.relationships.find(r => r.edgeType === 'serves_on');
    expect(servesOn).toBeDefined();
    expect(servesOn?.direction).toBe('outgoing');
    expect(servesOn?.targetType).toBe('committee');
  });

  // ── Helper Functions ──────────────────────────────────────────────

  it('getEntitySchema returns correct schema', () => {
    expect(getEntitySchema('representative')).toBe(REPRESENTATIVE_SCHEMA);
    expect(getEntitySchema('bill')).toBe(BILL_SCHEMA);
  });

  it('getRelationshipsBetween finds connections', () => {
    const repToCommittee = getRelationshipsBetween('representative', 'committee');
    expect(repToCommittee.length).toBeGreaterThan(0);
    expect(repToCommittee.some(r => r.edgeType === 'serves_on')).toBe(true);
  });

  it('getRelationshipsBetween returns empty for unconnected types', () => {
    const contractToSector = getRelationshipsBetween('contract', 'sector');
    expect(contractToSector).toEqual([]);
  });
});
