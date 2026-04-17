# PROMPT — Phase 5 A+ Completion

**Purpose:** Close CIV.IQ backbone Phase 5 from B- to A+ across 5 short focused sessions.
**Source plan:** [`PLAN-backbone-gaps-2026-04.md`](./PLAN-backbone-gaps-2026-04.md) — Phase 5 row.
**Why a handoff doc:** each session is starting a new conversation with no memory of what came before. Each prompt below is self-contained: paste into a fresh Claude Code session and it works.

---

## Current state (as of 2026-04-16)

A prior session left **uncommitted** work on disk that reached B-. No commits yet.

**On disk — modified:**

```
M  PLAN-backbone-gaps-2026-04.md              # Phase 5 row marked 🟢 (aspirational — needs real evidence)
M  package.json                                # added snapshot:adoption script
M  packages/civic-statistics/package.json      # hygiene: publishConfig, homepage, bugs, engines, files
M  packages/entity-resolution/package.json     # ditto
M  packages/entity-resolution/tsconfig.json    # excludes src/__tests__ from dist
M  packages/sdk/package.json                   # ditto + hygiene
M  packages/sdk/README.md                      # userAgent docs
M  packages/sdk/__tests__/client.test.ts       # +2 UA tests (27 tests total)
M  packages/sdk/src/http.ts                    # default @civiq/sdk User-Agent
M  packages/sdk/src/index.ts                   # exports SDK_VERSION, SDK_USER_AGENT
M  src/app/api/mcp/route.ts                    # onEvent handler → recordMcpInitialize
M  src/middleware.ts                           # adoption.sdk.request metric for /api/v1/* + /api/mcp
```

**On disk — new (untracked):**

```
?? .github/workflows/publish-packages.yml     # tag-triggered publish with npm provenance
?? .github/workflows/snapshot-adoption.yml    # weekly npm downloads snapshot
?? docs/ADOPTION.md                            # three adoption signals documented
?? docs/BOOTSTRAP.md                           # clone-to-running-server guide
?? docs/adoption/npm-downloads.json            # current snapshot (live: 5/64, 4/65, 4/66)
?? packages/civic-statistics/CHANGELOG.md      # 0.1.0 entry
?? packages/entity-resolution/CHANGELOG.md     # 0.1.0 entry
?? packages/sdk/CHANGELOG.md                   # 0.1.0 entry
?? packages/sdk/LICENSE                        # MIT
?? scripts/snapshot-adoption.ts                # npm downloads poller
?? src/__tests__/lib/analytics/adoption-telemetry.test.ts  # 19 unit tests
?? src/lib/analytics/adoption-telemetry.ts     # pure extractors + fire-and-forget metric
```

**Already live on npm (published 2026-03-25, BEFORE the current hygiene fixes):**

- `@civiq/civic-statistics@0.1.0` — stale `repository.url`, no provenance
- `@civiq/entity-resolution@0.1.0` — stale `repository.url`, no provenance, compiled tests in tarball
- `@civiq/sdk@0.1.0` — stale `repository.url`, no provenance, no default User-Agent

**Identified B- gaps (each is a faith-based claim or an untested assumption):**

1. Publish workflow is untested (tag glob matching, NPM_TOKEN presence, double-publish guard)
2. `docs/BOOTSTRAP.md` says "every step has been run end-to-end" — that is literally false
3. MCP `onEvent` shape for `initialize` is assumed but not verified against mcp-handler's actual behavior
4. SDK `User-Agent` pass-through through native Node fetch is unverified (undici historically blocked some headers)
5. No end-to-end integration test proving adoption signals actually fire

---

## Prerequisites — confirm BEFORE starting any phase

- [ ] **npm org access:** you own `@civiq` (0.1.0 was published under it, so this should already be the case). Confirm with `npm whoami` and `npm org ls @civiq`.
- [ ] **`NPM_TOKEN` secret** in `civdotiq/civ.iq` repo secrets for GH Actions to publish. Create a classic automation token at https://www.npmjs.com/settings/<user>/tokens with "Publish" permission scoped to `@civiq` (if granular tokens are available). Add as a repo secret: GitHub repo → Settings → Secrets and variables → Actions → New repository secret → `NPM_TOKEN`.
- [ ] **Vercel deploy access** to `civdotiq.org` (needed for Phase 5.D).
- [ ] **`.env.local`** in repo root with at least the 4 required API keys: `CONGRESS_API_KEY`, `FEC_API_KEY`, `OPENSTATES_API_KEY`, `CENSUS_API_KEY`. Needed for Phase 5.B.
- [ ] **Clean tree or known uncommitted state.** `git status --short` matches the "Current state" above.

