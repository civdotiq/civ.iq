/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SectionCard } from './SectionCard';
import { SectionCardConfig } from './types';

const makeSection = (overrides?: Partial<SectionCardConfig>): SectionCardConfig => ({
  id: 'voting',
  title: 'Voting Records',
  description: 'Voting history and positions',
  icon: <span data-testid="icon">V</span>,
  stats: [
    { label: 'Votes Cast', value: 142 },
    { label: 'Yea Rate', value: '68%' },
  ],
  ...overrides,
});

describe('SectionCard', () => {
  it('renders title and description', () => {
    render(<SectionCard section={makeSection()} onSelect={jest.fn()} />);
    expect(screen.getByText('Voting Records')).toBeInTheDocument();
    expect(screen.getByText('Voting history and positions')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<SectionCard section={makeSection()} onSelect={jest.fn()} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders stat values and labels', () => {
    render(<SectionCard section={makeSection()} onSelect={jest.fn()} />);
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('Votes Cast')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
    expect(screen.getByText('Yea Rate')).toBeInTheDocument();
  });

  it('renders em dash for undefined stat values', () => {
    const section = makeSection({
      stats: [{ label: 'Votes Cast', value: undefined }],
    });
    render(<SectionCard section={section} onSelect={jest.fn()} />);
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('renders skeleton loaders when loading', () => {
    const section = makeSection({ loading: true });
    const { container } = render(<SectionCard section={section} onSelect={jest.fn()} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('calls onSelect with section id on click', () => {
    const onSelect = jest.fn();
    render(<SectionCard section={makeSection()} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('voting');
  });

  it('renders Explore affordance text', () => {
    render(<SectionCard section={makeSection()} onSelect={jest.fn()} />);
    expect(screen.getByText('Explore')).toBeInTheDocument();
  });

  it('renders as a button element for keyboard accessibility', () => {
    render(<SectionCard section={makeSection()} onSelect={jest.fn()} />);
    const button = screen.getByRole('button');
    expect(button.tagName).toBe('BUTTON');
  });

  it('renders no stats section when stats array is empty', () => {
    const section = makeSection({ stats: [] });
    render(<SectionCard section={section} onSelect={jest.fn()} />);
    expect(screen.queryByText('Votes Cast')).not.toBeInTheDocument();
  });
});
