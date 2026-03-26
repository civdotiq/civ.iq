/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote Prediction Model Inference
 *
 * Loads a pre-trained XGBoost model (ONNX format) and predicts how a
 * legislator would vote on a bill based on their donor profile.
 *
 * The model runs on the WASM backend via onnxruntime-web (same runtime
 * used by @huggingface/transformers — no new native dependencies).
 *
 * The insight is the residual: when a legislator votes against their
 * donor-predicted position, that's a measurable signal about democratic
 * independence.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import logger from '@/lib/logging/simple-logger';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

// ── Types ────────────────────────────────────────────────────────────

export interface ShapFactor {
  feature: string;
  humanLabel: string;
  /** Mean absolute SHAP value. */
  importance: number;
  /** Actual feature value for this prediction. */
  featureValue: number;
  /** Whether this feature pushes toward yea, nay, or is neutral. */
  direction: 'toward_yea' | 'toward_nay' | 'neutral';
}

export interface VotePrediction {
  /** Predicted probability of yea vote (0-1). */
  yeaProbability: number;
  /** Confident prediction if probability > threshold or < (1-threshold). */
  predictedVote: 'yea' | 'nay' | 'uncertain';
  /** Which features drove this prediction (top 3 by importance). */
  topFactors: Array<{
    feature: string;
    humanLabel: string;
    contribution: number;
  }>;
  /** SHAP-based factors with directional context (top 5). */
  shapFactors?: ShapFactor[];
}

export interface IndependenceScore {
  /** How often the legislator voted against model prediction (0-1). */
  score: number;
  /** Number of votes where model was confident. */
  confidentPredictions: number;
  /** Number of times legislator defied prediction. */
  deviations: number;
  /** Peer comparison — percentile among chamber peers. */
  peerPercentile: number;
  /** Notable deviations — specific bills where they bucked the prediction. */
  notableDeviations: Array<{
    billId: string;
    billTitle: string;
    predictedVote: 'yea' | 'nay';
    actualVote: 'yea' | 'nay';
    yeaProbability: number;
    billSectors: IndustrySector[];
  }>;
}

export interface VotePredictionModelMetadata {
  modelVersion: string;
  trainedAt: string;
  trainingRecords: number;
  testAccuracy: number;
  testAUC: number;
  featureNames: string[];
  predictionThreshold: number;
  topFeatures: Array<{
    feature: string;
    importance: number;
  }>;
  /** SHAP-based feature importance (more reliable than gain-based). */
  shapFeatures?: Array<{
    feature: string;
    meanAbsShap: number;
  }>;
  /** Base rate (expected value) from SHAP — the average prediction across training set. */
  expectedValue?: number;
}

export interface FeatureVector {
  /** Donor percentage for each of the 13 sectors. */
  donorPctBySector: Record<string, number>;
  /** Legislator party (encoded). */
  party: 'D' | 'R' | 'I';
  /** Chamber. */
  chamber: 'House' | 'Senate';
  /** Years in office. */
  yearsInOffice: number;
  /** Which sectors this bill affects (binary flags). */
  billAffectsSectors: Record<string, boolean>;
  /** Number of cosponsors. */
  cosponsorCount: number;
  /** Whether the bill sponsor shares the legislator's party. */
  sponsorSameParty: boolean;
  /** Sum of donor_pct for bill's affected sectors. */
  donorBillOverlap: number;
  /** Highest single-sector donation % among bill sectors. */
  maxDonorSectorInBill: number;
}

// ── ONNX Session Management ─────────────────────────────────────────

/** Cached inference session. */
let sessionInstance: OnnxInferenceSession | null = null;

/** In-flight load promise — prevents duplicate loads. */
let sessionLoadPromise: Promise<OnnxInferenceSession | null> | null = null;

/** Whether we've already tried and failed to load. */
let sessionLoadFailed = false;

/** Cached model metadata. */
let metadataCache: VotePredictionModelMetadata | null = null;

/** Minimal ONNX interface — only the methods we use. */
interface OnnxInferenceSession {
  run(feeds: Record<string, OnnxTensor>): Promise<Record<string, OnnxTensor>>;
}

interface OnnxTensor {
  data: Float32Array | Int32Array | BigInt64Array;
  dims: number[];
}

const MODEL_PATH = 'models/vote-prediction.onnx';
const METADATA_PATH = 'models/vote-prediction-metadata.json';
const INFERENCE_TIMEOUT_MS = 5000;