If any prereq is missing, tell the new-session Claude up front so it doesn't blow the phase trying to work around auth.

---

## The 5 phases

Each phase is ~30–90 min of focused work. Run them in order — each phase's stopping criterion is the next phase's precondition.

```
5.A  Verify + integration-test       ~90 min   autonomous            commits 1-3
5.B  Fresh-clone bootstrap run       ~45 min   autonomous            commit 4
5.C  Ship 0.1.1 w/ provenance        ~60 min   needs NPM_TOKEN       commits 5-6
5.D  Deploy + observe telemetry      ~30 min   needs prod deploy     commit 7
5.E  Plan closure + evidence         ~20 min   autonomous            commit 8
```

---

## Phase 5.A — Verify assumptions + add integration tests

**Goal:** Kill every faith-based claim. Either verify it works or fix it.

**Preconditions:** prerequisites above confirmed.

**Session-start prompt (copy-paste into new Claude Code conversation):**

```
I'm continuing Phase 5 A+ work for CIV.IQ per PROMPT-phase5-completion.md in the
repo root. Read that file first for context. Start Phase 5.A: verify assumptions
and add integration tests.

A prior session reached B- and left 6 modified + 10 new files uncommitted on
disk. Do NOT commit anything until the work items below are done — the current
state contains false claims in BOOTSTRAP.md that need softening first. Read
CLAUDE.md feedback memories (feedback_no-hype, feedback_pitch-accuracy) before
starting so you don't inflate results.

Work items (do in order, don't skip):

1. SOFTEN THE LIE. docs/BOOTSTRAP.md §0 says "every step below has been run
   end-to-end on a fresh clone" — it's false at this point. Change to accurate
   language like "every step has been verified in place; Phase 5.B will run
   this sequence from a fresh clone and pin measured timings." This prevents
   a false claim from being committed.

2. Verify MCP onEvent semantics. Read node_modules/mcp-handler/dist/index.js
   (the runtime, not just .d.ts) and confirm that REQUEST_RECEIVED events for
   method="initialize" actually pass `parameters.clientInfo` to the onEvent
   callback. The current src/app/api/mcp/route.ts depends on this. If the
   assumption is wrong OR ambiguous, revert to the body-peek implementation
   (use `request.clone().text()` then JSON.parse, call recordMcpInitialize
   with the parsed body). Git diff will show this path in an earlier iteration
   of src/app/api/mcp/route.ts — recover via `git log -p --all -- src/app/api/mcp/route.ts`
   if needed, or just rewrite.

3. Test SDK User-Agent pass-through in native Node fetch:
     node -e "fetch('https://httpbin.org/headers', { headers: { 'User-Agent': '@civiq/sdk/0.1.0-test' } }).then(r => r.json()).then(j => console.log(JSON.stringify(j.headers, null, 2)))"
   Check if `User-Agent` appears in the echoed headers. If it does NOT, add an
   `X-CivIQ-SDK-Version` header to packages/sdk/src/http.ts as a fallback,
   update src/middleware.ts + src/lib/analytics/adoption-telemetry.ts to accept
   either signal (prefer UA, fall back to X-CivIQ-SDK-Version), and update
   tests. Document the fallback in packages/sdk/README.md and CHANGELOG.

4. Test the publish workflow's double-publish guard:
     npm view @civiq/sdk@99.99.99 version; echo "exit=$?"
   Expected: exits non-zero with nothing printed. If it exits 0 (no output,
   success), the guard in .github/workflows/publish-packages.yml is broken.
   Rewrite the guard to check stdout instead of exit code:
     OUT=$(npm view "${NAME}@${VERSION}" version 2>/dev/null || true)
     if [ -n "$OUT" ]; then echo "already published"; exit 1; fi

5. Verify GH Actions tag glob. Check docs at
   https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#patterns-to-match-branches-and-tags
   The pattern "@civiq/civic-statistics@v*" must match tag
   "@civiq/civic-statistics@v0.1.1". If you're not 100% sure the glob works
   with `/` in the ref name, change each tag pattern to use a safer form like
   "civic-statistics-v*", "entity-resolution-v*", "sdk-v*" — and update
   the tag-resolution bash to match. Document the chosen convention at the
   top of the workflow file.

6. Run `npm publish --dry-run --access public` from each of
   packages/civic-statistics, packages/entity-resolution, packages/sdk.
   Confirm prepublishOnly runs (clean + build + test) and tarball contents:
   - civic-statistics: LICENSE, CHANGELOG, METHODOLOGY, README, dist/* (no __tests__)
   - entity-resolution: same + data/*.json, NO dist/__tests__/*
   - sdk: LICENSE, CHANGELOG, README, dist/* (no __tests__)

7. Write src/__tests__/middleware/adoption.test.ts — integration test:
   - Construct NextRequest with URL /api/v1/representatives and header
     User-Agent: @civiq/sdk/0.1.0
   - Invoke the middleware (import from '@/middleware')
   - Spy on console.log with jest.spyOn
   - Assert an adoption.sdk.request metric line is emitted containing
     {sdk: '@civiq/sdk', version: '0.1.0', path: '/api/v1/representatives', method: 'GET'}
   - Negative test: UA 'curl/8.4.0' → no adoption.sdk.request call
   Reference: existing src/__tests__/middleware/v1-middleware.test.ts for the
   NextRequest construction pattern.

8. Write src/__tests__/api/mcp/mcp-adoption.test.ts — integration test that
   directly calls src/app/api/mcp/route.ts's POST handler with a JSON-RPC
   initialize body, spies on console.log, confirms adoption.mcp.initialize
   metric fires with the right clientInfo. This is the test that catches the
   onEvent-doesn't-fire bug if it exists.

9. Run `npm run validate:all` — must be 6 pass / 2 warn / 0 fail.

10. Commit in THREE logical units (conventional commits, each passing
    validate:all):
    a. feat(packages): publish-ready hygiene for @civiq/* packages
       Includes: package.json changes for all 3 packages, CHANGELOGs, LICENSE,
       entity-resolution tsconfig fix, SDK README userAgent docs.
    b. feat(sdk): default @civiq/sdk User-Agent in Node runtimes
       Includes: packages/sdk/src/http.ts, index.ts export additions,
       client.test.ts additions, any X-CivIQ-SDK-Version fallback from step 3.
    c. feat(telemetry): capture MCP clientInfo + REST SDK adoption signals
       Includes: src/lib/analytics/adoption-telemetry.ts + 19 unit tests + new
       integration tests from steps 7-8, src/app/api/mcp/route.ts,
       src/middleware.ts, .github/workflows/publish-packages.yml,
       .github/workflows/snapshot-adoption.yml, scripts/snapshot-adoption.ts,
       docs/adoption/npm-downloads.json, docs/ADOPTION.md, docs/BOOTSTRAP.md
       (with softened §0 from step 1), package.json snapshot:adoption script.

Stopping criterion: 3 commits on main, validate:all green, no faith-based
claims remain in the working tree. Report each item with specific findings —
especially if step 2 or 3 uncovered a broken assumption and a fix was applied.
Do NOT bump package versions yet — that's Phase 5.C.
```

