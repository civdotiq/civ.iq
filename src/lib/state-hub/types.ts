/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/** One sitting state legislator as the hub and its lookup show them. */
export interface HubMember {
  id: string;
  name: string;
  district: string;
  party: string;
  chamber: 'upper' | 'lower';
  phone?: string;
  email?: string;
  /** Readable profile path, e.g. /state-legislature/mi/legislator/angela-rigas-2a1a6b8f */
  url: string;
  /** DC's at-large members and Chairman, Puerto Rico's at-large seats. */
  atLarge: boolean;
}
