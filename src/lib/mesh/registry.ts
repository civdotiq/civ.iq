/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Civic Mesh Entity Registry
 *
 * Maps entity types to their schemas and hydrators. Provides a plugin-style
 * registration so new entity types can be added without modifying dispatch code.
 *
 * The registry is populated by init.ts which registers all 8 entity types
 * with their schemas and existing graph hydrators.
 */

import type { GraphNodeType } from '@/types/graph';
import type { EntitySchema, RelationshipDef } from './schema';

/** Function signature for type-specific hydrators */
export type HydratorFn = (identifier: string) => Promise<{
  center: import('@/types/graph').GraphNode;
  sources: import('@/lib/graph/types').HydrationSource[];
} | null>;

interface RegisteredEntity {
  schema: EntitySchema;
  hydrator: HydratorFn | null;
}

class MeshRegistry {
  private entities = new Map<GraphNodeType, RegisteredEntity>();

  /**
   * Register an entity type with its schema and optional hydrator.
   * Entity types without hydrators (contract, regulation) can still
   * be queried via schema — they just can't be hydrated directly.
   */
  register(schema: EntitySchema, hydrator: HydratorFn | null = null): void {
    this.entities.set(schema.nodeType, { schema, hydrator });
  }

  /** Get the schema for a node type */
  getSchema(nodeType: GraphNodeType): EntitySchema | undefined {
    return this.entities.get(nodeType)?.schema;
  }

  /** Get the hydrator function for a node type */
  getHydrator(nodeType: GraphNodeType): HydratorFn | null | undefined {
    return this.entities.get(nodeType)?.hydrator;
  }

  /** Check if a node type has a registered hydrator */
  hasHydrator(nodeType: GraphNodeType): boolean {
    const entry = this.entities.get(nodeType);
    return entry?.hydrator != null;
  }

  /** Get all registered schemas */
  getAllSchemas(): EntitySchema[] {
    return Array.from(this.entities.values()).map(e => e.schema);
  }

  /** Get all registered node types */
  getRegisteredTypes(): GraphNodeType[] {
    return Array.from(this.entities.keys());
  }

  /** Get all relationship types that can connect two entity types */
  getRelationships(fromType: GraphNodeType, toType: GraphNodeType): RelationshipDef[] {
    const schema = this.getSchema(fromType);
    if (!schema) return [];
    return schema.relationships.filter(r => r.targetType === toType);
  }

  /** Check if a node type is registered */
  isRegistered(nodeType: GraphNodeType): boolean {
    return this.entities.has(nodeType);
  }

  /** Total number of registered entity types */
  get size(): number {
    return this.entities.size;
  }
}

/** Singleton mesh registry instance */
export const meshRegistry = new MeshRegistry();
