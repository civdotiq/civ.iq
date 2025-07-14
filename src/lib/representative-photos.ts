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

/**
 * Representative Photo Utilities
 * 
 * This module provides utilities for generating and managing
 * representative photos from various public sources.
 */

export interface PhotoSources {
  primary: string;
  fallback: string[];
}

/**
 * Generate photo URLs for a representative using their bioguide ID
 */
export function getRepresentativePhotoUrls(bioguideId: string): PhotoSources {
  if (!bioguideId) {
    return {
      primary: '',
      fallback: []
    };
  }

  const upperBioguide = bioguideId.toUpperCase();
  
  return {
    // Primary source: Our API proxy to bypass CORS
    primary: `/api/representative-photo/${upperBioguide}`,
    
    // Direct URLs as fallback (may work in some contexts)
    fallback: [
      `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/${upperBioguide}.jpg`,
      `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/${upperBioguide}.jpg`,
      `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/original/${upperBioguide}.jpg`
    ]
  };
}

/**
 * Generate initials from a representative's name for fallback display
 */
export function getRepresentativeInitials(name: string): string {
  if (!name) return '?';
  
  // Split name and get first letter of each part
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  // Get first letter of first name and last name
  const firstName = parts[0].charAt(0);
  const lastName = parts[parts.length - 1].charAt(0);
  
  return (firstName + lastName).toUpperCase();
}

/**
 * Generate a consistent background color based on the representative's name
 * This creates a consistent avatar color for each person
 */
export function getAvatarBackgroundColor(name: string): string {
  if (!name) return '#6B7280'; // Gray default
  
  // Simple hash of the name to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to a pleasant color palette
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#8B5CF6', // Violet
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6366F1'  // Indigo
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get the party color for styling
 */
export function getPartyColor(party: string): string {
  const normalizedParty = party.toLowerCase();
  
  if (normalizedParty.includes('democrat') || normalizedParty.includes('dem')) {
    return '#3B82F6'; // Blue
  }
  
  if (normalizedParty.includes('republican') || normalizedParty.includes('rep')) {
    return '#EF4444'; // Red
  }
  
  if (normalizedParty.includes('independent') || normalizedParty.includes('ind')) {
    return '#8B5CF6'; // Purple
  }
  
  return '#6B7280'; // Gray for others
}

/**
 * Image loading utility with retry logic
 */
export function loadImageWithFallbacks(sources: PhotoSources): Promise<string> {
  return new Promise((resolve, reject) => {
    const allSources = [sources.primary, ...sources.fallback].filter(Boolean);
    
    let currentIndex = 0;
    
    function tryNextImage() {
      if (currentIndex >= allSources.length) {
        reject(new Error('All image sources failed to load'));
        return;
      }
      
      const img = new Image();
      const currentUrl = allSources[currentIndex];
      
      img.onload = () => {
        resolve(currentUrl);
      };
      
      img.onerror = () => {
        currentIndex++;
        tryNextImage();
      };
      
      // Set CORS to anonymous for cross-origin images
      img.crossOrigin = 'anonymous';
      img.src = currentUrl;
    }
    
    tryNextImage();
  });
}

/**
 * React hook-friendly photo loader
 */
export interface UseRepresentativePhotoResult {
  photoUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
  initials: string;
  backgroundColor: string;
}

// Export types for use in components
// UseRepresentativePhotoResult is already exported above