/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { prefersMarkdown, acceptsHtmlExplicitly } from '@/lib/http/content-negotiation';

describe('prefersMarkdown', () => {
  it('is false without an Accept header', () => {
    expect(prefersMarkdown(null)).toBe(false);
    expect(prefersMarkdown('')).toBe(false);
  });

  it('is true for an explicit text/markdown request', () => {
    expect(prefersMarkdown('text/markdown')).toBe(true);
  });

  it('is true when markdown and html tie (client listed markdown first)', () => {
    expect(prefersMarkdown('text/markdown, text/html')).toBe(true);
  });

  it('is true when markdown outranks html by q-value', () => {
    expect(prefersMarkdown('text/html;q=0.5, text/markdown')).toBe(true);
    expect(prefersMarkdown('text/markdown;q=0.9, text/html;q=0.8')).toBe(true);
  });

  it('is false when html outranks markdown', () => {
    expect(prefersMarkdown('text/html, text/markdown;q=0.5')).toBe(false);
  });

  it('never triggers on wildcards — browsers and curl keep getting HTML', () => {
    expect(prefersMarkdown('*/*')).toBe(false);
    expect(prefersMarkdown('text/*')).toBe(false);
    expect(
      prefersMarkdown('text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8')
    ).toBe(false);
  });

  it('is false when markdown is explicitly refused (q=0)', () => {
    expect(prefersMarkdown('text/markdown;q=0, text/plain')).toBe(false);
  });

  it('tolerates malformed segments', () => {
    expect(prefersMarkdown('garbage, text/markdown;q=abc')).toBe(true);
    expect(prefersMarkdown(';;;,')).toBe(false);
  });
});

describe('acceptsHtmlExplicitly', () => {
  it('matches browser Accept headers', () => {
    expect(
      acceptsHtmlExplicitly(
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8'
      )
    ).toBe(true);
  });

  it('treats bare */* (curl default) as not-HTML so agents get markdown 404s', () => {
    expect(acceptsHtmlExplicitly('*/*')).toBe(false);
    expect(acceptsHtmlExplicitly(null)).toBe(false);
    expect(acceptsHtmlExplicitly('application/json')).toBe(false);
  });

  it('accepts text/* as HTML-capable', () => {
    expect(acceptsHtmlExplicitly('text/*')).toBe(true);
  });

  it('respects q=0 refusal of html', () => {
    expect(acceptsHtmlExplicitly('text/html;q=0')).toBe(false);
  });
});
