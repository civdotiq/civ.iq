/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { FC, ReactNode, memo, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  /** Accessible label for interactive cards */
  'aria-label'?: string;
}

export const Card: FC<CardProps> = memo(
  ({
    children,
    className,
    interactive = false,
    padding = 'md',
    onClick,
    'aria-label': ariaLabel,
  }) => {
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const isClickable = interactive || onClick;

    // Handle keyboard activation for interactive cards
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (onClick && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick();
      }
    };

    return (
      <div
        className={cn(
          'bg-white border border-gray-100 border-2 border-black',
          isClickable &&
            'cursor-pointer hover:border-2 border-black hover:border-gray-200 hover:-translate-y-0.5 transform transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-civiq-blue focus-visible:ring-offset-2',
          paddingClasses[padding],
          className
        )}
        onClick={onClick}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-label={ariaLabel}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader: FC<CardHeaderProps> = ({ children, className }) => (
  <div className={cn('pb-4 border-b border-gray-100', className)}>{children}</div>
);

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export const CardTitle: FC<CardTitleProps> = ({ children, className }) => (
  <h3 className={cn('text-xl font-semibold text-gray-900', className)}>{children}</h3>
);

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export const CardContent: FC<CardContentProps> = ({ children, className }) => (
  <div className={cn('pt-4', className)}>{children}</div>
);

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter: FC<CardFooterProps> = ({ children, className }) => (
  <div className={cn('pt-4 mt-4 border-t border-gray-100', className)}>{children}</div>
);
