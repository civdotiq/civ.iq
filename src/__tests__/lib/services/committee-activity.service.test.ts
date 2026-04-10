/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for committee-activity service — primarily the committee
 * system code normalization used to build Congress.gov API URLs.
 * The underlying fetch behavior is not tested (network-dependent).
 */

import { normalizeCommitteeSystemCode } from '@/lib/services/committee-activity.service';

describe('normalizeCommitteeSystemCode', () => {
  it('appends 00 to 4-letter parent committee codes', () => {
    expect(normalizeCommitteeSystemCode('HSAG')).toBe('hsag00');
    expect(normalizeCommitteeSystemCode('SSFI')).toBe('ssfi00');
    expect(normalizeCommitteeSystemCode('HSWM')).toBe('hswm00');
  });

  it('preserves subcommittee codes already suffixed with 2 digits', () => {
    expect(normalizeCommitteeSystemCode('HSAG22')).toBe('hsag22');
    expect(normalizeCommitteeSystemCode('SSGA20')).toBe('ssga20');
    expect(normalizeCommitteeSystemCode('SSEV10')).toBe('ssev10');
  });

  it('lowercases already-normalized codes', () => {
    expect(normalizeCommitteeSystemCode('hsag00')).toBe('hsag00');
    expect(normalizeCommitteeSystemCode('SSFI00')).toBe('ssfi00');
  });

  it('passes through unusual shapes unchanged (lowercased)', () => {
    // The function is forgiving — it won't break on unexpected inputs.
    expect(normalizeCommitteeSystemCode('XYZ')).toBe('xyz');
    expect(normalizeCommitteeSystemCode('Unknown')).toBe('unknown');
  });
});
