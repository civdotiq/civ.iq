/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Civic Mesh Initialization
 *
 * Registers all 8 entity types with their schemas and existing graph hydrators.
 * Call ensureMeshInitialized() before using the registry — it's idempotent
 * and safe to call multiple times.
 */

import { meshRegistry } from './registry';
import {
  REPRESENTATIVE_SCHEMA,
  BILL_SCHEMA,
  COMMITTEE_SCHEMA,
  AGENCY_SCHEMA,
  ORGANIZATION_SCHEMA,
  SECTOR_SCHEMA,
  CONTRACT_SCHEMA,
  REGULATION_SCHEMA,
} from './schema';
import { hydrateRepresentative } from '@/lib/graph/hydrators/representative';
import { hydrateBill } from '@/lib/graph/hydrators/bill';
import { hydrateCommittee } from '@/lib/graph/hydrators/committee';
import { hydrateOrganization } from '@/lib/graph/hydrators/organization';
import { hydrateAgency } from '@/lib/graph/hydrators/agency';
import { hydrateSector } from '@/lib/graph/hydrators/sector';

let initialized = false;

/**
 * Register all entity types with the mesh registry.
 * Idempotent — safe to call multiple times.
 */
export function ensureMeshInitialized(): void {
  if (initialized) return;

  // Entity types with hydrators (6 of 8)
  meshRegistry.register(REPRESENTATIVE_SCHEMA, hydrateRepresentative);
  meshRegistry.register(BILL_SCHEMA, hydrateBill);
  meshRegistry.register(COMMITTEE_SCHEMA, hydrateCommittee);
  meshRegistry.register(ORGANIZATION_SCHEMA, hydrateOrganization);
  meshRegistry.register(AGENCY_SCHEMA, hydrateAgency);
  meshRegistry.register(SECTOR_SCHEMA, hydrateSector);

  // Entity types without hydrators yet (appear as edge targets, not as hydration roots)
  meshRegistry.register(CONTRACT_SCHEMA, null);
  meshRegistry.register(REGULATION_SCHEMA, null);

  initialized = true;
}
