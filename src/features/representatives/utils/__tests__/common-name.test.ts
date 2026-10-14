/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { commonName } from '../common-name';

describe('commonName', () => {
  it('uses the nickname with the last name', () => {
    expect(
      commonName({
        name: 'Bernard Sanders',
        fullName: { last: 'Sanders', nickname: 'Bernie' },
      })
    ).toBe('Bernie Sanders');
  });

  it('keeps the listed name when there is no nickname', () => {
    expect(commonName({ name: 'Nancy Pelosi', fullName: { last: 'Pelosi' } })).toBe('Nancy Pelosi');
    expect(commonName({ name: 'Nancy Pelosi' })).toBe('Nancy Pelosi');
  });

  it('ignores a blank nickname', () => {
    expect(commonName({ name: 'Josh Riley', fullName: { last: 'Riley', nickname: '  ' } })).toBe(
      'Josh Riley'
    );
  });
});