**Stopping criterion:** 3 commits land, `validate:all` green, all 5 identified B- gaps either verified-as-working or fixed.

---

## Phase 5.B — Fresh-clone bootstrap verification

**Goal:** Prove BOOTSTRAP.md is true by running it. Replace estimates with measurements.

**Preconditions:** Phase 5.A commits exist.

**Session-start prompt:**

```
I'm continuing Phase 5 A+ work for CIV.IQ per PROMPT-phase5-completion.md.
Start Phase 5.B: verify BOOTSTRAP.md end-to-end from a fresh clone.

Preconditions check before starting:
- git log --oneline | head -5 shows the 3 Phase 5.A commits
- .env.local exists in /Users/mbs/civ.iq with the 4 required API keys

The goal: prove — not assert — that docs/BOOTSTRAP.md works. Measure real
timings. If something fails, fix the script or fix the doc.

Steps:

1. Create throwaway directory:
     TS=$(date +%s)
     WORK="/tmp/civiq-bootstrap-${TS}"
     mkdir -p "$WORK" && cd "$WORK"

2. Clone current repo state locally (preserves the Phase 5.A work):
     git clone --local /Users/mbs/civ.iq .

3. Symlink .env.local so required API keys are present:
     ln -s /Users/mbs/civ.iq/.env.local ./.env.local

4. Follow docs/BOOTSTRAP.md §1-4 EXACTLY. Measure wall-clock time for each step
   using `time`. Capture output. Record:
   - npm ci: <seconds>
   - npm run diagnose:apis: <seconds>, confirm all 4 required APIs green
   - npm run process-zip-districts: <seconds>
   - npm run sync:bioguide-fec: <seconds>
   - npm run seed-data: <seconds>
   - npm run dev: time to ready, then hit each of the 5 verification URLs in §4
     with curl; confirm each returns the expected shape (DC-AL for geocode,
     52 for CA house, etc.).

5. Note any step that fails, is ambiguous, produces misleading output, or
   takes materially different time than the doc suggests.

6. Return to /Users/mbs/civ.iq. Update docs/BOOTSTRAP.md:
   - Replace every "Expected runtime: X minutes" with the actually-measured
     number + hardware context (e.g., "Measured: ~90s on 2026-04-16 on
     macOS 25.3.0 / Node 20 / residential broadband").
   - Add a "Verified: <date> on macOS Darwin 25.3.0 / Node 20" line near §0.
   - If any verification URL returned something different from the doc, fix
     the doc OR fix the route — decide which is the bug.
   - If a script failed, fix the script (don't paper over with doc changes).

7. Clean up the temp clone: rm -rf "$WORK". Do NOT check it in.

8. Run `npm run validate:all` from the main repo — must stay 6 pass / 2 warn
   / 0 fail.

9. Commit: docs(bootstrap): verify BOOTSTRAP.md end-to-end with measured
   timings

   In the commit body, cite:
   - The hardware profile used
   - Each step's measured time
   - Any script or doc changes made as a result of the run

Stopping criterion: docs/BOOTSTRAP.md carries measured numbers and a
"Verified: <date>" line, and the throwaway clone successfully reached a
running dev server passing all 5 verification URLs. If any step failed,
the commit message explains what broke and how it was fixed.

Be honest. If `npm run warm:intelligence` takes 45 minutes not 20, say so.
If a curl check returns a response shape that doesn't match §4, fix the
doc or fix the route — don't hand-wave.
```

