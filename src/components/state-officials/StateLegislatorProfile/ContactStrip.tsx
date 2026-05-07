/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CqLabel } from '@/components/cq';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

interface ContactStripProps {
  legislator: EnhancedStateLegislator;
}

interface OfficeCellProps {
  label: string;
  address?: string;
  phone?: string;
}

function OfficeCell({ label, address, phone }: OfficeCellProps) {
  return (
    <div style={{ padding: '14px 16px', borderLeft: '1px solid var(--line)' }}>
      <CqLabel>{label}</CqLabel>
      <div
        style={{
          fontSize: 11,
          color: 'var(--fg2)',
          marginTop: 6,
          lineHeight: 1.5,
          minHeight: 33,
        }}
      >
        {address ?? <span style={{ color: 'var(--fg4)' }}>Address unavailable</span>}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          marginTop: 6,
          color: 'var(--fg1)',
        }}
      >
        {phone ?? <span style={{ color: 'var(--fg4)' }}>—</span>}
      </div>
    </div>
  );
}

const linkStyle = {
  fontSize: 11,
  color: 'var(--civiq-blue-active)',
  fontFamily: 'var(--font-mono)',
  textDecoration: 'underline',
  textDecorationThickness: 1,
  textUnderlineOffset: 3,
} as const;

export function ContactStrip({ legislator: l }: ContactStripProps) {
  const capitol = l.contact?.capitolOffice;
  const districts = l.contact?.districtOffices ?? [];
  const district1 = districts[0];
  const district2 = districts[1];

  const websiteHost = l.website
    ? l.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : undefined;
  const contactForm = l.contact?.contactForm;
  const twitter = l.contact?.socialMedia?.twitter;

  return (
    <div
      style={{
        marginTop: 24,
        marginBottom: 28,
        border: '2px solid var(--ink)',
        display: 'grid',
        gridTemplateColumns: '160px repeat(3, 1fr) 220px',
      }}
    >
      <div
        style={{
          background: 'var(--fg1)',
          color: '#fff',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <CqLabel style={{ color: '#fff' }}>Contact</CqLabel>
        <div
          style={{
            fontSize: 10,
            color: 'var(--fg4)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            lineHeight: 1.5,
          }}
        >
          State office
          <br />
          Constituent inquiry
        </div>
      </div>
      <OfficeCell label="State capitol" address={capitol?.address} phone={capitol?.phone} />
      <OfficeCell label="District office" address={district1?.address} phone={district1?.phone} />
      <OfficeCell label="District office" address={district2?.address} phone={district2?.phone} />
      <div
        style={{
          padding: '14px 16px',
          borderLeft: '1px solid var(--line)',
          background: 'var(--bg2)',
        }}
      >
        <CqLabel>Online</CqLabel>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {l.website && (
            <a style={linkStyle} href={l.website} target="_blank" rel="noopener noreferrer">
              {websiteHost} →
            </a>
          )}
          {contactForm && (
            <a style={linkStyle} href={contactForm} target="_blank" rel="noopener noreferrer">
              Contact form →
            </a>
          )}
          {twitter && (
            <span style={{ fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>
              @{twitter}
            </span>
          )}
          {!l.website && !contactForm && !twitter && (
            <span style={{ fontSize: 11, color: 'var(--fg4)', fontFamily: 'var(--font-mono)' }}>
              Online channels unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
