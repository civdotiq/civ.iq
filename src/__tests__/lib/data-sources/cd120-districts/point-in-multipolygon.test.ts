/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  bboxContains,
  multiPolygonContains,
} from '@/lib/data-sources/cd120-districts/point-in-multipolygon';
import type { Bbox, MultiPolygonCoords } from '@/lib/data-sources/cd120-districts/cd120-corpus';

const unitSquare: MultiPolygonCoords = [
  [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ],
];

const squareWithHole: MultiPolygonCoords = [
  [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
    [
      [4, 4],
      [6, 4],
      [6, 6],
      [4, 6],
      [4, 4],
    ],
  ],
];

const twoIslands: MultiPolygonCoords = [
  ...unitSquare,
  [
    [
      [20, 20],
      [22, 20],
      [22, 22],
      [20, 22],
      [20, 20],
    ],
  ],
];

describe('bboxContains', () => {
  const bbox: Bbox = [-90, 29, -89, 31];

  it('accepts points inside and on the envelope edge', () => {
    expect(bboxContains(bbox, -89.5, 30)).toBe(true);
    expect(bboxContains(bbox, -90, 29)).toBe(true);
  });

  it('rejects points outside', () => {
    expect(bboxContains(bbox, -88.9, 30)).toBe(false);
    expect(bboxContains(bbox, -89.5, 31.1)).toBe(false);
  });
});

describe('multiPolygonContains', () => {
  it('finds points inside a simple polygon', () => {
    expect(multiPolygonContains(unitSquare, 5, 5)).toBe(true);
    expect(multiPolygonContains(unitSquare, 11, 5)).toBe(false);
    expect(multiPolygonContains(unitSquare, -1, -1)).toBe(false);
  });

  it('respects holes', () => {
    expect(multiPolygonContains(squareWithHole, 5, 5)).toBe(false);
    expect(multiPolygonContains(squareWithHole, 2, 2)).toBe(true);
  });

  it('checks every polygon of a MultiPolygon', () => {
    expect(multiPolygonContains(twoIslands, 21, 21)).toBe(true);
    expect(multiPolygonContains(twoIslands, 15, 15)).toBe(false);
  });
});
