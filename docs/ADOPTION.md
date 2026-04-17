# ADOPTION — who is consuming the CIV.IQ backbone

**Last reviewed:** 2026-04-16
**Purpose:** a public, dated record of whether CIV.IQ is actually being used as infrastructure — not as a marketing claim.

> A backbone is only a backbone if something leans on it. This page exists because calling yourself "the canonical civic data layer" without citing consumers is theater. If the numbers are small, we will say so. If they grow, we will say that too. Either way the numbers live in git.

---

## How we measure

Three signals, each mechanically falsifiable:

| Signal                | Source                                                                                                     | Captured by                                                         | Refresh cadence                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| npm downloads         | [`api.npmjs.org/downloads/point/...`](https://github.com/npm/registry/blob/master/docs/download-counts.md) | `scripts/snapshot-adoption.ts` → `docs/adoption/npm-downloads.json` | Weekly via `.github/workflows/snapshot-adoption.yml` (Mon 13 UTC) |
| MCP client handshakes | JSON-RPC `initialize.params.clientInfo` on `/api/mcp`                                                      | `src/lib/analytics/adoption-telemetry.ts#recordMcpInitialize`       | Per-request, structured log line `adoption.mcp.initialize`        |
| REST SDK traffic      | `User-Agent: @civiq/sdk/<version>` on `/api/v1/*` and `/api/mcp`                                           | `src/lib/analytics/adoption-telemetry.ts#recordSdkRequest`          | Per-request, structured log line `adoption.sdk.request`           |

The npm snapshot is the only signal that is in git. MCP and SDK traffic are in the platform log drain (Vercel logs on the production deploy); this repo contains only the code that emits them. If you maintain a self-hosted CIV.IQ, the same two log lines will appear in your own logs — grep for `adoption.mcp.initialize` and `adoption.sdk.request`.

---

## What we are NOT measuring

- **Page views.** Browser traffic to `civdotiq.org` is not "backbone adoption" — it's end-user consumption of CIV.IQ as a product. Useful, but measured separately (Google Analytics) and not part of this document.
- **Unauthenticated REST calls without SDK UA.** Any `curl` or generic scraper hits `/api/v1/*` without the `@civiq/sdk` signature; those requests get the standard access log but do not contribute to adoption numbers. That is deliberate — we want to measure SDK-mediated dependencies, not drive-by scraping.
- **ActivityPub followers / Nostr consumers.** Federated read traffic is a different system; tracked elsewhere if/when it becomes non-zero.

---

## npm downloads — published packages

**Latest snapshot:** [`docs/adoption/npm-downloads.json`](./adoption/npm-downloads.json) — 2026-04-16

All three `@civiq` packages are live on npm (initial publish: 2026-03-25). Subsequent releases go through [`.github/workflows/publish-packages.yml`](../.github/workflows/publish-packages.yml), which publishes with npm provenance attestation on tags matching `@civiq/<package>@v<version>`.

| Package                    | Published  | Latest version | last-week | last-month | Source                                                        |
| -------------------------- | ---------- | -------------- | --------- | ---------- | ------------------------------------------------------------- |
| `@civiq/civic-statistics`  | 2026-03-25 | 0.1.0          | 5         | 64         | [`packages/civic-statistics`](../packages/civic-statistics)   |
| `@civiq/entity-resolution` | 2026-03-25 | 0.1.0          | 4         | 65         | [`packages/entity-resolution`](../packages/entity-resolution) |
| `@civiq/sdk`               | 2026-03-25 | 0.1.0          | 4         | 66         | [`packages/sdk`](../packages/sdk)                             |

Numbers are low and that's honest — these packages are weeks old and barely promoted. The value of this table is that it exists, updates weekly, and does not silently bail on bad weeks.

To refresh manually:

```bash
npm run snapshot:adoption
```

The weekly GH Action opens a PR against `docs/adoption/npm-downloads.json` on Mondays at 13 UTC.

---

## MCP clients

**Latest snapshot:** rolling 30-day window, inferred from structured logs.

When an MCP client connects to `/api/mcp`, the first JSON-RPC message it sends is `initialize`. That payload carries `clientInfo.{name,version}`. CIV.IQ logs these as `adoption.mcp.initialize` metric events (see `src/app/api/mcp/route.ts`). Parse those lines out of the log drain to generate the rolling list.

On the production deploy, this should track at minimum:

- Claude Desktop (`claude-desktop`) — the reference MCP client.
- Cursor (`cursor`) — MCP-over-stdio consumer.
- Any `@modelcontextprotocol/sdk`-based client, which sends its package name as `clientInfo.name`.

External clients whose `clientInfo.name` is neither `civiq` nor a CIV.IQ-operated agent count as external adoption. Self-hosted deployments can compute their own list the same way.

> As of 2026-04-16: instrumentation is live. The production deploy has not been re-deployed since this commit, so no data has been collected yet. First numbers will be reportable after ~7 days of traffic post-deploy.

---

## REST SDK traffic

`@civiq/sdk` sets `User-Agent: @civiq/sdk/<version>` on every outgoing request from Node / Bun / Deno. The Next.js middleware (`src/middleware.ts`) records any `/api/v1/*` or `/api/mcp` hit whose UA matches this signature as an `adoption.sdk.request` metric event.

Expected fields per event:

```json
{
  "level": "metric",
  "message": "adoption.sdk.request",
  "data": {
    "sdk": "@civiq/sdk",
    "version": "0.1.0",
    "path": "/api/v1/representatives",
    "method": "GET"
  }
}
```

Aggregate by `version` to see the SDK version adoption curve. Aggregate by `path` to see which parts of the API external consumers actually hit — which routes deserve hardening first.

> As of 2026-04-16: instrumentation shipped in this commit; prior deploys did not capture SDK UAs, so we have no retroactive counts. First numbers reportable once the middleware change is deployed and a week of traffic accumulates.

---

## External projects citing CIV.IQ

Manual, curated, updated when we learn of them. If you're building on CIV.IQ, please open an issue at <https://github.com/civdotiq/civ.iq/issues> and we'll add you.

| Project               | Using | Since | Notes                                             |
| --------------------- | ----- | ----- | ------------------------------------------------- |
| _(none reported yet)_ | —     | —     | Be the first — `npm install @civiq/sdk` to begin. |

---

## How this page stays honest

- The npm snapshot is auto-generated; do not hand-edit `docs/adoption/npm-downloads.json`.
- MCP and SDK numbers, when published here, should cite the log query that produced them — not a hand-typed figure.
- If a signal turns downward, the downturn is captured. We do not quietly delete weeks where downloads dropped.
- If `@civiq/*` packages are deprecated or moved, this page is the first thing to update — a backbone that silently stops being consumed is a backbone that is no longer backbone-shaped.
