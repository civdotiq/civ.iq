/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { BillLink, CommitteeLink, LobbyLink } from '@/components/shared/links/EntityLinks';
import type {
  LobbyingPipelineInsight,
  LobbyingOrganizationActivity,
  TimelineAlignment,
  StanceClassification,
} from '@/lib/intelligence/types';

/**
 * InfluenceChainTable — structured table showing lobbying → legislation pipeline.
 *
 * Three sections:
 * 1. Summary row: total spending, org count, matched bill count
 * 2. Organizations table: name, spending, issue areas, filing count
 * 3. Issue-Bill alignment: issue label, lobbying $, matched bills (linked)
 *
 * Aicher design: border-2, no shadows, no rounded corners.
 */

interface InfluenceChainTableProps {
  insight: LobbyingPipelineInsight;
  className?: string;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

const STANCE_STYLES: Record<string, string> = {
  'supports legislation': 'border-[#0a9338] text-[#0a9338]',
  'opposes legislation': 'border-[#e11d07] text-[#e11d07]',
  'seeks amendment': 'border-[#3ea2d4] text-[#3ea2d4]',
  neutral: 'border-gray-500 text-gray-500',
};

const STANCE_LABELS: Record<string, string> = {
  'supports legislation': 'Supports',
  'opposes legislation': 'Opposes',
  'seeks amendment': 'Amendment',
  neutral: 'Neutral',
};

function StanceBadge({ stance }: { stance: StanceClassification }) {
  const style = STANCE_STYLES[stance.stance] ?? 'border-gray-500 text-gray-500';
  const label = STANCE_LABELS[stance.stance] ?? stance.stance;
  return (
    <span className={`inline-block border-2 px-2 py-0.5 type-xs aicher-heading ${style}`}>
      {label}
    </span>
  );
}

export function InfluenceChainTable({ insight, className = '' }: InfluenceChainTableProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <div className="bg-white border-2 border-gray-900 p-4 sm:p-6">
        <h3 className="aicher-heading type-lg text-gray-900 mb-4">
          Lobbying Pipeline: {insight.chamber}{' '}
          <CommitteeLink code={insight.committeeCode} name={insight.committeeName} />
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {formatCurrency(insight.totalSpending)}
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Total lobbying</div>
          </div>
          <div className="bg-gray-50 p-3">
            <div className="aicher-heading type-2xl text-gray-900">{insight.organizationCount}</div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Organizations</div>
          </div>
          <div className="bg-gray-50 p-3">
            <div className="aicher-heading type-2xl text-gray-900">{insight.matchedBillCount}</div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Matched bills</div>
          </div>
        </div>
      </div>

      {/* Organizations */}
      {insight.topOrganizations.length > 0 && (
        <div className="bg-white border-2 border-gray-900 p-4 sm:p-6">
          <h4 className="aicher-heading type-base text-gray-900 mb-3">Top Organizations</h4>
          <div className="overflow-x-auto">
            <table className="w-full type-sm">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-2 pr-4 aicher-heading-wide type-xs text-gray-500">
                    Organization
                  </th>
                  <th className="text-right py-2 pr-4 aicher-heading-wide type-xs text-gray-500">
                    Spending
                  </th>
                  <th className="text-right py-2 pr-4 aicher-heading-wide type-xs text-gray-500">
                    Filings
                  </th>
                  <th className="text-left py-2 pr-4 aicher-heading-wide type-xs text-gray-500 hidden sm:table-cell">
                    Issue areas
                  </th>
                  <th className="text-left py-2 aicher-heading-wide type-xs text-gray-500 hidden md:table-cell">
                    Stance
                  </th>
                </tr>
              </thead>
              <tbody>
                {insight.topOrganizations.map((org: LobbyingOrganizationActivity) => (
                  <tr key={org.name} className="border-b border-gray-200">
                    <td className="py-2 pr-4 text-gray-900">
                      <LobbyLink registrantId={org.registrantId} name={org.name} />
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-700">
                      {formatCurrency(org.totalSpending)}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-700">{org.filingCount}</td>
                    <td className="py-2 pr-4 text-gray-500 hidden sm:table-cell">
                      {org.issueCodes.slice(0, 3).join(', ')}
                      {org.issueCodes.length > 3 && ` +${org.issueCodes.length - 3}`}
                    </td>
                    <td className="py-2 text-gray-500 hidden md:table-cell">
                      {org.stance && <StanceBadge stance={org.stance} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue-Bill Alignment */}
      {insight.issueAlignments.length > 0 && (
        <div className="bg-white border-2 border-gray-900 p-4 sm:p-6">
          <h4 className="aicher-heading type-base text-gray-900 mb-3">Issue-Bill Alignment</h4>
          <div className="space-y-3">
            {insight.issueAlignments
              .filter((a: TimelineAlignment) => a.lobbyingSpending > 0)
              .slice(0, 8)
              .map((alignment: TimelineAlignment) => (
                <div key={alignment.issueCode} className="bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="aicher-heading type-sm text-gray-900">
                      {alignment.issueLabel}
                    </span>
                    <span className="type-sm text-gray-700 whitespace-nowrap">
                      {formatCurrency(alignment.lobbyingSpending)}
                    </span>
                  </div>
                  <div className="type-xs text-gray-500 mb-1">
                    {alignment.organizationCount} org{alignment.organizationCount !== 1 ? 's' : ''}
                  </div>
                  {alignment.matchedBills.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {alignment.matchedBills.slice(0, 3).map(bill => (
                        <div key={bill.id} className="type-xs text-gray-600">
                          <BillLink
                            billId={bill.id}
                            title={`${bill.type} ${bill.number}`}
                            className="type-xs"
                          />
                          {' — '}
                          <span className="text-gray-500">
                            {bill.title.length > 80
                              ? `${bill.title.substring(0, 80)}...`
                              : bill.title}
                          </span>
                        </div>
                      ))}
                      {alignment.matchedBills.length > 3 && (
                        <div className="type-xs text-gray-400">
                          +{alignment.matchedBills.length - 3} more bills
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
