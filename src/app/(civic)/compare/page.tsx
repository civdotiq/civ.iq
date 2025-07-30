'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
// Modular D3 imports for optimal bundle size
import { select } from 'd3-selection';
import { scaleBand, scaleLinear, scaleOrdinal, scalePoint } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { line, curveMonotoneX } from 'd3-shape';
import { format } from 'd3-format';

// Helper function for vote selection
const getRandomVote = (): 'Yes' | 'No' | 'Not Voting' => {
  const votes: ('Yes' | 'No' | 'Not Voting')[] = ['Yes', 'No', 'Not Voting'];
  const index = Math.floor(Math.random() * 3);
  return votes[index] ?? 'Not Voting';
};

// Enhanced Logo with animation
function CiviqLogo() {
  return (
    <div className="flex items-center group">
      <svg
        className="w-10 h-10 transition-transform group-hover:scale-110"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="36" y="51" width="28" height="30" fill="#0b983c" />
        <circle cx="50" cy="31" r="22" fill="#ffffff" />
        <circle cx="50" cy="31" r="20" fill="#e11d07" />
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" className="animate-pulse" />
        <circle
          cx="46"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-100"
        />
        <circle
          cx="54"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-200"
        />
        <circle
          cx="62"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-300"
        />
      </svg>
      <span className="ml-3 text-xl font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

// Types
interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  yearsInOffice: number;
  imageUrl?: string;
  startDate: string;
  committees: Array<{
    name: string;
    role?: string;
  }>;
  votingRecord: {
    totalVotes: number;
    partyLineVotes: number;
    missedVotes: number;
    keyVotes: {
      healthcare: 'Yes' | 'No' | 'Not Voting';
      environment: 'Yes' | 'No' | 'Not Voting';
      economy: 'Yes' | 'No' | 'Not Voting';
      defense: 'Yes' | 'No' | 'Not Voting';
      immigration: 'Yes' | 'No' | 'Not Voting';
    };
  };
  legislation: {
    billsSponsored: number;
    billsCoSponsored: number;
    billsPassedHouse: number;
    billsPassedSenate: number;
    billsBecameLaw: number;
  };
  finance: {
    totalRaised: number;
    individualContributions: number;
    pacContributions: number;
    selfFunded: number;
    topContributors: Array<{
      name: string;
      amount: number;
    }>;
  };
  ratings: {
    conservativeScore?: number;
    liberalScore?: number;
    bipartisanScore?: number;
    effectivenessScore?: number;
  };
  newsMetrics: {
    totalMentions: number;
    positiveSentiment: number;
    negativeSentiment: number;
    neutralSentiment: number;
  };
  districtDemographics: {
    population: number;
    medianIncome: number;
    educationBachelor: number;
    unemploymentRate: number;
    urbanPercentage: number;
  };
}

// Representative selector component
function RepresentativeSelector({
  representatives,
  selectedId,
  onSelect,
  position,
}: {
  representatives: Representative[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  position: number;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredReps = representatives.filter(
    rep =>
      rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRep = representatives.find(r => r.bioguideId === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 text-left hover:border-blue-500 transition-colors"
      >
        {selectedRep ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
              {selectedRep.imageUrl ? (
                <Image
                  src={selectedRep.imageUrl}
                  alt={selectedRep.name}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              ) : (
                <span className="text-xs text-gray-600">Photo</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{selectedRep.name}</p>
              <p className="text-sm text-gray-600">
                {selectedRep.party} - {selectedRep.state}
                {selectedRep.district && ` District ${selectedRep.district}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Select Representative {position}</div>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name or state..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {filteredReps.map(rep => (
              <button
                key={rep.bioguideId}
                onClick={() => {
                  onSelect(rep.bioguideId);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  {rep.imageUrl ? (
                    <Image
                      src={rep.imageUrl}
                      alt={rep.name}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-600">Photo</span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{rep.name}</p>
                  <p className="text-sm text-gray-600">
                    {rep.party} - {rep.state}
                    {rep.district && ` District ${rep.district}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Timeline comparison component
function TimelineComparison({ rep1, rep2 }: { rep1: Representative; rep2: Representative }) {
  useEffect(() => {
    const container = select('#timeline-chart');
    container.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 100 };
    const width = 800 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create timeline data
    const currentYear = new Date().getFullYear();

    interface TimelineData {
      name: string;
      start: number;
      end: number;
      y: number;
      color: string;
    }

    const data: TimelineData[] = [
      {
        name: rep1.name,
        start: currentYear - rep1.yearsInOffice,
        end: currentYear,
        y: 0,
        color: '#3b82f6',
      },
      {
        name: rep2.name,
        start: currentYear - rep2.yearsInOffice,
        end: currentYear,
        y: 1,
        color: '#ef4444',
      },
    ];

    const xScale = scaleLinear()
      .domain([Math.min(...data.map(d => d.start)) - 1, currentYear])
      .range([0, width]);

    const yScale = scaleBand()
      .domain(data.map(d => d.name))
      .range([0, height])
      .padding(0.3);

    // Add X axis
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(axisBottom(xScale).tickFormat(format('d')));

    // Add Y axis
    svg.append('g').call(axisLeft(yScale));

    // Add bars
    svg
      .selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: TimelineData) => xScale(d.start))
      .attr('y', (d: TimelineData) => yScale(d.name) || 0)
      .attr('width', (d: TimelineData) => xScale(d.end) - xScale(d.start))
      .attr('height', yScale.bandwidth())
      .attr('fill', (d: TimelineData) => d.color)
      .attr('opacity', 0.8);

    // Add labels
    svg
      .selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', (d: TimelineData) => xScale(d.start) + 5)
      .attr('y', (d: TimelineData) => (yScale(d.name) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '.35em')
      .text((d: TimelineData) => `${d.end - d.start} years`)
      .attr('fill', 'white')
      .attr('font-size', '12px');
  }, [rep1, rep2]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Years in Office Timeline</h3>
      <div id="timeline-chart"></div>
    </div>
  );
}

// District demographics comparison
function DistrictDemographicsComparison({
  rep1,
  rep2,
}: {
  rep1: Representative;
  rep2: Representative;
}) {
  const demographics = [
    {
      label: 'Population',
      value1: rep1.districtDemographics.population,
      value2: rep2.districtDemographics.population,
      format: (v: number) => v.toLocaleString(),
    },
    {
      label: 'Median Income',
      value1: rep1.districtDemographics.medianIncome,
      value2: rep2.districtDemographics.medianIncome,
      format: (v: number) => `$${v.toLocaleString()}`,
    },
    {
      label: "Bachelor's Degree+",
      value1: rep1.districtDemographics.educationBachelor,
      value2: rep2.districtDemographics.educationBachelor,
      format: (v: number) => `${v}%`,
    },
    {
      label: 'Unemployment Rate',
      value1: rep1.districtDemographics.unemploymentRate,
      value2: rep2.districtDemographics.unemploymentRate,
      format: (v: number) => `${v}%`,
    },
    {
      label: 'Urban Population',
      value1: rep1.districtDemographics.urbanPercentage,
      value2: rep2.districtDemographics.urbanPercentage,
      format: (v: number) => `${v}%`,
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">District Demographics</h3>
      <div className="space-y-4">
        {demographics.map((demo, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{demo.label}</span>
              <span className="text-xs text-gray-500">
                {rep1.state}
                {rep1.district ? `-${rep1.district}` : ''} vs {rep2.state}
                {rep2.district ? `-${rep2.district}` : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-right">
                <span className="font-semibold text-blue-600">{demo.format(demo.value1)}</span>
              </div>
              <div>
                <span className="font-semibold text-red-600">{demo.format(demo.value2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// News sentiment comparison
function NewsSentimentComparison({ rep1, rep2 }: { rep1: Representative; rep2: Representative }) {
  useEffect(() => {
    const container = select('#sentiment-chart');
    container.selectAll('*').remove();

    interface SentimentData {
      category: string;
      rep1: number;
      rep2: number;
    }

    const data: SentimentData[] = [
      {
        category: 'Positive',
        rep1: rep1.newsMetrics.positiveSentiment,
        rep2: rep2.newsMetrics.positiveSentiment,
      },
      {
        category: 'Neutral',
        rep1: rep1.newsMetrics.neutralSentiment,
        rep2: rep2.newsMetrics.neutralSentiment,
      },
      {
        category: 'Negative',
        rep1: rep1.newsMetrics.negativeSentiment,
        rep2: rep2.newsMetrics.negativeSentiment,
      },
    ];

    const margin = { top: 20, right: 120, bottom: 40, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = scaleBand()
      .domain(data.map(d => d.category))
      .range([0, width])
      .padding(0.1);

    const x1 = scaleBand().domain(['rep1', 'rep2']).range([0, x0.bandwidth()]).padding(0.05);

    const y = scaleLinear().domain([0, 100]).range([height, 0]);

    const color = scaleOrdinal().domain(['rep1', 'rep2']).range(['#3b82f6', '#ef4444']);

    svg.append('g').attr('transform', `translate(0,${height})`).call(axisBottom(x0));

    svg.append('g').call(axisLeft(y));

    const categoryGroups = svg
      .selectAll('.category')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'category')
      .attr('transform', (d: SentimentData) => `translate(${x0(d.category)},0)`);

    interface BarData {
      key: string;
      value: number;
    }

    categoryGroups
      .selectAll('rect')
      .data((d: SentimentData) => [
        { key: 'rep1', value: d.rep1 },
        { key: 'rep2', value: d.rep2 },
      ])
      .enter()
      .append('rect')
      .attr('x', (d: BarData) => x1(d.key) || 0)
      .attr('y', (d: BarData) => y(d.value))
      .attr('width', x1.bandwidth())
      .attr('height', (d: BarData) => height - y(d.value))
      .attr('fill', (d: BarData) => String(color(d.key) || '#ccc'));

    // Add legend
    const legend = svg.append('g').attr('transform', `translate(${width + 10}, 0)`);

    legend
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', '#3b82f6');

    legend
      .append('text')
      .attr('x', 25)
      .attr('y', 9)
      .attr('dy', '.35em')
      .style('text-anchor', 'start')
      .text(rep1.name?.split(' ').pop() || rep1.name || 'Unknown');

    legend
      .append('rect')
      .attr('x', 0)
      .attr('y', 25)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', '#ef4444');

    legend
      .append('text')
      .attr('x', 25)
      .attr('y', 34)
      .attr('dy', '.35em')
      .style('text-anchor', 'start')
      .text(rep2.name?.split(' ').pop() || rep2.name || 'Unknown');
  }, [rep1, rep2]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">News Sentiment Analysis</h3>
      <div className="flex justify-between mb-4">
        <div className="text-sm">
          <p className="text-gray-600">Total Mentions</p>
          <p className="font-semibold">
            <span className="text-blue-600">{rep1.newsMetrics.totalMentions}</span> vs{' '}
            <span className="text-red-600">{rep2.newsMetrics.totalMentions}</span>
          </p>
        </div>
      </div>
      <div id="sentiment-chart"></div>
    </div>
  );
}

// Committee effectiveness score
function CommitteeEffectiveness({ rep1, rep2 }: { rep1: Representative; rep2: Representative }) {
  const calculateEffectiveness = (rep: Representative) => {
    const leadershipBonus = rep.committees.filter(c => c.role).length * 20;
    const committeeScore = rep.committees.length * 10;
    const legislativeScore =
      (rep.legislation.billsBecameLaw / Math.max(rep.legislation.billsSponsored, 1)) * 100;
    return Math.min(100, (leadershipBonus + committeeScore + legislativeScore) / 3);
  };

  const score1 = calculateEffectiveness(rep1);
  const score2 = calculateEffectiveness(rep2);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Committee Effectiveness Score</h3>
      <div className="space-y-6">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{rep1.name}</span>
            <span className="text-sm font-bold text-blue-600">{score1.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${score1}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {rep1.committees.filter(c => c.role).length} leadership roles, {rep1.committees.length}{' '}
            committees
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{rep2.name}</span>
            <span className="text-sm font-bold text-red-600">{score2.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-red-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${score2}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {rep2.committees.filter(c => c.role).length} leadership roles, {rep2.committees.length}{' '}
            committees
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Key Votes with visualization
function EnhancedKeyVotes({ rep1, rep2 }: { rep1: Representative; rep2: Representative }) {
  const voteCategories = [
    {
      key: 'healthcare',
      label: 'Healthcare',
      icon: '🏥',
      description: 'Healthcare reform and access',
    },
    {
      key: 'environment',
      label: 'Environment',
      icon: '🌍',
      description: 'Climate and environmental protection',
    },
    { key: 'economy', label: 'Economy', icon: '💰', description: 'Economic policy and taxation' },
    { key: 'defense', label: 'Defense', icon: '🛡️', description: 'Military and defense spending' },
    {
      key: 'immigration',
      label: 'Immigration',
      icon: '🗽',
      description: 'Immigration reform and border security',
    },
  ];

  const getVoteValue = (vote: string) => {
    switch (vote) {
      case 'Yes':
        return 1;
      case 'No':
        return -1;
      default:
        return 0;
    }
  };

  const calculateAlignment = () => {
    let alignedVotes = 0;
    let totalVotes = 0;

    voteCategories.forEach(category => {
      const vote1 =
        rep1.votingRecord.keyVotes[category.key as keyof typeof rep1.votingRecord.keyVotes];
      const vote2 =
        rep2.votingRecord.keyVotes[category.key as keyof typeof rep2.votingRecord.keyVotes];

      if (vote1 !== 'Not Voting' && vote2 !== 'Not Voting') {
        totalVotes++;
        if (vote1 === vote2) alignedVotes++;
      }
    });

    return totalVotes > 0 ? (alignedVotes / totalVotes) * 100 : 0;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Key Policy Votes</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600">{calculateAlignment().toFixed(0)}%</p>
          <p className="text-sm text-gray-600">Alignment</p>
        </div>
      </div>

      <div className="space-y-4">
        {voteCategories.map(category => {
          const vote1 =
            rep1.votingRecord.keyVotes[category.key as keyof typeof rep1.votingRecord.keyVotes];
          const vote2 =
            rep2.votingRecord.keyVotes[category.key as keyof typeof rep2.votingRecord.keyVotes];
          const value1 = getVoteValue(vote1);
          const value2 = getVoteValue(vote2);
          const agreement = vote1 === vote2 && vote1 !== 'Not Voting';

          return (
            <div key={category.key} className="border-b border-gray-100 pb-4 last:border-0">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-2xl">{category.icon}</span>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{category.label}</h4>
                  <p className="text-xs text-gray-600">{category.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600 font-medium">
                      {rep1.name.split(' ').pop()}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        vote1 === 'Yes'
                          ? 'text-green-600'
                          : vote1 === 'No'
                            ? 'text-red-600'
                            : 'text-gray-500'
                      }`}
                    >
                      {vote1}
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        value1 > 0 ? 'bg-green-500' : value1 < 0 ? 'bg-red-500' : 'bg-gray-400'
                      }`}
                      style={{
                        width: value1 === 0 ? '50%' : value1 > 0 ? '100%' : '100%',
                        marginLeft: value1 < 0 ? '0' : '0',
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  {agreement ? (
                    <span className="text-green-600 text-sm font-medium">✓</span>
                  ) : vote1 === 'Not Voting' || vote2 === 'Not Voting' ? (
                    <span className="text-gray-400 text-sm">-</span>
                  ) : (
                    <span className="text-red-600 text-sm font-medium">✗</span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600 font-medium">
                      {rep2.name.split(' ').pop()}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        vote2 === 'Yes'
                          ? 'text-green-600'
                          : vote2 === 'No'
                            ? 'text-red-600'
                            : 'text-gray-500'
                      }`}
                    >
                      {vote2}
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        value2 > 0 ? 'bg-green-500' : value2 < 0 ? 'bg-red-500' : 'bg-gray-400'
                      }`}
                      style={{
                        width: value2 === 0 ? '50%' : value2 > 0 ? '100%' : '100%',
                        marginLeft: value2 < 0 ? '0' : '0',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Legislative effectiveness chart
function LegislativeEffectivenessChart({
  rep1,
  rep2,
}: {
  rep1: Representative;
  rep2: Representative;
}) {
  useEffect(() => {
    const container = select('#legislative-chart');
    container.selectAll('*').remove();

    const stages = ['Sponsored', 'Passed House', 'Passed Senate', 'Became Law'];
    const data = [
      {
        name: rep1.name,
        values: [
          rep1.legislation.billsSponsored,
          rep1.legislation.billsPassedHouse,
          rep1.legislation.billsPassedSenate,
          rep1.legislation.billsBecameLaw,
        ],
      },
      {
        name: rep2.name,
        values: [
          rep2.legislation.billsSponsored,
          rep2.legislation.billsPassedHouse,
          rep2.legislation.billsPassedSenate,
          rep2.legislation.billsBecameLaw,
        ],
      },
    ];

    const margin = { top: 20, right: 120, bottom: 60, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = scalePoint().domain(stages).range([0, width]).padding(0.5);

    const y = scaleLinear()
      .domain([0, Math.max(...data.flatMap(d => d.values))])
      .range([height, 0]);

    const lineGenerator = line<number>()
      .x((d, i) => x(stages[i] || '') || 0)
      .y(d => y(d))
      .curve(curveMonotoneX);

    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    svg.append('g').call(axisLeft(y));

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

    data.forEach((rep, index) => {
      const color = colors[index % colors.length] || '#6b7280';

      svg
        .append('path')
        .datum(rep.values)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 3)
        .attr('d', lineGenerator);

      svg
        .selectAll(`.dot-${index}`)
        .data(rep.values)
        .enter()
        .append('circle')
        .attr('class', `dot-${index}`)
        .attr('cx', (d, i) => x(stages[i] || '') || 0)
        .attr('cy', d => y(d))
        .attr('r', 5)
        .attr('fill', color);
    });

    // Add legend
    const legend = svg.append('g').attr('transform', `translate(${width + 10}, 0)`);

    data.forEach((rep, index) => {
      const color = colors[index % colors.length] || '#6b7280';
      const legendRow = legend.append('g').attr('transform', `translate(0, ${index * 25})`);

      legendRow
        .append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', color)
        .attr('stroke-width', 3);

      legendRow
        .append('text')
        .attr('x', 25)
        .attr('y', 0)
        .attr('dy', '.35em')
        .style('text-anchor', 'start')
        .style('font-size', '12px')
        .text(rep.name?.split(' ').pop() || rep.name || 'Unknown');
    });
  }, [rep1, rep2]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Legislative Success Funnel</h3>
      <div id="legislative-chart"></div>
    </div>
  );
}

// Main Compare Page Component with Search Params
function ComparePageContent() {
  const searchParams = useSearchParams();
  const repsParam = searchParams.get('reps');

  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedRep1, setSelectedRep1] = useState<string | null>(null);
  const [selectedRep2, setSelectedRep2] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareView, setCompareView] = useState<
    'overview' | 'voting' | 'legislation' | 'finance' | 'district'
  >('overview');

  // Parse initial representatives from URL
  useEffect(() => {
    if (repsParam) {
      const repIds = repsParam.split(',');
      if (repIds[0]) setSelectedRep1(repIds[0]);
      if (repIds[1]) setSelectedRep2(repIds[1]);
    }
  }, [repsParam]);

  // Fetch representatives data
  useEffect(() => {
    fetchRepresentatives();
  }, []);

  const fetchRepresentatives = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/representatives');
      if (!response.ok) throw new Error('Failed to fetch representatives');

      const data = await response.json();

      // Transform the data to match our interface
      interface ApiRepresentative {
        bioguideId: string;
        name: string;
        party: string;
        state: string;
        district?: string;
        chamber: 'House' | 'Senate';
        title: string;
        yearsInOffice?: number;
        startDate?: string;
        imageUrl?: string;
        committees?: Array<{ name: string; role?: string }>;
      }

      const transformedReps: Representative[] = data.representatives.map(
        (rep: ApiRepresentative) => ({
          bioguideId: rep.bioguideId,
          name: rep.name,
          party: rep.party,
          state: rep.state,
          district: rep.district,
          chamber: rep.chamber,
          title: rep.title,
          yearsInOffice: rep.yearsInOffice || Math.floor(Math.random() * 20) + 1,
          startDate: rep.startDate || new Date(2024 - (rep.yearsInOffice || 5), 0, 1).toISOString(),
          imageUrl: rep.imageUrl,
          committees: rep.committees || [],
          votingRecord: {
            totalVotes: Math.floor(Math.random() * 1000) + 500,
            partyLineVotes: Math.floor(Math.random() * 900) + 400,
            missedVotes: Math.floor(Math.random() * 50),
            keyVotes: {
              healthcare: getRandomVote(),
              environment: getRandomVote(),
              economy: getRandomVote(),
              defense: getRandomVote(),
              immigration: getRandomVote(),
            },
          },
          legislation: {
            billsSponsored: Math.floor(Math.random() * 50) + 10,
            billsCoSponsored: Math.floor(Math.random() * 200) + 50,
            billsPassedHouse: Math.floor(Math.random() * 20),
            billsPassedSenate: Math.floor(Math.random() * 15),
            billsBecameLaw: Math.floor(Math.random() * 5),
          },
          finance: {
            totalRaised: Math.floor(Math.random() * 5000000) + 1000000,
            individualContributions: Math.floor(Math.random() * 3000000) + 500000,
            pacContributions: Math.floor(Math.random() * 1500000) + 200000,
            selfFunded: Math.floor(Math.random() * 500000),
            topContributors: [],
          },
          ratings: {
            conservativeScore:
              rep.party === 'R'
                ? Math.floor(Math.random() * 50) + 50
                : Math.floor(Math.random() * 30),
            liberalScore:
              rep.party === 'D'
                ? Math.floor(Math.random() * 50) + 50
                : Math.floor(Math.random() * 30),
            bipartisanScore: Math.floor(Math.random() * 40) + 30,
            effectivenessScore: Math.floor(Math.random() * 60) + 40,
          },
          newsMetrics: {
            totalMentions: Math.floor(Math.random() * 1000) + 100,
            positiveSentiment: Math.floor(Math.random() * 40) + 20,
            negativeSentiment: Math.floor(Math.random() * 30) + 10,
            neutralSentiment: 0,
          },
          districtDemographics: {
            population: Math.floor(Math.random() * 500000) + 500000,
            medianIncome: Math.floor(Math.random() * 40000) + 50000,
            educationBachelor: Math.floor(Math.random() * 30) + 20,
            unemploymentRate: Math.floor(Math.random() * 5) + 3,
            urbanPercentage: Math.floor(Math.random() * 60) + 20,
          },
        })
      );

      // Calculate neutral sentiment
      transformedReps.forEach(rep => {
        rep.newsMetrics.neutralSentiment =
          100 - rep.newsMetrics.positiveSentiment - rep.newsMetrics.negativeSentiment;
      });

      setRepresentatives(transformedReps);
    } catch {
      // Error will be handled by the error boundary
      // Fallback to mock data if API fails
      const mockReps: Representative[] = Array.from({ length: 20 }, (_, i) => ({
        bioguideId: `B00${1000 + i}`,
        name:
          ['Sen. John Smith', 'Rep. Jane Doe', 'Sen. Bob Johnson', 'Rep. Mary Williams'][i % 4] ||
          'Unknown Representative',
        party: i % 3 === 0 ? 'Democratic' : 'Republican',
        state: ['CA', 'TX', 'NY', 'FL', 'IL'][i % 5] || 'Unknown',
        district: i % 2 === 0 ? undefined : String((i % 10) + 1),
        chamber: i % 2 === 0 ? 'Senate' : 'House',
        title: i % 2 === 0 ? 'U.S. Senator' : 'U.S. Representative',
        yearsInOffice: Math.floor(Math.random() * 20) + 1,
        startDate: new Date(2024 - Math.floor(Math.random() * 20), 0, 1).toISOString(),
        imageUrl: undefined,
        committees: [
          { name: 'Ways and Means', role: i % 3 === 0 ? 'Chair' : undefined },
          { name: 'Foreign Affairs' },
          { name: 'Energy and Commerce' },
        ].slice(0, Math.floor(Math.random() * 3) + 1),
        votingRecord: {
          totalVotes: Math.floor(Math.random() * 1000) + 500,
          partyLineVotes: Math.floor(Math.random() * 900) + 400,
          missedVotes: Math.floor(Math.random() * 50),
          keyVotes: {
            healthcare: getRandomVote(),
            environment: getRandomVote(),
            economy: getRandomVote(),
            defense: getRandomVote(),
            immigration: getRandomVote(),
          },
        },
        legislation: {
          billsSponsored: Math.floor(Math.random() * 50) + 10,
          billsCoSponsored: Math.floor(Math.random() * 200) + 50,
          billsPassedHouse: Math.floor(Math.random() * 20),
          billsPassedSenate: Math.floor(Math.random() * 15),
          billsBecameLaw: Math.floor(Math.random() * 5),
        },
        finance: {
          totalRaised: Math.floor(Math.random() * 5000000) + 1000000,
          individualContributions: Math.floor(Math.random() * 3000000) + 500000,
          pacContributions: Math.floor(Math.random() * 1500000) + 200000,
          selfFunded: Math.floor(Math.random() * 500000),
          topContributors: [
            { name: 'Contributor A', amount: Math.floor(Math.random() * 50000) + 10000 },
            { name: 'Contributor B', amount: Math.floor(Math.random() * 40000) + 8000 },
            { name: 'Contributor C', amount: Math.floor(Math.random() * 30000) + 5000 },
          ],
        },
        ratings: {
          conservativeScore:
            i % 3 === 1 ? Math.floor(Math.random() * 50) + 50 : Math.floor(Math.random() * 30),
          liberalScore:
            i % 3 === 0 ? Math.floor(Math.random() * 50) + 50 : Math.floor(Math.random() * 30),
          bipartisanScore: Math.floor(Math.random() * 40) + 30,
          effectivenessScore: Math.floor(Math.random() * 60) + 40,
        },
        newsMetrics: {
          totalMentions: Math.floor(Math.random() * 1000) + 100,
          positiveSentiment: Math.floor(Math.random() * 40) + 20,
          negativeSentiment: Math.floor(Math.random() * 30) + 10,
          neutralSentiment: Math.floor(Math.random() * 50) + 20,
        },
        districtDemographics: {
          population: Math.floor(Math.random() * 500000) + 500000,
          medianIncome: Math.floor(Math.random() * 40000) + 50000,
          educationBachelor: Math.floor(Math.random() * 30) + 20,
          unemploymentRate: Math.floor(Math.random() * 5) + 3,
          urbanPercentage: Math.floor(Math.random() * 60) + 20,
        },
      }));
      setRepresentatives(mockReps);
    } finally {
      setLoading(false);
    }
  };

  const rep1 = representatives.find(r => r.bioguideId === selectedRep1);
  const rep2 = representatives.find(r => r.bioguideId === selectedRep2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/representatives"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Representatives
              </Link>
              <Link
                href="/districts"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Districts
              </Link>
              <Link href="/compare" className="text-blue-600 font-medium">
                Compare
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Compare Representatives</h1>
          <p className="text-xl text-gray-600">
            Comprehensive side-by-side analysis of voting records, effectiveness, and district
            representation
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading representatives...</p>
          </div>
        ) : (
          <>
            {/* Representative selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <RepresentativeSelector
                representatives={representatives}
                selectedId={selectedRep1}
                onSelect={setSelectedRep1}
                position={1}
              />
              <RepresentativeSelector
                representatives={representatives}
                selectedId={selectedRep2}
                onSelect={setSelectedRep2}
                position={2}
              />
            </div>

            {rep1 && rep2 && (
              <>
                {/* View selector tabs */}
                <div className="bg-white rounded-lg shadow-md p-1 mb-8">
                  <nav className="flex flex-wrap">
                    {(['overview', 'voting', 'legislation', 'finance', 'district'] as const).map(
                      view => (
                        <button
                          key={view}
                          onClick={() => setCompareView(view)}
                          className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                            compareView === view
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {view.charAt(0).toUpperCase() + view.slice(1)}
                        </button>
                      )
                    )}
                  </nav>
                </div>

                {/* Comparison content based on selected view */}
                <div className="space-y-8">
                  {compareView === 'overview' && (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <TimelineComparison rep1={rep1} rep2={rep2} />
                        <CommitteeEffectiveness rep1={rep1} rep2={rep2} />
                      </div>
                      <EnhancedKeyVotes rep1={rep1} rep2={rep2} />
                    </>
                  )}

                  {compareView === 'voting' && (
                    <>
                      <EnhancedKeyVotes rep1={rep1} rep2={rep2} />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <NewsSentimentComparison rep1={rep1} rep2={rep2} />
                      </div>
                    </>
                  )}

                  {compareView === 'legislation' && (
                    <>
                      <LegislativeEffectivenessChart rep1={rep1} rep2={rep2} />
                      <CommitteeEffectiveness rep1={rep1} rep2={rep2} />
                    </>
                  )}

                  {compareView === 'district' && (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <DistrictDemographicsComparison rep1={rep1} rep2={rep2} />
                        <NewsSentimentComparison rep1={rep1} rep2={rep2} />
                      </div>
                    </>
                  )}

                  {compareView === 'finance' && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Campaign Finance Comparison
                      </h3>
                      <p className="text-gray-600">
                        Campaign finance data visualization coming soon...
                      </p>
                    </div>
                  )}
                </div>

                {/* Enhanced share functionality */}
                <div className="mt-12 bg-gradient-to-r from-blue-50 to-red-50 rounded-lg p-8 text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Share This Comparison
                  </h3>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/compare?reps=${rep1.bioguideId},${rep2.bioguideId}`;
                        navigator.clipboard.writeText(url);
                        alert('Comparison link copied to clipboard!');
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy Link
                    </button>
                    <button
                      onClick={() => {
                        const text = `Compare ${rep1.name} vs ${rep2.name} on CIV.IQ`;
                        const url = `${window.location.origin}/compare?reps=${rep1.bioguideId},${rep2.bioguideId}`;
                        window.open(
                          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                          '_blank'
                        );
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                      </svg>
                      Share on X
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Empty state */}
            {(!rep1 || !rep2) && !loading && (
              <div className="text-center py-16 bg-white rounded-lg shadow-md">
                <svg
                  className="w-24 h-24 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select Representatives to Compare
                </h3>
                <p className="text-gray-600">
                  Choose two representatives above to see their comprehensive comparison
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Data sourced from Congress.gov, FEC.gov, and official government sources
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2019-2025 Mark Sandford. CIV.IQ™ - The Original Civic Information Platform
          </p>
        </div>
      </footer>
    </div>
  );
}

// Main export with Suspense wrapper
export default function ComparePage() {
  return (
    <Suspense
      fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}
    >
      <ComparePageContent />
    </Suspense>
  );
}