// ── All 13 IndustrySector values in fixed order for feature vectors ──

const SECTOR_ORDER: string[] = [
  'Agribusiness',
  'Communications/Electronics',
  'Construction',
  'Defense',
  'Energy/Natural Resources',
  'Finance/Insurance/Real Estate',
  'Health',
  'Lawyers & Lobbyists',
  'Transportation',
  'Misc Business',
  'Labor',
  'Ideology/Single-Issue',
  'Other',
];

// ── Feature Name Mapping ─────────────────────────────────────────────

const FEATURE_HUMAN_LABELS: Record<string, string> = {
  donor_pct_agribusiness: 'Agribusiness donations',
  donor_pct_communications: 'Communications/Electronics donations',
  donor_pct_construction: 'Construction donations',
  donor_pct_defense: 'Defense donations',
  donor_pct_energy: 'Energy/Natural Resources donations',
  donor_pct_finance: 'Finance/Insurance/Real Estate donations',
  donor_pct_health: 'Health donations',
  donor_pct_lawyers: 'Lawyers & Lobbyists donations',
  donor_pct_transportation: 'Transportation donations',
  donor_pct_misc_business: 'Misc Business donations',
  donor_pct_labor: 'Labor donations',
  donor_pct_ideology: 'Ideology/Single-Issue donations',
  donor_pct_other: 'Other donations',
  party_R: 'Republican party',
  party_D: 'Democratic party',
  chamber_Senate: 'Senate chamber',
  years_in_office: 'Years in office',
  bill_cosponsor_count: 'Cosponsor count',
  sponsor_same_party: 'Same-party sponsor',
  donor_bill_overlap: 'Donor-bill sector overlap',
  max_donor_sector_in_bill: 'Top donor sector in bill',
};

// ── Public API ───────────────────────────────────────────────────────

/**
 * Get model metadata (cached). Returns null if model not available.
 */
export function getModelMetadata(): VotePredictionModelMetadata | null {
  if (metadataCache) return metadataCache;

  try {
    const filePath = join(process.cwd(), METADATA_PATH);
    const raw = readFileSync(filePath, 'utf-8');
    metadataCache = JSON.parse(raw) as VotePredictionModelMetadata;
    return metadataCache;
  } catch {
    logger.warn('[VotePredictor] Model metadata not found — model may not be trained yet');
    return null;
  }
}

/**
 * Build a feature vector from legislator and bill data.
 */
export function buildFeatureVector(
  donorProfile: Record<string, number>,
  party: 'D' | 'R' | 'I',
  chamber: 'House' | 'Senate',
  yearsInOffice: number,
  billSectors: IndustrySector[],
  cosponsorCount: number,
  sponsorSameParty: boolean
): FeatureVector {
  const billAffectsSectors: Record<string, boolean> = {};
  for (const sector of SECTOR_ORDER) {
    billAffectsSectors[sector] = billSectors.includes(sector as IndustrySector);
  }

  // Compute interaction features
  let donorBillOverlap = 0;
  let maxDonorSectorInBill = 0;
  for (const sector of billSectors) {
    const pct = donorProfile[sector] ?? 0;
    donorBillOverlap += pct;
    if (pct > maxDonorSectorInBill) {
      maxDonorSectorInBill = pct;
    }
  }

  return {
    donorPctBySector: donorProfile,
    party,
    chamber,
    yearsInOffice,
    billAffectsSectors,
    cosponsorCount,
    sponsorSameParty,
    donorBillOverlap,
    maxDonorSectorInBill,
  };
}

/**
 * Convert a FeatureVector into a flat numeric array for ONNX inference.
 * Order must match the training feature order exactly.
 */
export function featureVectorToArray(fv: FeatureVector): number[] {
  const features: number[] = [];

  // 13 donor sector percentages (in fixed order)
  for (const sector of SECTOR_ORDER) {
    features.push(fv.donorPctBySector[sector] ?? 0);
  }

  // Party (one-hot: R, D — I is baseline)
  features.push(fv.party === 'R' ? 1 : 0);
  features.push(fv.party === 'D' ? 1 : 0);

  // Chamber (binary: Senate = 1, House = 0)
  features.push(fv.chamber === 'Senate' ? 1 : 0);

  // Years in office (continuous)
  features.push(fv.yearsInOffice);

  // 13 bill-affects-sector flags
  for (const sector of SECTOR_ORDER) {
    features.push(fv.billAffectsSectors[sector] ? 1 : 0);
  }

  // Cosponsor count
  features.push(fv.cosponsorCount);

  // Sponsor same party
  features.push(fv.sponsorSameParty ? 1 : 0);

  // Interaction features
  features.push(fv.donorBillOverlap);
  features.push(fv.maxDonorSectorInBill);

  return features;
}

