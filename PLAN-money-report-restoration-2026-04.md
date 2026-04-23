# PLAN — Money Report Card Restoration (2026-04-23)

**Owner**: Mark Sandford
**Status**: Draft, ready to execute
**Canonical index**: this file. Phase prompts live in `PROMPT-MR*-*.md` siblings.

---

## Problem

The Money Report Card at `/your-reps` (and the `GET /api/intelligence/address/money-report` / `POST` endpoints) renders em-dashes (`—`) for most metrics because the backend returns `null` for `voteFinanceCorrelation` and `independenceScore` for nearly every representative, and occasionally for `financeJurisdictionOverlap` too.

### Confirmed production signals (2026-04-23, ZIP 48201 → MI-13)

| Metric                       | Peters (P000595) | Slotkin (S001208) | Thanedar (T000488) |
| ---------------------------- | ---------------- | ----------------- | ------------------ |
| `voteFinanceCorrelation`     | `null`           | `null`            | `null`             |
| `financeJurisdictionOverlap` | `null`           | `null`            | `0.0025` (cached)  |
| `independenceScore`          | `null`           | `null`            | `null`             |
| `influenceChainCount`        | `0`              | `0`               | `0`                |

Direct single-rep probes:

- `GET /api/intelligence/representative/P000595/vote-finance` → **HTTP 504 at 60.28s** (Vercel FUNCTION_INVOCATION_TIMEOUT).
- `GET /api/intelligence/representative/P000595/vote-prediction` → **HTTP 500** "Internal server error".
- `GET /api/intelligence/representative/T000488/finance-jurisdiction` → **HTTP 200 in 5.55s** (warm cache hit).

### Root causes

1. **ONNX model is not in the Vercel serverless bundle.** `next.config.mjs` has no `outputFileTracingIncludes` entry for `models/`. `src/lib/intelligence/ml/vote-predictor.ts:481` reads `models/vote-prediction.onnx` from `process.cwd()`, and `vote-predictor.ts:197` reads `models/vote-prediction-metadata.json`. In production, these reads return ENOENT and the analyzer surfaces `null` — plus the 500 from `/vote-prediction/route.ts` suggests something downstream of the `try/catch` in `getModelMetadata` / `loadSession` is still throwing.
2. **Vercel 60s function cap clips cold vote-finance compute.** `vote-finance-analyzer.ts:52` sets an internal `VOTE_FINANCE_TIMEOUT_MS = 120_000` with an explicit comment acknowledging 40–60s cold paths. The single-rep route has `maxDuration = 60`. Vercel kills the function before the cache write in `computeAndCache` executes, so cold paths never warm the Redis cache — every future visitor is also cold.
3. **Money-report orchestrator re-caps per-analyzer compute at 30s.** `src/app/api/intelligence/address/money-report/route.ts:42` sets `ANALYZER_TIMEOUT_MS = 30_000`, tighter than each analyzer's own budget. Even if #1 and #2 were fixed, the orchestrator would kill cold runs.
4. **No cron warms vote-prediction or influence-chain caches.** `scripts/warm-intelligence-cache.ts` only warms finance-jurisdiction and vote-finance. There is no Vercel cron for any of them (`vercel.json` lists six crons, none touch intelligence analyzers).
5. **UI renders `null` as a silent em-dash with no signal to the user.** `MoneyReportCard.tsx:38-49` treats "we tried and got null" identically to "not applicable" — violates the design rule "Empty states required. When data is unavailable, show a designed empty state explaining why."

---

## Objectives

1. Ship the ONNX model and metadata with the serverless function so vote-prediction can actually run in production.
2. Fit vote-finance cold compute inside the Vercel 60s budget with margin, so the first visitor warms the cache.
3. Align money-report orchestrator timeouts with real analyzer budgets.
4. Add a scheduled pre-warm so users land on warm caches, not cold.
5. Replace silent dashes with honest per-metric status (`computing…`, `unavailable`, or a real value), without breaking the Aicher design language.
6. Ship with full test coverage and `npm run validate:all` green.

**Non-goals**: redesigning the report card, adding new metrics, refactoring the analyzer framework, touching state-level reps. Stay inside federal scope.

