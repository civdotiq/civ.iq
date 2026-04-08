/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { AlertSubscribeForm } from './AlertSubscribeForm';

interface AlertSubscribeButtonProps {
  bioguideId: string;
  name: string;
  className?: string;
}

/**
 * "Get alerts" button that expands to show the AlertSubscribeForm inline.
 * Designed to sit alongside the ShareIconButton in the hero header.
 */
export function AlertSubscribeButton({
  bioguideId,
  name,
  className = '',
}: AlertSubscribeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const entities = [{ type: 'representative' as const, id: bioguideId, name }];

  if (isOpen) {
    return (
      <div className={`mt-4 max-w-md ${className}`}>
        <AlertSubscribeForm
          entities={entities}
          onSuccess={() => {
            // Keep showing the success message
          }}
          onCancel={() => setIsOpen(false)}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className={`flex items-center gap-1.5 text-sm text-gray-600 hover:text-civiq-blue transition-colors ${className}`}
      aria-label={`Get email alerts for ${name}`}
      title="Get email alerts"
    >
      <Bell className="w-4 h-4" />
      <span className="hidden sm:inline">Get alerts</span>
    </button>
  );
}
