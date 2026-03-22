/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Civic Mesh Schema Definitions
 *
 * Formalizes the implicit ontology spread across graph hydrators into
 * declarative entity type definitions. Each schema declares the properties
 * and relationships for one of the 8 graph node types.
 *
 * These schemas are the single source of truth for what the Civic Mesh
 * knows about each entity type — properties, relationships, and ID format.
 */

import type { GraphNodeType, GraphEdgeType } from '@/types/graph';

// ── Schema Types ──────────────────────────────────────────────────────

/**
 * Describes a single named property on an entity type.
 */
export interface PropertyDef {
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'number[]';
  required: boolean;
  description: string;
}

/**
 * Describes a valid relationship from/to this entity type.
 */
export interface RelationshipDef {
  edgeType: GraphEdgeType;
  targetType: GraphNodeType;
  direction: 'outgoing' | 'incoming';
  description: string;
}

/**
 * Full schema for one entity type in the Civic Mesh.
 */
export interface EntitySchema {
  nodeType: GraphNodeType;
  displayName: string;
  description: string;
  /** Property that serves as primary identifier (e.g., "bioguideId") */
  primaryKey: string;
  /** Typed property definitions */
  properties: Record<string, PropertyDef>;
  /** Valid relationships for this entity type */
  relationships: RelationshipDef[];
  /** Canonical ID prefix (e.g., "rep", "bill") — must match normalize.ts */
  idPrefix: string;
}

// ── Entity Schemas ────────────────────────────────────────────────────

export const REPRESENTATIVE_SCHEMA: EntitySchema = {
  nodeType: 'representative',
  displayName: 'Representative',
  description: 'A current or former member of the US Congress',
  primaryKey: 'bioguideId',
  idPrefix: 'rep',
  properties: {
    name: { type: 'string', required: true, description: 'Full name' },
    party: { type: 'string', required: true, description: 'Political party (D/R/I)' },
    state: { type: 'string', required: true, description: 'Two-letter state code' },
    district: { type: 'string', required: false, description: 'District number (House only)' },
    chamber: { type: 'string', required: true, description: 'House or Senate' },
    title: {
      type: 'string',
      required: false,
      description: 'Title (e.g., Representative, Senator)',
    },
    imageUrl: { type: 'string', required: false, description: 'Photo URL' },
  },
  relationships: [
    {
      edgeType: 'serves_on',
      targetType: 'committee',
      direction: 'outgoing',
      description: 'Committee membership',
    },
    {
      edgeType: 'voted_on',
      targetType: 'bill',
      direction: 'outgoing',
      description: 'Roll call vote',
    },
    {
      edgeType: 'sponsored',
      targetType: 'bill',
      direction: 'outgoing',
      description: 'Bill sponsorship',
    },
    {
      edgeType: 'traded_stock',
      targetType: 'organization',
      direction: 'outgoing',
      description: 'Financial disclosure trade',
    },
    {
      edgeType: 'donated_to',
      targetType: 'representative',
      direction: 'incoming',
      description: 'Received campaign contribution',
    },
  ],
};

export const BILL_SCHEMA: EntitySchema = {
  nodeType: 'bill',
  displayName: 'Bill',
  description: 'A piece of legislation in the US Congress',
  primaryKey: 'number',
  idPrefix: 'bill',
  properties: {
    title: { type: 'string', required: true, description: 'Bill title' },
    number: { type: 'string', required: true, description: 'Bill number (e.g., HR 1234)' },
    congress: { type: 'number', required: true, description: 'Congress number (e.g., 119)' },
    type: { type: 'string', required: true, description: 'Bill type (hr, s, hjres, sjres)' },
    policyArea: {
      type: 'string',
      required: false,
      description: 'Congress.gov policy area classification',
    },
    latestAction: {
      type: 'string',
      required: false,
      description: 'Most recent legislative action',
    },
  },
  relationships: [
    {
      edgeType: 'sponsored',
      targetType: 'bill',
      direction: 'incoming',
      description: 'Has a sponsor',
    },
    { edgeType: 'voted_on', targetType: 'bill', direction: 'incoming', description: 'Has votes' },
    {
      edgeType: 'affects_sector',
      targetType: 'sector',
      direction: 'outgoing',
      description: 'Affects an industry sector',
    },
    {
      edgeType: 'referred_to',
      targetType: 'committee',
      direction: 'outgoing',
      description: 'Referred to committee',
    },
    {
      edgeType: 'lobbying_matches',
      targetType: 'organization',
      direction: 'outgoing',
      description: 'Matched to lobbying activity',
    },
  ],
};

