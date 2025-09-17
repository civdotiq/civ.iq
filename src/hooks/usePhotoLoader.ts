import { useRef, useEffect, useState } from 'react';

interface PhotoState {
  url: string | null;
  loading: boolean;
  error: boolean;
}

// Global cache to prevent duplicate requests across components
const photoCache = new Map<string, Promise<string | null>>();

export function usePhotoLoader(bioguideId: string | undefined): PhotoState {
  const [state, setState] = useState<PhotoState>({
    url: null,
    loading: false,
    error: false,
  });

  // Prevent duplicate requests in React Strict Mode
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!bioguideId || loadingRef.current) return;

    loadingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: false }));

    // Check cache first
    if (photoCache.has(bioguideId)) {
      photoCache
        .get(bioguideId)!
        .then(url => {
          setState({ url, loading: false, error: false });
          loadingRef.current = false;
        })
        .catch(() => {
          setState({ url: null, loading: false, error: true });
          loadingRef.current = false;
        });
      return;
    }

    // Create new request and cache it
    const fetchPhoto = async (): Promise<string | null> => {
      try {
        const response = await fetch(`/api/representative-photo/${bioguideId}`, {
          method: 'HEAD',
        });
        return response.ok ? `/api/representative-photo/${bioguideId}` : null;
      } catch {
        return null;
      }
    };

    const promise = fetchPhoto();
    photoCache.set(bioguideId, promise);

    promise
      .then(url => {
        setState({ url, loading: false, error: false });
        loadingRef.current = false;
      })
      .catch(() => {
        setState({ url: null, loading: false, error: true });
        loadingRef.current = false;
      });

    // Cleanup
    return () => {
      loadingRef.current = false;
    };
  }, [bioguideId]);

  return state;
}
