/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { getAllPolicyAreas } from '@/lib/connections/policy-area-map';
import LegislationClient from './LegislationClient';

export default function LegislationPage() {
  // All CRS policy areas, so the topic filter doesn't depend on which bills loaded
  const policyAreas = [...getAllPolicyAreas()].sort((a, b) => a.localeCompare(b));
  return <LegislationClient policyAreas={policyAreas} />;
}
