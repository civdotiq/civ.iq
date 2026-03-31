/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RepresentativeDashboard, REPRESENTATIVE_SECTIONS } from './RepresentativeDashboard';
import { EnhancedRepresentative } from '@/types/representative';

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

// Mock all dynamic tab components
jest.mock('./ContactInfoTab', () => ({
  ContactInfoTab: () => <div data-testid="tab-overview">Overview content</div>,
}));

jest.mock('./VotingTab', () => ({
  VotingTab: () => <div data-testid="tab-voting">Voting content</div>,
  VoteResponse: {},
}));

jest.mock('./BillsTab', () => ({
  BillsTab: () => <div data-testid="tab-legislation">Bills content</div>,
  BillsResponse: {},
}));

jest.mock('@/features/campaign-finance/components/CampaignFinanceVisualizer', () => ({
  CampaignFinanceVisualizer: () => <div data-testid="tab-finance">Finance content</div>,
}));

jest.mock('./LobbyingTab', () => ({
  LobbyingTab: () => <div data-testid="tab-lobbying">Lobbying content</div>,
}));

jest.mock('@/components/intelligence/IntelligenceTab', () => ({
  IntelligenceTab: () => <div data-testid="tab-intelligence">Intelligence content</div>,
}));

jest.mock('@/features/news/components/ClusteredNewsSection', () => ({
  ClusteredNewsSection: () => <div data-testid="tab-news">News content</div>,
}));

jest.mock('./DistrictTab', () => ({
  DistrictTab: () => <div data-testid="tab-district">District content</div>,
}));

// Mock next/dynamic to bypass lazy loading in tests
jest.mock('next/dynamic', () => {
  return function mockDynamic(loader: () => Promise<{ default: React.ComponentType }>) {
    // Immediately resolve the dynamic import
    let Component: React.ComponentType | null = null;
    loader().then(mod => {
      Component = mod.default;
    });
    // Return a wrapper that renders the resolved component
    return function DynamicWrapper(props: Record<string, unknown>) {
      if (!Component) return <div>Loading...</div>;
      return <Component {...props} />;
    };
  };
});

const makeRepresentative = (): EnhancedRepresentative =>
  ({
    bioguideId: 'P000197',
    name: 'Nancy Pelosi',
    party: 'Democrat',
    chamber: 'House',
    state: 'CA',
    district: '11',
    committees: [{ name: 'Appropriations' }, { name: 'Intelligence' }],
    currentTerm: {
      start: '2023-01-03',
      end: '2025-01-03',
    },
  }) as unknown as EnhancedRepresentative;

const makeSummaryData = () => ({
  success: true,
  data: {
    billsSponsored: 12,
    billsCosponsored: 45,
    totalRaised: 2500000,
    totalSpent: 1800000,
    cashOnHand: 700000,
    votesParticipated: 312,
  },
});

describe('RepresentativeDashboard', () => {
  const defaultProps = {
    representative: makeRepresentative(),
    summaryData: makeSummaryData(),
    summaryLoading: false,
    batchData: undefined,
    batchLoading: false,
    batchError: undefined,
    committeeCodes: ['HSAP', 'HLIG'],
    activeSection: null as string | null,
    onSectionSelect: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 8 section cards', () => {
    render(<RepresentativeDashboard {...defaultProps} />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Voting Records')).toBeInTheDocument();
    expect(screen.getByText('Sponsored Bills')).toBeInTheDocument();
    expect(screen.getByText('Campaign Finance')).toBeInTheDocument();
    expect(screen.getByText('Lobbying')).toBeInTheDocument();
    expect(screen.getByText('Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Recent News')).toBeInTheDocument();
    expect(screen.getByText('District')).toBeInTheDocument();
  });

  it('has exactly 8 section IDs', () => {
    expect(REPRESENTATIVE_SECTIONS).toHaveLength(8);
  });

  it('displays summary stats on cards', () => {
    render(<RepresentativeDashboard {...defaultProps} />);
    expect(screen.getByText('312')).toBeInTheDocument(); // votesParticipated
    expect(screen.getByText('12')).toBeInTheDocument(); // billsSponsored
    expect(screen.getByText('45')).toBeInTheDocument(); // billsCosponsored
    expect(screen.getByText('$2.5M')).toBeInTheDocument(); // totalRaised
    expect(screen.getByText('$1.8M')).toBeInTheDocument(); // totalSpent
  });

  it('displays committee count and term range', () => {
    render(<RepresentativeDashboard {...defaultProps} />);
    expect(screen.getByText('2')).toBeInTheDocument(); // committees count
    expect(screen.getByText('2023\u20132025')).toBeInTheDocument(); // term range
  });

  it('clicking a card calls onSectionSelect', () => {
    render(<RepresentativeDashboard {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Click the second card (Voting Records)
    fireEvent.click(buttons[1]);
    expect(defaultProps.onSectionSelect).toHaveBeenCalledWith('voting');
  });

  it('renders drill-down when activeSection is set', () => {
    render(<RepresentativeDashboard {...defaultProps} activeSection="overview" />);
    // Should show back navigation
    expect(screen.getByText('All sections')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    // Cards should not be visible
    expect(screen.queryByText('Campaign Finance')).not.toBeInTheDocument();
  });

  it('back button in drill-down calls onBack', () => {
    render(<RepresentativeDashboard {...defaultProps} activeSection="finance" />);
    fireEvent.click(screen.getByText('All sections'));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows loading skeletons when summaryLoading', () => {
    const { container } = render(
      <RepresentativeDashboard {...defaultProps} summaryData={undefined} summaryLoading={true} />
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows em dash when summary data is unavailable', () => {
    render(
      <RepresentativeDashboard {...defaultProps} summaryData={undefined} summaryLoading={false} />
    );
    // Stats that depend on summary should show em dash
    const emDashes = screen.getAllByText('\u2014');
    expect(emDashes.length).toBeGreaterThan(0);
  });
});
