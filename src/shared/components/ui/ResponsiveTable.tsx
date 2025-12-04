/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { ReactNode } from 'react';
import { ComponentErrorBoundary } from '@/shared/components/error-boundaries';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
  /** Accessible caption/label for the table */
  caption?: string;
  /** ARIA label for the table (alternative to caption) */
  'aria-label'?: string;
}

interface ResponsiveTableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  mobileCard?: ReactNode; // Custom mobile card layout
  /** Accessible label for clickable rows */
  'aria-label'?: string;
}

interface ResponsiveTableCellProps {
  children: ReactNode;
  className?: string;
  label?: string; // Label for mobile view
  hideOnMobile?: boolean;
  priority?: 'high' | 'medium' | 'low'; // Content priority for mobile
}

/**
 * Main responsive table wrapper
 */
export function ResponsiveTable({
  children,
  className = '',
  mobileBreakpoint = 'md',
  caption,
  'aria-label': ariaLabel,
}: ResponsiveTableProps) {
  return (
    <ComponentErrorBoundary componentName="ResponsiveTable">
      <div
        className={`responsive-table-container ${className}`}
        role="region"
        aria-label={ariaLabel || caption || 'Data table'}
      >
        {/* Desktop table view */}
        <div className={`hidden ${mobileBreakpoint}:block overflow-x-auto`}>
          <table className="w-full" aria-label={ariaLabel}>
            {caption && <caption className="sr-only">{caption}</caption>}
            {children}
          </table>
        </div>

        {/* Mobile card view - will be handled by ResponsiveTableBody */}
        <div
          className={`block ${mobileBreakpoint}:hidden space-y-4`}
          role="list"
          aria-label={ariaLabel || caption || 'Data items'}
        >
          {children}
        </div>
      </div>
    </ComponentErrorBoundary>
  );
}

/**
 * Table header that's hidden on mobile
 */
