/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SectionDashboard } from './SectionDashboard';
import { SectionCardConfig } from './types';

// Mock ErrorBoundary to pass through children
jest.mock('@/components/shared/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock TabLoadingSpinner
jest.mock('@/lib/utils/code-splitting', () => ({
  TabLoadingSpinner: () => <div>Loading...</div>,
}));

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', { value: jest.fn() });

const makeSections = (): SectionCardConfig[] => [
  {
    id: 'overview',
    title: 'Profile',
    description: 'Personal details',
    icon: <span>O</span>,
    stats: [{ label: 'Committees', value: 3 }],
  },
  {
    id: 'voting',
    title: 'Voting Records',
    description: 'Voting history',
    icon: <span>V</span>,
    stats: [{ label: 'Votes', value: 142 }],
  },
  {
    id: 'finance',
    title: 'Campaign Finance',
    description: 'Fundraising data',
    icon: <span>F</span>,
    stats: [{ label: 'Raised', value: '$1.2M' }],
  },
];

describe('SectionDashboard', () => {
  const onSectionSelect = jest.fn();
  const onBack = jest.fn();
  const renderSection = jest.fn((id: string) => (
    <div data-testid={`section-${id}`}>Content for {id}</div>
  ));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders card grid when activeSection is null', () => {
    render(
      <SectionDashboard
        sections={makeSections()}
        activeSection={null}
        onSectionSelect={onSectionSelect}
        onBack={onBack}
        renderSection={renderSection}
      />
    );
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Voting Records')).toBeInTheDocument();
    expect(screen.getByText('Campaign Finance')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Section overview' })).toBeInTheDocument();
  });

  it('renders drill-down panel when activeSection is set', () => {
    render(
      <SectionDashboard
        sections={makeSections()}
        activeSection="voting"
        onSectionSelect={onSectionSelect}
        onBack={onBack}
        renderSection={renderSection}
      />
    );
    expect(screen.getByTestId('section-voting')).toBeInTheDocument();
    expect(screen.getByText('Content for voting')).toBeInTheDocument();
    expect(screen.getByText('All sections')).toBeInTheDocument();
    // Cards should not be visible in drill-down mode
    expect(screen.queryByText('Campaign Finance')).not.toBeInTheDocument();
  });

  it('calls onSectionSelect when a card is clicked', () => {
    render(
      <SectionDashboard
        sections={makeSections()}
        activeSection={null}
        onSectionSelect={onSectionSelect}
        onBack={onBack}
        renderSection={renderSection}
      />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Click "Voting Records"
    expect(onSectionSelect).toHaveBeenCalledWith('voting');
  });

  it('calls onBack when back button is clicked in drill-down', () => {
    render(
      <SectionDashboard
        sections={makeSections()}
        activeSection="finance"
        onSectionSelect={onSectionSelect}
        onBack={onBack}
        renderSection={renderSection}
      />
    );
    fireEvent.click(screen.getByText('All sections'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('uses section title in drill-down header', () => {
    render(
      <SectionDashboard
        sections={makeSections()}
        activeSection="finance"
        onSectionSelect={onSectionSelect}
        onBack={onBack}
        renderSection={renderSection}
      />
    );
    expect(screen.getByText('Campaign Finance')).toBeInTheDocument();
  });
});
