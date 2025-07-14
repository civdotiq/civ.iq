'use client';

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