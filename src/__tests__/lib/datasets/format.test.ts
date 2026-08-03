/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { formatDataset, streamDataset } from '@/lib/datasets/format';
import type { DatasetResult } from '@/types/dataset';

function makeDataset(rowCount: number): DatasetResult {
  return {
    metadata: {
      name: 'Test Dataset',
      slug: 'test-dataset',
      description: 'Fixture',
      source: 'Test',
      sourceUrl: 'https://example.test',
      generated: '2026-08-03T00:00:00.000Z',
      recordCount: rowCount,
      license: 'Public Domain',
      columns: [
        { key: 'name', label: 'Name', description: 'Name', type: 'string' },
        { key: 'amount', label: 'Amount', description: 'Amount', type: 'number' },
      ],
    },
    data: Array.from({ length: rowCount }, (_, i) => ({
      // A comma and a quote so escaping is exercised across a chunk boundary.
      name: `Org "${i}", Inc.`,
      amount: i * 100,
    })),
  };
}

function collect(result: DatasetResult, format: 'csv' | 'json'): string {
  let out = '';
  for (const chunk of streamDataset(result, format)) out += chunk;
  return out;
}

describe('streamDataset', () => {
  // 2000 rows per chunk, so this spans several and lands mid-batch.
  it.each([0, 1, 2000, 4500] as const)('matches formatDataset for %i CSV rows', rowCount => {
    const dataset = makeDataset(rowCount);

    expect(collect(dataset, 'csv')).toBe(formatDataset(dataset, 'csv'));
  });

  it('produces JSON parsing to the same value as formatDataset', () => {
    const dataset = makeDataset(4500);

    expect(JSON.parse(collect(dataset, 'json'))).toEqual(
      JSON.parse(formatDataset(dataset, 'json'))
    );
  });

  it('emits an empty data array rather than trailing commas', () => {
    expect(JSON.parse(collect(makeDataset(0), 'json'))).toMatchObject({ data: [] });
  });

  it('yields more than one chunk once past the chunk size', () => {
    expect(Array.from(streamDataset(makeDataset(4500), 'csv')).length).toBeGreaterThan(2);
  });
});
