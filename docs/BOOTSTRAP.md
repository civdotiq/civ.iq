# BOOTSTRAP — from clone to running CIV.IQ in under an hour

**Audience:** anyone cloning this repo for the first time — a researcher, a potential contributor, a re-hoster, or a funder checking that the backbone is reproducible.
**Goal:** you leave this page with a running dev server that serves real government data at `http://localhost:3000`.
**Promise:** every step below has been verified in place against the current repo; a separate fresh-clone verification pass (Phase 5.B of the backbone-gaps plan) will pin measured wall-clock timings and add a "Verified: <date>" stamp above §1. If a step does not work exactly as written, that is a bug — please open an issue.

> CIV.IQ is infrastructure, not a SaaS. You run the whole stack locally with free API keys. There is no "cloud tier" that magically turns things on — the APIs listed below are the actual data sources, and when one is down, CIV.IQ says so instead of inventing data.

---

## 0. Prerequisites

| Tool              | Version           | Check with          | Why                                                                                         |
| ----------------- | ----------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| Node.js           | **20.x or newer** | `node --version`    | Matches `.nvmrc` and `engines.node` in `package.json`.                                      |
| npm               | **10.x or newer** | `npm --version`     | Workspace support + `npm ci`. Ships with Node 20.                                           |
| git               | any recent        | `git --version`     | Obvious.                                                                                    |
| (optional) Python | 3.10+             | `python3 --version` | Only if you want to retrain the ML models. Inference works without Python via ONNX Runtime. |
| (optional) Redis  | 7.x               | `redis-cli ping`    | Optional cache. The app falls back to an in-memory cache if no Redis is configured.         |

`.nvmrc` pins Node 20. Run `nvm use` inside the repo if you have nvm installed.

---

## 1. Clone and install

```bash
git clone https://github.com/civdotiq/civ.iq.git
cd civ.iq
npm ci
```

**Expected runtime:** 2–4 minutes on a first-time install (warm npm cache ~60s).

`npm ci` also installs the three workspace packages under `packages/*` (civic-statistics, entity-resolution, sdk). They are symlinked into `node_modules/@civiq/*` so the app imports the local copies, not the published ones.

---

## 2. API keys

CIV.IQ runs on public government APIs. Every key below is free. Without them, most routes will return `dataQuality: 'unavailable'` — the app will still boot, but it will not have data to serve.

### 2a. Required to boot a useful dev server

| Env var              | Get one at                                    | Rate limit       | What it unlocks                                                               |
| -------------------- | --------------------------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `CONGRESS_API_KEY`   | <https://api.congress.gov/sign-up/>           | 5,000 req/hr     | Bills, members, votes, committees, hearings. The spine of the dataset.        |
| `FEC_API_KEY`        | <https://api.open.fec.gov/developers/>        | 1,000 req/hr     | Campaign finance: contributions, PAC disbursements, independent expenditures. |
| `OPENSTATES_API_KEY` | <https://openstates.org/accounts/profile/>    | 500 req/day free | All 50 state legislatures.                                                    |
| `CENSUS_API_KEY`     | <https://api.census.gov/data/key_signup.html> | none enforced    | District demographics + Census Geocoder for address → district resolution.    |

### 2b. Optional — improve coverage and remove soft errors

| Env var                        | Get one at                                       | What it unlocks                                                                   |
| ------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `FRED_API_KEY`                 | <https://fredaccount.stlouisfed.org/apikeys>     | State/metro economic indicators.                                                  |
| `BLS_API_KEY`                  | <https://data.bls.gov/registrationEngine/>       | BLS employment/wage data.                                                         |
| `DATA_GOV_API_KEY`             | <https://api.data.gov/signup/>                   | Regulations.gov public comments on proposed rules.                                |
| `OPENFDA_API_KEY`              | <https://open.fda.gov/apis/authentication/>      | Higher rate limits for openFDA endpoints (240 vs 40 req/min).                     |
| `HUD_API_TOKEN`                | <https://www.huduser.gov/hudapi/public/register> | Fair Market Rents, income limits.                                                 |
| `EIA_API_KEY`                  | <https://www.eia.gov/opendata/register.php>      | State energy profiles.                                                            |
| `NOAA_TOKEN`                   | <https://www.ncdc.noaa.gov/cdo-web/token>        | Climate normals, severe weather.                                                  |
| `GOVINFO_API_KEY`              | <https://api.govinfo.gov/docs>                   | Hearings detection for Nostr publisher. Defaults to `DEMO_KEY` otherwise.         |
| `FOLLOWTHEMONEY_API_KEY`       | <https://www.followthemoney.org/our-data/apis>   | State campaign finance. **Currently in maintenance** — see `docs/COVERAGE.md`.    |
| `SEC_USER_AGENT`               | n/a — just a string                              | SEC EDGAR requires a `User-Agent: Name Email` header. Set any identifiable value. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | <https://aistudio.google.com/apikey>             | AI bill summaries (Gemini). Free tier: 250 req/day.                               |

