'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface FallbackImageProps {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackIcon?: React.ReactNode;
  loading?: 'lazy' | 'eager';
  quality?: number;
  sizes?: string;
}

export function FallbackImage({
  src,
  alt,
  width,
  height,
  className = '',
  fallbackIcon,
  loading = 'lazy',
  quality = 75,
  sizes,
}: FallbackImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // Show fallback if no src, or if image failed to load
  if (!src || hasError) {
    return (
      <div
        className={`bg-gray-100 border border-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        {fallbackIcon || (
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
      {isLoading && (
        <div
          className={`absolute inset-0 bg-gray-100 border border-gray-200 flex items-center justify-center ${className}`}
        >
          <div className="animate-pulse">
            <div className="w-6 h-6 bg-gray-300 rounded"></div>
          </div>
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        loading={loading}
        quality={quality}
        sizes={sizes}
        style={isLoading ? { opacity: 0 } : { opacity: 1 }}
      />
    </div>
  );
}

export default FallbackImage;
