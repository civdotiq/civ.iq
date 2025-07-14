/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
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