**Stopping criterion:** BOOTSTRAP.md has measured timings and a verified-on line; throwaway clone was observed to work; commit lands with honest commit message.

---

## Phase 5.C — Ship @civiq/\* 0.1.1 with provenance

**Goal:** Replace stale 0.1.0 on npm with 0.1.1 carrying correct metadata + provenance attestation.

**Preconditions:** Phase 5.A + 5.B commits pushed. `NPM_TOKEN` configured in repo secrets.

**Session-start prompt:**

```
I'm continuing Phase 5 A+ work for CIV.IQ per PROMPT-phase5-completion.md.
Start Phase 5.C: ship @civiq/* 0.1.1 through the new publish workflow.

HARD PREREQUISITES (confirm first; if any missing, STOP and tell user):
- npm whoami → is a member of the @civiq org (npm org ls @civiq confirms)
- NPM_TOKEN secret exists in civdotiq/civ.iq repo Actions secrets
- git log --oneline | head -8 shows Phase 5.A and 5.B commits

Context: @civiq/civic-statistics@0.1.0, @civiq/entity-resolution@0.1.0, and
@civiq/sdk@0.1.0 are live on npm from 2026-03-25 with stale metadata
(wrong repository URL, no provenance, entity-resolution ships compiled test
files in tarball). Our hygiene fixes don't reach consumers until we ship
0.1.1 through the new .github/workflows/publish-packages.yml workflow.

Steps:

1. Bump version fields: 0.1.0 → 0.1.1 in:
   - packages/civic-statistics/package.json
   - packages/entity-resolution/package.json
   - packages/sdk/package.json

2. In packages/sdk/src/http.ts, bump: SDK_VERSION = '0.1.1'.

3. Rebuild + test each package:
     cd packages/civic-statistics && npm run clean && npm run build && npm run test
     cd ../entity-resolution && npm run clean && npm run build && npm run test
     cd ../sdk && npm run clean && npm run build && npm run test
     cd ../..

4. Add a new entry at the TOP of each CHANGELOG.md (do not delete the 0.1.0
   entry). Format:

   ## [0.1.1] — YYYY-MM-DD

   ### Changed
   - Publish metadata: correct repository URL (git+https://github.com/civdotiq/civ.iq.git)
     with directory key, added homepage, bugs, engines.node>=20, publishConfig
     with provenance attestation.
   - (sdk only) Default User-Agent: `@civiq/sdk/<version>` in Node/Bun/Deno
     runtimes. Adds optional `userAgent` option that appends a caller
     identifier after the SDK signature.
   - (if Phase 5.A step 3 added fallback) (sdk only) X-CivIQ-SDK-Version
     header for runtimes where User-Agent cannot be set.
   - (entity-resolution only) Tarball no longer ships compiled test files
     (saves ~10 files, no API change).

   ### Fixed
   - (entity-resolution only) tsconfig.json excludes src/__tests__ from
     compilation output.

   Use today's date. Don't embellish.

5. Dry-run publish each:
     cd packages/civic-statistics && npm publish --dry-run --access public
     cd ../entity-resolution && npm publish --dry-run --access public
     cd ../sdk && npm publish --dry-run --access public
   Confirm tarball contents are clean (no __tests__ in entity-resolution).

6. Commit: chore(packages): bump @civiq/* to 0.1.1 with provenance-ready
   metadata. Include CHANGELOG entries in the same commit.

7. Push commits to main: git push origin main.

8. Create and push tags (convention chosen in Phase 5.A step 5 — slash-free
   `<pkg>-v<version>` because GH Actions tag-glob semantics with `/` in ref
   names are not explicitly documented):
     git tag civic-statistics-v0.1.1
     git tag entity-resolution-v0.1.1
     git tag sdk-v0.1.1
     git push origin civic-statistics-v0.1.1 entity-resolution-v0.1.1 sdk-v0.1.1

9. Open https://github.com/civdotiq/civ.iq/actions and watch the three
   publish-packages.yml runs. Each must finish successfully. If any fails:
   - Read the failure step's logs
   - Fix the underlying issue
   - Bump to 0.1.2 (never retry 0.1.1 — npm burns a version on upload)
   - Amend the commit, retag, repush

10. Verify each publish carries provenance:
      npm view @civiq/civic-statistics@0.1.1 dist.attestations
      npm view @civiq/entity-resolution@0.1.1 dist.attestations
      npm view @civiq/sdk@0.1.1 dist.attestations
    Each should return an attestation object with a predicateType referencing
    slsa.dev/provenance. The npm page at
    https://www.npmjs.com/package/@civiq/sdk will show a green "Provenance"
    badge.

11. Re-run the adoption snapshot to capture the new version:
      npm run snapshot:adoption
    Update docs/ADOPTION.md table to show "Latest version: 0.1.1" with
    today's date.
    Commit: chore(adoption): snapshot post-0.1.1 downloads.

12. Push: git push origin main.

Stopping criterion:
- `npm view @civiq/sdk@0.1.1 version` returns "0.1.1"
- `npm view @civiq/sdk@0.1.1 dist.attestations` returns a non-empty
  attestation object
- https://www.npmjs.com/package/@civiq/sdk shows the Provenance badge
- docs/adoption/npm-downloads.json shows "publishedVersion": "0.1.1" for
  all three packages
- Two commits land on main (the bump + the adoption snapshot)

If any publish fails for authentication reasons (NPM_TOKEN missing, expired,
or wrong scope), STOP and surface to user. Do not paper over auth failures
with manual `npm publish` from the command line — the whole point of the
workflow is provenance attestation, and local publish skips that.
```