### 2c. Optional — infra / features

| Env var                                               | Purpose                                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Serverless-friendly Redis cache (recommended for Vercel). Free tier at <https://upstash.com/>. |
| `REDIS_HOST` + `REDIS_PORT`                           | Traditional Redis via ioredis. Alternative to Upstash.                                         |
| `NOSTR_PRIVATE_KEY`                                   | Publish signed civic events to Nostr. If unset, the publisher runs but publishes nothing.      |
| `CACHE_WARM_SECRET`                                   | Required to hit `/api/cache/warm`. Generate: `openssl rand -base64 32`.                        |
| `ADMIN_API_KEY`                                       | Required in production for admin endpoints.                                                    |
| `CRON_SECRET`                                         | Authenticates Vercel cron jobs (nostr-publisher, bill-summarizer).                             |

### 2d. Wire them up

```bash
cp .env.example .env.local
# edit .env.local — fill in the four required keys at minimum
```

`.env.local` is gitignored. Never commit it.

---

## 3. Bootstrap sequence

Run these in order. Expected wall-clock times are measured on a 2023-era laptop on residential broadband; your mileage will vary.

### 3.1 Verify API connectivity (30 seconds)

```bash
npm run diagnose:apis
```

This hits each configured API with a cheap probe and prints a green/red matrix. **Start here** — it catches typos and unsigned-up keys before you waste 20 minutes on a doomed seed run.

Expected output: all four required APIs green. Optional APIs are yellow if unconfigured.

### 3.2 Process the 119th-Congress ZIP→district mapping (1 minute)

```bash
npm run process-zip-districts
```

Writes `src/lib/data-sources/zip-district-mapping-119th.ts` — **check it in only if you changed the source data**. The file already ships in the repo; running this just confirms the generator is reproducible. Row counts are pinned by `src/__tests__/utils/zip-district-mapping.test.ts` (33,778 ZIPs, 7,299 multi-district, 26,479 single-district); the test fails if anything drifts silently.

ZIP→district is structurally static until post-2031 redistricting — you do not need to re-run this regularly.

### 3.3 Refresh the bioguide→FEC mapping (10 seconds, offline)

```bash
npm run sync:bioguide-fec
```

Pulls `legislators-current.yaml` from `unitedstates/congress-legislators` and writes `packages/entity-resolution/data/bioguide-fec-mapping.json`. This is the canonical representative-identity layer; CIV.IQ runs a GitHub Action that opens a PR with the latest diff every Sunday at 14 UTC, so in steady state you will not need to run this by hand.

For an initial clone, run it once so you are sure the canonical file matches your local environment.

### 3.4 Seed Congress.gov membership statistics (1–2 minutes)

```bash
npm run seed-data
```

Fetches `legislators-current.yaml` and writes `src/data/congress-statistics.json` — pre-calculated counts used by the hot-path stats endpoints. Respects Congress.gov rate limits.

### 3.5 Start the dev server (5 seconds to ready)

```bash
npm run dev
```

Open `http://localhost:3000`. First render of any page will be slow (30–60 s) because Next.js compiles the route on demand.

### 3.6 (optional) Warm the intelligence cache (~20 minutes)

```bash
npm run warm:intelligence
```

Pre-computes vote-finance, finance-jurisdiction, committee-lobbying, sector-leaderboard, and influence-chain results for all current members and writes them into Redis (or the in-memory fallback). This is **optional** — analyzers compute on demand the first time a route is hit, and Redis TTLs keep subsequent loads fast. But if you're demoing or benchmarking, warm it first.

Re-run after a cache flush or a deploy that changes analyzer logic.

---

## 4. Verification

Once `npm run dev` is serving, run each of these and confirm the shape of the response.

