# Documentation

Start with the repo [README](../README.md). This page explains what each document in `docs/` covers.

## Start here

| Document                               | What it covers                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [COVERAGE.md](./COVERAGE.md)           | **Canonical.** What CIV.IQ covers, which source each answer comes from, and the source count.      |
| [BOOTSTRAP.md](./BOOTSTRAP.md)         | Clone to running locally in under an hour: keys, environment, first run.                           |
| [API_REFERENCE.md](./API_REFERENCE.md) | API endpoints, parameters and response shapes. The machine-readable spec is `public/openapi.json`. |

## How it works

| Document                                                                   | What it covers                                                                                     |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                                       | System design, data flow and the intelligence layer.                                               |
| [DATA_NETWORK.md](./DATA_NETWORK.md)                                       | The cross-domain join layer that links bills, spending, lobbying and votes.                        |
| [architecture/CACHE_ARCHITECTURE.md](./architecture/CACHE_ARCHITECTURE.md) | Redis caching and TTLs. The TTL table is current; the file list predates some newer cache helpers. |
| [DATA-SOURCE-TIERS.md](./DATA-SOURCE-TIERS.md)                             | How each data source is ranked by importance and how it's maintained.                              |
| [MONITORING.md](./MONITORING.md)                                           | The `/api/health` probe and external monitoring for each source.                                   |

## Working on the code

| Document                               | What it covers                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| [TESTING-GUIDE.md](./TESTING-GUIDE.md) | Jest, Playwright and Vitest: commands, layout, and what `validate:all` runs. |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Summary of the design rules, with a pointer to the canonical rules file.     |
| [../SECURITY.md](../SECURITY.md)       | Reporting vulnerabilities, security measures and accepted advisories.        |

## Distribution and adoption

| Document                                                     | What it covers                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [MCP-REGISTRY-SUBMISSIONS.md](./MCP-REGISTRY-SUBMISSIONS.md) | How the MCP server is listed in the MCP directories.                              |
| [ADOPTION.md](./ADOPTION.md)                                 | A dated public record of who uses the backbone, including npm download snapshots. |

## Records

| Path                                                                       | What it is                                                              |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [architecture/PROJECT-PHILOSOPHY.md](./architecture/PROJECT-PHILOSOPHY.md) | The original 2025 vision statement. Historical.                         |
| [archive/](./archive/)                                                     | Post-mortems and calibration data that code comments cite.              |
| [design/](./design/)                                                       | The historical design handoff from the 2026 redesign. Not current copy. |
| [fixtures/](./fixtures/)                                                   | Captured upstream responses, used as contract snapshots.                |
| [adoption/](./adoption/)                                                   | Weekly npm download snapshots, written by `snapshot-adoption.yml`.      |
