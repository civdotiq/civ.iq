/**
 * Readable state legislator URLs (PLAN-search-growth Phase 2, decision 5).
 * Every link form ever emitted must still resolve, and the slug must never be
 * the thing that identifies the member — only its id suffix is.
 */

import {
  buildStateLegislatorUrl,
  parseStateLegislatorParam,
  stateLegislatorSlug,
} from '@/lib/helpers/url-builders';
import { encodeBase64Url } from '@/lib/url-encoding';

const ID = 'ocd-person/2a1a6b8f-1f9c-4a1b-9059-7b2f8cc93ed9';

describe('stateLegislatorSlug', () => {
  it('hyphenates the name and ends in the 8-hex id suffix', () => {
    expect(stateLegislatorSlug('Angela Rigas', ID)).toBe('angela-rigas-2a1a6b8f');
  });

  it('folds accents and drops punctuation', () => {
    expect(stateLegislatorSlug('José Peña Jr.', ID)).toBe('jose-pena-jr-2a1a6b8f');
    expect(stateLegislatorSlug("Mary O'Neil-Smith", ID)).toBe('mary-o-neil-smith-2a1a6b8f');
  });

  it('falls back to the suffix alone when the name has no ASCII letters', () => {
    expect(stateLegislatorSlug('---', ID)).toBe('2a1a6b8f');
  });

  it('builds the full lowercase-state path', () => {
    expect(buildStateLegislatorUrl('MI', ID, 'Angela Rigas')).toBe(
      '/state-legislature/mi/legislator/angela-rigas-2a1a6b8f'
    );
  });
});

describe('parseStateLegislatorParam', () => {
  it('reads a readable slug by its suffix', () => {
    expect(parseStateLegislatorParam('angela-rigas-2a1a6b8f')).toEqual({
      kind: 'suffix',
      suffix: '2a1a6b8f',
    });
    expect(parseStateLegislatorParam('2A1A6B8F')).toEqual({ kind: 'suffix', suffix: '2a1a6b8f' });
  });

  it('reads the legacy base64 id', () => {
    expect(parseStateLegislatorParam(encodeBase64Url(ID))).toEqual({ kind: 'id', id: ID });
  });

  it('reads raw ids with either separator, and a bare uuid', () => {
    expect(parseStateLegislatorParam(ID)).toEqual({ kind: 'id', id: ID });
    expect(parseStateLegislatorParam(encodeURIComponent(ID))).toEqual({ kind: 'id', id: ID });
    expect(parseStateLegislatorParam(ID.replace('/', '-'))).toEqual({ kind: 'id', id: ID });
    expect(parseStateLegislatorParam(ID.slice('ocd-person/'.length))).toEqual({
      kind: 'id',
      id: ID,
    });
  });

  it('round-trips every slug it builds', () => {
    const slug = stateLegislatorSlug('Angela Rigas', ID);
    expect(parseStateLegislatorParam(slug)).toEqual({ kind: 'suffix', suffix: '2a1a6b8f' });
  });

  it('rejects segments that name nobody', () => {
    expect(parseStateLegislatorParam('angela-rigas')).toBeNull();
    expect(parseStateLegislatorParam('b2NkLXBlcnNvbi9ub3QtYS11dWlk')).toBeNull();
    expect(parseStateLegislatorParam('%E0%A4%A')).toBeNull();
    expect(parseStateLegislatorParam('')).toBeNull();
  });
});