| Check                         | Command                                                                                                                            | Expect                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| All listed APIs are reachable | `npm run diagnose:apis`                                                                                                            | All required green.                                                 |
| California House delegation   | `curl -s 'http://localhost:3000/api/representatives?state=CA&chamber=house' \| jq '.members \| length'`                            | `52`                                                                |
| Address → district            | `curl -s 'http://localhost:3000/api/districts/geocode?address=1600+Pennsylvania+Ave+NW+Washington+DC+20500' \| jq '.districts[0]'` | `DC-AL` (non-voting delegate).                                      |
| FEC pipeline                  | `curl -s 'http://localhost:3000/api/representative/P000197/finance' \| jq '.dataQuality,.contributionCoverage.coveragePercent'`    | `"complete"` or `"partial"` + a number.                             |
| Empty/unavailable contract    | `curl -s 'http://localhost:3000/api/local-government/fakecity-zz' \| jq '.dataQuality'`                                            | `"unavailable"` (pilot list is 10 cities — see `docs/COVERAGE.md`). |

**If any check returns silent `[]` with `dataQuality` missing, that is a regression of Phase 2 of the backbone-gaps plan — please open an issue.**

---

## 5. Running the quality gate

The CI job in `.github/workflows/ci.yml` mirrors this locally:

```bash
npm run validate:all
```

Runs lint + type-check + unit tests + build + security audit. Expected: 6 pass, 2 warnings (install-time CVEs in the `tar`/`sqlite3`/`cacache` chain — accepted risk, see `SECURITY.md`). 0 failures.

Individual stages:

```bash
npm run lint
npm run type-check
npm test
npm run build
npm audit --audit-level=high   # security only
```

---

## 6. Common failure modes

| Symptom                                            | Likely cause                                      | Fix                                                                                     |
| -------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `diagnose:apis` shows Congress.gov red             | Typo in `CONGRESS_API_KEY` or trailing whitespace | Re-paste the key from the email — no quotes, no spaces.                                 |
| Build fails with `Cannot find module '@civiq/...'` | `npm ci` didn't link workspace packages           | `rm -rf node_modules && npm ci`.                                                        |
| `Redis connection refused`                         | You set `REDIS_HOST` but Redis isn't running      | Either start Redis or leave `REDIS_HOST` blank — the app falls back to in-memory cache. |
| Embeddings fail with "ONNX session error"          | Node version mismatch (pipeline needs 20+)        | `nvm use` and rerun. See `docs/EMBEDDING-PIPELINE-BROKEN-2026-04.md`.                   |
| `/api/representative/.../finance` returns empty    | FEC key unset or bioguide→FEC mapping stale       | Check `FEC_API_KEY` is in `.env.local`; rerun `npm run sync:bioguide-fec`.              |
| Next.js says port 3000 in use                      | Another dev server is running                     | `PORT=3001 npm run dev` or `lsof -i :3000` and kill the offender.                       |

---

## 7. What you are NOT getting from this bootstrap

Be explicit — nothing below is wired by default, and pretending otherwise would violate the data-integrity contract:

- **State campaign finance.** FollowTheMoney.org is in maintenance during the OpenSecrets merger. Routes return `dataQuality: 'unavailable'`. See `docs/COVERAGE.md`.
- **Non-pilot local government.** Only 10 cities are wired via Legistar (`src/lib/local-government/pilot-cities.ts`). Every other city returns `unavailable` with the pilot list included.
- **ML training.** Trained weights are not checked into the repo. You can use the existing ONNX vote-predictor model (committed under `public/models/`), but retraining requires Python + training data — see `scripts/train-vote-model.py` and `PLAN-ml-deepening.md`.
- **Production Redis.** A local dev server runs fine with the in-memory cache; Upstash is for production.

---

## 8. Going further

- [`docs/COVERAGE.md`](./COVERAGE.md) — what CIV.IQ can and cannot answer, by level of government.
- [`docs/API_REFERENCE.md`](./API_REFERENCE.md) — all 180+ API routes.
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — system design.
- [`docs/ADOPTION.md`](./ADOPTION.md) — who is using the backbone and how.
- [`packages/sdk/README.md`](../packages/sdk/README.md) — `@civiq/sdk` reference if you want to consume the API from TypeScript.

If something in this guide blocks you, open an issue at <https://github.com/civdotiq/civ.iq/issues>. A bootstrap that doesn't work is a backbone that doesn't exist.
