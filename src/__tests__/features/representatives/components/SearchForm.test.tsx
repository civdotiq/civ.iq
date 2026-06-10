/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchForm } from '@/features/representatives/components/SearchForm';

describe('SearchForm (address-first)', () => {
  const onSearch = jest.fn();

  beforeEach(() => {
    onSearch.mockClear();
  });

  it('prompts for a full home address, not a ZIP code', () => {
    render(<SearchForm onSearch={onSearch} />);
    const input = screen.getByLabelText('Home address or ZIP code');
    expect(input).toHaveAttribute('placeholder', expect.stringContaining('full home address'));
    // No numeric-only restriction: addresses must be typeable
    expect(input).not.toHaveAttribute('inputMode');
    expect(input).not.toHaveAttribute('pattern');
  });

  it('shows the ZIP accuracy honesty hint', () => {
    render(<SearchForm onSearch={onSearch} />);
    expect(screen.getByText(/ZIP codes also work but are approximate/i)).toBeInTheDocument();
  });

  it('submits a full address query', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSearch={onSearch} />);

    await user.type(screen.getByLabelText('Home address or ZIP code'), '123 Main St, Detroit, MI');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith('123 Main St, Detroit, MI');
  });

  it('still submits a ZIP code as fallback', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSearch={onSearch} />);

    await user.type(screen.getByLabelText('Home address or ZIP code'), '48201');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith('48201');
  });

  it('does not submit empty input', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSearch={onSearch} />);

    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).not.toHaveBeenCalled();
  });
});
