/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
// Type-only import — erased at build time. The ~51KB glossary is loaded lazily
// via dynamic import() below so it stays out of the shared client bundle that
// every page carrying a GlossaryLink would otherwise pull in.
import type { GlossaryTerm } from '@/lib/data/civic-glossary';

interface GlossaryLinkProps {
  /** The glossary term to look up (must match a term in civic-glossary.ts) */
  term: string;
  /** Optional override for the displayed text (defaults to the term name) */
  children?: React.ReactNode;
  /** Additional CSS classes on the wrapper span */
  className?: string;
}

function termToSlug(term: string): string {
  return term.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Inline glossary link — renders a dotted-underline term that, when clicked,
 * shows a compact popover with the definition and a link to the full glossary page.
 *
 * Follows the EdgeCaseTooltip pattern: click to open, Escape/X to close,
 * focus-trapped for keyboard accessibility.
 */
export default function GlossaryLink({ term, children, className = '' }: GlossaryLinkProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [glossaryTerm, setGlossaryTerm] = useState<GlossaryTerm | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Look up the term from the lazily-loaded glossary. The visible text renders
  // immediately; the interactive popover affordance appears once the glossary
  // chunk resolves. Terms not in the glossary stay plain text (unchanged).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { getTermByName } = await import('@/lib/data/civic-glossary');
        if (!cancelled) setGlossaryTerm(getTermByName(term) ?? null);
      } catch {
        if (!cancelled) setGlossaryTerm(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [term]);

  const handleClose = useCallback(() => setIsOpen(false), []);

  useFocusTrap({
    isActive: isOpen,
    onClose: handleClose,
    containerRef: popoverRef,
    lockScroll: false,
    autoFocus: false,
  });

  // If the term isn't in the glossary, render plain text
  if (!glossaryTerm) {
    return <span className={className}>{children ?? term}</span>;
  }

  const slug = termToSlug(glossaryTerm.term);

  return (
    <span className={`relative inline ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline text-inherit font-inherit underline decoration-dotted decoration-gray-400 underline-offset-2 hover:decoration-civiq-blue cursor-help transition-colors"
        aria-label={`Definition: ${glossaryTerm.term}`}
      >
        {children ?? term}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${glossaryTerm.term} definition`}
          className="absolute z-50 left-0 top-full mt-1 w-72 bg-white border-2 border-black shadow-tooltip"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-civiq-blue" />
              <span className="text-sm font-semibold text-gray-900">{glossaryTerm.term}</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close definition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Definition */}
          <div className="px-3 py-2">
            <p className="text-sm text-gray-700 leading-relaxed">{glossaryTerm.definition}</p>
          </div>

          {/* Footer link */}
          <div className="px-3 py-2 border-t border-gray-100">
            <Link
              href={`/glossary/${slug}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-civiq-blue hover:underline"
              onClick={handleClose}
            >
              Full definition & related terms
            </Link>
          </div>
        </div>
      )}
    </span>
  );
}