**Stopping criterion:** All three 0.1.1 packages live on npm with provenance attestation badges. Two commits on main.

---

## Phase 5.D — Deploy + observe telemetry

**Goal:** Capture the first real `adoption.*` log line from production.

**Preconditions:** Phase 5.C commits on main. User has deployed the changes to production Vercel.

**Session-start prompt:**

````
I'm continuing Phase 5 A+ work for CIV.IQ per PROMPT-phase5-completion.md.
Start Phase 5.D: deploy the adoption telemetry and capture the first real
datapoint from production.

HARD PREREQUISITES:
- Phase 5.C commits on main
- User confirms: Vercel has deployed the current main branch to
  https://civdotiq.org (check the Vercel dashboard or `vercel ls`)
- The deployed commit SHA includes src/middleware.ts adoption.sdk.request
  wiring and src/app/api/mcp/route.ts onEvent handler

If the deploy hasn't happened, ask user to deploy before proceeding.

Steps:

1. Verify production deploy is live:
     curl -sI https://civdotiq.org/api/v1/representatives?state=DC | head -5
   Expect HTTP 200 and X-Response-Time / X-Request-ID headers.

2. Trigger an SDK-UA'd request (simulates external @civiq/sdk consumer):
     curl -s -A '@civiq/sdk/0.1.1 phase5d-smoketest/1.0' \
       https://civdotiq.org/api/v1/representatives?state=DC \
       -o /dev/null -w 'HTTP %{http_code} in %{time_total}s\n'

