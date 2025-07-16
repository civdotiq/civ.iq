/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TradingCardGenerator } from '../TradingCardGenerator';
import { EnhancedRepresentative } from '@/types/representative';

// Mock the entire cardGenerator module
jest.mock('@/lib/cardGenerator', () => ({
  generateCardImage: jest.fn(),
  downloadCardImage: jest.fn(),
  generateCardFilename: jest.fn(),
  checkBrowserSupport: jest.fn(),
  optimizeElementForGeneration: jest.fn(),
}));

// Mock html2canvas
jest.mock('html2canvas', () => {
  return jest.fn().mockResolvedValue({
    width: 640,
    height: 1000,
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockImageData'),
    toBlob: jest.fn().mockImplementation((callback) => {
      const mockBlob = new Blob(['mock image data'], { type: 'image/png' });
      callback(mockBlob);
    })
  });
});

// Mock the RepresentativePhoto component
jest.mock('../RepresentativePhoto', () => {
  return function MockRepresentativePhoto({ name, bioguideId }: { name: string; bioguideId: string }) {
    return <div data-testid="representative-photo">{name} - {bioguideId}</div>;
  };
});

// Mock navigator.share
const mockShare = jest.fn();
Object.defineProperty(navigator, 'share', {
  value: mockShare,
  writable: true,
});

Object.defineProperty(navigator, 'canShare', {
  value: jest.fn().mockReturnValue(true),
  writable: true,
});

// Mock clipboard
const mockClipboard = {
  write: jest.fn().mockResolvedValue(undefined)
};
Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn().mockReturnValue('mock-blob-url'),
  writable: true,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
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
    { name: 'Committee on Armed Services', role: 'Member' }
  ]
};

const mockStats = [
  {
    label: 'Party Support',
    value: '87%',
    icon: '🎯',
    color: '#059669',
    description: 'Percentage of votes aligned with party position'
  },
  {
    label: 'Bills Sponsored',
    value: '42',
    icon: '📜',
    color: '#dc2626',
    description: 'Total number of bills sponsored'
  }
];

// Import the mocked functions after mock is defined
import * as cardGenerator from '@/lib/cardGenerator';

const mockGenerateCardImage = cardGenerator.generateCardImage as jest.MockedFunction<typeof cardGenerator.generateCardImage>;
const mockDownloadCardImage = cardGenerator.downloadCardImage as jest.MockedFunction<typeof cardGenerator.downloadCardImage>;
const mockGenerateCardFilename = cardGenerator.generateCardFilename as jest.MockedFunction<typeof cardGenerator.generateCardFilename>;
const mockCheckBrowserSupport = cardGenerator.checkBrowserSupport as jest.MockedFunction<typeof cardGenerator.checkBrowserSupport>;

