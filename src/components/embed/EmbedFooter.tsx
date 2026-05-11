/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Shared bottom attribution mark for the embed chassis (PR 22).
 * "Data via CIV.IQ · {timestamp}" — one tag at the bottom, mono 9px,
 * fg3. Links to the canonical non-embed page so the host site can
 * route readers back to civdotiq.org.
 */

import { CqLogoMark } from '@/components/cq';

interface EmbedFooterProps {
  canonicalUrl: string;
  timestamp: string;
}

export function EmbedFooter({ canonicalUrl, timestamp }: EmbedFooterProps) {
  return (
    <div
      className="civiq-embed-footer"
      style={{
        borderTop: '2px solid var(--ink)',
        padding: '10px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        background: 'var(--bg1)',
      }}
    >
      <a
        href={canonicalUrl}
        target="_top"
        rel="noopener"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--fg1)',
          textDecoration: 'none',
        }}
      >
        <CqLogoMark size={14} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--fg3)',
            letterSpacing: '0.04em',
          }}
        >
          Data via CIV.IQ · {timestamp}
        </span>
      </a>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--fg3)',
          letterSpacing: '0.04em',
        }}
      >
        civdotiq.org
      </span>
    </div>
  );
}
