/**
 * Print button for civic pack page.
 * Client component — hidden when printing.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '8px 24px',
        backgroundColor: '#000',
        color: '#fff',
        border: 'none',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
      }}
    >
      Print / Save PDF
    </button>
  );
}