export function ResponsiveTableHead({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <thead className={`bg-white border-b border-gray-200 ${className}`}>{children}</thead>;
}

/**
 * Table body that renders as cards on mobile
 */
export function ResponsiveTableBody({
  children,
  className = '',
  mobileBreakpoint = 'md',
}: {
  children: ReactNode;
  className?: string;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
}) {
  // Extract rows and render them appropriately
  const childArray = React.Children.toArray(children);

  return (
    <>
      {/* Desktop tbody */}
      <tbody className={`hidden ${mobileBreakpoint}:block divide-y divide-gray-200 ${className}`}>
        {children}
      </tbody>

      {/* Mobile card layout */}
      <div className={`block ${mobileBreakpoint}:hidden space-y-4`}>{childArray}</div>
    </>
  );
}

/**
 * Enhanced table row that can render as a card on mobile
 */
export function ResponsiveTableRow({
  children,
  className = '',
  onClick,
  mobileCard,
  'aria-label': ariaLabel,
}: ResponsiveTableRowProps) {
  const baseClasses = 'transition-colors';
  const desktopClasses = `hidden md:table-row hover:bg-white ${onClick ? 'cursor-pointer' : ''}`;
  const mobileClasses = 'block md:hidden bg-white border border-gray-200 border-2 border-black';

  // Handle keyboard activation for interactive rows
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <>
      {/* Desktop row */}
      <tr
        className={`${baseClasses} ${desktopClasses} ${className}`}
        onClick={onClick}
        onKeyDown={onClick ? handleKeyDown : undefined}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? 'button' : undefined}
        aria-label={ariaLabel}
      >
        {children}
      </tr>

      {/* Mobile card */}
      <div
        className={`${baseClasses} ${mobileClasses} ${onClick ? 'cursor-pointer hover:border-2 border-black focus:outline-none focus-visible:ring-2 focus-visible:ring-civiq-blue focus-visible:ring-offset-2' : ''} p-4`}
        onClick={onClick}
        onKeyDown={onClick ? handleKeyDown : undefined}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? 'listitem' : 'listitem'}
        aria-label={ariaLabel}
      >
        {mobileCard || (
          <div className="space-y-3">
            {React.Children.map(children, (child, index) => {
              if (React.isValidElement(child) && child.props.hideOnMobile) {
                return null;
              }
              return (
                <div key={index} className="mobile-cell">
                  {child}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Table cell that adapts to mobile layout
 */
export function ResponsiveTableCell({
  children,
  className = '',
  label,
  hideOnMobile = false,
  priority = 'medium',
}: ResponsiveTableCellProps) {
  if (hideOnMobile) {
    return <td className={`hidden md:table-cell ${className}`}>{children}</td>;
  }

  const priorityClasses = {
    high: 'order-1',
    medium: 'order-2',
    low: 'order-3',
  };

  return (
    <>
      {/* Desktop cell */}
      <td className={`hidden md:table-cell px-4 py-4 ${className}`}>{children}</td>

      {/* Mobile cell */}
      <div className={`block md:hidden ${priorityClasses[priority]}`}>
        {label && (
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            {label}
          </div>
        )}
        <div className={className}>{children}</div>
      </div>
    </>
  );
}

/**
 * Optimized mobile card component for voting records
 */
interface Vote {
  voteId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
  };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
  chamber: 'House' | 'Senate';
  rollNumber?: number;
  isKeyVote?: boolean;
  description?: string;
}

export function VoteCard({
  vote,
  onToggleExpansion,
  isExpanded,
  getPositionColor,
  getResultColor,
}: {
  vote: Vote;
  onToggleExpansion: (voteId: string) => void;
  isExpanded: boolean;
  getPositionColor: (position: string) => string;
  getResultColor: (result: string) => string;
}) {
  const detailsId = `vote-details-${vote.voteId}`;

  // Handle keyboard activation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleExpansion(vote.voteId);
    }
  };

  return (
    <article
      className="bg-white border border-gray-200 border-2 border-black hover:border-2 border-black transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-civiq-blue focus-visible:ring-offset-2"
      onClick={() => onToggleExpansion(vote.voteId)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-expanded={isExpanded}
      aria-controls={detailsId}
      aria-label={`Vote on ${vote.bill.number}: ${vote.position}. ${isExpanded ? 'Click to collapse' : 'Click to expand details'}`}
    >
      <div className="p-4">
        {/* Header with date and vote result */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-1">
              {new Date(vote.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-blue-600">{vote.bill.number}</span>
              {vote.isKeyVote && (
                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                  Key Vote
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-full border ${getPositionColor(vote.position)}`}
            >
              {vote.position}
            </span>
            <span className={`text-sm font-medium ${getResultColor(vote.result)}`}>
              {vote.result}
            </span>
          </div>
        </div>

        {/* Bill title */}
        <div className="mb-3">
          <p className={`text-sm text-gray-900 ${isExpanded ? '' : 'line-clamp-2'}`}>
            {vote.bill.title}
          </p>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div id={detailsId} className="pt-3 border-t border-gray-100 space-y-2">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Question:</span> {vote.question}
            </div>
            {vote.rollNumber && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Roll Call:</span> {vote.chamber} Roll #
                {vote.rollNumber}
              </div>
            )}
          </div>
        )}

        {/* Tap indicator */}
        <div className="flex items-center justify-center mt-3 pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-400 flex items-center gap-1" aria-hidden="true">
            <span>{isExpanded ? 'Tap to collapse' : 'Tap for details'}</span>
            <span className="text-gray-300">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Mobile-optimized header component
 */
export function ResponsiveSectionHeader({
  title,
  subtitle,
  actions,
  className = '',
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border-b border-gray-200 px-4 py-4 md:px-6 md:py-5 ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm md:text-base text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 md:gap-3">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * Touch-friendly pagination component
 */
export function TouchPagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsShown,
  totalItems: _totalItems,
  className = '',
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsShown: string;
  totalItems: number;
  className?: string;
}) {
  const buttonClasses = 'min-h-[44px] min-w-[44px] px-3 py-2 text-sm font-medium transition-colors';
  const activeClasses = 'bg-civiq-blue text-white';
  const inactiveClasses = 'bg-white text-gray-700 border border-gray-300 hover:bg-white';
  const disabledClasses = 'bg-white border-2 border-gray-300 text-gray-400 cursor-not-allowed';

  return (
    <nav
      className={`px-4 py-3 border-t border-gray-200 bg-white ${className}`}
      aria-label="Pagination"
    >
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div className="text-sm text-gray-700 text-center md:text-left" aria-live="polite">
          {itemsShown}
        </div>
        <div
          className="flex items-center justify-center gap-2"
          role="group"
          aria-label="Page navigation"
        >
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`${buttonClasses} ${currentPage === 1 ? disabledClasses : inactiveClasses}`}
            aria-label="Go to previous page"
          >
            ← Prev
          </button>

          {/* Show page numbers on larger screens */}
          <div className="hidden md:flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = i + 1;
              const isActive = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`${buttonClasses} ${isActive ? activeClasses : inactiveClasses}`}
                  aria-label={`Page ${page}${isActive ? ', current page' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Show current page on mobile */}
          <div className="md:hidden px-3 py-2 text-sm text-gray-700">
            {currentPage} of {totalPages}
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`${buttonClasses} ${
              currentPage === totalPages ? disabledClasses : inactiveClasses
            }`}
            aria-label="Go to next page"
          >
            Next →
          </button>
        </div>
      </div>
    </nav>
  );
}
