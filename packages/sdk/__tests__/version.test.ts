import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SDK_VERSION, SDK_USER_AGENT } from '../src/http.js';
import { runCli } from '../src/cli.js';

// package.json is read with fs rather than imported: a JSON import would
// need an import attribute and would pull package.json into the build graph.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')
) as { version: string };

describe('SDK_VERSION', () => {
  it('matches package.json (0.3.0 shipped reporting 0.2.0)', () => {
    expect(SDK_VERSION).toBe(pkg.version);
  });

  it('is what the User-Agent advertises', () => {
    expect(SDK_USER_AGENT).toBe(`@civiq/sdk/${pkg.version}`);
  });

  it('is what `civiq --version` prints', async () => {
    const stdout: string[] = [];
    const code = await runCli(
      ['--version'],
      { stdout: line => stdout.push(line), stderr: () => undefined },
      () => {
        throw new Error('--version must not construct a client');
      }
    );
    expect(code).toBe(0);
    expect(stdout).toEqual([pkg.version]);
  });
});
