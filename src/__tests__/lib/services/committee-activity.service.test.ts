/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Tests for committee-activity service — primarily the committee
 * system code normalization used to build Congress.gov API URLs.
 * The underlying fetch behavior is not tested (network-dependent).
 */

import {
  normalizeCommitteeSystemCode,
  getStatusFromAction,
  selectRecentMeetings,
  type CongressMeetingDetail,
} from '@/lib/services/committee-activity.service';

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

describe('getStatusFromAction', () => {
  // This is the reported cross-page bug: HR 6398's current latestAction
  // from Congress.gov contains both "received in the Senate" (the bill
  // cleared the House) and "referred" (to a Senate committee). The older
  // substring matcher collapsed it to "In Committee" on the House E&C
  // page, contradicting the voting-record page which showed members
  // voting on it. The chamber-transit signal must win so the status
  // accurately reflects that the bill has moved past this committee.
  it('labels a bill received in the Senate as having passed the House, not "In Committee"', () => {
    const action =
      'Received in the Senate and Read twice and referred to the Committee on Environment and Public Works.';
    expect(getStatusFromAction(action)).toBe('Passed House, in Senate');
  });

  it('labels a bill received in the House as having passed the Senate', () => {
    expect(getStatusFromAction('Received in the House.')).toBe('Passed Senate, in House');
  });

  it('labels a signed bill as law', () => {
    expect(getStatusFromAction('Became Public Law No: 119-42.')).toBe('Now law');
  });

  it('labels an "Ordered to be Reported" action as voted out of committee', () => {
    expect(getStatusFromAction('Ordered to be Reported by the Yeas and Nays: 28 - 21.')).toBe(
      'Voted out of committee'
    );
  });

  it('labels a plain referral as awaiting committee review (citizen language)', () => {
    expect(getStatusFromAction('Referred to the House Committee on Energy and Commerce.')).toBe(
      'Awaiting committee review'
    );
  });

  it('falls through to "Under review" for unrecognized text', () => {
    expect(getStatusFromAction('')).toBe('Under review');
    expect(
      getStatusFromAction('Motion to reconsider laid on the table Agreed to without objection.')
    ).toBe('Under review');
  });
});

describe('selectRecentMeetings', () => {
  const meeting = (
    eventId: string,
    date: string,
    opts: { status?: string; code?: string } = {}
  ): CongressMeetingDetail => ({
    chamber: 'House',
    congress: 119,
    eventId,
    date,
    title: `Hearing ${eventId}`,
    type: 'Hearing',
    meetingStatus: opts.status ?? 'Scheduled',
    updateDate: '2026-10-01T00:00:00Z',
    committees: [{ name: 'Agriculture', systemCode: opts.code ?? 'hsag00' }],
  });
  const now = Date.parse('2026-10-26T12:00:00Z');

  it('returns the newest held meetings by date, whatever the list order', () => {
    // Congress.gov lists meetings by update date; House Agriculture's June
    // hearing came back ahead of newer ones.
    const list = [
      meeting('a', '2026-06-10T14:00:00Z'),
      meeting('b', '2025-02-11T14:00:00Z'),
      meeting('c', '2026-09-16T14:00:00Z'),
      meeting('d', '2026-07-22T14:00:00Z'),
      meeting('e', '2026-07-21T14:00:00Z'),
      meeting('f', '2026-06-25T14:00:00Z'),
      null,
    ];
    expect(selectRecentMeetings(list, 'HSAG', 'house', 5, now).map(m => m.eventId)).toEqual([
      'c',
      'd',
      'e',
      'f',
      'a',
    ]);
  });

  it('skips canceled, postponed and future meetings, and other committees', () => {
    const list = [
      meeting('canceled', '2026-10-01T14:00:00Z', { status: 'Canceled' }),
      meeting('postponed', '2026-10-02T14:00:00Z', { status: 'Postponed' }),
      meeting('future', '2026-11-05T14:00:00Z'),
      meeting('other', '2026-10-03T14:00:00Z', { code: 'hsif00' }),
      meeting('subcommittee', '2026-09-30T14:00:00Z', { code: 'hsag15' }),
    ];
    expect(selectRecentMeetings(list, 'HSAG', 'house', 5, now).map(m => m.eventId)).toEqual([
      'subcommittee',
    ]);
  });
});
