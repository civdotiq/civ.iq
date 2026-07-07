/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/** Print button for the Record Card one-pager. Hidden when printing. */

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="border-2 border-black bg-black px-grid-3 py-grid-1 text-sm font-semibold text-white"
    >
      Print / Save PDF
    </button>
  );
}
