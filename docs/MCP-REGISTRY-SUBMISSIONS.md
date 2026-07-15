# MCP Registry Submissions

How to list the CIV.IQ MCP server (`https://civdotiq.org/api/mcp`) in the
MCP directories. The manifest lives at `server.json` in the repo root.
Each submission is a one-time action; verified 2026-07-07.

## Status

| Registry                                                 | Status                        | Method                  |
| -------------------------------------------------------- | ----------------------------- | ----------------------- |
| Official MCP Registry (registry.modelcontextprotocol.io) | Submitted 2026-07-15 (active) | `mcp-publisher` CLI     |
| Smithery (smithery.ai)                                   | Not submitted                 | Web, GitHub sign-in     |
| PulseMCP (pulsemcp.com)                                  | Not submitted                 | Web form                |
| mcp.so                                                   | Not submitted                 | Web form / GitHub issue |

## 1. Official MCP Registry

The `server.json` at the repo root follows the 2025-12-11 schema with a
`remotes` entry (streamable HTTP, no package). The name
`io.github.civdotiq/civiq` uses GitHub namespace verification — publishing
requires a device-flow login as a member of the `civdotiq` GitHub org.

```bash
brew install mcp-publisher
cd ~/civ.iq
mcp-publisher login github     # device flow, approve in browser
mcp-publisher publish          # reads ./server.json
```

Verify afterwards:

```bash
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=civiq"
```

Alternative namespace: `org.civdotiq/civiq` is available via DNS
verification (TXT record on civdotiq.org) — nicer branding, more setup.
The GitHub namespace works today; switching later is possible by
publishing under the new name.

## 2. Smithery

1. Go to https://smithery.ai and sign in with GitHub.
2. Add server → choose **remote/hosted server** (not a deployed package).
3. Endpoint: `https://civdotiq.org/api/mcp`, transport streamable HTTP,
   no auth.
4. Point it at the `civdotiq/civ.iq` repo for description/README.

## 3. PulseMCP

Submission form at https://www.pulsemcp.com/submit — name, endpoint URL,
repo link, short description. PulseMCP also auto-indexes the official
registry, so completing step 1 may list it here without action.

## 4. mcp.so

Submit via the site's "Submit" link (https://mcp.so) — same fields as
PulseMCP. Also auto-indexes popular registries.

## Suggested listing copy

> **CIV.IQ** — U.S. civic data for AI agents. 47 tools over live
> government sources: representatives by address, voting records,
> bills (full-text keyword search), campaign finance by industry,
> lobbying filings, federal spending, and district profiles
> (environment, health, safety, economy). Every answer cites its
> government source. Free, no API key, MIT-licensed.

## After submitting

- Watch adoption: `npm run stats` reports MCP initializes by client
  name (Upstash counters, 90-day retention).
- Setup page for humans: https://civdotiq.org/mcp
- Keep `server.json` `version` in sync with the server's advertised
  version in `src/lib/mcp/server.ts` (currently 1.0.0); re-run
  `mcp-publisher publish` on version bumps.