3. Trigger an MCP initialize (simulates external MCP client):
     curl -s https://civdotiq.org/api/mcp \
       -X POST \
       -H 'Content-Type: application/json' \
       -H 'Accept: application/json, text/event-stream' \
       -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"phase5d-smoketest","version":"1.0.0"}}}' \
       | head -c 500

4. Retrieve Vercel logs. Ask user to run:
     vercel logs https://civdotiq.org --since=10m | grep -E '"adoption\.(sdk|mcp)"'
   Or via the Vercel web UI: Deployments → latest → Logs → filter "adoption".

   Expect TWO log lines:
   - {"level":"metric","message":"adoption.sdk.request","data":{"sdk":"@civiq/sdk","version":"0.1.1","path":"/api/v1/representatives","method":"GET"}}
   - {"level":"metric","message":"adoption.mcp.initialize","data":{"clientName":"phase5d-smoketest","clientVersion":"1.0.0","protocolVersion":"2024-11-05"}}

5. If BOTH lines appear:
   Update docs/ADOPTION.md. Add a new section "First observed" near the top:

     ## First observed

     First real adoption signals captured from production on YYYY-MM-DD:

     ```
     <paste verbatim sdk log line>
     <paste verbatim mcp log line>
     ```

   Commit: docs(adoption): first captured adoption datapoint from production.

6. If EITHER line is MISSING, DO NOT FUDGE. Debug systematically:
   a. Confirm the deployed commit actually includes the telemetry code:
        vercel inspect <deployment-url> | grep commit
        git log <sha> --stat -- src/middleware.ts src/app/api/mcp/route.ts
   b. For missing adoption.sdk.request:
        - Check Vercel may be rewriting User-Agent at edge (unusual). Try
          another header in curl to see if the middleware fires at all.
        - Confirm middleware.ts was actually rebuilt (not cached): bump a
          debug log line, redeploy, retry.
   c. For missing adoption.mcp.initialize:
        - This is the mcp-handler onEvent test that Phase 5.A should have
          caught. If not caught, either onEvent doesn't fire for initialize
          or parameters.clientInfo isn't where expected.
        - Add a temporary console.log of event.type + event.method in the
          onEvent handler to see what's actually firing. Redeploy, retry.
        - If onEvent really doesn't expose clientInfo, fall back to body-peek
          (see Phase 5.A step 2).
   d. Apply fix, redeploy, rerun steps 2-4. Do not declare success until
      both lines appear.

Stopping criterion: docs/ADOPTION.md carries at least two real production
log lines captured verbatim with a timestamp, and the corresponding commit
exists in git history.
````

