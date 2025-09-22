'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useState } from 'react';

interface AnimatedFooterProps {
  children: React.ReactNode;
  delay?: string;
  className?: string;
}

export function AnimatedFooter({ children, delay = '0ms', className = '' }: AnimatedFooterProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Only enable animations after hydration is complete
    setIsHydrated(true);
  }, []);

  return (
    <div
      className={`${isHydrated ? 'animate-fade-in-up' : ''} ${className}`}
      style={isHydrated ? { animationDelay: delay } : undefined}
    >
      {children}
    </div>
  );
}
