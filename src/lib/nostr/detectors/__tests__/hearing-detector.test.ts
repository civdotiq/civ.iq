/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { describe, test, expect } from '@jest/globals';
import { parseChamberFromDocClass } from '../hearing-detector';

describe('parseChamberFromDocClass', () => {
  test('identifies House hearings', () => {
    expect(parseChamberFromDocClass('HRPT')).toBe('House');
    expect(parseChamberFromDocClass('H123')).toBe('House');
  });

  test('identifies Senate hearings', () => {
    expect(parseChamberFromDocClass('SRPT')).toBe('Senate');
    expect(parseChamberFromDocClass('S456')).toBe('Senate');
  });

  test('defaults to Joint for unknown', () => {
    expect(parseChamberFromDocClass('JRPT')).toBe('Joint');
    expect(parseChamberFromDocClass('XYZ')).toBe('Joint');
  });
});
