/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import {
  ShareData,
  generateTweetText,
  generateTwitterShareUrl,
  isShareDataValid,
  getSectionDisplayName,
} from '@/lib/social/share-utils';
import logger from '@/lib/logging/simple-logger';

interface ShareButtonProps {
  data: ShareData;
  variant?: 'default' | 'minimal' | 'text';
  className?: string;
  onClick?: () => void;
}

/**
 * ShareButton - Rams-inspired social sharing component
 *
 * Design principles:
 * - Single purpose: Share data to X.com
 * - Minimal visual design: Icon + optional text
 * - Clear interaction: Hover state only
 * - No tracking, no popups, no clutter
 */
export function ShareButton({
  data,
  variant = 'default',
  className = '',
  onClick,
}: ShareButtonProps) {
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!isShareDataValid(data)) {
      logger.warn('Invalid share data', { data });
      return;
    }

    const tweetText = generateTweetText(data);
    const shareUrl = generateTwitterShareUrl(tweetText);

    // Open in new window
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=550,height=420');

    // Call optional onClick handler
    onClick?.();
  };

  const sectionName = getSectionDisplayName(data.section);

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleShare}
        className={`inline-flex items-center justify-center w-8 h-8 p-0 bg-transparent border border-gray-300 text-gray-600 cursor-pointer transition-all duration-150 hover:border-black hover:text-black hover:bg-gray-50 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-civiq-blue focus-visible:outline-offset-2 ${className}`}
        aria-label={`Share ${sectionName} on X`}
        title={`Share ${sectionName} on X`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          strokeLinejoin="miter"
          aria-hidden="true"
        >
          {/* X.com logo (simplified geometric) */}
          <path d="M4 4L20 20M20 4L4 20" />
        </svg>
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleShare}
        className={`inline-flex items-center gap-2 p-0 bg-transparent border-none text-civiq-blue text-sm font-normal leading-relaxed cursor-pointer no-underline transition-colors duration-150 hover:text-black hover:underline hover:underline-offset-2 active:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-civiq-blue focus-visible:outline-offset-2 ${className}`}
        aria-label={`Share ${sectionName} on X`}
      >
        Share this data
      </button>
    );
  }

  // Default variant
  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-gray-300 text-gray-600 text-sm font-normal leading-relaxed cursor-pointer transition-all duration-150 hover:border-black hover:text-black hover:bg-gray-50 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-civiq-blue focus-visible:outline-offset-2 ${className}`}
      aria-label={`Share ${sectionName} on X`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <path d="M4 4L20 20M20 4L4 20" />
      </svg>
      <span>Share</span>
    </button>
  );
}

/**
 * ShareIconButton - Icon-only variant (alias for minimal)
 */
export function ShareIconButton(props: Omit<ShareButtonProps, 'variant'>) {
  return <ShareButton {...props} variant="minimal" />;
}

/**
 * ShareTextButton - Text-only variant
 */
export function ShareTextButton(props: Omit<ShareButtonProps, 'variant'>) {
  return <ShareButton {...props} variant="text" />;
}
