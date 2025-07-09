/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  title: string;
  formatValue?: (value: number) => string;
  maxHeight?: number;
}

export function BarChart({ data, title, formatValue = (v) => v.toString(), maxHeight = 200 }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-700 truncate" title={item.label}>
              {item.label}
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
              <div 
                className={`h-6 rounded-full transition-all duration-500 ${
                  item.color || 'bg-civiq-green'
                }`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <div className="w-20 text-sm font-medium text-gray-900 text-right">
              {formatValue(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PieChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  title: string;
  formatValue?: (value: number) => string;
  size?: number;
}

export function PieChart({ data, title, formatValue = (v) => v.toString(), size = 200 }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  let cumulativePercentage = 0;
  const segments = data.map(item => {
    const percentage = (item.value / total) * 100;
    const segment = {
      ...item,
      percentage,
      startAngle: cumulativePercentage * 3.6, // Convert to degrees
      endAngle: (cumulativePercentage + percentage) * 3.6
    };
    cumulativePercentage += percentage;
    return segment;
  });

  const radius = size / 2 - 10;
  const center = size / 2;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="flex items-center gap-6">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {segments.map((segment, index) => {
              const startAngleRad = (segment.startAngle * Math.PI) / 180;
              const endAngleRad = (segment.endAngle * Math.PI) / 180;
              
              const x1 = center + radius * Math.cos(startAngleRad);
              const y1 = center + radius * Math.sin(startAngleRad);
              const x2 = center + radius * Math.cos(endAngleRad);
              const y2 = center + radius * Math.sin(endAngleRad);
              
              const largeArcFlag = segment.percentage > 50 ? 1 : 0;
              
              const pathData = [
                `M ${center} ${center}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');

              return (
                <path
                  key={index}
                  d={pathData}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        </div>
        
        <div className="flex-1 space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-sm text-gray-700 flex-1">{segment.label}</span>
              <span className="text-sm font-medium text-gray-900">
                {formatValue(segment.value)} ({segment.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  title: string;
  centerText?: string;
  formatValue?: (value: number) => string;
  size?: number;
}

export function DonutChart({ data, title, centerText, formatValue = (v) => v.toString(), size = 200 }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let cumulativePercentage = 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="flex items-center gap-6">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
              
              cumulativePercentage += percentage;
              
              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          {centerText && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{centerText}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-700 flex-1">{item.label}</span>
              <span className="text-sm font-medium text-gray-900">
                {formatValue(item.value)} ({((item.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PartyAlignmentProps {
  partyAlignment: number; // percentage 0-100
  party: string;
  totalVotes: number;
  withPartyVotes: number;
}

export function PartyAlignmentChart({ partyAlignment, party, totalVotes, withPartyVotes }: PartyAlignmentProps) {
  const againstPartyVotes = totalVotes - withPartyVotes;
  const againstPartyPercentage = 100 - partyAlignment;
  
  const partyColor = party === 'Republican' ? '#dc2626' : party === 'Democratic' ? '#2563eb' : '#6b7280';
  const neutralColor = '#94a3b8';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Party Alignment</h3>
      
      {/* Progress bar style visualization */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Votes with {party} Party</span>
          <span className="text-sm font-bold text-gray-900">{partyAlignment.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="h-4 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
            style={{ 
              width: `${partyAlignment}%`,
              backgroundColor: partyColor
            }}
          >
            {partyAlignment > 15 && (
              <span className="text-white text-xs font-medium">{withPartyVotes}</span>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{totalVotes}</div>
          <div className="text-xs text-gray-600">Total Votes</div>
        </div>
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="text-2xl font-bold" style={{ color: partyColor }}>{withPartyVotes}</div>
          <div className="text-xs text-gray-600">With Party</div>
        </div>
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-600">{againstPartyVotes}</div>
          <div className="text-xs text-gray-600">Against Party</div>
        </div>
      </div>
    </div>
  );
}

interface VoteHistoryProps {
  votes: Array<{
    bill: string;
    title: string;
    date: string;
    position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
    result: string;
    isKeyVote?: boolean;
  }>;
  party: string;
}

export function VoteHistoryChart({ votes, party }: VoteHistoryProps) {
  const getPositionColor = (position: string) => {
    switch (position) {
      case 'Yea': return '#0b983c'; // civiq-green
      case 'Nay': return '#e11d07'; // civiq-red
      case 'Present': return '#3ea2d4'; // civiq-blue
      case 'Not Voting': return '#94a3b8'; // gray
      default: return '#6b7280';
    }
  };

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'Yea': return '✓';
      case 'Nay': return '✗';
      case 'Present': return 'P';
      case 'Not Voting': return '—';
      default: return '?';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Key Votes</h3>
      
      <div className="space-y-4">
        {votes.slice(0, 8).map((vote, index) => (
          <div key={index} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-4">
              {/* Vote position indicator */}
              <div 
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: getPositionColor(vote.position) }}
              >
                {getPositionIcon(vote.position)}
              </div>
              
              {/* Vote details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-medium text-gray-900 truncate">{vote.bill}</h4>
                  <span className="text-xs text-gray-500 ml-2">{new Date(vote.date).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{vote.title}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-600">Position: <span className="font-medium">{vote.position}</span></span>
                  <span className="text-gray-600">Result: <span className="font-medium">{vote.result}</span></span>
                  {vote.isKeyVote && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                      Key Vote
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {votes.length > 8 && (
        <div className="text-center mt-4">
          <span className="text-sm text-gray-500">Showing 8 of {votes.length} recent votes</span>
        </div>
      )}
    </div>
  );
}

interface DemographicStatsProps {
  title: string;
  stats: Array<{
    label: string;
    value: string | number;
    percentage?: number;
    change?: string;
    color?: string;
  }>;
}

export function DemographicStats({ title, stats }: DemographicStatsProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color || 'text-gray-900'}`}>
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                {stat.percentage !== undefined && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Percentage</span>
                      <span>{stat.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${stat.color?.includes('green') ? 'bg-civiq-green' : stat.color?.includes('red') ? 'bg-civiq-red' : 'bg-civiq-blue'}`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
                {stat.change && (
                  <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ElectionResultsProps {
  title: string;
  elections: Array<{
    year: string;
    type: string;
    results: Array<{
      candidate: string;
      party: string;
      votes: number;
      percentage: number;
    }>;
    totalVotes: number;
    turnout?: number;
  }>;
}

export function ElectionResults({ title, elections }: ElectionResultsProps) {
  const getPartyColor = (party: string) => {
    switch (party.toLowerCase()) {
      case 'democrat':
      case 'democratic': return '#2563eb';
      case 'republican': return '#dc2626';
      case 'independent': return '#059669';
      default: return '#6b7280';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-6">
        {elections.map((election, electionIndex) => (
          <div key={electionIndex} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">{election.year} {election.type}</h4>
              <div className="text-sm text-gray-600">
                {election.totalVotes.toLocaleString()} total votes
                {election.turnout && ` • ${election.turnout}% turnout`}
              </div>
            </div>
            
            <div className="space-y-3">
              {election.results.map((result, resultIndex) => (
                <div key={resultIndex} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {result.candidate} ({result.party})
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {result.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${result.percentage}%`,
                          backgroundColor: getPartyColor(result.party)
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {result.votes.toLocaleString()} votes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PopulationPyramidProps {
  title: string;
  ageGroups: {
    under_18: number;
    age_18_64: number;
    over_65: number;
  };
  totalPopulation: number;
}

export function PopulationPyramid({ title, ageGroups, totalPopulation }: PopulationPyramidProps) {
  const groups = [
    { label: 'Under 18', value: ageGroups.under_18, color: '#3ea2d4' },
    { label: '18-64', value: ageGroups.age_18_64, color: '#0b983c' },
    { label: '65+', value: ageGroups.over_65, color: '#e11d07' }
  ];

  const maxValue = Math.max(...groups.map(g => g.value));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="space-y-4">
        {groups.map((group, index) => {
          const percentage = (group.value / totalPopulation) * 100;
          const barWidth = (group.value / maxValue) * 100;
          
          return (
            <div key={index} className="flex items-center gap-4">
              <div className="w-16 text-sm font-medium text-gray-700">
                {group.label}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">{group.value.toLocaleString()}</span>
                  <span className="text-sm font-medium text-gray-900">{percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="h-4 rounded-full transition-all duration-700"
                    style={{ 
                      width: `${barWidth}%`,
                      backgroundColor: group.color
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <span className="text-lg font-bold text-gray-900">{totalPopulation.toLocaleString()}</span>
          <span className="text-sm text-gray-600 ml-2">Total Population</span>
        </div>
      </div>
    </div>
  );
}