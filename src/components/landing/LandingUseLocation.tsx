'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LandingUseLocationProps {
  className?: string;
}

export function LandingUseLocation({ className }: LandingUseLocationProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleClick = () => {
    if (busy || !('geolocation' in navigator)) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        try {
          router.push(`/results?lat=${latitude}&lng=${longitude}`);
        } finally {
          setBusy(false);
        }
      },
      () => setBusy(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  };

  return (
    <button type="button" className={className} onClick={handleClick} disabled={busy}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3ea2d4"
        strokeWidth={2.5}
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      {busy ? 'LOCATING…' : 'USE MY LOCATION'}
    </button>
  );
}
