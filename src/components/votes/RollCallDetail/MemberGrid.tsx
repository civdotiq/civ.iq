'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X as XIcon, Minus, Circle } from 'lucide-react';
import { CqButton, CqChip, CqLabel } from '@/components/cq';
import type { Position, RollCallMember } from './types';

const PAGE_SIZE = 50;

interface MemberGridProps {
  members: RollCallMember[];
}

interface PositionGlyphProps {
  position: Position;
}

function PositionGlyph({ position }: PositionGlyphProps) {
  const glyphProps = { width: 14, height: 14, strokeWidth: 2.5 } as const;
  const tone = 'var(--fg1)';
  const label = position === 'Not Voting' ? 'Not voting' : position;

  let icon;
  switch (position) {
    case 'Yea':
      icon = <Check {...glyphProps} aria-hidden="true" />;
      break;
    case 'Nay':
      icon = <XIcon {...glyphProps} aria-hidden="true" />;
      break;
    case 'Present':
      icon = <Minus {...glyphProps} aria-hidden="true" />;
      break;
    default:
      icon = <Circle {...glyphProps} aria-hidden="true" />;
      break;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        border: '2px solid var(--ink)',
        borderRadius: 'var(--radius-interactive)',
        background: 'var(--bg1)',
        color: tone,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase',
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

interface MemberRowProps {
  member: RollCallMember;
  index: number;
}

function partyAccent(party: RollCallMember['party']): string {
  if (party === 'D') return 'var(--party-democrat)';
  if (party === 'R') return 'var(--civiq-red)';
  return 'var(--party-independent)';
}

function partyLabel(party: RollCallMember['party']): string {
  if (party === 'D') return 'Democrat';
  if (party === 'R') return 'Republican';
  return 'Independent';
}

function partyChipVariant(party: RollCallMember['party']): 'd' | 'r' | 'i' {
  if (party === 'D') return 'd';
  if (party === 'R') return 'r';
  return 'i';
}

function initialsFor(member: RollCallMember): string {
  const first = (member.firstName ?? '').trim();
  const last = (member.lastName ?? '').trim();
  const fi = first.charAt(0);
  const li = last.charAt(0);
  if (fi || li) return `${fi}${li}`.toUpperCase();
  return (member.fullName ?? '?').charAt(0).toUpperCase();
}

function memberHref(member: RollCallMember): string | null {
  if (!member.bioguideId) return null;
  return `/representative/${member.bioguideId}`;
}

function MemberRow({ member, index }: MemberRowProps) {
  const accent = partyAccent(member.party);
  const href = memberHref(member);
  const initials = initialsFor(member);
  const districtOrState = member.district || (member.state ? `${member.state}` : '—');

  const content = (
    <>
      <div
        style={{
          width: 48,
          height: 48,
          position: 'relative',
          border: '2px solid var(--ink)',
          background: 'var(--bg1)',
          backgroundImage:
            'repeating-linear-gradient(45deg, var(--bg2) 0 6px, var(--bg3) 6px 12px)',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: accent,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--fg1)',
          }}
        >
          {initials}
        </div>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg1)' }}>
        {member.fullName || `${member.firstName} ${member.lastName}`.trim()}
      </span>
      <CqChip variant={partyChipVariant(member.party)} filled={false} size="sm">
        {partyLabel(member.party)}
      </CqChip>
      <PositionGlyph position={member.position} />
      <span
        style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg2)',
        }}
      >
        {districtOrState}
      </span>
      <span
        aria-hidden="true"
        style={{
          fontSize: 14,
          color: href ? 'var(--fg3)' : 'var(--fg4)',
          textAlign: 'right',
        }}
      >
        {href ? '→' : ''}
      </span>
    </>
  );

  const baseStyle = {
    display: 'grid',
    gridTemplateColumns: '60px minmax(0, 1fr) 130px 150px 110px 30px',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid var(--line)',
    alignItems: 'center',
    textDecoration: 'none',
    color: 'var(--fg1)',
  } as const;

  if (href) {
    return (
      <Link key={`${member.id}-${index}`} href={href} style={baseStyle}>
        {content}
      </Link>
    );
  }
  return (
    <div key={`${member.id}-${index}`} style={baseStyle}>
      {content}
    </div>
  );
}

export function MemberGrid({ members }: MemberGridProps) {
  const [showAll, setShowAll] = useState(false);
  const total = members.length;
  const overflow = Math.max(0, total - PAGE_SIZE);
  const visible = useMemo(
    () => (showAll || overflow === 0 ? members : members.slice(0, PAGE_SIZE)),
    [members, showAll, overflow]
  );

  if (total === 0) {
    return (
      <div
        style={{
          marginTop: 16,
          padding: '14px 18px',
          border: '1px solid var(--line)',
          background: 'var(--bg2)',
          fontSize: 13,
          color: 'var(--fg2)',
        }}
      >
        Data unavailable. Individual member positions are still being parsed from the official roll
        call XML.
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '60px minmax(0, 1fr) 130px 150px 110px 30px',
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <CqLabel>Photo</CqLabel>
        <CqLabel>Member</CqLabel>
        <CqLabel>Party</CqLabel>
        <CqLabel>Vote</CqLabel>
        <CqLabel>State / district</CqLabel>
        <CqLabel>{''}</CqLabel>
      </div>

      {visible.map((member, index) => (
        <MemberRow key={`${member.id}-${index}`} member={member} index={index} />
      ))}

      {overflow > 0 && !showAll && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 18,
            paddingBottom: 4,
          }}
        >
          <CqButton variant="secondary" size="sm" onClick={() => setShowAll(true)}>
            View all {total} members
          </CqButton>
        </div>
      )}
    </>
  );
}
