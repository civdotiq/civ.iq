/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect, useRef, memo, useMemo } from 'react';
import Image from 'next/image';
import {
  getRepresentativePhotoUrls,
  getRepresentativeInitials,
  getAvatarBackgroundColor,
  loadImageWithFallbacks,
  type UseRepresentativePhotoResult,
} from '@/features/representatives/services/representative-photos';
import { logger } from '@/lib/logging/logger-client';

interface RepresentativePhotoProps {
  bioguideId: string;
  name: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-12 h-12 text-sm',
  md: 'w-16 h-16 text-base',
  lg: 'w-20 h-20 text-lg',
  xl: 'w-24 h-24 text-xl',
};

const sizeDimensions = {
  xs: 32,
  sm: 48,
  md: 64,
  lg: 80,
  xl: 96,
};

export const RepresentativePhoto = memo(function RepresentativePhoto({
  bioguideId,
  name,
  className = '',
  size = 'lg',
}: RepresentativePhotoProps) {
  const [photoState, setPhotoState] = useState<UseRepresentativePhotoResult>({
    photoUrl: null,
    isLoading: false, // Start as not loading
    hasError: false,
    initials: getRepresentativeInitials(name),
    backgroundColor: getAvatarBackgroundColor(name),
  });
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bioguideId) {
      setPhotoState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
      }));
      return;
    }

    setPhotoState(prev => ({
      ...prev,
      isLoading: true,
      hasError: false,
    }));

    // Use enhanced photo service for maximum reliability
    const loadPhoto = async () => {
      try {
        const { enhancedPhotoService } = await import(
          '@/features/representatives/services/enhanced-photo-service'
        );
        const result = await enhancedPhotoService.getRepresentativePhoto(bioguideId, name);

        setPhotoState(prev => ({
          ...prev,
          photoUrl: result.photoUrl,
          isLoading: false,
          hasError: result.isGenerated, // Only consider it an error if we had to generate
        }));

        // Log success metrics
        if (result.photoUrl && !result.isGenerated) {
          logger.info(
            `Photo loaded successfully from ${result.successfulSource?.name} in ${result.loadTime}ms`
          );
        }
      } catch (error) {
        logger.warn('Enhanced photo service failed, using fallback:', {
          error: String(error),
        });

        // Fallback to original system
        const photoSources = getRepresentativePhotoUrls(bioguideId);

        try {
          const url = await loadImageWithFallbacks(photoSources, 6000);
          setPhotoState(prev => ({
            ...prev,
            photoUrl: url,
            isLoading: false,
            hasError: false,
          }));
        } catch {
          setPhotoState(prev => ({
            ...prev,
            photoUrl: null,
            isLoading: false,
            hasError: true,
          }));
        }
      }
    };

    loadPhoto();
  }, [bioguideId, name]);

  const combinedClasses = useMemo(() => {
    const baseClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0`;
    return `${baseClasses} ${className}`;
  }, [size, className]);

  // Show loading state
  if (photoState.isLoading) {
    return (
      <div ref={imgRef} className={`${combinedClasses} bg-gray-200 animate-pulse`}>
        <div className="w-full h-full bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  // Show photo if available
  if (photoState.photoUrl && !photoState.hasError) {
    return (
      <div ref={imgRef} className={combinedClasses}>
        <Image
          src={photoState.photoUrl}
          alt={`Photo of ${name}`}
          width={sizeDimensions[size]}
          height={sizeDimensions[size]}
          className="w-full h-full object-cover rounded-full"
          priority={size === 'xl'} // Prioritize larger images
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          onError={() => {
            setPhotoState(prev => ({
              ...prev,
              photoUrl: null,
              hasError: true,
            }));
          }}
        />
      </div>
    );
  }

  // Fallback to initials avatar
  return (
    <div
      ref={imgRef}
      className={`${combinedClasses} text-white font-semibold`}
      style={{ backgroundColor: photoState.backgroundColor }}
      title={`${name} (no photo available)`}
    >
      {photoState.initials}
    </div>
  );
});

/**
 * Hook for using representative photo data in other components
 */
export const useRepresentativePhoto = function (
  bioguideId: string,
  name: string
): UseRepresentativePhotoResult {
  const [photoState, setPhotoState] = useState<UseRepresentativePhotoResult>({
    photoUrl: null,
    isLoading: true,
    hasError: false,
    initials: getRepresentativeInitials(name),
    backgroundColor: getAvatarBackgroundColor(name),
  });

  useEffect(() => {
    if (!bioguideId) {
      setPhotoState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
      }));
      return;
    }

    const photoSources = getRepresentativePhotoUrls(bioguideId);

    setPhotoState(prev => ({
      ...prev,
      isLoading: true,
      hasError: false,
    }));

    loadImageWithFallbacks(photoSources, 6000)
      .then(url => {
        setPhotoState(prev => ({
          ...prev,
          photoUrl: url,
          isLoading: false,
          hasError: false,
        }));
      })
      .catch(error => {
        logger.warn('Failed to load representative photo in hook:', {
          error: error.message,
        });
        setPhotoState(prev => ({
          ...prev,
          photoUrl: null,
          isLoading: false,
          hasError: true,
        }));
      });
  }, [bioguideId, name]);

  return photoState;
};

// Export hook and component
export default RepresentativePhoto;
