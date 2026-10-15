# Testing guide

How tests are organized and run in this repo. Every command here is a script in `package.json`.

## Before you open a PR

```bash
npm run validate:all
```

`npm run validate:all` runs `scripts/validation/validate-all.js`. The run fails if any of these steps fail:

1. `npm run type-check`
2. `npm run lint`
3. `npm test -- --passWithNoTests`
4. `npm run build`
5. `npm run check:onnx-trace`, which checks that the ONNX runtime files are traced into the build
6. `npm run smoke:embedding`, which loads the real ML pipelines with no mocks

It also runs two checks that only warn and never fail the run: `npm audit --audit-level=high`, and a scan for patterns such as `Math.random()` and `: any`.

CI (`.github/workflows/ci.yml`, Node 22) runs on every PR and every push to `main`: `npm ci`, then lint, type-check, `npm test -- --ci --coverage` and build.

## Unit and integration tests (Jest)

- **Config:** `jest.config.js`, built on `next/jest`. It uses jsdom, plus `jest.polyfills.js` and `jest.setup.js`.
- **Where tests live:** mostly in `src/__tests__/`, which mirrors `src/` (`api/`, `components/`, `lib/`, `services/`, `intelligence/`, …). A few sit next to their code as `*.test.ts(x)`.
- **Excluded:** Jest skips `tests/` (Playwright) and `packages/`, which use Vitest.

| Command                                        | What it does                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm test`                                     | Run all Jest tests                                                                  |
| `npm test -- src/__tests__/api/search`         | Run one directory or file                                                           |
| `npm run test:unit:watch`                      | Watch mode                                                                          |
| `npm run test:coverage`                        | Coverage report in `coverage/lcov-report/`                                          |
| `npm run test:smoke`                           | Smoke test against live APIs (`smoke.integration`); needs real keys in `.env.local` |
| `npm run smoke:embedding`                      | Real (unmocked) embedding, zero-shot and NER pipelines                              |
| `npm run test:llm-eval`, `test:causation-eval` | Check LLM output for reading level and causal language                              |

Coverage thresholds in `jest.config.js` are deliberately low. They are a floor, not a target.

## End-to-end tests (Playwright)

- **Config:** `playwright.config.ts`. Specs live in `tests/e2e/`.
- **Setup:** it uses one Chromium project against `http://localhost:3000` and starts `npm run dev` itself. Install the browser once with `npx playwright install chromium`.
- **Run:** `npm run test:e2e`. Add `:headed` to watch the browser, or use `:ui` for the inspector.
- **Not in CI:** E2E tests don't run in CI. Run the specs that cover the area you changed.

## Workspace packages (Vitest)

`packages/sdk`, `packages/civic-statistics` and `packages/entity-resolution` each have their own Vitest suite. Run one with `npm test` inside that package. `publish-packages.yml` runs these suites before it publishes.

## Mocks and the real-data rule

The app never shows fabricated data. That rule covers what the app and API return, not test code: tests may mock their inputs with `jest.mock`, `jest.fn` or Playwright `page.route`. Two things still apply:

- Name fixtures as fixtures (for example `mockRepresentativeData`), so they can't be mistaken for real records.
- When you test an empty or failure path, assert that the code returns an empty result or "Data unavailable". It must never return placeholder values.

`docs/fixtures/` holds raw responses captured from real upstreams. They serve as contract snapshots you can diff against.
