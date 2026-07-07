/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * Provenance Popover (Record Card)
 *
 * Every number on the card carries its provenance: source name, as-of date,
 * and a link to the underlying government record — the "2 clicks to verify"
 * contract. Opens on hover and on tap/click (mobile has no hover), closes on
 * blur, Escape, or outside click.
 *
 * Visual spec (mockup 1a): dotted interactive-blue underline on the number;
 * 2px black popover with a tight elevation shadow (allowed for real
 * elevation only).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ProvenanceInfo {
  /** Source system, e.g. "Congress.gov" or "FEC". */
  source: string;
  /** Human-readable as-of line, e.g. "Bill status as of Jul 2, 2026". */
  asOf: string;
  /** Link to the underlying record (government site or internal page). */
  href?: string;
  /** Link label, e.g. "View bill: H.R. 1219 — became Public Law 119-24". */
  linkLabel?: string;
}

export function ProvenancePopover({
  info,
  children,
}: {
  info: ProvenanceInfo;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return (
    <span
      ref={rootRef}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Source: ${info.source}, ${info.asOf}`}
        onClick={() => setOpen(v => !v)}
        onFocus={() => setOpen(true)}
        onBlur={e => {
          if (rootRef.current && !rootRef.current.contains(e.relatedTarget as Node)) close();
        }}
        className="cursor-help border-b-2 border-dotted border-civiq-blue bg-transparent p-0 font-inherit text-inherit"
      >
        {children}
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute right-0 top-full z-20 mt-grid-1 w-[280px] border-2 border-black bg-white p-grid-2 text-left shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-900">
            Source: {info.source}
          </div>
          <div className="mb-grid-1 mt-[4px] text-xs tracking-[0.025em] text-gray-500">
            {info.asOf}
          </div>
          {info.href && info.linkLabel && (
            <a
              href={info.href}
              className="text-[13px] font-medium tracking-[0.025em] text-civiq-blue hover:underline"
            >
              {info.linkLabel} →
            </a>
          )}
        </div>
      )}
    </span>
  );
}
