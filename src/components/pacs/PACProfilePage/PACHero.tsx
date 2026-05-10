/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * PAC profile hero — Aicher mark + chips + uppercase committee name.
 *
 * The mark replaces the portrait used on official profiles: PACs aren't
 * people. The 6px-wide left stripe encodes the committee's partisan
 * alignment (D=green, R=red, nonpartisan/unknown=ink). The mark
 * lockup ("SUPER PAC", "TRAD. PAC", etc.) is derived from the FEC
 * committee_type / designation classifier.
 */

import { CqButton, CqChip } from '@/components/cq';
import {
  PAC_TYPE_HUMAN,
  PAC_TYPE_LABEL,
  chamberScopeLabel,
  partyAlignment,
  partyAlignmentLabel,
  partyStripeVar,
} from './data';
import type { CommitteeInfoPayload } from './types';

interface PACHeroProps {
  committeeId: string;
  info: CommitteeInfoPayload | null;
  loading: boolean;
}

export function PACHero({ committeeId, info, loading }: PACHeroProps) {
  const align = partyAlignment(info?.party);
  const stripe = partyStripeVar(align);
  const lockup = info?.pacType ? PAC_TYPE_LABEL[info.pacType] : { line1: 'PAC', line2: '' };
  const typeChip = info?.pacType ? PAC_TYPE_HUMAN[info.pacType] : 'Federal political committee';
  const name = info?.name ?? (loading ? 'Loading…' : `Committee ${committeeId}`);
  const treasurer = info?.treasurerName ?? null;
  const fecHref = `https://www.fec.gov/data/committee/${committeeId}/`;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr 240px',
        gap: 32,
        paddingBottom: 24,
        borderBottom: '2px solid var(--ink)',
        alignItems: 'flex-start',
      }}
    >
      {/* Aicher mark */}
      <div
        aria-hidden="true"
        style={{
          width: 120,
          height: 120,
          border: '2px solid var(--ink)',
          background: 'var(--bg1)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            background: stripe,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            paddingLeft: 6,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--fg3)',
              letterSpacing: '0.12em',
            }}
          >
            {lockup.line1}
          </div>
          {lockup.line2 && (
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                color: 'var(--fg1)',
              }}
            >
              {lockup.line2}
            </div>
          )}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {align !== 'i' && (
            <CqChip variant={align} size="sm">
              {partyAlignmentLabel(align)}
            </CqChip>
          )}
          {align === 'i' && info && (
            <CqChip variant="ink" filled={false} size="sm">
              {partyAlignmentLabel(align)}
            </CqChip>
          )}
          <CqChip variant="ink" filled={false} size="sm">
            {typeChip}
          </CqChip>
          <CqChip variant="info" filled={false} size="sm">
            {chamberScopeLabel(info?.candidateIds ?? [])}
          </CqChip>
        </div>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
            margin: '0 0 8px',
            textTransform: 'uppercase',
          }}
        >
          {name}
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--fg2)',
            margin: 0,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {`FEC · ${committeeId}`}
          {treasurer ? ` · Treasurer ${treasurer}` : ''}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <a
          href={fecHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <CqButton variant="secondary" size="sm">
            FEC filings
          </CqButton>
        </a>
        <a href="#recipients" style={{ textDecoration: 'none' }}>
          <CqButton variant="primary" size="sm">
            All recipients →
          </CqButton>
        </a>
      </div>
    </div>
  );
}
