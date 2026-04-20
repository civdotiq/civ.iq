/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { describe, test, expect } from '@jest/globals';
import {
  applyZipAccuracyDegradation,
  getZipAccuracyNote,
  ZIP_ACCURACY_NOTE,
} from '@/lib/backbone/zip-accuracy';
import type { BackboneResponse } from '@/types/backbone-response';

type Sample = { value: number };

function completeResponse(): BackboneResponse<Sample> {
  return {
    data: { value: 1 },
    dataQuality: 'complete',
    sourceStatus: [{ source: 'test', status: 'ok', fetchedAt: '2026-04-20T00:00:00.000Z' }],
  };
}

function unavailableResponse(): BackboneResponse<Sample> {
  return {
    data: { value: 0 },
    dataQuality: 'unavailable',
    sourceStatus: [
      {
        source: 'test',
        status: 'error',
        errorMessage: 'boom',
        fetchedAt: '2026-04-20T00:00:00.000Z',
      },
    ],
  };
}

describe('applyZipAccuracyDegradation', () => {
  test('address input: response is unchanged', () => {
    const input = completeResponse();
    const output = applyZipAccuracyDegradation(input, 'address');

    expect(output).toBe(input);
    expect(output.dataQuality).toBe('complete');
    expect(output.accuracyNote).toBeUndefined();
  });

  test('lat-lon input: response is unchanged', () => {
    const input = completeResponse();
    const output = applyZipAccuracyDegradation(input, 'lat-lon');

    expect(output).toBe(input);
    expect(output.accuracyNote).toBeUndefined();
  });

  test('zip input on complete response: downgrades to partial and attaches accuracyNote', () => {
    const input = completeResponse();
    const output = applyZipAccuracyDegradation(input, 'zip');

    expect(output.dataQuality).toBe('partial');
    expect(output.accuracyNote).toBe(ZIP_ACCURACY_NOTE);
    // Input is not mutated
    expect(input.dataQuality).toBe('complete');
    expect(input.accuracyNote).toBeUndefined();
    // Underlying data and sourceStatus preserved
    expect(output.data).toEqual(input.data);
    expect(output.sourceStatus).toEqual(input.sourceStatus);
  });

  test('zip input on unavailable response: stays unavailable and does not add note', () => {
    const input = unavailableResponse();
    const output = applyZipAccuracyDegradation(input, 'zip');

    expect(output).toBe(input);
    expect(output.dataQuality).toBe('unavailable');
    expect(output.accuracyNote).toBeUndefined();
  });
});

describe('getZipAccuracyNote', () => {
  test('returns the note for zip', () => {
    expect(getZipAccuracyNote('zip')).toBe(ZIP_ACCURACY_NOTE);
  });

  test('returns undefined for address', () => {
    expect(getZipAccuracyNote('address')).toBeUndefined();
  });

  test('returns undefined for lat-lon', () => {
    expect(getZipAccuracyNote('lat-lon')).toBeUndefined();
  });
});
