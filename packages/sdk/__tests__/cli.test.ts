import { describe, it, expect, vi } from 'vitest';
import { runCli } from '../src/cli.js';
import { CivIQ } from '../src/index.js';

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
    headers: new Headers(),
  });
}

interface RunResult {
  code: number;
  stdout: string[];
  stderr: string[];
  fetchFn: ReturnType<typeof mockFetch>;
}

async function run(argv: string[], body: unknown = { data: [] }, status = 200): Promise<RunResult> {
  const fetchFn = mockFetch(body, status);
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await runCli(
    argv,
    { stdout: l => stdout.push(l), stderr: l => stderr.push(l) },
    baseUrl => new CivIQ({ baseUrl: baseUrl ?? 'https://civdotiq.org/api', fetch: fetchFn })
  );
  return { code, stdout, stderr, fetchFn };
}

describe('civiq CLI', () => {
  it('prints help and exits 0 with --help', async () => {
    const { code, stdout } = await run(['--help']);
    expect(code).toBe(0);
    expect(stdout.join('\n')).toContain('Usage: civiq');
    expect(stdout.join('\n')).toContain('representatives');
  });

  it('prints help and exits 1 with no command', async () => {
    const { code } = await run([]);
    expect(code).toBe(1);
  });

  it('lists representatives with filters mapped to query params', async () => {
    const { code, fetchFn } = await run([
      'representatives',
      '--state',
      'MI',
      '--chamber',
      'house',
      '--limit',
      '5',
    ]);
    expect(code).toBe(0);
    const url = fetchFn.mock.calls[0]?.[0] as string;
    expect(url).toContain('/v1/representatives');
    expect(url).toContain('state=MI');
    expect(url).toContain('chamber=house');
    expect(url).toContain('limit=5');
  });

  it('fetches a representative voting record via the real per-member route', async () => {
    const { code, fetchFn, stdout } = await run(
      ['representative', 'P000197', 'votes', '--limit', '3'],
      { votes: [], totalResults: 0 }
    );
    expect(code).toBe(0);
    const url = fetchFn.mock.calls[0]?.[0] as string;
    expect(url).toContain('/representative/P000197/votes');
    expect(url).toContain('limit=3');
    expect(JSON.parse(stdout.join('\n'))).toEqual({ votes: [], totalResults: 0 });
  });

  it('runs unified search', async () => {
    const { code, fetchFn } = await run(['search', 'healthcare'], { results: [] });
    expect(code).toBe(0);
    expect(fetchFn.mock.calls[0]?.[0] as string).toContain('/search/unified?q=healthcare');
  });

  it('honors --base-url', async () => {
    const { fetchFn } = await run(['bills', '--base-url', 'http://localhost:3000/api']);
    expect(fetchFn.mock.calls[0]?.[0] as string).toContain('http://localhost:3000/api/v1/bills');
  });

  it('prints compact JSON with --compact', async () => {
    const { stdout } = await run(['committees', '--compact'], { data: [{ id: 'hsag' }] });
    expect(stdout).toHaveLength(1);
    expect(stdout[0]).not.toContain('\n');
  });

  it('reports usage errors as JSON on stderr with exit 1', async () => {
    const { code, stderr } = await run(['representative']);
    expect(code).toBe(1);
    expect(JSON.parse(stderr[0] ?? '{}').error.code).toBe('USAGE');
  });

  it('reports API errors as structured JSON with exit 1', async () => {
    const { code, stderr } = await run(
      ['representative', 'X999999'],
      { error: { code: 404, message: 'Representative not found' } },
      404
    );
    expect(code).toBe(1);
    const err = JSON.parse(stderr[0] ?? '{}');
    expect(err.error.status).toBe(404);
    expect(err.error.message).toContain('not found');
  });

  it('rejects unknown commands', async () => {
    const { code, stderr } = await run(['frobnicate']);
    expect(code).toBe(1);
    expect(JSON.parse(stderr[0] ?? '{}').error.message).toContain('unknown command');
  });
});