/**
 * Predict how a legislator would vote on a bill.
 * Returns null if model is not available.
 */
export async function predictVote(fv: FeatureVector): Promise<VotePrediction | null> {
  const session = await getOrCreateSession();
  if (!session) return null;

  const metadata = getModelMetadata();
  if (!metadata) return null;

  try {
    const features = featureVectorToArray(fv);

    // Run inference with timeout
    const result = await withTimeout(runInference(session, features), INFERENCE_TIMEOUT_MS);

    if (!result) return null;

    const yeaProbability = result;
    const threshold = metadata.predictionThreshold;

    let predictedVote: 'yea' | 'nay' | 'uncertain';
    if (yeaProbability >= threshold) {
      predictedVote = 'yea';
    } else if (yeaProbability <= 1 - threshold) {
      predictedVote = 'nay';
    } else {
      predictedVote = 'uncertain';
    }

    // Use SHAP-based importance when available (more reliable than gain-based)
    const featureSource =
      metadata.shapFeatures ??
      metadata.topFeatures.map(f => ({
        feature: f.feature,
        meanAbsShap: f.importance,
      }));

    // Contextualize factors: highlight features whose actual values are non-zero
    const featureValues = featureVectorToArray(fv);
    const featureNames = metadata.featureNames;
    const topFactors = featureSource
      .filter(f => {
        const idx = featureNames.indexOf(f.feature);
        // Prefer features that are active for this specific prediction
        return idx >= 0 && featureValues[idx] !== 0;
      })
      .slice(0, 3)
      .map(f => ({
        feature: f.feature,
        humanLabel: FEATURE_HUMAN_LABELS[f.feature] ?? f.feature,
        contribution: f.meanAbsShap,
      }));

    // Fallback if fewer than 3 active features found
    if (topFactors.length < 3) {
      const existingFeatures = new Set(topFactors.map(f => f.feature));
      for (const f of featureSource) {
        if (topFactors.length >= 3) break;
        if (!existingFeatures.has(f.feature)) {
          topFactors.push({
            feature: f.feature,
            humanLabel: FEATURE_HUMAN_LABELS[f.feature] ?? f.feature,
            contribution: f.meanAbsShap,
          });
        }
      }
    }

    // Compute SHAP factors with directional context
    const shapFactors = computeShapFactors(metadata, featureValues, featureNames, yeaProbability);

    return {
      yeaProbability,
      predictedVote,
      topFactors,
      shapFactors,
    };
  } catch (error) {
    logger.warn('[VotePredictor] Inference failed', {
      error: (error as Error).message,
    });
    return null;
  }
}

// ── SHAP Direction Inference ──────────────────────────────────────────

/**
 * Infer directional SHAP factors from model metadata and feature values.
 *
 * Uses the expected value (base rate from SHAP) to infer per-feature direction:
 * - Binary features (party_R, bill_affects_*, sponsor_same_party): if active (1)
 *   and prediction is above expected value, feature pushes toward_yea; below → toward_nay.
 * - Continuous features (donor_pct_*, years_in_office, bill_cosponsor_count):
 *   above-zero values with above-expected predictions push toward_yea.
 * Features with zero values are "neutral" (not active for this prediction).
 */
