/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CqSourceTag } from '../CqSourceTag';

describe('CqSourceTag', () => {
  it('renders no freshness line when no time is passed', () => {
    const { container } = render(<CqSourceTag source="USASpending.gov" id="award 123" />);

    expect(screen.getByText('USASpending.gov')).toBeInTheDocument();
    expect(container.textContent).toBe('USASpending.gov' + 'award 123');
    expect(container.textContent).not.toMatch(/updated/i);
  });

  it('renders the time it is given', () => {
    render(<CqSourceTag source="FEC.gov" time="Data through Sep 30, 2026" />);

    expect(screen.getByText('Data through Sep 30, 2026')).toBeInTheDocument();
  });
});
