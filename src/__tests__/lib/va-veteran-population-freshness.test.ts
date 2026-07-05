/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * TRIPWIRE (2026-07 audit item 3): the VA veteran-population integration is
 * pinned to the FY2026 VetPop dataset (Socrata resource w6fb-7dn4). The FY
 * label must describe the DATASET, not today's date — but once the federal
 * fiscal calendar moves past that dataset's year, someone needs to check
 * whether VA has published a newer VetPop resource and update BOTH the
 * resource UUID and FISCAL_YEAR in va-veteran-population-service.ts.
 *
 * If this test is failing: that time has come. Look for the FY2027 (or
 * later) "Veteran Population by State" dataset on datahub.va.gov, update
 * the constants, and bump VETERAN_POP_DATASET_FISCAL_YEAR.
 */

import { VETERAN_POP_DATASET_FISCAL_YEAR } from '@/lib/data-sources/va-veteran-population-service';
import { currentFederalFiscalYear } from '@/lib/helpers/federal-fiscal-year';

describe('VA veteran population dataset freshness tripwire', () => {
  it('the pinned VetPop dataset is not older than the current federal fiscal year', () => {
    expect(currentFederalFiscalYear()).toBeLessThanOrEqual(VETERAN_POP_DATASET_FISCAL_YEAR);
  });
});
