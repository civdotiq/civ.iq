/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlossaryLink from '@/components/shared/ui/GlossaryLink';

// Mock next/link to render as a plain anchor
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe('GlossaryLink', () => {
  // The glossary is now loaded lazily via dynamic import(), so the interactive
  // link resolves asynchronously — tests await the button before interacting.

  it('renders the term as a clickable button', async () => {
    render(<GlossaryLink term="Roll Call Vote" />);

    const button = await screen.findByRole('button', { name: /definition: roll call vote/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Roll Call Vote');
  });

  it('renders custom children text instead of term name', async () => {
    render(<GlossaryLink term="Roll Call Vote">Roll Call</GlossaryLink>);

    const button = await screen.findByRole('button');
    expect(button).toHaveTextContent('Roll Call');
  });

  it('shows definition popover when clicked', async () => {
    render(<GlossaryLink term="Cloture" />);

    // Popover should not be visible initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Click to open (await the lazily-loaded term resolving first)
    fireEvent.click(await screen.findByRole('button'));

    // Popover should now be visible with definition
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-label', 'Cloture definition');

    // Should contain the term name in header (multiple matches: button + header)
    expect(screen.getAllByText('Cloture').length).toBeGreaterThanOrEqual(2);

    // Should contain a link to the full glossary page
    const glossaryLink = screen.getByText(/full definition/i);
    expect(glossaryLink).toBeInTheDocument();
    expect(glossaryLink.closest('a')).toHaveAttribute('href', '/glossary/cloture');
  });

  it('closes popover when close button is clicked', async () => {
    render(<GlossaryLink term="Cloture" />);

    // Open
    fireEvent.click(await screen.findByRole('button', { name: /definition/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close via X button
    fireEvent.click(screen.getByRole('button', { name: /close definition/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes popover on Escape key', async () => {
    render(<GlossaryLink term="Cloture" />);

    // Open
    fireEvent.click(await screen.findByRole('button', { name: /definition/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders plain text for unknown terms', async () => {
    render(<GlossaryLink term="Nonexistent Civic Term XYZ" />);

    // Visible text renders immediately; after the glossary resolves (term not
    // found) it stays plain text — never a button.
    expect(screen.getByText('Nonexistent Civic Term XYZ')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  it('generates correct glossary slug for multi-word terms', async () => {
    render(<GlossaryLink term="Roll Call Vote" />);

    fireEvent.click(await screen.findByRole('button'));

    const glossaryLink = screen.getByText(/full definition/i).closest('a');
    expect(glossaryLink).toHaveAttribute('href', '/glossary/roll-call-vote');
  });

  it('applies custom className', async () => {
    const { container } = render(<GlossaryLink term="Cloture" className="my-custom-class" />);

    // Wait for resolution so the enhanced markup settles (avoids act warnings).
    await screen.findByRole('button');
    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});
