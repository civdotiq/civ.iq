/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The checks a Senate roll call read from the Congressional Record must pass
 * before it is stored, on real Record text (roll 253 of 2026) and the
 * committed congress-legislators roster.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import {
  parseSenateRollCalls,
  recordText,
  type RecordRollCall,
} from '@/lib/data-sources/congressional-record/senate-roll-calls';
import {
  senateTerms,
  type RosterLegislator,
} from '@/lib/data-sources/congressional-record/senate-roster';
import {
  carried,
  checkRecordRollCall,
} from '@/lib/data-sources/congressional-record/senate-roll-check';

const roster = senateTerms(
  ['legislators-current.yaml', 'legislators-departed.yaml'].flatMap(
    file => yaml.load(readFileSync(join(process.cwd(), 'data', file), 'utf8')) as RosterLegislator[]
  )
);

function roll253(): RecordRollCall {
  const htm = readFileSync(
    join(__dirname, 'fixtures/congressional-record', 'CREC-2026-09-30-PgS5199-roll-253.htm'),
    'utf8'
  );
  const [roll] = parseSenateRollCalls(recordText(htm));
  if (!roll) throw new Error('fixture has no roll call');
  return roll;
}

describe('checkRecordRollCall', () => {
  it('passes roll 253 of 2026 with every senator, position and party', () => {
    const check = checkRecordRollCall(roll253(), roster, '2026-09-30');
    expect(check.problems).toEqual([]);
    expect(check.positions.size).toBe(100);
    // Rick Scott (FL) yea; Van Hollen nay; Sanders is an independent.
    expect(check.positions.get('S001217')).toBe('Y');
    expect(check.positions.get('V000128')).toBe('N');
    expect(check.parties.get('S000033')).toBe('I');
    expect(check.parties.get('S001217')).toBe('R');
  });

  it('fails a list whose count disagrees with its heading', () => {
    const roll = roll253();
    roll.names.Y.pop();
    const check = checkRecordRollCall(roll, roster, '2026-09-30');
    expect(check.problems).toEqual(
      expect.arrayContaining([
        'Yea: heading says 53, 52 names listed',
        expect.stringMatching(/^tally sentence 53-47, lists 52-47$/),
        expect.stringMatching(/^seated but not listed: /),
      ])
    );
  });

  it('fails a name it cannot match to exactly one senator', () => {
    const roll = roll253();
    roll.names.Y = roll.names.Y.map(n => (n === 'Scott (FL)' ? 'Scott' : n));
    const check = checkRecordRollCall(roll, roster, '2026-09-30');
    expect(check.problems).toEqual(
      expect.arrayContaining([expect.stringMatching(/"Scott" matches 2 seated senators/)])
    );
  });

  it('fails a roll call with no tally sentence', () => {
    const roll = roll253();
    roll.tally = null;
    expect(checkRecordRollCall(roll, roster, '2026-09-30').problems).toContain(
      'no tally sentence found'
    );
  });
});

describe('carried', () => {
  it('reads whether the question carried', () => {
    expect(carried('The motion was agreed to.')).toBe(true);
    expect(carried('The motion was not agreed to.')).toBe(false);
    expect(carried('The veto sustained.')).toBe(false);
    expect(carried(null)).toBeNull();
  });
});
