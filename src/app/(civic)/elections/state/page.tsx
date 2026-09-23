/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getAllStatewideResults2024 } from '@/lib/services/election-results.service';
import StateElectionsClient from './StateElectionsClient';

export default function StateElectionsPage() {
  // Committed MEDSL data, so the server HTML carries the governor races
  // instead of an empty "0 races" shell. The data modules stay server-side.
  const initialResults = getAllStatewideResults2024('GOVERNOR');
  return <StateElectionsClient initialResults={initialResults} />;
}
