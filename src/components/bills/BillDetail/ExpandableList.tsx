'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

interface ExpandableListProps {
  /** Pre-rendered, keyed rows. Every row is in the page; the rest are hidden until asked for. */
  items: ReactNode[];
  initial: number;
  /** Plural noun for the toggle, e.g. "cosponsors" → "Show all 16 cosponsors". */
  noun: string;
  containerStyle?: CSSProperties;
}

/**
 * Shows the first `initial` rows and a toggle for the rest — never a bare
 * "and N more" the reader can't open.
 */
export function ExpandableList({ items, initial, noun, containerStyle }: ExpandableListProps) {
  const [expanded, setExpanded] = useState(false);
  const hidden = items.length - initial;
  const visible = expanded || hidden <= 0 ? items : items.slice(0, initial);

  return (
    <>
      <div style={containerStyle}>{visible}</div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          aria-expanded={expanded}
          style={{
            marginTop: 12,
            padding: '8px 0',
            width: '100%',
            background: 'none',
            border: 0,
            borderTop: '1px solid var(--line)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--civiq-blue-active)',
            fontFamily: 'var(--font-primary)',
          }}
        >
          {expanded ? `Show fewer ${noun}` : `Show all ${items.length} ${noun}`}
        </button>
      )}
    </>
  );
}
