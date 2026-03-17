/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Civic Mesh — Open Civic Intelligence Infrastructure
 *
 * Formalizes CIV.IQ's implicit graph ontology into a declarative,
 * queryable schema with plugin-style entity registration and
 * generic N-hop traversal.
 */

// Schema — entity type definitions
export {
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
} from './schema';
export type { EntitySchema, PropertyDef, RelationshipDef } from './schema';

// Registry — entity type registration and lookup
export { meshRegistry } from './registry';
export type { HydratorFn } from './registry';

// Initialization — call before using registry
export { ensureMeshInitialized } from './init';

// Traversal — generic N-hop BFS exploration
export { traverseMesh } from './traversal';
export type { TraversalFilter, TraversalResult } from './traversal';

// District Profile — computed district intelligence profiles
export { buildDistrictProfile, cosineSimilarity } from './district-profile';
export type {
  DistrictProfile,
  RepresentationAlignment,
  SectorConcentration,
  BillExposure,
  PeerDistrict,
  DistrictVector,
} from './district-profile-types';

// Temporal — time-series edge aggregation and trend detection
export { buildTemporalProfile, computeTrend, detectTemporalEvents } from './temporal';
export type {
  TemporalBucket,
  TemporalEdge,
  TemporalEdgeSummary,
  TemporalEvent,
  TemporalProfile,
  TemporalTrend,
} from './temporal-types';
