/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The request-time reader fetches one state's artifact from the manifest's
 * base URL, decodes it once per instance, and answers null — not [] — for a
 * state the manifest does not list, so "no votes" is never said for "not
 * available".
 */

import { brotliCompressSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { buildVotesCorpus } from '@/lib/data-sources/openstates-votes/build-votes';
import {
  __resetVotesCorpusCache,
  getMemberVotes,
  hasVotesCorpus,
} from '@/lib/data-sources/openstates-votes/load-votes';

jest.mock('node:fs/promises', () => ({ readFile: jest.fn() }));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;

const artifact = brotliCompressSync(
  Buffer.from(
    JSON.stringify(
      buildVotesCorpus({
        jurisdiction: 'VT',
        generatedAt: '2026-10-08T00:00:00Z',
        roster: [{ uuid: 'aaaa', party: 'Democratic', chamber: 'lower' }],
        sessions: [
          {
            identifier: '2025-2026',
            name: '2025-2026',
            upstreamGeneratedAt: '',
            organizations: [{ id: 'o', classification: 'lower' }],
            bills: [],
            votes: [
              { id: 'ocd-vote/v', start_date: '2026-01-01', result: 'pass', organization_id: 'o' },
            ],
            votePeople: [
              { vote_event_id: 'ocd-vote/v', option: 'yes', voter_id: 'ocd-person/aaaa' },
            ],
          },
        ],
      })
    )
  )
);

const manifest = JSON.stringify({
  generatedAt: '2026-10-08T00:00:00Z',
  staleAfter: '2026-12-17',
  baseUrl: 'https://example.test/votes',
  jurisdictions: {
    VT: {
      bytes: 1,
      rollCalls: 1,
      memberVotes: 1,
      members: 1,
      unresolvedVotes: 0,
      sessions: [],
      generatedAt: '',
    },
  },
});

describe('openstates-votes loader', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    __resetVotesCorpusCache();
    delete process.env.OPENSTATES_VOTES_BASE_URL;
    mockedReadFile.mockReset();
    mockedReadFile.mockResolvedValue(manifest);
    fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        artifact.buffer.slice(artifact.byteOffset, artifact.byteOffset + artifact.byteLength),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('fetches a listed state from the manifest base URL once and decodes a member', async () => {
    const votes = await getMemberVotes('vt', 'ocd-person/aaaa');
    expect(votes?.map(v => v.option)).toEqual(['yes']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://example.test/votes/VT.json.br');

    await getMemberVotes('VT', 'ocd-person/aaaa');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await getMemberVotes('VT', 'ocd-person/nobody')).toEqual([]);
  });

  it('answers null for a state the manifest does not list, without a fetch', async () => {
    expect(await getMemberVotes('CA', 'ocd-person/aaaa')).toBeNull();
    expect(await hasVotesCorpus('CA')).toBe(false);
    expect(await hasVotesCorpus('VT')).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets OPENSTATES_VOTES_BASE_URL override the manifest host', async () => {
    process.env.OPENSTATES_VOTES_BASE_URL = 'https://override.test/';
    await getMemberVotes('VT', 'ocd-person/aaaa');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://override.test/VT.json.br');
  });

  it('treats a failed fetch as unavailable and retries on the next call', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    expect(await getMemberVotes('VT', 'ocd-person/aaaa')).toBeNull();
    expect((await getMemberVotes('VT', 'ocd-person/aaaa'))?.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
