/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CqLabel } from '@/components/cq';
import { PanelHeader } from './PanelHeader';

/**
 * State campaign-finance is not currently wired.
 *
 * FollowTheMoney.org (the canonical state campaign-finance feed) is in
 * maintenance mode during the OpenSecrets merger, and per-state SOS feeds are
 * not yet integrated. Render a designed empty state rather than fake numbers.
 */
export function MoneyPanel() {
  return (
    <div>
      <PanelHeader
        eyebrow="Campaign finance"
        title="State filings"
        source={{ name: 'FollowTheMoney', id: 'pending' }}
      />
      <div
        style={{
          border: '2px solid var(--ink)',
          padding: '32px 28px',
          display: 'grid',
          gridTemplateColumns: '6px 1fr',
          gap: 22,
          background: 'var(--bg2)',
        }}
      >
        <div style={{ background: 'var(--color-warning)' }} aria-hidden="true" />
        <div>
          <CqLabel color="amber">Data unavailable</CqLabel>
          <p
            style={{
              fontSize: 14,
              color: 'var(--fg1)',
              margin: '8px 0 12px',
              lineHeight: 1.5,
              maxWidth: 540,
            }}
          >
            State campaign-finance is pending the FollowTheMoney / OpenSecrets merger. We will not
            display estimated, scraped, or extrapolated finance numbers at the state level until a
            primary source is wired.
          </p>
          <p
            style={{
              fontSize: 11,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            For federal officeholders, see Money on the federal profile.
            <br />
            Tracking issue: state-finance backbone (FollowTheMoney maintenance mode).
          </p>
        </div>
      </div>
    </div>
  );
}
