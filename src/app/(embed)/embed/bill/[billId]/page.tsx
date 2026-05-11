/**
 * Embeddable Widget: Bill Status Tracker
 * Server component - fetches data at render time via existing service layer.
 *
 * PR 22 gate: `?v=new` swaps the legacy chassis for the redesign chassis
 * (EmbedBillCard). Data resolution is shared — the new chassis renders the
 * same `bill` object the legacy body has always rendered.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import { EmbedBillCard } from '@/components/embed/EmbedBillCard';

interface PageProps {
  params: Promise<{ billId: string }>;
  searchParams: Promise<{ v?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { billId } = await params;
  return {
    title: `Bill ${billId.toUpperCase()}`,
  };
}

const STATUS_STEPS = [
  'introduced',
  'referred',
  'reported',
  'passed_house',
  'passed_senate',
  'enacted',
] as const;

const STATUS_LABELS: Record<string, string> = {
  introduced: 'Introduced',
  referred: 'In Committee',
  reported: 'Reported',
  passed_house: 'Passed House',
  passed_senate: 'Passed Senate',
  passed_both: 'Passed Both',
  enacted: 'Enacted',
  vetoed: 'Vetoed',
  failed: 'Failed',
};

function statusColor(status: string): string {
  if (status === 'enacted') return '#0a9338';
  if (status === 'failed' || status === 'vetoed') return '#e11d07';
  return '#3ea2d4';
}

function getStatusIndex(status: string): number {
  if (status === 'passed_both') return 5;
  if (status === 'enacted') return 5;
  const idx = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
  return idx >= 0 ? idx : 0;
}

export default async function EmbedBillPage({ params, searchParams }: PageProps) {
  const { billId } = await params;
  const { v } = await searchParams;

  const bill = await fetchBillFromCongress(billId);

  if (!bill) {
    return (
      <div style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Bill {billId.toUpperCase()} not found.</p>
      </div>
    );
  }

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (useRedesign) {
    return <EmbedBillCard bill={bill} />;
  }

  const currentStatus = bill.status.current;
  const activeIndex = getStatusIndex(currentStatus);

  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui, sans-serif', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <a
            href={`https://civdotiq.org/bill/${billId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontWeight: 700,
              fontSize: '16px',
              color: '#111827',
              textDecoration: 'none',
            }}
          >
            {bill.number}
          </a>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              border: '2px solid',
              borderColor: statusColor(currentStatus),
              color: statusColor(currentStatus),
              whiteSpace: 'nowrap',
            }}
          >
            {STATUS_LABELS[currentStatus] || currentStatus}
          </span>
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#374151',
            marginTop: '4px',
            lineHeight: '1.4',
          }}
        >
          {bill.title.length > 120 ? `${bill.title.substring(0, 120)}...` : bill.title}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0',
            position: 'relative',
          }}
        >
          {STATUS_STEPS.map((step, i) => {
            const isActive = i <= activeIndex;
            const isCurrent = i === activeIndex;
            return (
              <div
                key={step}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                {/* Connector line */}
                {i > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '50%',
                      width: '100%',
                      height: '2px',
                      backgroundColor: isActive ? statusColor(currentStatus) : '#e5e7eb',
                    }}
                  />
                )}
                {/* Dot */}
                <div
                  style={{
                    width: isCurrent ? '14px' : '10px',
                    height: isCurrent ? '14px' : '10px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? statusColor(currentStatus) : '#e5e7eb',
                    border: isCurrent ? `2px solid ${statusColor(currentStatus)}` : 'none',
                    position: 'relative',
                    zIndex: 1,
                  }}
                />
                {/* Label */}
                <div
                  style={{
                    fontSize: '9px',
                    color: isActive ? '#374151' : '#9ca3af',
                    marginTop: '4px',
                    textAlign: 'center',
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {STATUS_LABELS[step]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Last action */}
      {bill.status.lastAction && (
        <div
          style={{
            fontSize: '12px',
            color: '#6b7280',
            padding: '8px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
          }}
        >
          <span style={{ fontWeight: 500 }}>Latest:</span>{' '}
          {bill.status.lastAction.description.length > 100
            ? `${bill.status.lastAction.description.substring(0, 100)}...`
            : bill.status.lastAction.description}
          <span style={{ color: '#9ca3af', marginLeft: '4px' }}>
            ({new Date(bill.status.lastAction.date).toLocaleDateString()})
          </span>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '10px',
          color: '#9ca3af',
          textAlign: 'right',
        }}
      >
        Data from Congress.gov via{' '}
        <a
          href="https://civdotiq.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3ea2d4', textDecoration: 'none' }}
        >
          CIV.IQ
        </a>
      </div>
    </div>
  );
}
