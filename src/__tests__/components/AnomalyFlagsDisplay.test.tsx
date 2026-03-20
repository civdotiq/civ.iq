/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import { AnomalyFlagsDisplay } from '@/components/intelligence/AnomalyFlagsDisplay';
import type { AnomalyResult } from '@civiq/civic-statistics';

const makeAnomalyResult = (overrides?: Partial<AnomalyResult>): AnomalyResult => ({
  overallScore: 4.2,
  flags: [
    {
      dimension: 'Defense',
      value: 340_000,
      peerMedian: 81_000,
      modifiedZScore: 4.2,
      isAnomaly: true,
      description: '4.2x the peer median (Modified Z-Score: 4.2)',
    },
    {
      dimension: 'Health',
      value: 210_000,
      peerMedian: 68_000,
      modifiedZScore: 3.1,
      isAnomaly: true,
      description: '3.1x the peer median (Modified Z-Score: 3.1)',
    },
    {
      dimension: 'Energy/Natural Resources',
      value: 50_000,
      peerMedian: 45_000,
      modifiedZScore: 0.8,
      isAnomaly: false,
      description: 'Within normal range',
    },
  ],
  hasAnomalies: true,
  method: 'modified-z-score',
  threshold: 3.5,
  meetsMinimumPeers: true,
  ...overrides,
});

describe('AnomalyFlagsDisplay', () => {
  it('renders anomaly flags with plain language', () => {
    render(<AnomalyFlagsDisplay anomalies={makeAnomalyResult()} />);

    expect(screen.getByText(/How this lawmaker/)).toBeInTheDocument();
    expect(
      screen.getByText(/Received \$340,000 from the Defense & Military sector/)
    ).toBeInTheDocument();
    expect(screen.getByText(/typically received about \$81,000/)).toBeInTheDocument();
    expect(screen.getByText(/Received \$210,000 from the Healthcare sector/)).toBeInTheDocument();
  });

  it('returns null when no anomalies exist', () => {
    const { container } = render(
      <AnomalyFlagsDisplay anomalies={makeAnomalyResult({ hasAnomalies: false })} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when insufficient peers', () => {
    const { container } = render(
      <AnomalyFlagsDisplay anomalies={makeAnomalyResult({ meetsMinimumPeers: false })} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('filters out non-anomaly flags', () => {
    render(<AnomalyFlagsDisplay anomalies={makeAnomalyResult()} />);

    // Energy flag is not an anomaly — should not appear
    expect(screen.queryByText(/Energy & Natural Resources/)).not.toBeInTheDocument();
  });

  it('shows methodology disclaimer', () => {
    render(<AnomalyFlagsDisplay anomalies={makeAnomalyResult()} />);

    expect(screen.getByText(/does not indicate wrongdoing/)).toBeInTheDocument();
  });

  it('handles zero peer median', () => {
    const result = makeAnomalyResult({
      flags: [
        {
          dimension: 'Communications/Electronics',
          value: 120_000,
          peerMedian: 0,
          modifiedZScore: 5.0,
          isAnomaly: true,
          description: 'No peer contributions',
        },
      ],
    });

    render(<AnomalyFlagsDisplay anomalies={result} />);
    expect(screen.getByText(/received nothing from this sector/)).toBeInTheDocument();
  });

  it('formats large dollar amounts', () => {
    const result = makeAnomalyResult({
      flags: [
        {
          dimension: 'Finance/Insurance/Real Estate',
          value: 2_500_000,
          peerMedian: 400_000,
          modifiedZScore: 4.5,
          isAnomaly: true,
          description: 'High',
        },
      ],
    });

    render(<AnomalyFlagsDisplay anomalies={result} />);
    expect(screen.getByText(/\$2\.5 million/)).toBeInTheDocument();
  });

  it('caps output at 5 flags even when more anomalies exist', () => {
    const manyFlags = Array.from({ length: 8 }, (_, i) => ({
      dimension: `Sector${i}`,
      value: 100_000 * (i + 1),
      peerMedian: 20_000,
      modifiedZScore: 5 - i * 0.3,
      isAnomaly: true,
      description: `Flag ${i}`,
    }));

    const result = makeAnomalyResult({ flags: manyFlags });
    render(<AnomalyFlagsDisplay anomalies={result} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
  });

  it('preserves precision for non-round amounts', () => {
    const result = makeAnomalyResult({
      flags: [
        {
          dimension: 'Defense',
          value: 47_500,
          peerMedian: 12_300,
          modifiedZScore: 3.8,
          isAnomaly: true,
          description: 'High',
        },
      ],
    });

    render(<AnomalyFlagsDisplay anomalies={result} />);
    expect(screen.getByText(/\$47,500/)).toBeInTheDocument();
    expect(screen.getByText(/\$12,300/)).toBeInTheDocument();
  });
});
