/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { mkdirSync, mkdtempSync, rmSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../..');
const REAL_METADATA = join(PROJECT_ROOT, 'models/vote-prediction-metadata.json');

describe('vote-predictor error paths', () => {
  const originalCwd = process.cwd();
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'vote-predictor-test-'));
    process.chdir(tmp);
    jest.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  it('getModelMetadata returns null when metadata file is missing', async () => {
    const { getModelMetadata } = await import('../vote-predictor');
    expect(getModelMetadata()).toBeNull();
  });

  it('predictVote returns null when model file is missing', async () => {
    const { predictVote, buildFeatureVector } = await import('../vote-predictor');
    const fv = buildFeatureVector({}, 'D', 'House', 2, [], 0, false);
    const result = await predictVote(fv);
    expect(result).toBeNull();
  });

  it('getModelMetadata returns parsed metadata when file is present', async () => {
    mkdirSync(join(tmp, 'models'), { recursive: true });
    copyFileSync(REAL_METADATA, join(tmp, 'models/vote-prediction-metadata.json'));
    const { getModelMetadata } = await import('../vote-predictor');
    const metadata = getModelMetadata();
    expect(metadata).not.toBeNull();
    expect(metadata!.featureNames.length).toBeGreaterThan(0);
    expect(metadata!.predictionThreshold).toBeGreaterThan(0.5);
  });
});

describe('FEATURE_HUMAN_LABELS coverage', () => {
  it('has a human label for every feature the model was trained on', async () => {
    const { readFileSync } = await import('fs');
    const metadata = JSON.parse(readFileSync(REAL_METADATA, 'utf-8')) as {
      featureNames: string[];
    };
    const { FEATURE_HUMAN_LABELS } = await import('../vote-predictor');

    const unlabeled = metadata.featureNames.filter(name => !FEATURE_HUMAN_LABELS[name]);
    // Raw feature slugs must never reach citizens in topFactors/shapFactors
    expect(unlabeled).toEqual([]);
  });
});
