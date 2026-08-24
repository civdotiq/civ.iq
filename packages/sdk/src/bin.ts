#!/usr/bin/env node
/**
 * Executable entry for the `civiq` CLI. Kept separate from cli.ts so the
 * command logic is testable without spawning a process.
 */

import { runCli } from './cli.js';

runCli(process.argv.slice(2), {
  stdout: line => process.stdout.write(`${line}\n`),
  stderr: line => process.stderr.write(`${line}\n`),
}).then(code => {
  process.exitCode = code;
});
