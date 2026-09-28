/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { BillLink } from '@/components/shared/links/EntityLinks';

describe('BillLink', () => {
  it('links a valid slug in canonical form', () => {
    render(<BillLink billId="hr8814-119" title="H.R. 8814" />);
    expect(screen.getByRole('link', { name: 'H.R. 8814' })).toHaveAttribute(
      'href',
      '/bill/119-hr-8814'
    );
  });

  it('renders plain text for an unparseable slug instead of a 404 link', () => {
    render(<BillLink billId="119-unknown-Unknown" title="S.Amdt. 6714" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('S.Amdt. 6714')).toBeInTheDocument();
  });
});