**Stopping criterion:** Verbatim production log lines in `docs/ADOPTION.md`. One commit on main.

---

## Phase 5.E — Plan closure + evidence

**Goal:** Rewrite the Phase 5 row in `PLAN-backbone-gaps-2026-04.md` with concrete evidence, not aspirations. Final status.

**Preconditions:** Phases 5.A–5.D complete.

**Session-start prompt:**

```
Final step of Phase 5 A+ for CIV.IQ per PROMPT-phase5-completion.md.
Phase 5.E: plan closure and evidence capture.

Preconditions: 5.A through 5.D commits all on main; 0.1.1 packages live on
npm with provenance; production logs show adoption.* lines.

Steps:

1. Gather evidence:
   - git log --oneline --grep='(packages)\|(sdk)\|(telemetry)\|(ci)\|(adoption)\|(bootstrap)\|(plan)' --since='2026-04-16' | head -15
     Captures commit SHAs for Phase 5 work.
   - npm view @civiq/civic-statistics@0.1.1 version dist.tarball
     npm view @civiq/entity-resolution@0.1.1 version dist.tarball
     npm view @civiq/sdk@0.1.1 version dist.tarball
   - Verify provenance:
     npm view @civiq/sdk@0.1.1 dist.attestations.predicateType
   - cat docs/adoption/npm-downloads.json — current numbers
   - Pull the "First observed" section from docs/ADOPTION.md (added in 5.D)
   - cat src/__tests__/middleware/adoption.test.ts src/__tests__/api/mcp/mcp-adoption.test.ts — confirm they exist and are passing

2. Rewrite the Phase 5 row in PLAN-backbone-gaps-2026-04.md. The current row
   is an aspirational B- draft. Replace with an evidence-cited entry:
   - Specific commit SHAs for each of the 7 Phase 5 commits
   - npm URLs to 0.1.1 with provenance: https://www.npmjs.com/package/@civiq/sdk/v/0.1.1
   - Verbatim first-observed log lines from docs/ADOPTION.md
   - Measured BOOTSTRAP timings (cite the hardware profile from 5.B commit)
   - Integration test paths + count: src/__tests__/middleware/adoption.test.ts,
     src/__tests__/api/mcp/mcp-adoption.test.ts,
     src/__tests__/lib/analytics/adoption-telemetry.test.ts (19 unit)
   - Explicit mention of any assumption that was BROKEN in 5.A and how it
     was fixed (e.g., "onEvent did/didn't expose clientInfo; implementation
     uses X as a result")

3. Add a "Verified: <date>" line to the top of docs/ADOPTION.md and
   docs/BOOTSTRAP.md headers.

4. Write a new project memory at ~/.claude/projects/-Users-mbs-civ-iq/memory/
   named project_phase5-closure.md. Frontmatter: type: project, name:
   "Phase 5 backbone infrastructure closure", description: one-liner. Body:
   cite the deliverables, the assumption-breaks-and-fixes from 5.A, and
   link back to the plan row. Update MEMORY.md index with a pointer under
   "Completed Initiatives".

5. Run `npm run validate:all` one final time — must be 6 pass / 2 warn / 0
   fail.

6. Commit: docs(plan): close Phase 5 to A-grade with measured evidence.
   In the commit body, list:
   - Commits that closed Phase 5 (with SHAs)
   - npm URLs for the 0.1.1 packages
   - Confirmation of provenance attestation
   - First-observed timestamps for both adoption signals
   - Measured BOOTSTRAP timings summary

7. Push: git push origin main.

Stopping criterion for A+:
- PLAN Phase 5 row cites SHAs, npm URLs, log lines, integration test paths
  — NOT future-tense claims, NOT "will be observed once deployed"
- docs/ADOPTION.md + docs/BOOTSTRAP.md carry verified-on dates
- project_phase5-closure.md memory exists
- validate:all green
- Final commit lands on main

If anything in the evidence check fails (e.g., provenance missing, log
lines don't show up), DO NOT mark the phase A+. Back up to the phase that
failed and finish it first.
```

**Stopping criterion:** Plan row reads as evidence, not hope. Final commit lands.