export function computeShapFactors(
  metadata: VotePredictionModelMetadata,
  featureValues: number[],
  featureNames: string[],
  yeaProbability: number
): ShapFactor[] {
  const shapSource = metadata.shapFeatures;
  if (!shapSource || shapSource.length === 0) return [];

  const safeYeaProb =
    Number.isFinite(yeaProbability) && yeaProbability >= 0 && yeaProbability <= 1
      ? yeaProbability
      : 0.5;
  const expectedValue = metadata.expectedValue ?? 0.383;
  const aboveBaseline = safeYeaProb > expectedValue;

  return shapSource
    .slice(0, 8) // consider top 8 candidates
    .filter(sf => Number.isFinite(sf.meanAbsShap) && sf.meanAbsShap >= 0)
    .map(sf => {
      const idx = featureNames.indexOf(sf.feature);
      const raw = idx >= 0 ? (featureValues[idx] ?? 0) : 0;
      const featureValue = Number.isFinite(raw) ? raw : 0;
      const isActive = featureValue !== 0;

      let direction: ShapFactor['direction'];
      if (!isActive) {
        direction = 'neutral';
      } else {
        const isBinary =
          sf.feature.startsWith('party_') ||
          sf.feature.startsWith('bill_affects_') ||
          sf.feature === 'sponsor_same_party' ||
          sf.feature === 'chamber_Senate';

        if (isBinary) {
          // Binary feature active (1): if prediction is above base rate,
          // this feature contributed to pushing it up (toward_yea)
          direction = aboveBaseline ? 'toward_yea' : 'toward_nay';
        } else {
          // Continuous feature: high SHAP importance + above-baseline prediction
          // means this feature likely pushed the prediction up. But for features
          // like donor_pct_labor (which correlate with D votes/nay on R bills),
          // the direction depends on the feature's relationship with the outcome.
          //
          // Heuristic: use the SHAP mean magnitude relative to the prediction's
          // deviation from expected value. If they point the same way, the feature
          // pushed in the prediction's direction.
          const predictionDeviation = safeYeaProb - expectedValue;
          const featureInfluence = sf.meanAbsShap * featureValue;
          // Large SHAP * large value = strong influence in prediction's direction
          direction =
            predictionDeviation >= 0
              ? featureInfluence > 0.01
                ? 'toward_yea'
                : 'toward_nay'
              : featureInfluence > 0.01
                ? 'toward_nay'
                : 'toward_yea';
        }
      }

      return {
        feature: sf.feature,
        humanLabel: FEATURE_HUMAN_LABELS[sf.feature] ?? sf.feature,
        importance: sf.meanAbsShap,
        featureValue,
        direction,
      };
    })
    .filter(f => f.direction !== 'neutral')
    .slice(0, 5);
}

// ── Internal ─────────────────────────────────────────────────────────

async function getOrCreateSession(): Promise<OnnxInferenceSession | null> {
  if (sessionInstance) return sessionInstance;
  if (sessionLoadFailed) return null;
  if (sessionLoadPromise) return sessionLoadPromise;

  sessionLoadPromise = loadSession();
  return sessionLoadPromise;
}

async function loadSession(): Promise<OnnxInferenceSession | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ort = require('onnxruntime-web') as {
      InferenceSession: { create(buffer: ArrayBuffer): Promise<OnnxInferenceSession> };
      Tensor: new (type: string, data: Float32Array, dims: number[]) => OnnxTensor;
    };
    const fs = await import('fs');
    const path = await import('path');

    const modelPath = path.resolve(process.cwd(), MODEL_PATH);
    const modelBuffer = fs.readFileSync(modelPath);

    const session = await ort.InferenceSession.create(modelBuffer.buffer);
    sessionInstance = session;
    logger.info('[VotePredictor] ONNX session loaded');
    return sessionInstance;
  } catch (error) {
    sessionLoadFailed = true;
    logger.warn('[VotePredictor] Failed to load ONNX model — vote prediction disabled', {
      error: (error as Error).message,
    });
    return null;
  } finally {
    sessionLoadPromise = null;
  }
}

async function runInference(
  session: OnnxInferenceSession,
  features: number[]
): Promise<number | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ort = require('onnxruntime-web') as {
      Tensor: new (type: string, data: Float32Array, dims: number[]) => OnnxTensor;
    };
    const inputTensor = new ort.Tensor('float32', Float32Array.from(features), [
      1,
      features.length,
    ]);
    const results = await session.run({ input: inputTensor });

    // XGBoost ONNX typically outputs probabilities in a 'probabilities' or 'output_probability' key
    const probKey =
      Object.keys(results).find(k => k.includes('prob') || k.includes('output')) ??
      Object.keys(results)[0];

    if (!probKey) return null;

    const output = results[probKey];
    if (!output) return null;
    // For binary classification, probability of class 1 (yea) is at index 1
    const data = output.data as Float32Array;
    return data.length >= 2 ? (data[1] ?? null) : (data[0] ?? null);
  } catch (error) {
    logger.warn('[VotePredictor] ONNX inference error', {
      error: (error as Error).message,
    });
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Reset internal state. Only for testing.
 */
export function _resetForTesting(): void {
  sessionInstance = null;
  sessionLoadPromise = null;
  sessionLoadFailed = false;
  metadataCache = null;
}
