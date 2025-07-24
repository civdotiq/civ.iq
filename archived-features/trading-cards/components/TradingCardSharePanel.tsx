/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { EnhancedRepresentative } from '@/types/representative';
import { 
  generateShareUrl, 
  openShareWindow, 
  copyImageToClipboard,
  copyTextToClipboard,
  generateShareText
} from '@/lib/socialSharing';

interface CardStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  description: string;
}

interface TradingCardSharePanelProps {
  representative: EnhancedRepresentative;
  stats: CardStat[];
  imageBlob?: Blob;
  imageUrl?: string;
  onClose?: () => void;
}

export function TradingCardSharePanel({ 
  representative, 
  stats, 
  imageBlob,
  imageUrl,
  onClose 
}: TradingCardSharePanelProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const [shareStatus, setShareStatus] = useState<string>('');

  const handleSocialShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'email') => {
    // Generate a shareable URL with OG metadata
    const ogUrl = `/api/trading-card/og-image?bioguideId=${representative.bioguideId}&name=${encodeURIComponent(representative.name)}&state=${representative.state}&district=${representative.district || ''}&title=${encodeURIComponent(representative.title)}`;
    const shareableUrl = `${window.location.origin}${ogUrl}`;
    
    const result = generateShareUrl({
      representative,
      stats,
      platform,
      imageUrl: shareableUrl
    });

    if (result.success && result.url) {
      if (platform === 'email') {
        window.location.href = result.url;
      } else {
        openShareWindow(result.url, platform);
      }
      setShareStatus(`Shared on ${platform}`);
    } else {
      setShareStatus(`Failed to share: ${result.error}`);
    }
  };

  const handleCopyImage = async () => {
    if (!imageBlob) {
      setCopyStatus('error');
      return;
    }

    setCopyStatus('copying');
    const success = await copyImageToClipboard(imageBlob);
    setCopyStatus(success ? 'success' : 'error');
    
    if (success) {
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  const handleCopyLink = async () => {
    const shareText = generateShareText(representative, stats, 'twitter');
    const fullText = `${shareText}\n\n${window.location.href}`;
    
    const success = await copyTextToClipboard(fullText);
    setShareStatus(success ? 'Link copied!' : 'Failed to copy link');
    
    if (success) {
      setTimeout(() => setShareStatus(''), 3000);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Share Trading Card</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Social Media Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => handleSocialShare('twitter')}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span className="font-medium">Share on X</span>
        </button>

        <button
          onClick={() => handleSocialShare('facebook')}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span className="font-medium">Facebook</span>
        </button>

        <button
          onClick={() => handleSocialShare('linkedin')}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          <span className="font-medium">LinkedIn</span>
        </button>

        <button
          onClick={() => handleSocialShare('email')}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">Email</span>
        </button>
      </div>

      {/* Copy Actions */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        {imageBlob && (
          <button
            onClick={handleCopyImage}
            disabled={copyStatus === 'copying'}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all ${
              copyStatus === 'success' 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : copyStatus === 'error'
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {copyStatus === 'copying' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                <span>Copying image...</span>
              </>
            ) : copyStatus === 'success' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Image copied!</span>
              </>
            ) : copyStatus === 'error' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Copy failed</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Copy Image to Clipboard</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span>Copy Share Link</span>
        </button>
      </div>

      {/* Status Messages */}
      {shareStatus && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm text-center">
          {shareStatus}
        </div>
      )}

      {/* Attribution */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Trading cards powered by CIV.IQ - Your Civic Intelligence Hub
        </p>
      </div>
    </div>
  );
}

export default TradingCardSharePanel;