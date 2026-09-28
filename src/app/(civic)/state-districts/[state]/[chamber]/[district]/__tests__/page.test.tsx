/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * @jest-environment node
 */

import type { ReactElement, ReactNode } from 'react';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/services/core/state-legislature-core.service', () => ({
  StateLegislatureCoreService: {
    getAllStateLegislators: async () => [
      { id: 'ocd-person/1', name: 'Jane Doe', district: '1st Barnstable', chamber: 'lower' },
      { id: 'ocd-person/2', name: 'John Roe', district: '2nd Barnstable', chamber: 'lower' },
    ],
  },
}));
jest.mock('@/lib/services/state-census-api.service', () => ({
  getStateDistrictDemographics: async () => null,
}));
jest.mock('@/lib/api/wikipedia', () => ({ fetchDistrictBiography: async () => null }));
jest.mock('@/features/districts/components/StateDistrictBoundaryMapClient', () => () => null);
jest.mock('@/components/districts/shared/UnifiedRepresentativeCard', () => () => null);
jest.mock('@/components/districts/shared/UnifiedDemographicsDisplay', () => () => null);
jest.mock('@/components/districts/shared/UnifiedDistrictSidebar', () => () => null);

import StateDistrictPage, { generateMetadata, generateStaticParams, revalidate } from '../page';

/** Collect the `representative` prop of every element in a React tree. */
function representatives(node: ReactNode, out: Array<{ id: string }> = []) {
  if (Array.isArray(node)) node.forEach(n => representatives(n, out));
  else if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as ReactElement<{ representative?: { id: string }; children?: ReactNode }>)
      .props;
    if (props.representative) out.push(props.representative);
    representatives(props.children, out);
  }
  return out;
}

const params = Promise.resolve({ state: 'ma', chamber: 'lower', district: '1st%20Barnstable' });

describe('/state-districts/[state]/[chamber]/[district]', () => {
  it('matches a named district that arrives percent-encoded', async () => {
    const tree = await StateDistrictPage({ params });
    expect(representatives(tree).map(r => r.id)).toEqual(['ocd-person/1']);
  });

  it('is served via on-demand ISR rather than rendered per request', async () => {
    // Empty generateStaticParams + revalidate is what makes a dynamic-segment
    // route cacheable; reading searchParams on the server would undo it.
    expect(revalidate).toBe(3600);
    expect(await generateStaticParams()).toEqual([]);
  });

  it('encodes the canonical URL exactly once', async () => {
    const meta = await generateMetadata({ params });
    expect(meta.alternates?.canonical).toBe(
      'https://civdotiq.org/state-districts/ma/lower/1st%20Barnstable'
    );
  });
});