export const COMMITTEE_SCHEMA: EntitySchema = {
  nodeType: 'committee',
  displayName: 'Committee',
  description: 'A congressional committee with oversight jurisdiction',
  primaryKey: 'code',
  idPrefix: 'cmte',
  properties: {
    name: { type: 'string', required: true, description: 'Committee name' },
    chamber: { type: 'string', required: true, description: 'House, Senate, or Joint' },
    code: { type: 'string', required: true, description: 'Committee code (e.g., SSFI, HSIF)' },
    jurisdiction: { type: 'string', required: false, description: 'Jurisdiction description' },
  },
  relationships: [
    {
      edgeType: 'serves_on',
      targetType: 'committee',
      direction: 'incoming',
      description: 'Has members',
    },
    {
      edgeType: 'oversees',
      targetType: 'agency',
      direction: 'outgoing',
      description: 'Oversight of federal agency',
    },
    {
      edgeType: 'lobbied',
      targetType: 'committee',
      direction: 'incoming',
      description: 'Targeted by lobbying',
    },
    {
      edgeType: 'referred_to',
      targetType: 'committee',
      direction: 'incoming',
      description: 'Bills referred here',
    },
  ],
};

export const AGENCY_SCHEMA: EntitySchema = {
  nodeType: 'agency',
  displayName: 'Federal Agency',
  description: 'A federal government agency or department',
  primaryKey: 'name',
  idPrefix: 'agency',
  properties: {
    name: { type: 'string', required: true, description: 'Agency name' },
  },
  relationships: [
    {
      edgeType: 'oversees',
      targetType: 'agency',
      direction: 'incoming',
      description: 'Overseen by committee',
    },
    {
      edgeType: 'awarded_contract',
      targetType: 'organization',
      direction: 'outgoing',
      description: 'Awarded federal contract',
    },
    {
      edgeType: 'regulates',
      targetType: 'organization',
      direction: 'outgoing',
      description: 'Regulatory authority over',
    },
  ],
};

export const ORGANIZATION_SCHEMA: EntitySchema = {
  nodeType: 'organization',
  displayName: 'Organization',
  description: 'A corporation, PAC, lobbying firm, or other entity',
  primaryKey: 'name',
  idPrefix: 'org',
  properties: {
    name: { type: 'string', required: true, description: 'Organization name' },
  },
  relationships: [
    {
      edgeType: 'donated_to',
      targetType: 'representative',
      direction: 'outgoing',
      description: 'Campaign contributions',
    },
    {
      edgeType: 'lobbied',
      targetType: 'committee',
      direction: 'outgoing',
      description: 'Lobbying activity',
    },
    {
      edgeType: 'in_sector',
      targetType: 'sector',
      direction: 'outgoing',
      description: 'Industry sector membership',
    },
    {
      edgeType: 'awarded_contract',
      targetType: 'organization',
      direction: 'incoming',
      description: 'Received federal contract',
    },
    {
      edgeType: 'employs_donor',
      targetType: 'representative',
      direction: 'outgoing',
      description: 'Employs a campaign donor',
    },
    {
      edgeType: 'lobbying_matches',
      targetType: 'organization',
      direction: 'incoming',
      description: 'Matched to bill via lobbying',
    },
    {
      edgeType: 'regulates',
      targetType: 'organization',
      direction: 'incoming',
      description: 'Regulated by agency',
    },
  ],
};

export const SECTOR_SCHEMA: EntitySchema = {
  nodeType: 'sector',
  displayName: 'Industry Sector',
  description: 'One of 13 industry sectors (OpenSecrets classification)',
  primaryKey: 'name',
  idPrefix: 'sector',
  properties: {
    name: { type: 'string', required: true, description: 'Sector display name' },
  },
  relationships: [
    {
      edgeType: 'in_sector',
      targetType: 'sector',
      direction: 'incoming',
      description: 'Organizations in this sector',
    },
    {
      edgeType: 'affects_sector',
      targetType: 'sector',
      direction: 'incoming',
      description: 'Bills affecting this sector',
    },
    {
      edgeType: 'donated_to',
      targetType: 'representative',
      direction: 'outgoing',
      description: 'Sector-level contributions',
    },
  ],
};

export const CONTRACT_SCHEMA: EntitySchema = {
  nodeType: 'contract',
  displayName: 'Federal Contract',
  description: 'A federal contract or grant award',
  primaryKey: 'awardId',
  idPrefix: 'contract',
  properties: {
    recipientName: { type: 'string', required: false, description: 'Award recipient name' },
    amount: { type: 'number', required: false, description: 'Award amount in dollars' },
  },
  relationships: [
    {
      edgeType: 'awarded_contract',
      targetType: 'organization',
      direction: 'outgoing',
      description: 'Awarded to organization',
    },
  ],
};

export const REGULATION_SCHEMA: EntitySchema = {
  nodeType: 'regulation',
  displayName: 'Federal Regulation',
  description: 'A Federal Register document (rule, notice, or executive order)',
  primaryKey: 'documentNumber',
  idPrefix: 'reg',
  properties: {
    title: { type: 'string', required: true, description: 'Regulation title' },
  },
  relationships: [
    {
      edgeType: 'regulates',
      targetType: 'organization',
      direction: 'outgoing',
      description: 'Regulates an organization',
    },
  ],
};

