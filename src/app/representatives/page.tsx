'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RepresentativesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page - users need to search by ZIP first
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to search...</p>
      </div>
    </div>
  );
}
