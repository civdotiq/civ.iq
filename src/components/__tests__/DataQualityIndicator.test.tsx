/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataQualityIndicator, ErrorState, DataSourceBadge } from '../DataQualityIndicator';

describe('DataQualityIndicator', () => {
  it('renders with valid props', () => {
    render(
      <DataQualityIndicator
        quality="high"
        source="congress-legislators"
        freshness="Retrieved in 150ms"
      />
    );
    
    expect(screen.getByText('High Quality')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders fallback when props are missing', () => {
    render(<DataQualityIndicator />);
    
    expect(screen.getByText('Unknown Quality')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders fallback when quality is missing', () => {
    render(<DataQualityIndicator source="test" />);
    
    expect(screen.getByText('Unknown Quality')).toBeInTheDocument();
  });

  it('renders fallback when source is missing', () => {
    render(<DataQualityIndicator quality="high" />);
    
    expect(screen.getByText('Unknown Quality')).toBeInTheDocument();
  });

  it('handles different quality levels', () => {
    const { rerender } = render(
      <DataQualityIndicator quality="medium" source="test" />
    );
    
    expect(screen.getByText('Medium Quality')).toBeInTheDocument();
    expect(screen.getByText('⚠')).toBeInTheDocument();
    
    rerender(<DataQualityIndicator quality="low" source="test" />);
    expect(screen.getByText('Low Quality')).toBeInTheDocument();
    expect(screen.getByText('!')).toBeInTheDocument();
    
    rerender(<DataQualityIndicator quality="unavailable" source="test" />);
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('renders with valid props', () => {
    const error = {
      code: 'DISTRICT_NOT_FOUND',
      message: 'District not found',
      details: 'Additional details'
    };
    
    const metadata = {
      timestamp: '2025-01-16T12:00:00Z',
      zipCode: '12345',
      dataQuality: 'unavailable' as const,
      dataSource: 'test',
      cacheable: false,
      freshness: 'Retrieved in 100ms'
    };
    
    render(<ErrorState error={error} metadata={metadata} />);
    
    expect(screen.getByText('District not found')).toBeInTheDocument();
    expect(screen.getByText('Additional details')).toBeInTheDocument();
    expect(screen.getByText('Error Code: DISTRICT_NOT_FOUND')).toBeInTheDocument();
  });

  it('renders fallback when props are missing', () => {
    render(<ErrorState />);
    
    expect(screen.getByText('Unknown Error')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
  });

  it('renders fallback when error is missing', () => {
    const metadata = {
      timestamp: '2025-01-16T12:00:00Z',
      zipCode: '12345',
      dataQuality: 'unavailable' as const,
      dataSource: 'test',
      cacheable: false
    };
    
    render(<ErrorState metadata={metadata} />);
    
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    expect(screen.getByText('Error Code: UNKNOWN_ERROR')).toBeInTheDocument();
  });

  it('renders fallback when metadata is missing', () => {
    const error = {
      code: 'TEST_ERROR',
      message: 'Test error message'
    };
    
    render(<ErrorState error={error} />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Error Code: TEST_ERROR')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    
    render(<ErrorState onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('DataSourceBadge', () => {
  it('renders with valid props', () => {
    render(<DataSourceBadge source="congress-legislators" />);
    
    expect(screen.getByText('Congress Data')).toBeInTheDocument();
    expect(screen.getByText('🏛️')).toBeInTheDocument();
  });

  it('renders fallback when source is missing', () => {
    render(<DataSourceBadge />);
    
    expect(screen.getByText('Unknown Source')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('shows trust level when requested', () => {
    render(<DataSourceBadge source="congress-legislators" showTrustLevel={true} />);
    
    expect(screen.getByText('(95% trust)')).toBeInTheDocument();
  });

  it('shows trust level for unknown source', () => {
    render(<DataSourceBadge showTrustLevel={true} />);
    
    expect(screen.getByText('(0% trust)')).toBeInTheDocument();
  });

  it('handles different source types', () => {
    const { rerender } = render(<DataSourceBadge source="census" />);
    expect(screen.getByText('Census Data')).toBeInTheDocument();
    
    rerender(<DataSourceBadge source="congress.gov" />);
    expect(screen.getByText('Congress.gov')).toBeInTheDocument();
    
    rerender(<DataSourceBadge source="fec" />);
    expect(screen.getByText('FEC Data')).toBeInTheDocument();
    
    rerender(<DataSourceBadge source="mock" />);
    expect(screen.getByText('Test Data')).toBeInTheDocument();
    
    rerender(<DataSourceBadge source="error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});