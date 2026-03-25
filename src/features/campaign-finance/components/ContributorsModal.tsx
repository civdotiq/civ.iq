/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * ContributorsModal Component
 *
 * Modal for viewing all individual contributors with:
 * - React.memo for performance optimization
 * - Full ARIA dialog accessibility attributes
 * - Click-outside to close
 * - Escape key to close
 * - Scroll lock when open
 */

'use client';

import React, { useCallback, useEffect } from 'react';

export interface Contributor {
  name: string;
  totalAmount: number;
  contributionCount: number;
  city: string;
  state: string;
  employer: string;
  occupation: string;
  fecTransparencyLink?: string;
  isCommittee?: boolean;
}

export interface ContributorMetadata {
  fecCandidateLink?: string;
  fecCommitteeId?: string;
  fecReceiptsLink?: string;
  totalIndividualContributors?: number;
  totalCommitteeContributors?: number;
}

export interface ContributorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contributors?: Contributor[];
  metadata?: ContributorMetadata;
}

/**
 * Format currency for display
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

/**
 * ContributorsModal - Full-featured modal with accessibility
 */
const ContributorsModalComponent: React.FC<ContributorsModalProps> = ({
  isOpen,
  onClose,
  contributors,
  metadata,
}) => {
  // Handle escape key to close modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  // Handle click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [isOpen]);

  // Focus trap - focus modal when opened
  useEffect(() => {
    if (isOpen) {
      const modal = document.getElementById('contributors-modal');
      modal?.focus();
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contributors-modal-title"
      aria-describedby="contributors-modal-description"
      className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-start justify-center p-4 sm:pt-12"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        id="contributors-modal"
        tabIndex={-1}
        className="bg-white max-w-4xl w-full max-h-[90vh] flex flex-col border-2 border-black my-4 focus:outline-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b-2 border-black flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 id="contributors-modal-title" className="text-xl sm:text-2xl font-bold">
              All Individual Contributors
            </h2>
            <p
              id="contributors-modal-description"
              className="text-xs sm:text-sm text-gray-600 mt-1"
            >
              Showing {contributors?.length || 0} of {metadata?.totalIndividualContributors || 0}{' '}
              individual contributors
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 text-gray-700 hover:text-black hover:bg-gray-100 p-2 transition-colors border-2 border-black focus:outline-none focus:ring-2 focus:ring-civiq-blue"
            aria-label="Close modal"
            title="Close (or press Escape)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {contributors && contributors.length > 0 ? (
            <div className="space-y-3" role="list" aria-label="List of contributors">
              {contributors.map((contributor, index) => (
                <div
                  key={index}
                  className="border p-4 hover:bg-white"
                  role="listitem"
                  aria-label={`${contributor.name}, ${formatCurrency(contributor.totalAmount)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {index + 1}. {contributor.name}
                        </span>
                        {contributor.fecTransparencyLink && (
                          <a
                            href={contributor.fecTransparencyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-civiq-blue hover:text-civiq-blue font-medium focus:outline-none focus:ring-2 focus:ring-civiq-blue"
                            aria-label={`View ${contributor.name} on FEC.gov (opens in new tab)`}
                          >
                            View on FEC.gov →
                          </a>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {contributor.city}, {contributor.state}
                        {contributor.employer && ` • ${contributor.employer}`}
                        {contributor.occupation && ` • ${contributor.occupation}`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {contributor.contributionCount} contribution
                        {contributor.contributionCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div
                      className="text-lg font-semibold text-civiq-green"
                      aria-label="Total amount"
                    >
                      {formatCurrency(contributor.totalAmount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No contributors to display</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white">
          {metadata?.fecReceiptsLink && (
            <a
              href={metadata.fecReceiptsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-civiq-blue hover:text-civiq-blue font-medium focus:outline-none focus:ring-2 focus:ring-civiq-blue"
              aria-label="View all contributions on FEC.gov (opens in new tab)"
            >
              View all contributions on FEC.gov →
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

ContributorsModalComponent.displayName = 'ContributorsModal';

export const ContributorsModal = React.memo(ContributorsModalComponent);
