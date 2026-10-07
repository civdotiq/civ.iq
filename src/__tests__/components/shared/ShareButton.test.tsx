/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareButton, RepresentativeShareButton } from '@/components/shared/social/ShareButton';

describe('ShareButton', () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  const open = jest.fn();

  beforeEach(() => {
    writeText.mockClear();
    open.mockClear();
    Object.assign(navigator, { clipboard: { writeText } });
    window.open = open;
  });

  it('copies the page path as an absolute link', async () => {
    render(<ShareButton url="/districts/MI-12" title="Michigan's 12th District" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share this page' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /copy link/i }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/districts/MI-12`)
    );
  });

  it('posts the title and link when no post text is given', () => {
    render(<ShareButton url="/bill/119-hr-1" title="H.R. 1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share this page' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /bluesky/i }));
    const intent = new URL(open.mock.calls[0][0] as string);
    expect(intent.searchParams.get('text')).toBe(
      `H.R. 1\n\n${window.location.origin}/bill/119-hr-1`
    );
  });
});

describe('RepresentativeShareButton', () => {
  it('renders nothing without a bioguide id', () => {
    const { container } = render(
      <RepresentativeShareButton
        data={{
          representative: { name: 'Test', party: 'D', state: 'MI', bioguideId: '' },
          section: 'overview',
        }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('labels the button with the section', () => {
    render(
      <RepresentativeShareButton
        data={{
          representative: { name: 'Test', party: 'D', state: 'MI', bioguideId: 'T000001' },
          section: 'finance',
        }}
      />
    );
    expect(screen.getByRole('button', { name: 'Share Campaign Finance' })).toBeInTheDocument();
  });
});
