/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Regression guard for a factual-data bug where the House Financial Services
// committee page rendered the Budget Committee's jurisdiction text. HSBA is
// Financial Services on Congress.gov / THOMAS (legacy "Banking" code); HSBU
// is Budget. Historically a stub file conflated the two. These tests pin the
// committee data + systemCode mappings to the real-world mapping verified
// against src/data/committees-with-subcommittees.json and the House Rules
// and Manual (HMAN-119).

import { getCommitteeData, HOUSE_COMMITTEES } from '@/lib/data/committees';
import { COMMITTEE_NAMES, COMMITTEE_INFO } from '@/lib/data/committee-names';

describe('House committee systemCode mapping (HSBA / HSBU)', () => {
  it('HSBA returns the House Financial Services Committee with the Rule X clause 1(h) jurisdiction', async () => {
    const committee = await getCommitteeData('HSBA');
    expect(committee).not.toBeNull();
    expect(committee!.id).toBe('HSBA');
    expect(committee!.name).toBe('House Committee on Financial Services');
    expect(committee!.jurisdiction).toMatch(/Financial Services/);
    expect(committee!.jurisdiction).toMatch(/Rule X, clause 1\(h\)/);
    // Guard against the original bug: Budget Committee phrasing must not appear.
    expect(committee!.jurisdiction).not.toMatch(/federal budget process/i);
    expect(committee!.jurisdiction).not.toMatch(/budget resolution/i);
  });

  it('HSBU returns the House Budget Committee with the Rule X clause 1(d) jurisdiction', async () => {
    const committee = await getCommitteeData('HSBU');
    expect(committee).not.toBeNull();
    expect(committee!.id).toBe('HSBU');
    expect(committee!.name).toBe('House Committee on the Budget');
    expect(committee!.jurisdiction).toMatch(/Rule X, clause 1\(d\)/);
    expect(committee!.jurisdiction).toMatch(/concurrent resolutions on the budget/i);
    expect(committee!.jurisdiction).toMatch(/budget process generally/i);
    // Guard against the original bug: Financial Services phrasing must not appear.
    expect(committee!.jurisdiction).not.toMatch(/Financial Services/);
    expect(committee!.jurisdiction).not.toMatch(/deposit insurance/);
  });

  it('HOUSE_COMMITTEES constant maps HSBA to Financial Services and HSBU to Budget', () => {
    expect(HOUSE_COMMITTEES.HSBA).toBe('Financial Services');
    expect(HOUSE_COMMITTEES.HSBU).toBe('Budget');
    expect(HOUSE_COMMITTEES.HSSM).toBe('Small Business');
    expect(HOUSE_COMMITTEES.HSPW).toBe('Transportation and Infrastructure');
    // Guard against bogus systemCodes that have appeared here historically.
    expect((HOUSE_COMMITTEES as Record<string, string>).HSSF).toBeUndefined();
    expect((HOUSE_COMMITTEES as Record<string, string>).HSTG).toBeUndefined();
  });

  it('COMMITTEE_NAMES maps HSBA to Financial Services, not Small Business', () => {
    expect(COMMITTEE_NAMES.HSBA).toBe('House Committee on Financial Services');
    expect(COMMITTEE_NAMES.HSBU).toBe('House Committee on the Budget');
    expect(COMMITTEE_NAMES.HSSM).toBe('House Committee on Small Business');
    // Bogus codes that shadowed HSBA's real committee:
    expect(COMMITTEE_NAMES.HSFS).toBeUndefined();
    expect(COMMITTEE_NAMES.HSHL).toBeUndefined();
  });

  it('COMMITTEE_INFO maps HSBA to Financial Services (used by rep committee tooltips)', () => {
    const hsba = COMMITTEE_INFO.HSBA;
    expect(hsba).toBeDefined();
    expect(hsba!.name).toBe('House Committee on Financial Services');
    expect(hsba!.description.toLowerCase()).toMatch(/financial|banking|securities/);
    expect(hsba!.description.toLowerCase()).not.toMatch(/small business/);

    const hssm = COMMITTEE_INFO.HSSM;
    expect(hssm).toBeDefined();
    expect(hssm!.name).toBe('House Committee on Small Business');

    expect((COMMITTEE_INFO as Record<string, unknown>).HSFS).toBeUndefined();
  });
});
