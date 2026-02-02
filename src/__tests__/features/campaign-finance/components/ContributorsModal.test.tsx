/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ContributorsModal,
  type Contributor,
  type ContributorMetadata,
} from '@/features/campaign-finance/components/ContributorsModal';

const mockContributors: Contributor[] = [
  {
    name: 'John Doe',
    totalAmount: 5000,
    contributionCount: 3,
    city: 'Minneapolis',
    state: 'MN',
    employer: 'Tech Corp',
    occupation: 'Software Engineer',
    fecTransparencyLink: 'https://www.fec.gov/data/receipts/?contributor_name=John+Doe',
  },
  {
    name: 'Jane Smith',
    totalAmount: 2500,
    contributionCount: 1,
    city: 'St. Paul',
    state: 'MN',
    employer: 'Healthcare Inc',
    occupation: 'Nurse',
  },
];

const mockMetadata: ContributorMetadata = {
  fecCandidateLink: 'https://www.fec.gov/data/candidate/H6MN05049',
  fecCommitteeId: 'C00123456',
  fecReceiptsLink: 'https://www.fec.gov/data/receipts/?committee_id=C00123456',
  totalIndividualContributors: 150,
  totalCommitteeContributors: 10,
};

describe('ContributorsModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders nothing when closed', () => {
    render(
      <ContributorsModal
        isOpen={false}
        onClose={mockOnClose}
        contributors={mockContributors}
        metadata={mockMetadata}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    render(
      <ContributorsModal
        isOpen={true}
        onClose={mockOnClose}
        contributors={mockContributors}
        metadata={mockMetadata}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('All Individual Contributors')).toBeInTheDocument();
  });

  it('displays contributor count in header', () => {
    render(
      <ContributorsModal
        isOpen={true}
        onClose={mockOnClose}
        contributors={mockContributors}
        metadata={mockMetadata}
      />
    );

    expect(screen.getByText(/Showing 2 of 150/)).toBeInTheDocument();
  });

  it('renders contributor information correctly', () => {
    render(
      <ContributorsModal
        isOpen={true}
        onClose={mockOnClose}
        contributors={mockContributors}
        metadata={mockMetadata}
      />
    );

    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
    expect(screen.getByText(/Minneapolis, MN/)).toBeInTheDocument();
    expect(screen.getByText(/Tech Corp/)).toBeInTheDocument();
    expect(screen.getByText('3 contributions')).toBeInTheDocument();

    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText('$2,500')).toBeInTheDocument();
    expect(screen.getByText('1 contribution')).toBeInTheDocument();
  });

  it('renders FEC transparency link when available', () => {
    render(
      <ContributorsModal
        isOpen={true}
        onClose={mockOnClose}
        contributors={mockContributors}
        metadata={mockMetadata}
      />
    );

    const fecLinks = screen.getAllByText('View on FEC.gov →');
    expect(fecLinks).toHaveLength(1); // Only John Doe has a link
    expect(fecLinks[0]).toHaveAttribute('target', '_blank');
    expect(fecLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();

    render(
      <ContributorsModal
        isOpen={true}
        onClose={mockOnClose}
        contributors={mockContributors}
        metadata={mockMetadata}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close modal/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop clicked', async () => {
    const user = userEvent.setup();

    render(
      <ContributorsModal
        isOpen={true}
        onClose={mockOnClose}
        contributors={mockContributors}
        metadata={mockMetadata}
      />
    );

    const backdrop = screen.getByRole('dialog');
    await user.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content clicked', async () => {
    const user = userEvent.setup();

    render(
      <ContributorsModal
        isOpen={true}
        onClose={mockOnClose}
        contributors={mockContributors}
        metadata={mockMetadata}
      />
    );

    const modalContent = screen.getByText('All Individual Contributors');
    await user.click(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key pressed', () => {
    render(
      <ContributorsModal
        isOpen={true}
        onClose={mockOnClose}
        contributors={mockContributors}
        metadata={mockMetadata}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('has proper ARIA attributes', () => {
    render(
      <ContributorsModal
        isOpen={true}
        onClose={mockOnClose}
        contributors={mockContributors}
        metadata={mockMetadata}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'contributors-modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'contributors-modal-description');
  });

  it('renders empty state when no contributors', () => {
    render(
      <ContributorsModal
        isOpen={true}
        onClose={mockOnClose}
        contributors={[]}
        metadata={mockMetadata}
      />
    );

    expect(screen.getByText('No contributors to display')).toBeInTheDocument();
  });

  it('renders FEC receipts link in footer when available', () => {
    render(
      <ContributorsModal
        isOpen={true}
        onClose={mockOnClose}
        contributors={mockContributors}
        metadata={mockMetadata}
      />
    );

    const footerLink = screen.getByText('View all contributions on FEC.gov →');
    expect(footerLink).toHaveAttribute('target', '_blank');
    expect(footerLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(footerLink).toHaveAttribute(
      'href',
      'https://www.fec.gov/data/receipts/?committee_id=C00123456'
    );
  });

  it('handles undefined contributors gracefully', () => {
    render(<ContributorsModal isOpen={true} onClose={mockOnClose} metadata={mockMetadata} />);

    expect(screen.getByText('No contributors to display')).toBeInTheDocument();
  });

  it('handles undefined metadata gracefully', () => {
    render(
      <ContributorsModal isOpen={true} onClose={mockOnClose} contributors={mockContributors} />
    );

    expect(screen.getByText(/Showing 2 of 0/)).toBeInTheDocument();
  });
});
