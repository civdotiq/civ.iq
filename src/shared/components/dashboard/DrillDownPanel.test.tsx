/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DrillDownPanel } from './DrillDownPanel';

// Mock ErrorBoundary to pass through children
jest.mock('@/components/shared/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock TabLoadingSpinner
jest.mock('@/lib/utils/code-splitting', () => ({
  TabLoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Mock window.scrollTo
const scrollToSpy = jest.fn();
Object.defineProperty(window, 'scrollTo', { value: scrollToSpy });

describe('DrillDownPanel', () => {
  const onBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders back button and section title', () => {
    render(
      <DrillDownPanel sectionTitle="Voting Records" onBack={onBack}>
        <div>Content</div>
      </DrillDownPanel>
    );
    expect(screen.getByText('All sections')).toBeInTheDocument();
    expect(screen.getByText('Voting Records')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(
      <DrillDownPanel sectionTitle="Voting Records" onBack={onBack}>
        <div>Content</div>
      </DrillDownPanel>
    );
    fireEvent.click(screen.getByText('All sections'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders children', () => {
    render(
      <DrillDownPanel sectionTitle="Finance" onBack={onBack}>
        <div data-testid="section-content">Campaign finance data</div>
      </DrillDownPanel>
    );
    expect(screen.getByTestId('section-content')).toBeInTheDocument();
  });

  it('scrolls to top on mount', () => {
    render(
      <DrillDownPanel sectionTitle="Voting Records" onBack={onBack}>
        <div>Content</div>
      </DrillDownPanel>
    );
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('has correct aria-label on back button', () => {
    render(
      <DrillDownPanel sectionTitle="Voting Records" onBack={onBack}>
        <div>Content</div>
      </DrillDownPanel>
    );
    expect(screen.getByLabelText('Back to all sections')).toBeInTheDocument();
  });

  it('has a region role with section title', () => {
    render(
      <DrillDownPanel sectionTitle="Voting Records" onBack={onBack}>
        <div>Content</div>
      </DrillDownPanel>
    );
    expect(screen.getByRole('region', { name: 'Voting Records' })).toBeInTheDocument();
  });
});