---

## After Phase 5.E — what A+ looks like

- [ ] `npm view @civiq/sdk@0.1.1 dist.attestations` returns a provenance object
- [ ] `npm view @civiq/civic-statistics@0.1.1 dist.attestations` returns a provenance object
- [ ] `npm view @civiq/entity-resolution@0.1.1 dist.attestations` returns a provenance object
- [ ] https://www.npmjs.com/package/@civiq/sdk shows a green Provenance badge
- [ ] `docs/BOOTSTRAP.md` carries measured timings and a "Verified: <date>" line
- [ ] A throwaway `git clone` into `/tmp` successfully reaches a running dev server following only the doc (proven in 5.B)
- [ ] `docs/ADOPTION.md` contains verbatim production log lines with a timestamp
- [ ] 3 integration test files (`adoption-telemetry.test.ts`, `adoption.test.ts`, `mcp-adoption.test.ts`) pin the end-to-end flow
- [ ] `PLAN-backbone-gaps-2026-04.md` Phase 5 row cites commit SHAs + npm URLs + log excerpts
- [ ] `npm run validate:all` green: 6 pass / 2 warn / 0 fail
- [ ] At least 7 commits on main with clean conventional-commit messages, one per logical deliverable

**When all ten boxes are checked, Phase 5 is A+ and the "infrastructure story" claim in the plan is defensible. A funder, a re-hoster, or a third-party developer can verify each claim independently without asking us.**

---

## Failure modes and what to do

| Phase | Possible failure                                  | What to do                                                                                           |
| ----- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 5.A   | MCP onEvent doesn't expose clientInfo             | Revert to body-peek in `src/app/api/mcp/route.ts` using `request.clone().text()`.                    |
| 5.A   | Native Node fetch strips User-Agent               | Add `X-CivIQ-SDK-Version` header fallback; update middleware + telemetry extractor to accept either. |
| 5.A   | Tag glob `@civiq/*@v*` doesn't match              | Switch tag convention to `civic-statistics-v*` etc.; update workflow + tag-resolution bash.          |
| 5.B   | A bootstrap script fails on fresh clone           | Fix the SCRIPT, not the doc. Bootstrap scripts are the contract.                                     |
| 5.B   | A verification curl returns unexpected shape      | Decide: is the doc wrong or is the route wrong? Fix whichever is the bug.                            |
| 5.C   | `NPM_TOKEN` missing                               | STOP. Tell user to create a token at npmjs.com and add as repo secret. Do NOT publish manually.      |
| 5.C   | Publish workflow fails mid-run                    | Bump to 0.1.2 (npm burns 0.1.1 on partial upload). Fix root cause. Retag.                            |
| 5.C   | Published but no provenance attestation           | Check workflow has `id-token: write` permission and `--provenance` flag.                             |
| 5.D   | `adoption.mcp.initialize` doesn't appear          | This is the assumption-break Phase 5.A should have caught. Fall back to body-peek, redeploy.         |
| 5.D   | `adoption.sdk.request` doesn't appear             | Check Vercel rewrote UA; check middleware rebuilt on deploy; add debug log if needed.                |
| 5.E   | One of the check-boxes at end of 5.E is unchecked | Go back to the phase that produced it; do not mark A+.                                               |

---

## Why it's worth doing in 5 sessions instead of one

- **Context window discipline.** Each phase has ~30-90 min of work and a clean stopping criterion. Cramming all 5 into one session risks mid-session context compaction losing critical detail.
- **Gate between risks.** Phase 5.A's verification must finish before 5.C's publish — otherwise we risk publishing 0.1.1 with a broken onEvent assumption. Sequential phases enforce this.
- **External dependencies.** Phases 5.C and 5.D need `NPM_TOKEN` and a production deploy, respectively — both are things you (not Claude) control. Splitting them out lets you do those async.
- **Honest rollback point.** If 5.A uncovers that `@huggingface/transformers` has been silently broken (like last time with the embedding pipeline), we can STOP there. The first three commits are still valuable; we haven't pushed a bad 0.1.1 to npm.

**Don't skip phases. Don't combine them. The whole point of the handoff is that each session has a clear start and a clear end.**
