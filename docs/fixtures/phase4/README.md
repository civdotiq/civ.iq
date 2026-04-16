# Phase 4 BackboneResponse fixtures

Real-upstream JSON captures of the four critical response paths introduced by
Phase 4 of [`PLAN-backbone-gaps-2026-04.md`](../../../PLAN-backbone-gaps-2026-04.md).
These exist so a future contract regression (a field rename, a status-code
flip, a pilot-city drop) is caught by a plain diff against the committed JSON,
not only by Jest mocks.

## How these were captured

`npm run dev`, then `curl` against the running server. Each fixture is the
raw response body; headers and status codes are documented per-file in the
table below.

| File                             | Route                                               | Status | `dataQuality` | Why it exists                                                                                                                                                                             |
| -------------------------------- | --------------------------------------------------- | ------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state-finance-unavailable.json` | `/api/state-legislature/ca/legislator/<id>/finance` | `503`  | `unavailable` | Production reality: `FOLLOWTHEMONEY_API_KEY` is absent, so the route short-circuits with an `unavailable` BackboneResponse. Pins the source-status entry and the OpenSecrets-merger note. |
| `local-gov-pilot-match.json`     | `/api/local-government/boston-ma`                   | `200`  | `partial`     | Pilot-city happy path. Pins `resolvedCity`, the `legistar:boston` source status, and the `metadata.note` pointing callers at `/api/city/boston/council`.                                  |
| `local-gov-unsupported.json`     | `/api/local-government/fakecity-zz`                 | `503`  | `unavailable` | Outside the pilot list. Pins the `civiq:local-government` `not-configured` status and the full 10-entry `pilotCities[]` payload.                                                          |

## Intentionally missing

- `state-finance-configured-empty.json` — the FTM-configured success path
  (`200` / `empty` / `sourceStatus[0].status = 'ok'`) is dormant in this
  environment because `FOLLOWTHEMONEY_API_KEY` is not set and the FollowTheMoney
  API is itself in maintenance mode during the OpenSecrets merger. The contract
  test `src/__tests__/api/state-legislature/legislator-finance.test.ts`
  exercises that path with a mocked `resolveFTMEntityId`; there is nothing
  real to capture until a usable replacement upstream exists.

## Regression-detection workflow

```bash
# Re-capture live
curl -s http://localhost:3000/api/local-government/boston-ma \
  | jq '.' > /tmp/live.json

# Diff against committed fixture
diff <(jq -S '.' docs/fixtures/phase4/local-gov-pilot-match.json) \
     <(jq -S '.' /tmp/live.json)
```

Any non-trivial diff (ignoring `fetchedAt` / `lastUpdated` timestamps) means
the contract changed. Either the change is intentional (update the fixture)
or it is a regression (fix the code).
