/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export {
  buildCd120Corpus,
  normalizeDistrictCode,
  type BuildCd120CorpusInput,
  type Cd120CorpusFile,
  type Cd120District,
  type Cd120Row,
  type MultiPolygonCoords,
  type Bbox,
  type OgrFeatureCollection,
} from './cd120-corpus';
export { multiPolygonContains, bboxContains } from './point-in-multipolygon';
export {
  resolveBallotDistrict2026,
  toDistrictId,
  type BallotDistrict2026,
} from './ballot-district';
export {
  lookupDistrict120,
  getCd120CorpusStatus,
  __resetCd120Cache,
  type Cd120CorpusStatus,
} from './load-districts';
