/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { MinimalHeader } from '@/components/representative/MinimalHeader';
import { MinimalTabs } from '@/components/representative/MinimalTabs';
import { VotingMetrics } from '@/components/representative/VotingMetrics';
import { VotingBars } from '@/components/representative/VotingBars';

interface MinimalRepresentativePageProps {
  representative: {
    bioguideId: string;
    name: string;
    title?: string;
    state: string;
    district?: string;
    party: string;
    chamber: 'House' | 'Senate';
    currentTerm?: {
      start?: string;
      end?: string;
    };
    committees?: Array<{
      name: string;
      role?: string;
    }>;
  };
  serverData?: {
    bills?: unknown[];
    votes?: unknown[];
    finance?: Record<string, unknown>;
    news?: unknown[];
  };
}

export function MinimalRepresentativePage({
  representative,
  serverData,
}: MinimalRepresentativePageProps) {
  const [activeTab, setActiveTab] = useState('Overview');

  // Mock data for demonstration - would be calculated from real data
  const votingData = {
    total: 245,
    yes: 156,
    no: 67,
    present: 12,
    absent: 10,
  };

  const votingDistribution = {
    yes: Math.round((votingData.yes / votingData.total) * 100),
    no: Math.round((votingData.no / votingData.total) * 100),
    absent: Math.round(((votingData.absent + votingData.present) / votingData.total) * 100),
  };

  // Mock recent votes data
  const recentVotes = [
    {
      id: '1',
      bill: 'H.R. 1234',
      title: 'Infrastructure Investment and Jobs Act',
      date: '2024-03-15',
      vote: 'Yes',
    },
    {
      id: '2',
      bill: 'S. 567',
      title: 'Climate Action and Clean Energy Act',
      date: '2024-03-10',
      vote: 'No',
    },
    {
      id: '3',
      bill: 'H.R. 890',
      title: 'Healthcare Affordability Act',
      date: '2024-03-05',
      vote: 'Yes',
    },
  ];

  const quickStats = {
    committees: representative.committees?.length || 3,
    billsSponsored: Array.isArray(serverData?.bills) ? serverData.bills.length : 12,
    attendance: 94,
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <MinimalHeader rep={representative} />
      <MinimalTabs active={activeTab} onChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="col-span-8">
            {activeTab === 'Overview' && (
              <div className="space-y-12">
                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Representative Summary
                  </h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-lg text-gray-700 leading-relaxed">
                      {representative.name} serves as a{' '}
                      {representative.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative'}{' '}
                      representing {representative.state}
                      {representative.district ? ` District ${representative.district}` : ''}. They
                      are a member of the {representative.party} party.
                    </p>
                  </div>
                </section>

                {/* Complete Voting Analysis Grid */}
                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Voting Analysis
                  </h2>
                  <div className="grid grid-cols-4 gap-6">
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-light text-gray-900">{votingData.total}</div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                        Total Votes
                      </div>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <div className="text-2xl font-light text-[#0a9338]">{votingData.yes}</div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                        Yes Votes
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{votingDistribution.yes}%</div>
                    </div>
                    <div className="text-center p-6 bg-red-50 rounded-lg">
                      <div className="text-2xl font-light text-[#e11d07]">{votingData.no}</div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                        No Votes
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{votingDistribution.no}%</div>
                    </div>
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-light text-gray-600">
                        {votingData.absent + votingData.present}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                        Absent/Present
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{votingDistribution.absent}%</div>
                    </div>
                  </div>
                </section>

                <VotingBars dist={votingDistribution} />

                {/* Recent Legislative Activity */}
                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Recent Legislative Activity
                  </h2>
                  <div className="space-y-4">
                    {recentVotes.slice(0, 3).map(v => (
                      <div key={v.id} className="py-4 border-b border-gray-100 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {v.bill} • {v.title}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">{v.date}</p>
                          </div>
                          <span
                            className={`text-sm px-3 py-1 rounded-full ${
                              v.vote === 'Yes'
                                ? 'bg-green-50 text-[#0a9338]'
                                : v.vote === 'No'
                                  ? 'bg-red-50 text-[#e11d07]'
                                  : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            {v.vote}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'Voting Records' && (
              <div className="space-y-12">
                <VotingMetrics data={votingData} />
                <VotingBars dist={votingDistribution} />

                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Recent Votes
                  </h2>
                  <div className="space-y-4">
                    {recentVotes.map(v => (
                      <div key={v.id} className="py-4 border-b border-gray-100 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {v.bill} • {v.title}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">{v.date}</p>
                          </div>
                          <span
                            className={`text-sm px-3 py-1 rounded-full ${
                              v.vote === 'Yes'
                                ? 'bg-green-50 text-[#0a9338]'
                                : v.vote === 'No'
                                  ? 'bg-red-50 text-[#e11d07]'
                                  : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            {v.vote}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'Legislation' && (
              <div className="space-y-12">
                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Legislative Summary
                  </h2>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-light text-[#3ea2d4]">
                        {quickStats.billsSponsored}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                        Bills Sponsored
                      </div>
                    </div>
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-light text-gray-900">8</div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                        Bills Enacted
                      </div>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <div className="text-2xl font-light text-[#0a9338]">15</div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                        Co-Sponsored
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Recent Sponsored Bills
                  </h2>
                  <div className="space-y-6">
                    {[
                      {
                        id: '1',
                        number: 'H.R. 2847',
                        title: 'Clean Energy Infrastructure Investment Act',
                        introduced: '2024-02-15',
                        status: 'Committee Review',
                        summary:
                          'Provides federal funding for renewable energy infrastructure projects across rural and urban communities.',
                      },
                      {
                        id: '2',
                        number: 'H.R. 3156',
                        title: 'Healthcare Accessibility and Affordability Act',
                        introduced: '2024-01-22',
                        status: 'Passed House',
                        summary:
                          'Expands healthcare coverage options and reduces prescription drug costs for middle-income families.',
                      },
                      {
                        id: '3',
                        number: 'H.R. 2901',
                        title: 'Small Business Innovation Support Act',
                        introduced: '2023-12-08',
                        status: 'Enacted',
                        summary:
                          'Creates tax incentives and grants for small businesses investing in research and development.',
                      },
                    ].map(bill => (
                      <div key={bill.id} className="border border-gray-100 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {bill.number} • {bill.title}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">
                              Introduced {bill.introduced}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-3 py-1 rounded-full ${
                              bill.status === 'Enacted'
                                ? 'bg-green-50 text-[#0a9338]'
                                : bill.status === 'Passed House'
                                  ? 'bg-blue-50 text-[#3ea2d4]'
                                  : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            {bill.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{bill.summary}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Legislative Focus Areas
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { area: 'Healthcare', count: 8 },
                      { area: 'Environment', count: 6 },
                      { area: 'Economy', count: 5 },
                      { area: 'Education', count: 3 },
                    ].map(focus => (
                      <div
                        key={focus.area}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm text-gray-700">{focus.area}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {focus.count} bills
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'Finance' && (
              <div className="space-y-12">
                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Campaign Finance Overview
                  </h2>
                  <div className="grid grid-cols-4 gap-6">
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <div className="text-2xl font-light text-[#0a9338]">$2.4M</div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                        Total Raised
                      </div>
                      <div className="text-xs text-gray-400 mt-1">2023-2024 Cycle</div>
                    </div>
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-light text-[#3ea2d4]">$1.8M</div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                        Total Spent
                      </div>
                      <div className="text-xs text-gray-400 mt-1">75% of funds</div>
                    </div>
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-light text-gray-900">$600K</div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                        Cash on Hand
                      </div>
                      <div className="text-xs text-gray-400 mt-1">As of Q4 2024</div>
                    </div>
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-light text-gray-900">3,847</div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                        Contributors
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Individual donors</div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Funding Sources
                  </h2>
                  <div className="space-y-4">
                    {[
                      {
                        source: 'Individual Contributions',
                        amount: '$1.6M',
                        percentage: 67,
                        color: 'bg-[#0a9338]',
                      },
                      {
                        source: 'PAC Contributions',
                        amount: '$480K',
                        percentage: 20,
                        color: 'bg-[#3ea2d4]',
                      },
                      {
                        source: 'Party Committees',
                        amount: '$240K',
                        percentage: 10,
                        color: 'bg-gray-400',
                      },
                      { source: 'Other', amount: '$80K', percentage: 3, color: 'bg-gray-300' },
                    ].map(item => (
                      <div key={item.source} className="flex items-center gap-4">
                        <span className="text-sm w-32 text-gray-700">{item.source}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full">
                          <div
                            className={`h-2 ${item.color} rounded-full transition-all duration-300`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900 w-16 text-right font-medium">
                          {item.amount}
                        </span>
                        <span className="text-sm text-gray-400 w-12 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Top Contributors
                  </h2>
                  <div className="space-y-4">
                    {[
                      { name: 'National Education Association', amount: '$15,000', type: 'PAC' },
                      { name: 'American Federation of Teachers', amount: '$12,500', type: 'PAC' },
                      { name: "Emily's List", amount: '$10,000', type: 'PAC' },
                      { name: 'Sierra Club', amount: '$8,500', type: 'PAC' },
                      { name: 'AFL-CIO', amount: '$7,000', type: 'PAC' },
                    ].map((contributor, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{contributor.name}</h3>
                          <p className="text-xs text-gray-400 mt-1">{contributor.type}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {contributor.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Expenditures by Category
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { category: 'Media & Advertising', amount: '$720K', percentage: 40 },
                      { category: 'Staff & Consultants', amount: '$540K', percentage: 30 },
                      { category: 'Fundraising', amount: '$270K', percentage: 15 },
                      { category: 'Travel & Events', amount: '$180K', percentage: 10 },
                      { category: 'Administrative', amount: '$90K', percentage: 5 },
                    ].map(expense => (
                      <div key={expense.category} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-gray-700">{expense.category}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {expense.amount}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-gray-200 rounded-full">
                          <div
                            className="h-1 bg-[#3ea2d4] rounded-full transition-all duration-300"
                            style={{ width: `${expense.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">
                          {expense.percentage}% of total
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'News' && (
              <div className="space-y-12">
                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Recent News Coverage
                  </h2>
                  <div className="space-y-6">
                    {[
                      {
                        id: '1',
                        headline: 'Representative Introduces Bipartisan Infrastructure Bill',
                        source: 'The Hill',
                        date: '2024-08-14',
                        summary:
                          'Legislation aims to modernize transportation networks and expand broadband access in rural communities.',
                        url: '#',
                      },
                      {
                        id: '2',
                        headline: 'Local Representative Advocates for Climate Action at Capitol',
                        source: 'Washington Post',
                        date: '2024-08-12',
                        summary:
                          'Speaking at a committee hearing, the representative emphasized the need for immediate action on renewable energy initiatives.',
                        url: '#',
                      },
                      {
                        id: '3',
                        headline: 'Healthcare Reform Bill Gains Momentum with New Co-Sponsor',
                        source: 'Politico',
                        date: '2024-08-10',
                        summary:
                          'The representative joins growing coalition supporting expanded healthcare access for underserved communities.',
                        url: '#',
                      },
                      {
                        id: '4',
                        headline: 'Education Funding Initiative Receives Bipartisan Support',
                        source: 'CNN',
                        date: '2024-08-08',
                        summary:
                          'Proposed legislation would increase federal funding for K-12 education and teacher training programs.',
                        url: '#',
                      },
                    ].map(article => (
                      <article
                        key={article.id}
                        className="border border-gray-100 rounded-lg p-6 hover:border-gray-200 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-gray-900 leading-relaxed">
                            {article.headline}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">
                          {article.summary}
                        </p>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>{article.source}</span>
                          <time>{article.date}</time>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Press Releases
                  </h2>
                  <div className="space-y-4">
                    {[
                      {
                        id: '1',
                        title: 'Statement on Infrastructure Investment and Jobs Act',
                        date: '2024-08-15',
                        excerpt:
                          "Today's passage represents a significant step forward for our district's infrastructure needs...",
                      },
                      {
                        id: '2',
                        title: 'Announcing Community Health Center Funding',
                        date: '2024-08-10',
                        excerpt:
                          'Securing $2.3 million in federal funding to expand healthcare services in underserved areas...',
                      },
                      {
                        id: '3',
                        title: 'Supporting Small Business Recovery Initiatives',
                        date: '2024-08-05',
                        excerpt:
                          'Introducing legislation to provide additional tax relief and support for local entrepreneurs...',
                      },
                    ].map(release => (
                      <div
                        key={release.id}
                        className="py-4 border-b border-gray-100 last:border-b-0"
                      >
                        <h3 className="font-medium text-gray-900">{release.title}</h3>
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                          {release.excerpt}
                        </p>
                        <time className="text-xs text-gray-400 mt-2 block">{release.date}</time>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">
                    Media Appearances
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        outlet: 'CNN Sunday Morning',
                        topic: 'Healthcare Policy',
                        date: '2024-08-11',
                      },
                      {
                        outlet: 'NPR Morning Edition',
                        topic: 'Infrastructure Bill',
                        date: '2024-08-09',
                      },
                      { outlet: 'Fox News Sunday', topic: 'Education Funding', date: '2024-08-06' },
                      { outlet: 'Meet the Press', topic: 'Climate Action', date: '2024-08-04' },
                    ].map((appearance, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium text-gray-900 text-sm">{appearance.outlet}</h3>
                        <p className="text-sm text-gray-600 mt-1">{appearance.topic}</p>
                        <time className="text-xs text-gray-400 mt-2 block">{appearance.date}</time>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="col-span-4">
            <div className="sticky top-32">
              <h3 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-4">
                Quick Stats
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Committees</span>
                  <span className="font-medium">{quickStats.committees}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Bills Sponsored</span>
                  <span className="font-medium">{quickStats.billsSponsored}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Attendance</span>
                  <span className="font-medium">{quickStats.attendance}%</span>
                </div>
              </div>

              {/* Committee Assignments */}
              {representative.committees && representative.committees.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-4">
                    Committees
                  </h3>
                  <div className="space-y-2">
                    {representative.committees.slice(0, 3).map((committee, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium text-gray-900">{committee.name}</div>
                        {committee.role && (
                          <div className="text-xs text-gray-500">{committee.role}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
