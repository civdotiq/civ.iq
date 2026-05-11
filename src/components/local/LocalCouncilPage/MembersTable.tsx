/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Council roster table — 4 columns: District · Member · Title · Status.
 *
 * The reference shows 6 columns (Dist · Member · Neighborhood · Party ·
 * Att · Spon). Party, neighborhood, attendance, and sponsorship counts
 * are not returned by Legistar /OfficeRecords at the chamber level —
 * not rendered rather than fabricated. NO party color is used anywhere
 * in this table; status uses a non-partisan filled/grey treatment.
 */

import { CqChip, CqLabel } from '@/components/cq';
import type { CouncilMember } from '@/types/legistar';

interface MembersTableProps {
  members: CouncilMember[] | null;
  loading: boolean;
}

const COLUMNS = '80px 1fr 1fr 80px';
const SKELETON_ROW_COUNT = 8;

export function MembersTable({ members, loading }: MembersTableProps) {
  const showSkeleton = loading && (members === null || members.length === 0);
  const showEmpty = !loading && (members === null || members.length === 0);

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLUMNS,
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <CqLabel>District</CqLabel>
        <CqLabel>Member</CqLabel>
        <CqLabel>Title</CqLabel>
        <CqLabel>Status</CqLabel>
      </div>

      {showSkeleton &&
        Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
          <SkeletonRow key={`skeleton-${i}`} />
        ))}

      {showEmpty && (
        <div
          style={{
            padding: '36px 18px',
            borderBottom: '1px solid var(--line)',
            fontSize: 13,
            color: 'var(--fg2)',
            background: 'var(--bg2)',
          }}
        >
          Data unavailable — Legistar did not return any active council records for this city.
        </div>
      )}

      {!showSkeleton &&
        !showEmpty &&
        members?.map(member => <MemberRow key={member.id} member={member} />)}
    </div>
  );
}

function MemberRow({ member }: { member: CouncilMember }) {
  const districtLabel = member.district ?? '—';
  const titleLabel = member.title?.trim() ?? '—';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMNS,
        gap: 12,
        padding: '14px 0',
        borderBottom: '1px solid var(--line)',
        alignItems: 'center',
        minHeight: 36,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--fg1)',
        }}
      >
        {districtLabel}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg1)' }}>{member.name}</span>
      <span style={{ fontSize: 12, color: 'var(--fg2)' }}>{titleLabel}</span>
      <span>
        {member.active ? (
          <CqChip variant="info" size="sm" filled>
            Active
          </CqChip>
        ) : (
          <CqChip variant="i" size="sm" filled={false}>
            Inactive
          </CqChip>
        )}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMNS,
        gap: 12,
        padding: '14px 0',
        borderBottom: '1px solid var(--line)',
        alignItems: 'center',
        minHeight: 36,
      }}
      aria-hidden="true"
    >
      <SkeletonBar widthPct={50} />
      <SkeletonBar widthPct={70} />
      <SkeletonBar widthPct={60} />
      <SkeletonBar widthPct={40} />
    </div>
  );
}

function SkeletonBar({ widthPct }: { widthPct: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        height: 12,
        width: `${widthPct}%`,
        background: 'var(--bg2)',
      }}
    />
  );
}
