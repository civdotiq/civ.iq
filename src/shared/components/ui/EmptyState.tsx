/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('border-2 border-gray-200 p-8 text-center', className)}>
      {icon && <div className="flex justify-center mb-4 text-gray-400">{icon}</div>}
      <h3 className="aicher-heading text-lg text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-civiq-blue border-2 border-civiq-blue hover:bg-civiq-blue/10 transition-colors rounded-interactive"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
