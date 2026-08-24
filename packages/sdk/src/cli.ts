#!/usr/bin/env node
/**
 * civiq — command-line interface for the CIV.IQ civic data API.
 *
 * Zero-dependency (node:util parseArgs) wrapper over the SDK client so
 * agents and developers can script lookups without writing an integration:
 *
 *   npx @civiq/sdk representatives --state MI --chamber house
 *   npx @civiq/sdk representative P000197 votes --limit 5
 *   npx @civiq/sdk search healthcare
 *
 * All commands print JSON to stdout; errors go to stderr as JSON with a
 * non-zero exit code. No authentication required (60 req/min per IP).
 */

import { parseArgs } from 'node:util';
import { CivIQ } from './client.js';
import { CivIQError } from './errors.js';
import { SDK_VERSION } from './http.js';

const HELP = `civiq ${SDK_VERSION} — CIV.IQ civic data CLI (https://civdotiq.org/developers)

Usage: civiq <command> [arguments] [options]

Commands:
  representatives                List members of Congress
                                 (--state MI, --chamber house|senate, --party D|R|I,
                                  --limit N, --offset N)
  representative <bioguideId>    Member detail
  representative <id> profile    Comprehensive profile (biography, committees, IDs)
  representative <id> votes      Voting record (--limit N)
  representative <id> finance    FEC campaign finance summary
  representative <id> lobbying   Related Senate LDA lobbying filings
  bills                          List recent bills (--sort updateDate+desc|updateDate+asc|
                                  number+desc|number+asc, --limit N, --offset N)
  bill <billId>                  Bill detail (billId like 119-hr-1)
  bill <billId> summary          Bill summary (CRS-derived)
  vote <voteId>                  Roll-call vote detail
  district <districtId>          District detail (districtId like MI-08)
  committees                     List committees (--chamber house|senate|joint, --limit N)
  committee <committeeId>        Committee detail
  search <query>                 Cross-domain search

Options:
  --base-url <url>   API base (default https://civdotiq.org/api)
  --compact          Print single-line JSON instead of pretty-printed
  --help, -h         Show this help
  --version, -v      Show version

Output is JSON on stdout. Errors are JSON on stderr with exit code 1
(HTTP errors carry the API's structured error body).

Data comes from official U.S. government sources only. Rate limit:
60 requests/minute per IP; the API sends standard RateLimit-* headers.`;

interface CliIo {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

export async function runCli(
  argv: string[],
  io: CliIo,
  createClient: (baseUrl?: string) => CivIQ = baseUrl =>
    new CivIQ(baseUrl ? { baseUrl, userAgent: 'civiq-cli' } : { userAgent: 'civiq-cli' })
): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      state: { type: 'string' },
      chamber: { type: 'string' },
      party: { type: 'string' },
      sort: { type: 'string' },
      cycle: { type: 'string' },
      limit: { type: 'string' },
      offset: { type: 'string' },
      'base-url': { type: 'string' },
      compact: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  if (values.version) {
    io.stdout(SDK_VERSION);
    return 0;
  }
  const [command, ...rest] = positionals;
  if (values.help || !command) {
    io.stdout(HELP);
    return values.help ? 0 : 1;
  }

  const num = (v: string | undefined): number | undefined =>
    v === undefined ? undefined : Number.parseInt(v, 10);
  const client = createClient(values['base-url']);
  const print = (data: unknown): void =>
    io.stdout(values.compact ? JSON.stringify(data) : JSON.stringify(data, null, 2));

  try {
    switch (command) {
      case 'representatives': {
        print(
          await client.representatives.list({
            state: values.state,
            chamber: values.chamber as 'house' | 'senate' | undefined,
            party: values.party as 'D' | 'R' | 'I' | undefined,
            limit: num(values.limit),
            offset: num(values.offset),
          })
        );
        return 0;
      }
      case 'representative': {
        const [bioguideId, sub] = rest;
        if (!bioguideId) throw new UsageError('representative requires a <bioguideId>');
        if (sub === 'votes') {
          print(await client.representatives.votes(bioguideId, { limit: num(values.limit) }));
        } else if (sub === 'finance') {
          print(await client.representatives.finance(bioguideId, { cycle: num(values.cycle) }));
        } else if (sub === 'lobbying') {
          print(await client.representatives.lobbying(bioguideId));
        } else if (sub === 'profile') {
          print(await client.representatives.profile(bioguideId));
        } else if (sub === undefined) {
          print(await client.representatives.get(bioguideId));
        } else {
          throw new UsageError(`unknown representative subcommand: ${sub}`);
        }
        return 0;
      }
      case 'bills': {
        print(
          await client.bills.list({
            sort: values.sort as
              | 'updateDate+desc'
              | 'updateDate+asc'
              | 'number+desc'
              | 'number+asc'
              | undefined,
            limit: num(values.limit),
            offset: num(values.offset),
          })
        );
        return 0;
      }
      case 'bill': {
        const [billId, sub] = rest;
        if (!billId) throw new UsageError('bill requires a <billId> (like 119-hr-1)');
        if (sub === 'summary') {
          print(await client.bills.summary(billId));
        } else if (sub === undefined) {
          print(await client.bills.get(billId));
        } else {
          throw new UsageError(`unknown bill subcommand: ${sub}`);
        }
        return 0;
      }
      case 'vote': {
        const [voteId] = rest;
        if (!voteId) throw new UsageError('vote requires a <voteId>');
        print(await client.votes.get(voteId));
        return 0;
      }
      case 'district': {
        const [districtId] = rest;
        if (!districtId) throw new UsageError('district requires a <districtId> (like MI-08)');
        print(await client.districts.get(districtId));
        return 0;
      }
      case 'committees': {
        print(
          await client.committees.list({
            chamber: values.chamber as 'house' | 'senate' | 'joint' | undefined,
            limit: num(values.limit),
            offset: num(values.offset),
          })
        );
        return 0;
      }
      case 'committee': {
        const [committeeId] = rest;
        if (!committeeId) throw new UsageError('committee requires a <committeeId>');
        print(await client.committees.get(committeeId));
        return 0;
      }
      case 'search': {
        const [query] = rest;
        if (!query) throw new UsageError('search requires a <query>');
        print(await client.search.unified({ q: query, limit: num(values.limit) }));
        return 0;
      }
      default:
        throw new UsageError(`unknown command: ${command}`);
    }
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr(JSON.stringify({ error: { code: 'USAGE', message: error.message } }));
      io.stderr(`Run 'civiq --help' for usage.`);
      return 1;
    }
    if (error instanceof CivIQError) {
      io.stderr(
        JSON.stringify({
          error: {
            code: error.code ?? 'API_ERROR',
            status: error.status,
            message: error.message,
            details: error.details,
          },
        })
      );
      return 1;
    }
    io.stderr(JSON.stringify({ error: { code: 'UNEXPECTED', message: String(error) } }));
    return 1;
  }
}

class UsageError extends Error {}
