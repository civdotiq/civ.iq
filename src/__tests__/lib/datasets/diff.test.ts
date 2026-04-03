/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { computeDatasetDiff } from '@/lib/datasets/diff';
import type { DatasetResult } from '@/types/dataset';

function makeDataset(data: Record<string, unknown>[]): DatasetResult {
  return {
    metadata: {
      name: 'Test Dataset',
      slug: 'test',
      description: 'Test',
      source: 'test',
      sourceUrl: 'https://example.com',
      generated: new Date().toISOString(),
      recordCount: data.length,
      license: 'Public Domain',
      columns: [],
    },
    data,
  };
}

describe('computeDatasetDiff', () => {
  it('returns empty diff when old data is null (first generation)', () => {
    const newData = makeDataset([
      { bioguideId: 'A000001', name: 'Alice', party: 'D' },
      { bioguideId: 'B000001', name: 'Bob', party: 'R' },
    ]);

    const diff = computeDatasetDiff('congress-members', 'bioguideId', null, newData);

    expect(diff.dataset).toBe('congress-members');
    expect(diff.entries).toHaveLength(0);
    expect(diff.stats).toEqual({ added: 0, modified: 0, removed: 0 });
  });

  it('returns empty diff when old data is empty', () => {
    const oldData = makeDataset([]);
    const newData = makeDataset([{ bioguideId: 'A000001', name: 'Alice' }]);

    const diff = computeDatasetDiff('test', 'bioguideId', oldData, newData);

    expect(diff.entries).toHaveLength(0);
  });

  it('detects added rows', () => {
    const oldData = makeDataset([{ bioguideId: 'A000001', name: 'Alice', party: 'D' }]);
    const newData = makeDataset([
      { bioguideId: 'A000001', name: 'Alice', party: 'D' },
      { bioguideId: 'B000001', name: 'Bob', party: 'R' },
    ]);

    const diff = computeDatasetDiff('test', 'bioguideId', oldData, newData);

    expect(diff.stats.added).toBe(1);
    expect(diff.stats.modified).toBe(0);
    expect(diff.stats.removed).toBe(0);

    const added = diff.entries.find(e => e.type === 'added');
    expect(added).toBeDefined();
    expect(added!.key).toBe('B000001');
    expect(added!.summary).toContain('Added');
  });

  it('detects removed rows', () => {
    const oldData = makeDataset([
      { bioguideId: 'A000001', name: 'Alice', party: 'D' },
      { bioguideId: 'B000001', name: 'Bob', party: 'R' },
    ]);
    const newData = makeDataset([{ bioguideId: 'A000001', name: 'Alice', party: 'D' }]);

    const diff = computeDatasetDiff('test', 'bioguideId', oldData, newData);

    expect(diff.stats.removed).toBe(1);
    const removed = diff.entries.find(e => e.type === 'removed');
    expect(removed).toBeDefined();
    expect(removed!.key).toBe('B000001');
    expect(removed!.summary).toContain('Removed');
  });

  it('detects modified rows with field-level changes', () => {
    const oldData = makeDataset([
      { bioguideId: 'A000001', name: 'Alice', party: 'D', phone: '555-0001' },
    ]);
    const newData = makeDataset([
      { bioguideId: 'A000001', name: 'Alice', party: 'R', phone: '555-9999' },
    ]);

    const diff = computeDatasetDiff('test', 'bioguideId', oldData, newData);

    expect(diff.stats.modified).toBe(1);
    const modified = diff.entries.find(e => e.type === 'modified');
    expect(modified).toBeDefined();
    expect(modified!.key).toBe('A000001');
    expect(modified!.changes).toBeDefined();
    expect(modified!.changes!['party']).toEqual(['D', 'R']);
    expect(modified!.changes!['phone']).toEqual(['555-0001', '555-9999']);
  });

  it('does not flag unchanged rows as modified', () => {
    const data = [
      { bioguideId: 'A000001', name: 'Alice', party: 'D' },
      { bioguideId: 'B000001', name: 'Bob', party: 'R' },
    ];
    const oldData = makeDataset(data);
    const newData = makeDataset(data);

    const diff = computeDatasetDiff('test', 'bioguideId', oldData, newData);

    expect(diff.entries).toHaveLength(0);
    expect(diff.stats).toEqual({ added: 0, modified: 0, removed: 0 });
  });

  it('handles combined adds, modifies, and removes', () => {
    const oldData = makeDataset([
      { id: '1', name: 'Alice', status: 'active' },
      { id: '2', name: 'Bob', status: 'active' },
      { id: '3', name: 'Charlie', status: 'active' },
    ]);
    const newData = makeDataset([
      { id: '1', name: 'Alice', status: 'active' }, // unchanged
      { id: '2', name: 'Bob', status: 'inactive' }, // modified
      { id: '4', name: 'Diana', status: 'active' }, // added
      // id=3 removed
    ]);

    const diff = computeDatasetDiff('test', 'id', oldData, newData);

    expect(diff.stats.added).toBe(1);
    expect(diff.stats.modified).toBe(1);
    expect(diff.stats.removed).toBe(1);
    expect(diff.entries).toHaveLength(3);
  });

  it('generates human-readable summaries for single-field changes', () => {
    const oldData = makeDataset([{ id: '1', status: 'active' }]);
    const newData = makeDataset([{ id: '1', status: 'inactive' }]);

    const diff = computeDatasetDiff('test', 'id', oldData, newData);

    const entry = diff.entries[0]!;
    expect(entry.summary).toContain('status');
    expect(entry.summary).toContain('active');
    expect(entry.summary).toContain('inactive');
  });

  it('skips rows with missing key values', () => {
    const oldData = makeDataset([
      { id: '1', name: 'Alice' },
      { id: '', name: 'NoKey' }, // empty key — should be skipped
    ]);
    const newData = makeDataset([
      { id: '1', name: 'Alice' },
      { name: 'AlsoNoKey' }, // missing key field — should be skipped
    ]);

    const diff = computeDatasetDiff('test', 'id', oldData, newData);

    // Only id=1 should be compared (unchanged), no spurious adds/removes
    expect(diff.entries).toHaveLength(0);
  });

  it('caps entries at 100', () => {
    // Create 150 new rows (all "added")
    const oldData = makeDataset([{ id: 'seed', name: 'Seed' }]);
    const newRows = Array.from({ length: 150 }, (_, i) => ({
      id: `new-${i}`,
      name: `Person ${i}`,
    }));
    const newData = makeDataset(newRows);

    const diff = computeDatasetDiff('test', 'id', oldData, newData);

    // Should be capped at 100
    expect(diff.entries.length).toBeLessThanOrEqual(100);
  });
});
