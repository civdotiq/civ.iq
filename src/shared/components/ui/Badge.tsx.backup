/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className,
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};

interface PartyBadgeProps {
  party: 'Republican' | 'Democrat' | 'Independent' | string;
  className?: string;
}

export const PartyBadge: FC<PartyBadgeProps> = ({ party, className }) => {
  const getVariant = () => {
    switch (party) {
      case 'Republican':
        return 'danger';
      case 'Democrat':
        return 'info';
      default:
        return 'default';
    }
  };

  const getAbbreviation = () => {
    switch (party) {
      case 'Republican':
        return 'R';
      case 'Democrat':
        return 'D';
      case 'Independent':
        return 'I';
      default:
        return party.charAt(0);
    }
  };

  return (
    <Badge variant={getVariant()} className={className}>
      {getAbbreviation()}
    </Badge>
  );
};

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending';
  className?: string;
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, className }) => {
  const variants = {
    active: 'success',
    inactive: 'default',
    pending: 'warning',
  } as const;

  const labels = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
  };

  return (
    <Badge variant={variants[status]} className={className}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {labels[status]}
    </Badge>
  );
};
