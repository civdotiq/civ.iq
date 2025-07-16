/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  getRepresentativePhotoUrls, 
  getRepresentativeInitials, 
  getAvatarBackgroundColor,
  loadImageWithFallbacks,
  type UseRepresentativePhotoResult 
} from '@/lib/representative-photos';

interface RepresentativePhotoProps {
  bioguideId: string;
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-12 h-12 text-sm',
  md: 'w-16 h-16 text-base',
  lg: 'w-20 h-20 text-lg',
  xl: 'w-24 h-24 text-xl'
};

export function RepresentativePhoto({ 
  bioguideId, 
  name, 
  className = '', 
  size = 'lg' 
}: RepresentativePhotoProps) {
  const [photoState, setPhotoState] = useState<UseRepresentativePhotoResult>({
    photoUrl: null,
    isLoading: true,
    hasError: false,
    initials: getRepresentativeInitials(name),
    backgroundColor: getAvatarBackgroundColor(name)
  });

  useEffect(() => {
    if (!bioguideId) {
      setPhotoState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true
      }));
      return;
    }

    // Directly use the API proxy URL
    const photoUrl = `/api/representative-photo/${bioguideId.toUpperCase()}`;
    
    setPhotoState(prev => ({
      ...prev,
      photoUrl: photoUrl,
      isLoading: false,
      hasError: false
    }));
  }, [bioguideId, name]);

  const baseClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0`;
  const combinedClasses = `${baseClasses} ${className}`;

  // Show loading state
  if (photoState.isLoading) {
    return (
      <div className={`${combinedClasses} bg-gray-200 animate-pulse`}>
        <div className="w-full h-full bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  // Show photo if available
  if (photoState.photoUrl && !photoState.hasError) {
    return (
      <div className={combinedClasses}>
        <img 
          src={photoState.photoUrl}
          alt={`Photo of ${name}`}
          className="w-full h-full object-cover rounded-full"
          onError={() => {
            setPhotoState(prev => ({
              ...prev,
              photoUrl: null,
              hasError: true
            }));
          }}
        />
      </div>
    );
  }

  // Fallback to initials avatar
  return (
    <div 
      className={`${combinedClasses} text-white font-semibold`}
      style={{ backgroundColor: photoState.backgroundColor }}
      title={`${name} (no photo available)`}
    >
      {photoState.initials}
    </div>
  );
}

/**
 * Hook for using representative photo data in other components
 */
export function useRepresentativePhoto(bioguideId: string, name: string): UseRepresentativePhotoResult {
  const [photoState, setPhotoState] = useState<UseRepresentativePhotoResult>({
    photoUrl: null,
    isLoading: true,
    hasError: false,
    initials: getRepresentativeInitials(name),
    backgroundColor: getAvatarBackgroundColor(name)
  });

  useEffect(() => {
    if (!bioguideId) {
      setPhotoState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true
      }));
      return;
    }

    const photoSources = getRepresentativePhotoUrls(bioguideId);
    
    setPhotoState(prev => ({
      ...prev,
      isLoading: true,
      hasError: false
    }));

    loadImageWithFallbacks(photoSources)
      .then((url) => {
        setPhotoState(prev => ({
          ...prev,
          photoUrl: url,
          isLoading: false,
          hasError: false
        }));
      })
      .catch(() => {
        setPhotoState(prev => ({
          ...prev,
          photoUrl: null,
          isLoading: false,
          hasError: true
        }));
      });
  }, [bioguideId, name]);

  return photoState;
}

// Export hook and component
export default RepresentativePhoto;