---

## Constraints / Guardrails

- **Grade-A means**: every phase lands with tests, `npm run validate:all` green, a curl proof against localhost, and a documented production curl proof after deploy. No "looks right in the diff" finishes.
- **Real data only.** Never fall back to fabricated scores; a dash with a clear "computing" or "unavailable" label is the correct behavior when data isn't ready.
- **No causation language.** Any new UI copy complies with `.claude/rules/intelligence-layer.md`.
- **Aicher design system.** Any new UI state uses the existing palette, Braun Linear, 2px borders, blue for interactive — no new colors, no rounded >4px, no shadows for non-elevation use.
- **30-line rule.** Validate after each logical change.
- **One phase per session.** Do not auto-advance (per `feedback_audit-phases-separate-sessions.md`).
- **Vercel plan.** Assume Pro plan (maxDuration up to 300s allowed for cron, 60s for non-cron HTTP). If Hobby, Phase 2's larger raises are moot — validate before starting Phase 2.

---

## Phase Sequence (execute in this order, one per session)

| #   | Phase                                    | Prompt file                                 | Blast radius                                        | Why this order                                                                                                                                                   |
| --- | ---------------------------------------- | ------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MR1 | Bundle ONNX model with serverless        | `PROMPT-MR1-bundle-onnx-model.md`           | Low — config + smoke tests                          | Largest "silent failure" fix. Cheap. Unblocks independence score for every rep simultaneously. Must land first so later verification steps see real predictions. |
| MR2 | Trim vote-finance cold compute under 50s | `PROMPT-MR2-trim-vote-finance-compute.md`   | Medium — analyzer changes, needs correctness proofs | The cache-warm mechanism cannot work until a single cold call fits in Vercel's 60s budget. Prerequisite for MR3 and MR4.                                         |
| MR3 | Align money-report orchestrator timeouts | `PROMPT-MR3-align-orchestrator-timeouts.md` | Low — single route file                             | Depends on MR2. Raises per-analyzer ceiling from 30s to a value matched to trimmed analyzers; keeps overall request inside Vercel cap.                           |
| MR4 | Pre-warm cache via Vercel cron           | `PROMPT-MR4-cache-warm-cron.md`             | Medium — new cron route, vercel.json entry          | Depends on MR1 (model available) and MR2 (analyzer fits). Makes cold paths vanish for the overwhelming majority of visitors.                                     |
| MR5 | Honest per-metric status in UI + API     | `PROMPT-MR5-honest-empty-states.md`         | Medium — types + route + component                  | UX fix. Keeps the product honest even when data genuinely unavailable (e.g., freshman senators with <10 sector votes).                                           |
| MR6 | End-to-end verification + sign-off       | `PROMPT-MR6-verification-signoff.md`        | Low — runs scripts, no code changes                 | Proves the pipeline with curl evidence, screenshots, validate:all, and a production probe after each deploy.                                                     |

Expected cumulative wall-clock per phase: MR1 ≈ 45 min, MR2 ≈ 90 min, MR3 ≈ 30 min, MR4 ≈ 75 min, MR5 ≈ 90 min, MR6 ≈ 45 min.

---

## Acceptance Criteria (end-state, after MR6)

A cold-cache ZIP 48201 call to `GET /api/intelligence/address/money-report?zip=48201` must return, within 60 seconds:

- All three Michigan reps present.
- For every Senate rep (who has ≥1 year of 119th Congress voting history and ≥10 sector-classified votes): `voteFinanceCorrelation` is a real number; `independenceScore` is a real number; `financeJurisdictionOverlap` is a real number.
- For reps with genuinely insufficient data (brand-new senators, non-voters): the response includes a per-metric status object (`computing | insufficient-data | unavailable`) so the UI can render an explicit empty state instead of a silent dash.
- Response body includes `sources`, `dataAsOf`, `confidence`, `methodology` — already present, must not regress.
- `npm run validate:all` green.
- Production curl evidence captured in MR6 sign-off.

---

## Verification Playbook (used by every phase)

Every phase must run this before claiming done:

```bash
# 1. Type + lint + test + build
npm run validate:all

# 2. Local smoke (dev server must be running separately)
curl -s "http://localhost:3000/api/intelligence/address/money-report?zip=48201" \
  -m 120 | jq '.representatives[] | {name, voteFinanceCorrelation, financeJurisdictionOverlap, independenceScore}'

# 3. Individual analyzer probes (local)
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
  "http://localhost:3000/api/intelligence/representative/P000595/vote-finance" -m 120
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
  "http://localhost:3000/api/intelligence/representative/P000595/vote-prediction" -m 120
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
  "http://localhost:3000/api/intelligence/representative/T000488/finance-jurisdiction" -m 120

# 4. After deploy, re-run step 2 and 3 against https://civdotiq.org
```

Record HTTP code, elapsed seconds, and the three metric values for each rep in the phase's closeout note.

---

## Rollback Plan

Each phase is a separate commit. If any phase misbehaves in production:

1. `git revert <phase-commit-sha>` on `main`.
2. Redeploy.
3. Re-open the phase with a new prompt documenting what broke.

The only phase that touches an external resource (Vercel cron) is MR4. Rollback for MR4 also requires removing the cron entry from `vercel.json` — the commit revert handles this automatically.

---

## Open Questions (resolve before MR1)

1. **Vercel plan tier**: Confirm Pro (allows 300s cron functions) vs Hobby (60s cap everywhere). If Hobby, MR4's cron design must fit in 60s per invocation — likely means multiple crons with offset schedules, or rep-shards in KV.
2. **Model update cadence**: `models/vote-prediction.onnx` is ~582KB + 6KB metadata. Tracked in git. Is the plan to retrain periodically? If yes, note it in MR1 so `outputFileTracingIncludes` globs pick up future files.
3. **Peer-comparison baselines**: MR2 proposes trimming to N peers per chamber. Before trimming, confirm the peer group is currently "all House / all Senate" (not a curated subset).

---

## Reference Anchors (file:line)

- `src/app/api/intelligence/address/money-report/route.ts:42` — orchestrator `ANALYZER_TIMEOUT_MS = 30_000`
- `src/app/api/intelligence/address/money-report/route.ts:43` — orchestrator `OVERALL_TIMEOUT_MS = 90_000`
- `src/lib/intelligence/analyzers/vote-finance-analyzer.ts:52` — `VOTE_FINANCE_TIMEOUT_MS = 120_000`
- `src/lib/intelligence/analyzers/vote-finance-analyzer.ts:59` — `MAX_VOTES = 200`
- `src/lib/intelligence/analyzers/vote-prediction-analyzer.ts:48` — `MAX_VOTES = 200`
- `src/lib/intelligence/analyzers/shared.ts:31` — `ANALYZER_TIMEOUT_MS = 55_000`
- `src/lib/intelligence/ml/vote-predictor.ts:139-140` — `MODEL_PATH`, `METADATA_PATH`
- `src/lib/intelligence/ml/vote-predictor.ts:196-197` — `readFileSync(join(process.cwd(), METADATA_PATH))`
- `src/lib/intelligence/ml/vote-predictor.ts:481-482` — `path.resolve(process.cwd(), MODEL_PATH); readFileSync(modelPath)`
- `next.config.mjs:13` — `nextConfig` object (no `outputFileTracingIncludes`)
- `vercel.json` — `functions` section has `src/app/api/intelligence/**/*.ts` at `maxDuration: 60, memory: 1024`
- `scripts/warm-intelligence-cache.ts` — existing warmer for finance-jurisdiction + vote-finance only
- `src/components/intelligence/MoneyReportCard.tsx:21-24, 38-49` — null renders silent em-dash

---

## How to Use This Plan

1. Read this file once at the start of each session so you know which phase is next.
2. Open the `PROMPT-MR{N}-*.md` file for the current phase. That prompt is self-contained — it re-states the goal, inputs, success criteria, and verification.
3. Execute the phase. Commit as `fix(intel): <phase-title>` with a body that references this plan.
4. Fill in the phase's closeout note at the bottom of its prompt file (commit SHA, production curl evidence, any deviations).
5. Stop. Do not start the next phase. A new session, a fresh prompt — per `feedback_audit-phases-separate-sessions.md`.
