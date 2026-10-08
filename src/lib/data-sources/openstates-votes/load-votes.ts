/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Request-time reader for the per-state roll-call corpus (votes-corpus.ts).
 *
 * The committed manifest, `data/openstates-votes.meta.json`, says which states
 * have an artifact and where the artifacts live. Each state's artifact is
 * fetched on first use and memoized for the life of the instance:
 *
 *   1. `OPENSTATES_VOTES_BASE_URL` (env) or the manifest's `baseUrl`, joined
 *      with `<ST>.json.br` — the normal path; artifacts are hosted outside the
 *      repo because they are refreshed monthly and run to ~1 MB a state.
 *   2. `data/openstates-votes/<ST>.json.br` — a local build, for development.
 *   3. null — the state has no artifact; callers say "not available" rather
 *      than "no votes", per the real-data-or-unavailable rule.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { brotliDecompress } from 'node:zlib';
import { promisify } from 'node:util';
import logger from '@/lib/logging/simple-logger';
import { decodeMemberVotes } from './votes-corpus';
import type { CorpusMemberVote, VotesCorpusFile } from './votes-corpus';

const decompress = promisify(brotliDecompress);

const MANIFEST_PATH = 'data/openstates-votes.meta.json';
const LOCAL_DIR = 'data/openstates-votes';
const FETCH_TIMEOUT_MS = 20_000;
/** States kept decoded in memory; a profile burst rarely spans more. */
const MAX_LOADED_STATES = 12;

export interface VotesManifestJurisdiction {
  bytes: number;
  rollCalls: number;
  memberVotes: number;
  members: number;
  unresolvedVotes: number;
  sessions: Array<{ identifier: string; name: string; upstreamGeneratedAt: string }>;
  generatedAt: string;
}

export interface VotesManifest {
  generatedAt: string;
  /** Absolute YYYY-MM-DD after which the corpus should not be trusted as current. */
  staleAfter: string;
  /** Where `<ST>.json.br` artifacts are served from; '' when only local. */
  baseUrl: string;
  jurisdictions: Record<string, VotesManifestJurisdiction>;
}

// undefined = not yet read; null = no manifest.
let manifestCache: VotesManifest | null | undefined;
let manifestInFlight: Promise<VotesManifest | null> | null = null;

const loaded = new Map<string, Promise<VotesCorpusFile | null>>();

async function readManifest(): Promise<VotesManifest | null> {
  if (manifestCache !== undefined) return manifestCache;
  manifestInFlight ??= (async () => {
    try {
      const raw = await readFile(join(process.cwd(), MANIFEST_PATH), 'utf8');
      return JSON.parse(raw) as VotesManifest;
    } catch {
      return null;
    }
  })().then(result => {
    manifestCache = result;
    manifestInFlight = null;
    return result;
  });
  return manifestInFlight;
}

async function readArtifactBytes(
  state: string,
  manifest: VotesManifest | null
): Promise<Buffer | null> {
  const baseUrl = (process.env.OPENSTATES_VOTES_BASE_URL || manifest?.baseUrl || '').replace(
    /\/$/,
    ''
  );
  if (baseUrl) {
    const url = `${baseUrl}/${state}.json.br`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`OpenStates votes corpus ${res.status} from ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  try {
    return await readFile(join(process.cwd(), LOCAL_DIR, `${state}.json.br`));
  } catch {
    return null;
  }
}

async function loadState(state: string): Promise<VotesCorpusFile | null> {
  const existing = loaded.get(state);
  if (existing) return existing;

  const promise = (async () => {
    const started = Date.now();
    try {
      const manifest = await readManifest();
      // The manifest is the index: a state it does not list has no artifact,
      // and asking the host for it would only turn a known gap into a 404.
      if (manifest && !manifest.jurisdictions[state]) return null;

      const bytes = await readArtifactBytes(state, manifest);
      if (!bytes) return null;
      const file = JSON.parse((await decompress(bytes)).toString('utf8')) as VotesCorpusFile;
      logger.info('[OpenStatesVotes] Corpus loaded', {
        state,
        rollCalls: file.meta.rollCalls,
        members: file.meta.members,
        bytes: bytes.length,
        ms: Date.now() - started,
      });
      return file;
    } catch (error) {
      logger.info('[OpenStatesVotes] Corpus unavailable', {
        state,
        error: (error as Error).message,
      });
      // A failed fetch is retried on the next request rather than pinned as
      // "unavailable" for the life of the instance.
      loaded.delete(state);
      return null;
    }
  })();

  loaded.set(state, promise);
  if (loaded.size > MAX_LOADED_STATES) {
    const oldest = loaded.keys().next().value;
    if (oldest !== undefined && oldest !== state) loaded.delete(oldest);
  }
  return promise;
}

/**
 * One member's roll calls, newest first; `[]` when the state has an artifact
 * but records no votes for this member; null when the state has no artifact.
 * Null and empty are deliberately different: null means "not available",
 * empty means "this member cast no recorded votes", and the profile must
 * never say the second when the first is true.
 */
export async function getMemberVotes(
  state: string,
  personId: string
): Promise<CorpusMemberVote[] | null> {
  const file = await loadState(state.toUpperCase());
  if (!file) return null;
  return decodeMemberVotes(file, personId);
}

/** Whether a state has an artifact, without decoding it. */
export async function hasVotesCorpus(state: string): Promise<boolean> {
  const manifest = await readManifest();
  if (manifest) return Boolean(manifest.jurisdictions[state.toUpperCase()]);
  return (await loadState(state.toUpperCase())) !== null;
}

/** Provenance for status routes. Null when no manifest has been generated. */
export async function getVotesCorpusStatus(): Promise<VotesManifest | null> {
  return readManifest();
}

/** Test seam: drop every memoized artifact and the manifest. */
export function __resetVotesCorpusCache(): void {
  manifestCache = undefined;
  manifestInFlight = null;
  loaded.clear();
}
