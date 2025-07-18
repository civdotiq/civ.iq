/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { getAllEnhancedRepresentatives, fetchCommittees, fetchCommitteeMemberships } from '@/lib/congress-legislators';
import { COMMITTEE_NAMES, getCommitteeInfo, getSubcommittees } from '@/lib/data/committee-names';
import CommitteeActivityTimeline from '@/components/CommitteeActivityTimeline';

interface CommitteePageProps {
  params: Promise<{
    committeeId: string;
  }>;
}

interface CommitteeMember {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: string;
  role: string;
  rank?: number;
}

interface CommitteeAction {
  date: string;
  text: string;
  actionType: 'referral' | 'markup' | 'hearing' | 'vote' | 'report' | 'amendment' | 'other';
  committeeId?: string;
  voteResult?: {
    yeas: number;
    nays: number;
    present: number;
    notVoting: number;
  };
  amendmentDetails?: {
    number: string;
    sponsor: string;
    status: 'adopted' | 'rejected' | 'withdrawn';
  };
}

interface CommitteeBill {
  billId: string;
  billNumber: string;
  title: string;
  sponsor: {
    name: string;
    party: string;
    state: string;
  };
  introducedDate: string;
  latestAction: {
    date: string;
    text: string;
  };
  status: string;
  summary?: string;
  committees?: string[];
  committeeActions: CommitteeAction[];
  committeeStatus: 'referred' | 'markup_scheduled' | 'markup_completed' | 'reported' | 'stalled';
  nextCommitteeAction?: {
    type: string;
    date: string;
    description: string;
  };
  hearings?: Array<{
    date: string;
    title: string;
    witnesses?: string[];
  }>;
}

interface CommitteeReport {
  reportId: string;
  reportNumber: string;
  title: string;
  publishedDate: string;
  reportType: string;
  congress: number;
  chamber: string;
  summary?: string;
  url?: string;
  pages?: number;
}

interface TimelineItem {
  id: string;
  type: 'bill' | 'report' | 'hearing' | 'markup' | 'vote' | 'amendment';
  date: string;
  title: string;
  description: string;
  metadata: {
    billNumber?: string;
    reportNumber?: string;
    sponsor?: string;
    voteResult?: {
      yeas: number;
      nays: number;
    };
    status?: string;
    url?: string;
    committeeId?: string;
  };
  relatedItems?: string[];
  importance: 'high' | 'medium' | 'low';
}

interface TimelineStats {
  totalItems: number;
  billsCount: number;
  reportsCount: number;
  hearingsCount: number;
  markupsCount: number;
  votesCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  activityByMonth: Record<string, number>;
  mostActiveMonth: string;
}

async function fetchCommitteeBills(committeeId: string): Promise<CommitteeBill[]> {
  try {
    // In server-side rendering, we need to use the full URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/committee/${committeeId}/bills`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.bills || [];
  } catch (error) {
    console.error('Error fetching committee bills:', error);
    // Return mock data for development
    return [
      {
        billId: `119-hr-${Math.floor(Math.random() * 9999)}`,
        billNumber: `H.R. ${Math.floor(Math.random() * 9999)}`,
        title: 'Sample Legislative Act Related to Committee Activities',
        sponsor: {
          name: 'John Smith',
          party: 'Democratic',
          state: 'CA'
        },
        introducedDate: '2025-01-15',
        latestAction: {
          date: '2025-01-20',
          text: 'Referred to Committee for consideration'
        },
        status: 'In Committee',
        summary: 'This is a sample bill to demonstrate committee legislative activity.',
        committeeActions: [
          {
            date: '2025-01-20',
            text: 'Referred to Committee',
            actionType: 'referral' as const
          }
        ],
        committeeStatus: 'referred' as const
      }
    ];
  }
}

async function fetchCommitteeReports(committeeId: string): Promise<CommitteeReport[]> {
  try {
    // In server-side rendering, we need to use the full URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/committee/${committeeId}/reports`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.reports || [];
  } catch (error) {
    console.error('Error fetching committee reports:', error);
    // Return mock data for development
    return [
      {
        reportId: '119-hrpt-001',
        reportNumber: 'H. Rpt. 119-1',
        title: 'Committee Report on Sample Legislation',
        publishedDate: '2025-01-15',
        reportType: 'hrpt',
        congress: 119,
        chamber: 'house',
        summary: 'Committee report analyzing proposed legislation and providing recommendations for House consideration.'
      }
    ];
  }
}

