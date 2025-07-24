/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TradingCardModal } from '../TradingCardModal';
import { EnhancedRepresentative } from '@/types/representative';

// Mock the RepresentativePhoto component
jest.mock('../RepresentativePhoto', () => {
  return function MockRepresentativePhoto({ name, bioguideId }: { name: string; bioguideId: string }) {
    return <div data-testid="representative-photo">{name} - {bioguideId}</div>;
  };
});

const mockRepresentative: EnhancedRepresentative = {
  bioguideId: 'C001118',
  name: 'John Smith',
  firstName: 'John',
  lastName: 'Smith',
  party: 'Republican',
  state: 'MI',
  district: '12',
  chamber: 'House',
  title: 'U.S. Representative',
  terms: [
    { congress: '119', startYear: '2025', endYear: '2027' }
  ],
  committees: [
    { name: 'Committee on Armed Services', role: 'Member' },
    { name: 'Committee on Transportation', role: 'Ranking Member' }
  ]
};

const mockAdditionalData = {
  votes: [
    { position: 'Yea', bill: 'H.R. 1' },
    { position: 'Nay', bill: 'H.R. 2' },
    { position: 'Not Voting', bill: 'H.R. 3' }
  ],
  bills: [
    { title: 'Sample Bill 1', cosponsors: ['A001', 'B002'] },
    { title: 'Sample Bill 2', cosponsors: [] }
  ],
  finance: { totalRaised: 1200000 },
  news: [
    { title: 'News 1' },
    { title: 'News 2' }
  ],
  partyAlignment: { partySupport: 87.5 }
};

describe('TradingCardModal', () => {
  const mockOnClose = jest.fn();
  const mockOnGenerate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={false}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
      />
    );

    expect(screen.queryByText('Create Trading Card')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
      />
    );

    expect(screen.getByText('Create Trading Card')).toBeInTheDocument();
    expect(screen.getByText('Choose up to 5 stats to display for John Smith')).toBeInTheDocument();
  });

  it('displays all four categories', () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
      />
    );

    expect(screen.getByText('Legislative')).toBeInTheDocument();
    expect(screen.getByText('Political')).toBeInTheDocument();
    expect(screen.getByText('Demographics')).toBeInTheDocument();
    expect(screen.getByText('Engagement')).toBeInTheDocument();
  });

  it('switches categories when clicked', () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
      />
    );

    // Initially shows Legislative category
    expect(screen.getByText('Bills Sponsored')).toBeInTheDocument();

    // Click on Political category
    fireEvent.click(screen.getByText('Political'));

    // Should show Political stats
    expect(screen.getByText('Party Support')).toBeInTheDocument();
    expect(screen.getByText('Voting Attendance')).toBeInTheDocument();
  });

  it('enforces 5-stat maximum limit', async () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        additionalData={mockAdditionalData}
      />
    );

    // Select 5 stats
    const checkboxes = screen.getAllByRole('checkbox');
    for (let i = 0; i < 5; i++) {
      fireEvent.click(checkboxes[i]);
    }

    await waitFor(() => {
      expect(screen.getByText('5/5')).toBeInTheDocument();
    });

    // The 6th checkbox should be disabled
    expect(checkboxes[5]).toBeDisabled();
  });

  it('shows selection counter', () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
      />
    );

    expect(screen.getByText('0/5')).toBeInTheDocument();
  });

  it('enables Generate button when stats are selected', async () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
      />
    );

    const generateButton = screen.getByText('Generate Card');
    expect(generateButton).toBeDisabled();

    // Select one stat
    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstCheckbox);

    await waitFor(() => {
      expect(generateButton).not.toBeDisabled();
    });
  });

  it('calls onGenerate with selected stats', async () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        additionalData={mockAdditionalData}
      />
    );

    // Select first stat
    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstCheckbox);

    await waitFor(() => {
      const generateButton = screen.getByText('Generate Card');
      expect(generateButton).not.toBeDisabled();
    });

    // Click generate
    fireEvent.click(screen.getByText('Generate Card'));

    expect(mockOnGenerate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          label: expect.any(String),
          value: expect.any(String),
          icon: expect.any(String),
          color: expect.any(String),
          description: expect.any(String)
        })
      ])
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
      />
    );

    fireEvent.click(screen.getByText('×'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows live preview when stats are selected', async () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
      />
    );

    // Initially shows placeholder
    expect(screen.getByText('Select stats to see preview')).toBeInTheDocument();

    // Select first stat
    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstCheckbox);

    // Should show preview card
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  it('displays stat values from additional data', () => {
    render(
      <TradingCardModal
        representative={mockRepresentative}
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        additionalData={mockAdditionalData}
      />
    );

    // Switch to Political category to see Party Support
    fireEvent.click(screen.getByText('Political'));

    // Should show calculated party support from additional data
    expect(screen.getByText('88%')).toBeInTheDocument(); // Math.round(87.5)
  });
});