/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShareData,
  generateTweetText,
  generateTwitterShareUrl,
  generateBlueskyShareUrl,
  generateFacebookShareUrl,
  generateRedditShareUrl,
  generateEmailShareUrl,
  generateShareUrl,
  generateShareTitle,
  isShareDataValid,
  getSectionDisplayName,
} from '@/lib/social/share-utils';
import { copyToClipboard } from '@/lib/utils/contactHelpers';
import logger from '@/lib/logging/simple-logger';

interface ShareButtonProps {
  data: ShareData;
  variant?: 'default' | 'minimal' | 'text';
  className?: string;
  onClick?: () => void;
}

/**
 * ShareButton - Multi-platform social sharing component
 *
 * Dropdown menu with Copy Link, Native Share (mobile), X, Bluesky,
 * Facebook, Reddit, and Email. Follows ExportButton dropdown pattern.
 */
export function ShareButton({
  data,
  variant = 'default',
  className = '',
  onClick,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    setHasNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  const shareUrl = generateShareUrl(data.representative.bioguideId, data.section);
  const tweetText = isShareDataValid(data) ? generateTweetText(data) : '';
  const shareTitle = isShareDataValid(data) ? generateShareTitle(data) : '';

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setIsOpen(false);
  };

  const handleNativeShare = async () => {
    setIsOpen(false);
    try {
      await navigator.share({
        title: shareTitle,
        text: tweetText,
        url: shareUrl,
      });
    } catch {
      // User cancelled or share failed — no action needed
    }
  };

  const handlePlatformShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
    setIsOpen(false);
    onClick?.();
  };

  const handleEmailShare = () => {
    const emailUrl = generateEmailShareUrl(shareTitle, `${tweetText}\n\n${shareUrl}`);
    window.location.href = emailUrl;
    setIsOpen(false);
    onClick?.();
  };

  const sectionName = getSectionDisplayName(data.section);

  const toggleButton = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isShareDataValid(data)) {
      logger.warn('Invalid share data', { data });
      return;
    }
    setIsOpen(!isOpen);
  };

  const dropdown = isOpen && (
    <>
      {/* Backdrop to close dropdown */}
      <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} aria-hidden="true" />

      {/* Dropdown menu */}
      <div
        role="menu"
        aria-orientation="vertical"
        className="absolute right-0 z-20 mt-1 w-48 border-2 border-black bg-white"
        onKeyDown={handleKeyDown}
      >
        {/* Copy Link */}
        <button
          type="button"
          role="menuitem"
          onClick={handleCopyLink}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>

        {/* Native Share (mobile) */}
        {hasNativeShare && (
          <>
            <div className="border-t border-gray-200" />
            <button
              type="button"
              role="menuitem"
              onClick={handleNativeShare}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              <span>Share...</span>
            </button>
          </>
        )}

        <div className="border-t border-gray-200" />

        {/* X / Twitter */}
        <button
          type="button"
          role="menuitem"
          onClick={() => handlePlatformShare(generateTwitterShareUrl(tweetText))}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>X / Twitter</span>
        </button>

        <div className="border-t border-gray-200" />

        {/* Bluesky */}
        <button
          type="button"
          role="menuitem"
          onClick={() => handlePlatformShare(generateBlueskyShareUrl(tweetText))}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.6 3.476 6.178 3.126-4.438.646-8.392 2.47-3.644 8.377C7.67 26.924 10.608 21.278 12 18.06c1.392 3.218 3.862 8.473 8.842 3.69 4.748-5.906.794-7.73-3.644-8.377 2.578.35 5.393-.499 6.178-3.126C23.622 9.418 24 4.458 24 3.768c0-.69-.139-1.86-.902-2.203-.66-.298-1.664-.62-4.3 1.24C16.046 4.747 13.087 8.686 12 10.8" />
          </svg>
          <span>Bluesky</span>
        </button>

        <div className="border-t border-gray-200" />

        {/* Facebook */}
        <button
          type="button"
          role="menuitem"
          onClick={() => handlePlatformShare(generateFacebookShareUrl(shareUrl))}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>Facebook</span>
        </button>

        <div className="border-t border-gray-200" />

        {/* Reddit */}
        <button
          type="button"
          role="menuitem"
          onClick={() => handlePlatformShare(generateRedditShareUrl(shareUrl, shareTitle))}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12C24 5.373 18.627 0 12 0zm6.066 13.266c.035.218.054.44.054.664 0 3.396-3.952 6.15-8.828 6.15-4.875 0-8.828-2.754-8.828-6.15 0-.225.02-.446.053-.664-.59-.34-.985-.985-.985-1.72 0-1.09.884-1.973 1.974-1.973.532 0 1.013.21 1.37.548C4.762 9.204 7.14 8.53 9.738 8.392l1.635-7.7a.346.346 0 0 1 .41-.267l5.452 1.16a2.003 2.003 0 0 1 3.867.672c0 1.105-.895 2-2 2-1.072 0-1.948-.844-1.995-1.904l-4.867-1.035-1.462 6.88c2.555.152 4.89.82 6.76 1.925.36-.344.845-.558 1.382-.558 1.09 0 1.974.883 1.974 1.973 0 .732-.393 1.374-.978 1.716z" />
            <circle cx="8.5" cy="13.5" r="1.5" />
            <circle cx="15.5" cy="13.5" r="1.5" />
            <path
              d="M9.5 17.5c0 0 1 1.5 2.5 1.5s2.5-1.5 2.5-1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
          <span>Reddit</span>
        </button>

        <div className="border-t border-gray-200" />

        {/* Email */}
        <button
          type="button"
          role="menuitem"
          onClick={handleEmailShare}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 7l-10 7L2 7" />
          </svg>
          <span>Email</span>
        </button>
      </div>
    </>
  );

  if (variant === 'minimal') {
    return (
      <div className="relative inline-block">
        <button
          onClick={toggleButton}
          className={`inline-flex items-center justify-center w-8 h-8 p-0 bg-transparent border border-gray-300 text-gray-600 cursor-pointer transition-all duration-150 hover:border-black hover:text-black hover:bg-gray-50 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-civiq-blue focus-visible:outline-offset-2 ${className}`}
          aria-label={`Share ${sectionName}`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
        {dropdown}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className="relative inline-block">
        <button
          onClick={toggleButton}
          className={`inline-flex items-center gap-2 p-0 bg-transparent border-none text-civiq-blue text-sm font-normal leading-relaxed cursor-pointer no-underline transition-colors duration-150 hover:text-black hover:underline hover:underline-offset-2 active:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-civiq-blue focus-visible:outline-offset-2 ${className}`}
          aria-label={`Share ${sectionName}`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          Share this data
        </button>
        {dropdown}
      </div>
    );
  }

  // Default variant
  return (
    <div className="relative inline-block">
      <button
        onClick={toggleButton}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-gray-300 text-gray-600 text-sm font-normal leading-relaxed cursor-pointer transition-all duration-150 hover:border-black hover:text-black hover:bg-gray-50 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-civiq-blue focus-visible:outline-offset-2 ${className}`}
        aria-label={`Share ${sectionName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="flex-shrink-0"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        <span>Share</span>
      </button>
      {dropdown}
    </div>
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
