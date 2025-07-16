/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TradingCardSharePanel } from '../TradingCardSharePanel';
import { EnhancedRepresentative } from '@/types/representative';
import * as socialSharing from '@/lib/socialSharing';

// Mock the socialSharing module
jest.mock('@/lib/socialSharing', () => ({
  generateShareUrl: jest.fn(),
  openShareWindow: jest.fn(),
  copyImageToClipboard: jest.fn(),
  copyTextToClipboard: jest.fn(),
  generateShareText: jest.fn()
}));

// Mock window methods
const mockOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true
});

// window.location is already defined in jsdom
// Just access it directly in tests

const mockRepresentative: EnhancedRepresentative = {
  bioguideId: 'S001234',
  name: 'Jane Smith',
  firstName: 'Jane',
  lastName: 'Smith',
  party: 'Democrat',
  state: 'CA',
  district: '12',
  chamber: 'House',
  title: 'U.S. Representative'
};

const mockStats = [
  {
    label: 'Bills Sponsored',
    value: '42',
    icon: '📜',
    color: '#dc2626',
    description: 'Total bills sponsored'
  },
  {
    label: 'Party Support',
    value: '87%',
    icon: '🎯',
    color: '#059669',
    description: 'Party alignment'
  }
];

describe('TradingCardSharePanel', () => {
  const mockOnClose = jest.fn();
  const mockBlob = new Blob(['mock image data'], { type: 'image/png' });

  beforeEach(() => {
    jest.clearAllMocks();
    (socialSharing.generateShareUrl as jest.Mock).mockReturnValue({
      success: true,
      url: 'https://twitter.com/share'
    });
    (socialSharing.generateShareText as jest.Mock).mockReturnValue('Mock share text');
  });

  it('renders all social share buttons', () => {
    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        imageBlob={mockBlob}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Share Trading Card')).toBeInTheDocument();
    expect(screen.getByText('Share on X')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('opens share window for Twitter', () => {
    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        imageBlob={mockBlob}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Share on X'));

    expect(socialSharing.generateShareUrl).toHaveBeenCalledWith({
      representative: mockRepresentative,
      stats: mockStats,
      platform: 'twitter',
      imageUrl: undefined
    });
    expect(socialSharing.openShareWindow).toHaveBeenCalledWith(
      'https://twitter.com/share',
      'twitter'
    );
  });

  it('opens share window for Facebook', () => {
    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        imageBlob={mockBlob}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Facebook'));

    expect(socialSharing.generateShareUrl).toHaveBeenCalledWith({
      representative: mockRepresentative,
      stats: mockStats,
      platform: 'facebook',
      imageUrl: undefined
    });
    expect(socialSharing.openShareWindow).toHaveBeenCalledWith(
      'https://twitter.com/share',
      'facebook'
    );
  });

  it('handles email share by changing location', () => {
    const mailtoUrl = 'mailto:?subject=Test';
    (socialSharing.generateShareUrl as jest.Mock).mockReturnValue({
      success: true,
      url: mailtoUrl
    });

    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        imageBlob={mockBlob}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Email'));

    expect(socialSharing.generateShareUrl).toHaveBeenCalledWith({
      representative: mockRepresentative,
      stats: mockStats,
      platform: 'email',
      imageUrl: undefined
    });
    // Note: window.location.href assignment is not testable in jsdom
    // We've verified the function is called with correct params
  });

  it('copies image to clipboard when button clicked', async () => {
    (socialSharing.copyImageToClipboard as jest.Mock).mockResolvedValue(true);

    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        imageBlob={mockBlob}
        onClose={mockOnClose}
      />
    );

    const copyImageButton = screen.getByText('Copy Image to Clipboard');
    fireEvent.click(copyImageButton);

    await waitFor(() => {
      expect(screen.getByText('Image copied!')).toBeInTheDocument();
    });

    expect(socialSharing.copyImageToClipboard).toHaveBeenCalledWith(mockBlob);
  });

  it('shows error when image copy fails', async () => {
    (socialSharing.copyImageToClipboard as jest.Mock).mockResolvedValue(false);

    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        imageBlob={mockBlob}
        onClose={mockOnClose}
      />
    );

    const copyImageButton = screen.getByText('Copy Image to Clipboard');
    fireEvent.click(copyImageButton);

    await waitFor(() => {
      expect(screen.getByText('Copy failed')).toBeInTheDocument();
    });
  });

  it('copies share link when button clicked', async () => {
    (socialSharing.copyTextToClipboard as jest.Mock).mockResolvedValue(true);

    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        imageBlob={mockBlob}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Copy Share Link'));

    await waitFor(() => {
      expect(screen.getByText('Link copied!')).toBeInTheDocument();
    });

    expect(socialSharing.generateShareText).toHaveBeenCalledWith(
      mockRepresentative,
      mockStats,
      'twitter'
    );
    expect(socialSharing.copyTextToClipboard).toHaveBeenCalled();
  });

  it('shows attribution text', () => {
    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        imageBlob={mockBlob}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Trading cards powered by CIV.IQ - Your Civic Intelligence Hub')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        imageBlob={mockBlob}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not show close button when onClose not provided', () => {
    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        imageBlob={mockBlob}
      />
    );

    const closeButtons = screen.queryAllByRole('button');
    // Should only have the share buttons, not the close button
    expect(closeButtons).toHaveLength(6); // 4 social + 2 copy buttons
  });

  it('does not show copy image button when no blob provided', () => {
    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Copy Image to Clipboard')).not.toBeInTheDocument();
  });

  it('handles share error gracefully', () => {
    (socialSharing.generateShareUrl as jest.Mock).mockReturnValue({
      success: false,
      error: 'Network error'
    });

    render(
      <TradingCardSharePanel
        representative={mockRepresentative}
        stats={mockStats}
        imageBlob={mockBlob}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Share on X'));

    expect(screen.getByText('Failed to share: Network error')).toBeInTheDocument();
  });
});