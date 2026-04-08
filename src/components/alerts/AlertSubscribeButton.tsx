/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { AlertSubscribeForm } from './AlertSubscribeForm';

interface AlertSubscribeButtonProps {
  bioguideId: string;
  name: string;
  chamber: 'House' | 'Senate';
  className?: string;
}

/**
 * "Get alerts" button with dropdown form.
 * The button stays inline (works in flex rows). The form drops down
 * as an absolutely-positioned panel so it doesn't displace surrounding layout.
 */
export function AlertSubscribeButton({
  bioguideId,
  name,
  chamber,
  className = '',
}: AlertSubscribeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const entities = [{ type: 'representative' as const, id: bioguideId, name, chamber }];

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-civiq-blue transition-colors"
        aria-label={`Get email alerts for ${name}`}
        aria-expanded={isOpen}
        title="Get email alerts"
      >
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">Get alerts</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 w-80 shadow-md bg-white">
          <AlertSubscribeForm entities={entities} onCancel={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
}
