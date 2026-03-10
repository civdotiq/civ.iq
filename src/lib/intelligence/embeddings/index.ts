/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export { classifyBillSectors, embedText } from './embedding-classifier';
export {
  cosineSimilarity,
  classifySectors,
  DEFAULT_THRESHOLD,
  DEFAULT_MAX_SECTORS,
} from './cosine-similarity';
export { SECTOR_DESCRIPTIONS } from './sector-descriptions';
export type { SectorClassification, SectorEmbeddingEntry } from './types';
