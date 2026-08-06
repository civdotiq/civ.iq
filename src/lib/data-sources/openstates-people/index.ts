/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export { buildPeopleCorpus, currentChamberRole } from './build-corpus';
export type { BuildInput, RawPersonYaml } from './build-corpus';
export { decodePersonRow } from './people-corpus';
export type {
  CorpusChamber,
  CorpusPerson,
  EncodedPersonRow,
  PeopleCorpusFile,
} from './people-corpus';
// The request-time reader is deliberately absent: it pulls in node:fs, and
// consumers import './load-people' directly. Same split as the LDA corpus.
