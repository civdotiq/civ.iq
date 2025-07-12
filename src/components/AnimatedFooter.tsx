'use client';

/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
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