async function fetchCommitteeTimeline(committeeId: string, filter: string = 'all'): Promise<{ timeline: TimelineItem[], stats: TimelineStats }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/committee/${committeeId}/timeline?filter=${filter}&limit=20`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return {
      timeline: data.timeline || [],
      stats: data.stats || {
        totalItems: 0,
        billsCount: 0,
        reportsCount: 0,
        hearingsCount: 0,
        markupsCount: 0,
        votesCount: 0,
        dateRange: { start: '', end: '' },
        activityByMonth: {},
        mostActiveMonth: ''
      }
    };
  } catch (error) {
    console.error('Error fetching committee timeline:', error);
    return { timeline: [], stats: {
      totalItems: 0,
      billsCount: 0,
      reportsCount: 0,
      hearingsCount: 0,
      markupsCount: 0,
      votesCount: 0,
      dateRange: { start: '', end: '' },
      activityByMonth: {},
      mostActiveMonth: ''
    }};
  }
}

async function getCommitteeData(committeeId: string) {
  try {
    const [representatives, committeeMemberships, committees, bills, reports, timelineData] = await Promise.all([
      getAllEnhancedRepresentatives(),
      fetchCommitteeMemberships(),
      fetchCommittees(),
      fetchCommitteeBills(committeeId),
      fetchCommitteeReports(committeeId),
      fetchCommitteeTimeline(committeeId)
    ]);

    // Find the committee details
    const committee = committees.find(c => c.thomas_id === committeeId);
    
    // Find all members of this committee
    const members: CommitteeMember[] = [];
    
    committeeMemberships.forEach(membership => {
      const committeeData = membership.committees.find(c => c.thomas_id === committeeId);
      if (committeeData) {
        const representative = representatives.find(r => r.bioguideId === membership.bioguide);
        if (representative) {
          members.push({
            bioguideId: representative.bioguideId,
            name: representative.name,
            party: representative.party,
            state: representative.state,
            district: representative.district,
            chamber: representative.chamber,
            role: committeeData.title || 'Member',
            rank: committeeData.rank
          });
        }
      }
    });

    // Sort members by rank (lower rank = higher position)
    members.sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank) return -1;
      if (b.rank) return 1;
      return a.name.localeCompare(b.name);
    });

    // Get comprehensive committee information
    const committeeInfo = getCommitteeInfo(committeeId);
    const subcommittees = getSubcommittees(committeeId);
    
    return {
      committee,
      committeeInfo,
      members,
      bills,
      reports,
      timeline: timelineData.timeline,
      timelineStats: timelineData.stats,
      subcommittees,
      committeeName: COMMITTEE_NAMES[committeeId] || committee?.name || committeeId
    };
  } catch (error) {
    console.error('Error fetching committee data:', error);
    return {
      committee: null,
      committeeInfo: null,
      members: [],
      bills: [],
      reports: [],
      timeline: [],
      timelineStats: {
        totalItems: 0,
        billsCount: 0,
        reportsCount: 0,
        hearingsCount: 0,
        markupsCount: 0,
        votesCount: 0,
        dateRange: { start: '', end: '' },
        activityByMonth: {},
        mostActiveMonth: ''
      },
      subcommittees: [],
      committeeName: COMMITTEE_NAMES[committeeId] || committeeId
    };
  }
}

function CommitteePageContent({ params }: CommitteePageProps) {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading committee data...</div>}>
      <CommitteePageAsync params={params} />
    </Suspense>
  );
}

async function CommitteePageAsync({ params }: CommitteePageProps) {
  const { committeeId } = await params;
  const { committee, committeeInfo, members, bills, reports, timeline, timelineStats, subcommittees, committeeName } = await getCommitteeData(committeeId);

  const getActionIcon = (actionType: CommitteeAction['actionType']) => {
    switch (actionType) {
      case 'referral': return '📥';
      case 'hearing': return '👥';
      case 'markup': return '✏️';
      case 'vote': return '🗳️';
      case 'report': return '📊';
      case 'amendment': return '📝';
      default: return '•';
    }
  };

  const getCommitteeStatusBadge = (status: CommitteeBill['committeeStatus']) => {
    switch (status) {
      case 'referred':
        return 'bg-gray-100 text-gray-800';
      case 'markup_scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'markup_completed':
        return 'bg-yellow-100 text-yellow-800';
      case 'reported':
        return 'bg-green-100 text-green-800';
      case 'stalled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  const getPartyColor = (party: string) => {
    switch (party?.toLowerCase()) {
      case 'republican':
      case 'r':
        return 'text-red-600 bg-red-50';
      case 'democrat':
      case 'democratic':
      case 'd':
        return 'text-blue-600 bg-blue-50';
      case 'independent':
      case 'i':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const leadershipMembers = members.filter(m => m.role !== 'Member');
  const regularMembers = members.filter(m => m.role === 'Member');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {committeeName}
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                {committee?.type === 'house' ? 'House' : committee?.type === 'senate' ? 'Senate' : 'Joint'} Committee
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{members.length}</div>
              <div className="text-sm text-gray-500">Total Members</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Committee Overview */}
        {committeeInfo && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Committee Overview</h2>
            <p className="text-gray-700 mb-4">{committeeInfo.description}</p>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Jurisdiction</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {committeeInfo.jurisdiction.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Activity Timeline */}
        {timeline.length > 0 && (
          <CommitteeActivityTimeline 
            committeeId={committeeId}
            initialTimeline={timeline}
            initialStats={timelineStats}
          />
        )}

        {/* Bills in Committee */}
        {bills.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Bills in Committee ({bills.length})</h2>
            <div className="space-y-6">
              {bills.map(bill => (
                <div key={bill.billId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {bill.billNumber}: {bill.title}
                      </h3>
                      <div className="text-sm text-gray-600">
                        Sponsor: {bill.sponsor.name} ({bill.sponsor.party}-{bill.sponsor.state}) • 
                        Introduced: {bill.introducedDate}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCommitteeStatusBadge(bill.committeeStatus)}`}>
                        {bill.committeeStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {bill.summary && (
                    <p className="text-sm text-gray-700 mb-3">{bill.summary}</p>
                  )}

                  {/* Next Committee Action */}
                  {bill.nextCommitteeAction && (
                    <div className="bg-blue-50 rounded p-3 mb-3">
                      <h4 className="text-sm font-semibold text-blue-900">Next Action:</h4>
                      <p className="text-sm text-blue-700">
                        {bill.nextCommitteeAction.description} - {bill.nextCommitteeAction.date}
                      </p>
                    </div>
                  )}

                  {/* Committee Action Timeline */}
                  {bill.committeeActions && bill.committeeActions.length > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Committee Activity Timeline:</h4>
                      <div className="space-y-2">
                        {bill.committeeActions.slice(0, 5).map((action, idx) => (
                          <div key={`${bill.billId}-action-${idx}`} className="flex items-start space-x-2">
                            <span className="text-lg flex-shrink-0">{getActionIcon(action.actionType)}</span>
                            <div className="flex-1 text-sm">
                              <div className="font-medium text-gray-700">{action.date}</div>
                              <div className="text-gray-600">{action.text}</div>
                              {action.voteResult && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Vote: {action.voteResult.yeas}-{action.voteResult.nays}
                                </div>
                              )}
                              {action.amendmentDetails && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Amendment {action.amendmentDetails.number} by {action.amendmentDetails.sponsor} - 
                                  <span className={`font-medium ${
                                    action.amendmentDetails.status === 'adopted' ? 'text-green-600' : 
                                    action.amendmentDetails.status === 'rejected' ? 'text-red-600' : 
                                    'text-gray-600'
                                  }`}>
                                    {action.amendmentDetails.status}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {bill.committeeActions.length > 5 && (
                          <div className="text-sm text-gray-500 italic pl-7">
                            + {bill.committeeActions.length - 5} more actions
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hearings */}
                  {bill.hearings && bill.hearings.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Committee Hearings:</h4>
                      {bill.hearings.map((hearing, idx) => (
                        <div key={`${bill.billId}-hearing-${idx}`} className="text-sm text-gray-600 mb-2">
                          <div className="font-medium">{hearing.date}: {hearing.title}</div>
                          {hearing.witnesses && hearing.witnesses.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Witnesses: {hearing.witnesses.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Committee Reports */}
        {reports.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Committee Reports ({reports.length})</h2>
            <div className="space-y-4">
              {reports.map(report => (
                <div key={report.reportId} className="border-l-4 border-green-500 pl-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {report.reportNumber}: {report.title}
                      </h3>
                      <div className="text-sm text-gray-600 mb-2">
                        Published: {report.publishedDate} • Congress: {report.congress}th • Chamber: {report.chamber}
                      </div>
                      {report.summary && (
                        <p className="text-sm text-gray-700 mb-2">{report.summary}</p>
                      )}
                      {report.url && (
                        <div className="text-sm">
                          <a 
                            href={report.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Full Report →
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        report.reportType.includes('majority') ? 'bg-blue-100 text-blue-800' :
                        report.reportType.includes('minority') ? 'bg-orange-100 text-orange-800' :
                        report.reportType.includes('conference') ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {report.reportType.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leadership */}
        {leadershipMembers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Leadership</h2>
            <div className="space-y-3">
              {leadershipMembers.map(member => (
                <div key={member.bioguideId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Link 
                      href={`/representative/${member.bioguideId}`}
                      className="text-lg font-semibold text-blue-600 hover:underline"
                    >
                      {member.name}
                    </Link>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPartyColor(member.party)}`}>
                      {member.party}-{member.state}{member.district ? `-${member.district}` : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{member.role}</div>
                    <div className="text-sm text-gray-500">{member.chamber}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Committee Members ({regularMembers.length})
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Democrats: {members.filter(m => m.party.toLowerCase().includes('democrat')).length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Republicans: {members.filter(m => m.party.toLowerCase().includes('republican')).length}</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularMembers.map(member => (
              <div key={member.bioguideId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <Link 
                  href={`/representative/${member.bioguideId}`}
                  className="block"
                >
                  <div className="font-semibold text-blue-600 hover:underline mb-2">
                    {member.name}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPartyColor(member.party)}`}>
                      {member.party}-{member.state}{member.district ? `-${member.district}` : ''}
                    </div>
                    <div className="text-xs text-gray-500">{member.chamber}</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Subcommittees */}
        {subcommittees.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Subcommittees ({subcommittees.length})</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {subcommittees.map(subcommittee => (
                <div key={subcommittee.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 mb-2">{subcommittee.name}</h3>
                  <p className="text-sm text-gray-600">ID: {subcommittee.id}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back to Representatives */}
        <div className="mt-8 text-center">
          <Link 
            href="/representatives"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            ← Back to Representatives
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CommitteePage({ params }: CommitteePageProps) {
  return <CommitteePageContent params={params} />;
}