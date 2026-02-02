/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoteRow, extractVoteId, type Vote } from '@/features/representatives/components/VoteRow';

const mockVote: Vote = {
  voteId: 'house-119-116',
  bill: {
    number: 'H.R. 123',
    title: 'Test Bill Title',
    congress: '119',
    type: 'HR',
    url: 'https://congress.gov/bill/119/hr123',
  },
  question: 'On Passage',
  result: 'Passed',
  date: '2024-01-15',
  position: 'Yea',
  chamber: 'House',
  rollNumber: 116,
  description: 'A test bill description',
  category: 'key',
  isKeyVote: true,
};

describe('VoteRow', () => {
  const mockOnVoteClick = jest.fn();

  beforeEach(() => {
    mockOnVoteClick.mockClear();
  });

  it('renders vote information correctly', () => {
    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    expect(screen.getByText('116')).toBeInTheDocument();
    expect(screen.getByText('On Passage')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Yea')).toBeInTheDocument();
    expect(screen.getByText('H.R. 123')).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    expect(screen.getByText('01/15/2024')).toBeInTheDocument();
  });

  it('calls onVoteClick when clicked if clickable', async () => {
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    const row = screen.getByRole('button');
    await user.click(row);

    expect(mockOnVoteClick).toHaveBeenCalledTimes(1);
    expect(mockOnVoteClick).toHaveBeenCalledWith(mockVote);
  });

  it('does not call onVoteClick when not clickable', async () => {
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={false} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    const rows = screen.getAllByRole('row');
    await user.click(rows[0]);

    expect(mockOnVoteClick).not.toHaveBeenCalled();
  });

  it('handles Enter key press for navigation', async () => {
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    const row = screen.getByRole('button');
    row.focus();
    await user.keyboard('{Enter}');

    expect(mockOnVoteClick).toHaveBeenCalledTimes(1);
  });

  it('handles Space key press for navigation', async () => {
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    const row = screen.getByRole('button');
    row.focus();
    await user.keyboard(' ');

    expect(mockOnVoteClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct styling for Yea position', () => {
    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    const badge = screen.getByText('Yea');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('applies correct styling for Nay position', () => {
    const nayVote = { ...mockVote, position: 'Nay' as const };

    render(
      <table>
        <tbody>
          <VoteRow vote={nayVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    const badge = screen.getByText('Nay');
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('applies correct styling for Present position', () => {
    const presentVote = { ...mockVote, position: 'Present' as const };

    render(
      <table>
        <tbody>
          <VoteRow vote={presentVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    const badge = screen.getByText('Present');
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('applies key vote highlighting', () => {
    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    const row = screen.getByRole('button');
    expect(row).toHaveClass('bg-yellow-50');
  });

  it('alternates row background color', () => {
    const nonKeyVote = { ...mockVote, isKeyVote: false };

    const { rerender } = render(
      <table>
        <tbody>
          <VoteRow vote={nonKeyVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    let row = screen.getByRole('button');
    expect(row).toHaveClass('bg-white');

    rerender(
      <table>
        <tbody>
          <VoteRow vote={nonKeyVote} index={1} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    row = screen.getByRole('button');
    expect(row).toHaveClass('bg-white/50');
  });

  it('includes ARIA attributes when clickable', () => {
    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    const row = screen.getByRole('button');
    expect(row).toHaveAttribute('tabIndex', '0');
    expect(row).toHaveAttribute('aria-label');
  });

  it('does not have button role when not clickable', () => {
    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={false} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders bill link that opens in new tab', () => {
    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    const link = screen.getByRole('link', { name: /H\.R\. 123/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('stops propagation when bill link clicked', async () => {
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <VoteRow vote={mockVote} index={0} isClickable={true} onVoteClick={mockOnVoteClick} />
        </tbody>
      </table>
    );

    const link = screen.getByRole('link', { name: /H\.R\. 123/i });
    await user.click(link);

    // onVoteClick should NOT be called when clicking the bill link
    expect(mockOnVoteClick).not.toHaveBeenCalled();
  });
});

describe('extractVoteId', () => {
  it('returns voteId for House votes', () => {
    const houseVote: Vote = {
      ...mockVote,
      chamber: 'House',
      voteId: 'house-119-116',
    };
    expect(extractVoteId(houseVote)).toBe('house-119-116');
  });

  it('extracts numeric part from Senate voteId', () => {
    const senateVote: Vote = {
      ...mockVote,
      chamber: 'Senate',
      voteId: '119-senate-00123',
    };
    expect(extractVoteId(senateVote)).toBe('00123');
  });

  it('falls back to rollNumber for Senate votes without proper voteId', () => {
    const senateVote: Vote = {
      ...mockVote,
      chamber: 'Senate',
      voteId: '',
      rollNumber: 456,
    };
    expect(extractVoteId(senateVote)).toBe('456');
  });

  it('returns null when voteId is empty and no rollNumber', () => {
    const vote: Vote = {
      ...mockVote,
      voteId: '',
      rollNumber: 0,
    };
    expect(extractVoteId(vote)).toBeNull();
  });
});
