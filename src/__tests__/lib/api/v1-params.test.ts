/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Guards the unknown-parameter warning contract.
 *
 * Regression origin: /api/v1/bills silently ignored `query` and `congress`,
 * so a client polling ~10,000 times a day received 200 OK responses that
 * never matched the request it thought it was making (measured 2026-08-27).
 */

import { unknownParamWarnings } from '@/lib/api/v1-params';

const SUPPORTED = ['congress', 'sort', 'limit', 'offset'] as const;

describe('unknownParamWarnings()', () => {
  it('returns nothing when every parameter is supported', () => {
    const params = new URLSearchParams('congress=119&sort=number+asc&limit=10&offset=20');
    expect(unknownParamWarnings(params, SUPPORTED)).toEqual([]);
  });

  it('returns nothing for a request with no parameters at all', () => {
    expect(unknownParamWarnings(new URLSearchParams(''), SUPPORTED)).toEqual([]);
  });

  it('names the unknown parameter and lists the supported ones', () => {
    const warnings = unknownParamWarnings(new URLSearchParams('query=bill'), SUPPORTED);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Unknown parameter 'query' was ignored");
    expect(warnings[0]).toContain('congress, sort, limit, offset');
    expect(warnings[0]).toContain('https://civdotiq.org/docs/api');
  });

  it('warns once per unknown parameter, keeping supported ones quiet', () => {
    const params = new URLSearchParams('query=bill&congress=119&chamber=house');
    const warnings = unknownParamWarnings(params, SUPPORTED);

    expect(warnings).toHaveLength(2);
    expect(warnings.join(' ')).toContain("'query'");
    expect(warnings.join(' ')).toContain("'chamber'");
    expect(warnings.join(' ')).not.toContain("'congress'");
  });

  it('deduplicates a repeated unknown parameter', () => {
    const params = new URLSearchParams('query=a&query=b&query=c');
    expect(unknownParamWarnings(params, SUPPORTED)).toHaveLength(1);
  });

  it('caps the number of warnings so junk params cannot inflate the response', () => {
    const params = new URLSearchParams(
      Array.from({ length: 50 }, (_, i) => `junk${i}=1`).join('&')
    );
    expect(unknownParamWarnings(params, SUPPORTED)).toHaveLength(5);
  });

  it('truncates and strips an abusive parameter name before echoing it', () => {
    const hostile = `<script>alert(1)</script>${'x'.repeat(200)}`;
    const warnings = unknownParamWarnings(
      new URLSearchParams(`${encodeURIComponent(hostile)}=1`),
      SUPPORTED
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).not.toContain('<');
    expect(warnings[0]).not.toContain('>');
    expect(warnings[0]).toContain('…');
    expect(warnings[0]!.length).toBeLessThan(200);
  });
});