describe('TradingCardGenerator', () => {
  const mockOnClose = jest.fn();
  const mockOnGenerated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockCheckBrowserSupport.mockReturnValue({
      supported: true,
      features: {
        canvas: true,
        html2canvas: true,
        download: true,
        highDPI: true
      }
    });
    
    mockGenerateCardFilename.mockReturnValue('john-smith-trading-card-2025-01-16.png');
  });

  it('does not render when isOpen is false', () => {
    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={false}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    expect(screen.queryByText('Generate Trading Card')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    expect(screen.getByText('Generate Trading Card')).toBeInTheDocument();
    expect(screen.getByText('Create and download your card for John Smith')).toBeInTheDocument();
  });

  it('displays card preview', () => {
    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    expect(screen.getByText('Card Preview')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('displays selected stats summary', () => {
    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    expect(screen.getByText('Selected Stats')).toBeInTheDocument();
    expect(screen.getAllByText('Party Support')).toHaveLength(2); // One in card, one in stats
    expect(screen.getAllByText('87%')).toHaveLength(2); // One in card, one in stats
    expect(screen.getAllByText('Bills Sponsored')).toHaveLength(2); // One in card, one in stats
    expect(screen.getAllByText('42')).toHaveLength(2); // One in card, one in stats
  });

  it('shows browser support information', () => {
    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    expect(screen.getByText('Browser Support')).toBeInTheDocument();
    expect(screen.getByText('Canvas Support')).toBeInTheDocument();
    expect(screen.getByText('Download Support')).toBeInTheDocument();
  });

  it('generates card when generate button is clicked', async () => {
    mockGenerateCardImage.mockResolvedValue({
      success: true,
      canvas: document.createElement('canvas'),
      dataUrl: 'data:image/png;base64,mockImageData',
      blob: new Blob(['mock'], { type: 'image/png' }),
      metadata: {
        width: 640,
        height: 1000,
        scale: 2,
        format: 'png',
        fileSize: 1024,
        generationTime: 100
      }
    });

    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    const generateButton = screen.getByText('Generate Card');
    fireEvent.click(generateButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    // Check success state
    await waitFor(() => {
      expect(screen.getByText('Card generated successfully!')).toBeInTheDocument();
    });

    expect(mockGenerateCardImage).toHaveBeenCalled();
    expect(mockOnGenerated).toHaveBeenCalled();
  });

  it('handles generation errors gracefully', async () => {
    mockGenerateCardImage.mockResolvedValue({
      success: false,
      error: 'Test error message'
    });

    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    const generateButton = screen.getByText('Generate Card');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Generation failed')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    expect(mockGenerateCardImage).toHaveBeenCalled();
  });

  it('shows download button after successful generation', async () => {
    mockGenerateCardImage.mockResolvedValue({
      success: true,
      canvas: document.createElement('canvas'),
      dataUrl: 'data:image/png;base64,mockImageData',
      blob: new Blob(['mock'], { type: 'image/png' }),
      metadata: {
        width: 640,
        height: 1000,
        scale: 2,
        format: 'png',
        fileSize: 1024,
        generationTime: 100
      }
    });

    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    const generateButton = screen.getByText('Generate Card');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
    });
  });

  it('triggers download when download button is clicked', async () => {
    mockDownloadCardImage.mockImplementation(() => {});

    mockGenerateCardImage.mockResolvedValue({
      success: true,
      canvas: document.createElement('canvas'),
      dataUrl: 'data:image/png;base64,mockImageData',
      blob: new Blob(['mock'], { type: 'image/png' }),
      metadata: {
        width: 640,
        height: 1000,
        scale: 2,
        format: 'png',
        fileSize: 1024,
        generationTime: 100
      }
    });

    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    // Generate card first
    const generateButton = screen.getByText('Generate Card');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Download')).toBeInTheDocument();
    });

    // Click download
    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);

    expect(mockDownloadCardImage).toHaveBeenCalled();
  });

  it('attempts to share when share button is clicked', async () => {
    mockGenerateCardImage.mockResolvedValue({
      success: true,
      canvas: document.createElement('canvas'),
      dataUrl: 'data:image/png;base64,mockImageData',
      blob: new Blob(['mock'], { type: 'image/png' }),
      metadata: {
        width: 640,
        height: 1000,
        scale: 2,
        format: 'png',
        fileSize: 1024,
        generationTime: 100
      }
    });

    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    // Generate card first
    const generateButton = screen.getByText('Generate Card');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    // Click share
    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);

    // Should attempt to use native share if available
    expect(mockShare).toHaveBeenCalled();
  });

  it('closes when close button is clicked', () => {
    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    fireEvent.click(screen.getByText('×'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes when close button in footer is clicked', () => {
    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    fireEvent.click(screen.getByText('Close'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows generation progress messages', async () => {
    // Mock a slow generation to test progress messages
    mockGenerateCardImage.mockImplementation(async () => {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        success: true,
        canvas: document.createElement('canvas'),
        dataUrl: 'data:image/png;base64,mockImageData',
        blob: new Blob(['mock'], { type: 'image/png' }),
        metadata: {
          width: 640,
          height: 1000,
          scale: 2,
          format: 'png',
          fileSize: 1024,
          generationTime: 100
        }
      };
    });

    render(
      <TradingCardGenerator
        representative={mockRepresentative}
        stats={mockStats}
        isOpen={true}
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    const generateButton = screen.getByText('Generate Card');
    fireEvent.click(generateButton);

    // Should show progress messages
    await waitFor(() => {
      expect(screen.getByText(/Generating/)).toBeInTheDocument();
    });
  });
});