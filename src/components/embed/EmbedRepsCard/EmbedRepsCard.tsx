/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * EmbedRepsCard — mast-less render chassis for /embed/reps/[districtId]?v=new.
 * 1–3 federal reps for a district (1 House + up to 2 Senate). Width-responsive
 * via @container queries:
 *   ≤ 480 → single column stack
 *   ≥ 480 → 2-column grid
 *   ≥ 600 → 3-column grid
 */

import type { EnhancedRepresentative } from '@/types/representative';
import { CqLabel, CqChip } from '@/components/cq';
import { EmbedFooter } from '../EmbedFooter';
import '../embed-print.css';

interface EmbedRepsCardProps {
  districtId: string;
  reps: EnhancedRepresentative[];
}

function partyToken(party: string): 'd' | 'r' | 'i' {
  if (party === 'Democratic' || party === 'Democrat' || party === 'D') return 'd';
  if (party === 'Republican' || party === 'R') return 'r';
  return 'i';
}

function partyInitial(party: string): string {
  if (party === 'Democratic' || party === 'Democrat') return 'D';
  if (party === 'Republican') return 'R';
  return party.charAt(0).toUpperCase() || 'I';
}

function repInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(s => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function chamberShort(chamber: 'House' | 'Senate'): string {
  return chamber === 'Senate' ? 'Sen.' : 'House';
}

function repDistrict(rep: EnhancedRepresentative): string {
  if (rep.chamber === 'Senate') return rep.state;
  const num = rep.district?.replace(/^0+/, '') ?? '';
  return num ? `${rep.state}-${num}` : rep.state;
}

export function EmbedRepsCard({ districtId, reps }: EmbedRepsCardProps) {
  const parts = districtId.toUpperCase().split('-');
  const stateCode = parts[0] ?? '';
  const districtNum = parts[1] ?? '';
  const canonicalUrl = `https://civdotiq.org/districts/${districtId}`;

  return (
    <main className="civiq-embed-shell">
      <div className="civiq-embed-body">
        <div style={{ marginBottom: 12 }}>
          <CqLabel>Federal representatives</CqLabel>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginTop: 4,
              marginBottom: 0,
              letterSpacing: '-0.01em',
              color: 'var(--fg1)',
            }}
          >
            {stateCode}
            {districtNum ? `-${districtNum}` : ''}
          </h1>
        </div>

        <div className="civiq-embed-reps">
          {reps.map(rep => (
            <div key={rep.bioguideId} className="civiq-embed-rep-card">
              <div
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 40,
                  border: '2px solid var(--ink)',
                  background: 'var(--bg2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  flexShrink: 0,
                  color: 'var(--fg1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background:
                      partyToken(rep.party) === 'd'
                        ? 'var(--civiq-green)'
                        : partyToken(rep.party) === 'r'
                          ? 'var(--civiq-red)'
                          : 'var(--fg3)',
                  }}
                />
                {repInitials(rep.name)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <CqLabel>{chamberShort(rep.chamber)}</CqLabel>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    marginTop: 3,
                    color: 'var(--fg1)',
                  }}
                >
                  {rep.name}
                </div>
                <div style={{ marginTop: 4 }}>
                  <CqChip variant={partyToken(rep.party)} size="sm">
                    {partyInitial(rep.party)} · {repDistrict(rep)}
                  </CqChip>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <EmbedFooter
        canonicalUrl={canonicalUrl}
        timestamp={new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      />
    </main>
  );
}
