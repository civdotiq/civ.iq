/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Regression test for the /influence/[committeeId] empty-state card:
 * shape-valid FEC IDs that return no data must render an honest card
 * that names the committee ID, the cycle, and links to FEC.gov.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/components/shared/navigation/Breadcrumbs', () => ({
  Breadcrumbs: ({ items }: { items: Array<{ label: string }> }) => (
    <nav data-testid="breadcrumbs">
      {items.map(item => (
        <span key={item.label}>{item.label}</span>
      ))}
    </nav>
  ),
}));

jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: { getCommitteeInfo: jest.fn(), getCommitteeTotals: jest.fn() },
}));
jest.mock('@/lib/fec/recipient-resolver', () => ({
  resolveCommitteeRecipients: jest.fn(async () => []),
}));
jest.mock('@/lib/fec/industry-taxonomy', () => ({ categorizePACByName: () => null }));
jest.mock('@/lib/mesh/sector-display', () => ({ displaySector: (s: string) => s }));
jest.mock('@/app/(civic)/influence/[committeeId]/PACPageSchema', () => ({
  PACPageSchema: () => null,
}));
jest.mock('@/app/(civic)/influence/[committeeId]/CommitteeProfileClient', () => ({
  CommitteeProfileClient: () => null,
}));
jest.mock('@/components/shared/ui/OpenDataStrip', () => ({ OpenDataStrip: () => null }));
jest.mock('@/components/seo/JsonLd', () => ({ BreadcrumbSchema: () => null }));

import { CommitteeNotFoundEmptyState } from '@/app/(civic)/influence/[committeeId]/page';

describe('CommitteeNotFoundEmptyState', () => {
  it('names the committee ID and cycle in the heading/body', () => {
    render(<CommitteeNotFoundEmptyState committeeId="C00401224" cycle={2026} />);
    expect(
      screen.getByRole('heading', { name: /No FEC data for committee C00401224/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/2026 cycle/)).toBeInTheDocument();
  });

  it('links to FEC.gov for the specific committee', () => {
    render(<CommitteeNotFoundEmptyState committeeId="C00401224" cycle={2026} />);
    const fecLink = screen.getByRole('link', { name: /Look up on FEC\.gov/i });
    expect(fecLink).toHaveAttribute('href', 'https://www.fec.gov/data/committee/C00401224/');
    expect(fecLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('offers a path back to committee search', () => {
    render(<CommitteeNotFoundEmptyState committeeId="C00401224" cycle={2026} />);
    const searchLink = screen.getByRole('link', { name: /Search committees/i });
    expect(searchLink).toHaveAttribute('href', '/influence');
  });
});
