/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AicherSidebarCardProps {
  title: string;
  icon: LucideIcon;
  variant?: 'default' | 'highlight' | 'warning';
  children: React.ReactNode;
  className?: string;
}

export function AicherSidebarCard({
  title,
  icon: Icon,
  variant = 'default',
  children,
  className = '',
}: AicherSidebarCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'highlight':
        return 'aicher-sidebar-card highlight';
      case 'warning':
        return 'aicher-sidebar-card warning';
      default:
        return 'aicher-sidebar-card';
    }
  };

  return (
    <div className={`${getVariantClasses()} ${className}`}>
      {/* Sidebar Header */}
      <div className="aicher-sidebar-header">
        <div className="w-5 h-5 opacity-80">
          <Icon className="w-full h-full" strokeWidth={2} />
        </div>
        <h3 className="aicher-heading-wide type-sm">{title}</h3>
      </div>

      {/* Sidebar Content */}
      <div className="p-3">{children}</div>
    </div>
  );
}
