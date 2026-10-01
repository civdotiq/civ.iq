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
 * Grace period: VA publishes a fiscal year's VetPop file after that year
 * starts (on 2026-10-01 the newest was still FY2026), and the pinned data
 * stays correctly labelled meanwhile. So the tripwire fires on April 1 of
 * the following fiscal year, not on October 1.
 *
 * If this test is failing: that time has come. Look for the FY2027 (or
 * later) "Veteran Population by State" dataset on datahub.va.gov, update
 * the constants, and bump VETERAN_POP_DATASET_FISCAL_YEAR. If VA still
 * hasn't published it, say so in the PR and move the grace date.
 */

import { VETERAN_POP_DATASET_FISCAL_YEAR } from '@/lib/data-sources/va-veteran-population-service';

/** April 1 of the fiscal year after the pinned dataset's (UTC). */
function tripwireDate(datasetFiscalYear: number): Date {
  return new Date(Date.UTC(datasetFiscalYear + 1, 3, 1));
}

describe('VA veteran population dataset freshness tripwire', () => {
  it('the pinned VetPop dataset is checked for a newer one by April of the next fiscal year', () => {
    expect(Date.now()).toBeLessThan(tripwireDate(VETERAN_POP_DATASET_FISCAL_YEAR).getTime());
  });

  it('fires on April 1, 2027 for the FY2026 dataset', () => {
    expect(tripwireDate(2026).toISOString()).toBe('2027-04-01T00:00:00.000Z');
  });
});
