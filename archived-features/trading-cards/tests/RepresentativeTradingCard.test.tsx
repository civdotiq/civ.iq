/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import { RepresentativeTradingCard, getSampleStats } from '../RepresentativeTradingCard';
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
    {
      congress: '119',
      startYear: '2025',
      endYear: '2027'
    }
  ],
  fullName: {
    first: 'John',
    last: 'Smith',
    nickname: 'Johnny'
  },
  committees: [
    { name: 'Committee on Armed Services', role: 'Member' },
    { name: 'Committee on Transportation', role: 'Ranking Member' }
  ]
};

describe('RepresentativeTradingCard', () => {
  it('renders representative name and basic information', () => {
    const stats = getSampleStats(mockRepresentative);
    
    render(
      <RepresentativeTradingCard 
        representative={mockRepresentative}
        stats={stats}
      />
    );

    // Check if the name is rendered (using nickname if available)
    expect(screen.getByText('Johnny Smith')).toBeInTheDocument();
    expect(screen.getByText('U.S. Representative')).toBeInTheDocument();
    expect(screen.getByText('Republican')).toBeInTheDocument();
    expect(screen.getByText('MI-12')).toBeInTheDocument();
    expect(screen.getByText('House')).toBeInTheDocument();
  });

  it('renders stats correctly', () => {
    const stats = getSampleStats(mockRepresentative);
    
    render(
      <RepresentativeTradingCard 
        representative={mockRepresentative}
        stats={stats}
      />
    );

    // Check if stats are rendered
    expect(screen.getByText('Party Support')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('Years in Office')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // From terms.length
    expect(screen.getByText('Committee Roles')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // From committees.length
  });

  it('applies correct party colors for Republican', () => {
    const stats = getSampleStats(mockRepresentative);
    
    const { container } = render(
      <RepresentativeTradingCard 
        representative={mockRepresentative}
        stats={stats}
      />
    );

    // Check if Republican party color is applied
    const partyBadge = screen.getByText('Republican');
    expect(partyBadge).toHaveStyle('background-color: #dc2626'); // Republican accent color
  });

  it('applies correct party colors for Democrat', () => {
    const democratRepresentative = {
      ...mockRepresentative,
      party: 'Democratic'
    };
    const stats = getSampleStats(democratRepresentative);
    
    render(
      <RepresentativeTradingCard 
        representative={democratRepresentative}
        stats={stats}
      />
    );

    const partyBadge = screen.getByText('Democratic');
    expect(partyBadge).toHaveStyle('background-color: #2563eb'); // Democratic accent color
  });

  it('handles Senate representatives correctly', () => {
    const senateRepresentative = {
      ...mockRepresentative,
      chamber: 'Senate' as const,
      district: undefined,
      title: 'U.S. Senator'
    };
    const stats = getSampleStats(senateRepresentative);
    
    render(
      <RepresentativeTradingCard 
        representative={senateRepresentative}
        stats={stats}
      />
    );

    expect(screen.getByText('U.S. Senator')).toBeInTheDocument();
    expect(screen.getByText('MI')).toBeInTheDocument(); // No district for Senate
    expect(screen.getByText('Senate')).toBeInTheDocument();
  });

  it('includes CIV.IQ branding', () => {
    const stats = getSampleStats(mockRepresentative);
    
    render(
      <RepresentativeTradingCard 
        representative={mockRepresentative}
        stats={stats}
      />
    );

    expect(screen.getByText('CIV.IQ')).toBeInTheDocument();
    expect(screen.getByText(new Date().getFullYear().toString())).toBeInTheDocument();
  });

  it('limits stats to 4 items', () => {
    const manyStats = [
      { label: 'Stat 1', value: '1', icon: '📊', color: '#000' },
      { label: 'Stat 2', value: '2', icon: '📈', color: '#000' },
      { label: 'Stat 3', value: '3', icon: '📉', color: '#000' },
      { label: 'Stat 4', value: '4', icon: '📋', color: '#000' },
      { label: 'Stat 5', value: '5', icon: '📌', color: '#000' },
      { label: 'Stat 6', value: '6', icon: '📍', color: '#000' }
    ];
    
    render(
      <RepresentativeTradingCard 
        representative={mockRepresentative}
        stats={manyStats}
      />
    );

    // Should only show first 4 stats
    expect(screen.getByText('Stat 1')).toBeInTheDocument();
    expect(screen.getByText('Stat 2')).toBeInTheDocument();
    expect(screen.getByText('Stat 3')).toBeInTheDocument();
    expect(screen.getByText('Stat 4')).toBeInTheDocument();
    expect(screen.queryByText('Stat 5')).not.toBeInTheDocument();
    expect(screen.queryByText('Stat 6')).not.toBeInTheDocument();
  });
});

describe('getSampleStats', () => {
  it('returns correct sample stats', () => {
    const stats = getSampleStats(mockRepresentative);
    
    expect(stats).toHaveLength(4);
    expect(stats[0]).toEqual({
      label: 'Party Support',
      value: '87%',
      icon: '🎯',
      color: '#059669'
    });
    expect(stats[1]).toEqual({
      label: 'Years in Office',
      value: 1, // mockRepresentative.terms.length
      icon: '📅',
      color: '#7c3aed'
    });
    expect(stats[2]).toEqual({
      label: 'Bills Sponsored',
      value: '42',
      icon: '📜',
      color: '#dc2626'
    });
    expect(stats[3]).toEqual({
      label: 'Committee Roles',
      value: 2, // mockRepresentative.committees.length
      icon: '🏛️',
      color: '#2563eb'
    });
  });
});