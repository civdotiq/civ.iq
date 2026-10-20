/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataProvenance } from '../DataProvenance';
import { registrySource } from '@/lib/provenance/source-registry';

describe('DataProvenance block variant', () => {
  it('shows publisher, dates, license and method link per source', () => {
    render(
      <DataProvenance
        variant="block"
        sources={[
          registrySource('congressGov', {
            covers: 'Status and actions',
            asOf: 'Record updated Sep 19, 2026',
            fetchedAt: '2026-10-20T13:12:00.000Z',
          }),
          registrySource('usaspending', { covers: 'Related Federal Spending section' }),
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Sources and method' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Congress.gov' })).toHaveAttribute(
      'href',
      'https://www.congress.gov'
    );
    expect(screen.getByText(/Library of Congress/)).toBeInTheDocument();
    // Eastern time, whatever the test machine's zone.
    expect(
      screen.getByText('Record updated Sep 19, 2026 · Loaded Oct 20, 2026, 9:12 AM ET')
    ).toBeInTheDocument();
    // One license line and one method link for the whole list, not per row.
    expect(screen.getAllByRole('link', { name: 'Public domain (17 U.S.C. § 105)' })).toHaveLength(
      1
    );
    expect(screen.getByText(/All sources:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Data sources →' })).toHaveAttribute(
      'href',
      '/methodology#data-sources'
    );
  });

  it('starts collapsed, with names and the headline date in the summary', () => {
    const { container } = render(
      <DataProvenance
        variant="block"
        sources={[
          registrySource('congressGov', { covers: 'Status', asOf: 'Record updated Sep 19, 2026' }),
          registrySource('crs', { covers: 'Official summary' }),
          registrySource('congressLegislators', { covers: 'Member names' }),
        ]}
      />
    );
    const details = container.querySelector('details');
    expect(details).not.toHaveAttribute('open');
    expect(container.querySelector('summary')).toHaveTextContent(
      /^▸Sources and method · Congress\.gov, CRS, congress-legislators · Record updated Sep 19, 2026$/
    );
    // Mixed licenses are grouped by source.
    expect(screen.getByText(/Congress\.gov, CRS:/)).toBeInTheDocument();
    expect(screen.getByText(/congress-legislators:/)).toBeInTheDocument();
  });

  it('prints no date line for a source without dates', () => {
    render(
      <DataProvenance
        variant="block"
        sources={[registrySource('usaspending', { covers: 'Related Federal Spending section' })]}
      />
    );
    expect(screen.queryByText(/Loaded [A-Z][a-z]{2} \d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/updated/)).not.toBeInTheDocument();
  });
});