export const FACILITY_SCHEMA: EntitySchema = {
  nodeType: 'facility',
  displayName: 'Facility',
  description: 'A regulated facility tracked by EPA ECHO',
  primaryKey: 'registryId',
  idPrefix: 'fac',
  properties: {
    name: { type: 'string', required: true, description: 'Facility name' },
    registryId: { type: 'string', required: true, description: 'EPA Registry ID' },
    state: { type: 'string', required: false, description: 'Two-letter state code' },
    city: { type: 'string', required: false, description: 'City name' },
  },
  relationships: [
    {
      edgeType: 'located_in_district',
      targetType: 'representative',
      direction: 'outgoing',
      description: 'Located in congressional district',
    },
    {
      edgeType: 'violates_regulation',
      targetType: 'regulation',
      direction: 'outgoing',
      description: 'Has regulatory violations',
    },
  ],
};

export const DISASTER_SCHEMA: EntitySchema = {
  nodeType: 'disaster',
  displayName: 'Disaster Declaration',
  description: 'A FEMA disaster declaration',
  primaryKey: 'disasterNumber',
  idPrefix: 'dis',
  properties: {
    title: { type: 'string', required: true, description: 'Disaster title' },
    disasterNumber: { type: 'string', required: true, description: 'FEMA disaster number' },
    state: { type: 'string', required: false, description: 'Two-letter state code' },
    declarationType: {
      type: 'string',
      required: false,
      description: 'Declaration type (DR, EM, FM)',
    },
  },
  relationships: [
    {
      edgeType: 'declared_in',
      targetType: 'representative',
      direction: 'outgoing',
      description: 'Declared in congressional district',
    },
    {
      edgeType: 'receives_grant',
      targetType: 'organization',
      direction: 'outgoing',
      description: 'Disaster grants awarded',
    },
  ],
};

export const INSTITUTION_SCHEMA: EntitySchema = {
  nodeType: 'institution',
  displayName: 'Financial Institution',
  description: 'A financial institution subject to CFPB or HUD oversight',
  primaryKey: 'name',
  idPrefix: 'inst',
  properties: {
    name: { type: 'string', required: true, description: 'Institution name' },
  },
  relationships: [
    {
      edgeType: 'complained_against',
      targetType: 'institution',
      direction: 'incoming',
      description: 'Has consumer complaints',
    },
    {
      edgeType: 'receives_grant',
      targetType: 'institution',
      direction: 'incoming',
      description: 'Receives HUD housing grants',
    },
  ],
};

export const COMPLAINT_SCHEMA: EntitySchema = {
  nodeType: 'complaint',
  displayName: 'Consumer Complaint',
  description: 'A CFPB consumer complaint record',
  primaryKey: 'complaintId',
  idPrefix: 'cmp',
  properties: {
    complaintId: { type: 'string', required: true, description: 'CFPB complaint ID' },
    product: { type: 'string', required: false, description: 'Financial product type' },
    issue: { type: 'string', required: false, description: 'Complaint issue category' },
  },
  relationships: [
    {
      edgeType: 'complained_against',
      targetType: 'institution',
      direction: 'outgoing',
      description: 'Filed against financial institution',
    },
  ],
};

// ── Schema Collection ─────────────────────────────────────────────────

/** All entity schemas, indexed by node type */
export const ENTITY_SCHEMAS: Record<GraphNodeType, EntitySchema> = {
  representative: REPRESENTATIVE_SCHEMA,
  bill: BILL_SCHEMA,
  committee: COMMITTEE_SCHEMA,
  agency: AGENCY_SCHEMA,
  organization: ORGANIZATION_SCHEMA,
  sector: SECTOR_SCHEMA,
  contract: CONTRACT_SCHEMA,
  regulation: REGULATION_SCHEMA,
  facility: FACILITY_SCHEMA,
  disaster: DISASTER_SCHEMA,
  institution: INSTITUTION_SCHEMA,
  complaint: COMPLAINT_SCHEMA,
};

/** Get schema for a node type. Returns undefined for unknown types. */
export function getEntitySchema(nodeType: GraphNodeType): EntitySchema | undefined {
  return ENTITY_SCHEMAS[nodeType];
}

/**
 * Get all relationships that connect two entity types.
 * Checks both outgoing from `fromType` and incoming to `toType`.
 */
export function getRelationshipsBetween(
  fromType: GraphNodeType,
  toType: GraphNodeType
): RelationshipDef[] {
  const fromSchema = ENTITY_SCHEMAS[fromType];
  if (!fromSchema) return [];

  return fromSchema.relationships.filter(r => {
    if (r.direction === 'outgoing') return r.targetType === toType;
    // For incoming relationships, the "targetType" is actually the source of the edge
    if (r.direction === 'incoming') return r.targetType === fromType;
    return false;
  });
}

/**
 * Get all edge types referenced across all schemas.
 * Useful for validation — every GraphEdgeType should appear at least once.
 */
export function getAllReferencedEdgeTypes(): Set<GraphEdgeType> {
  const edgeTypes = new Set<GraphEdgeType>();
  for (const schema of Object.values(ENTITY_SCHEMAS)) {
    for (const rel of schema.relationships) {
      edgeTypes.add(rel.edgeType);
    }
  }
  return edgeTypes;
}
