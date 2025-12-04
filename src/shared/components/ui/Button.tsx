/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { ButtonHTMLAttributes, FC, memo } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  /** Accessible label for icon-only buttons (required when no text children) */
  'aria-label'?: string;
}

export const Button: FC<ButtonProps> = memo(
  ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    'aria-label': ariaLabel,
    ...props
  }) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

    const variants = {
      primary:
        'bg-civiq-green text-white hover:bg-green-700 hover:border-2 border-black focus-visible:ring-civiq-green',
      secondary:
        'border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-white focus-visible:ring-gray-400',
      ghost: 'text-gray-700 hover:bg-white border-2 border-gray-300 focus-visible:ring-gray-400',
      danger:
        'bg-civiq-red text-white hover:bg-red-700 hover:border-2 border-black focus-visible:ring-civiq-red',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-6 py-3',
      lg: 'px-8 py-4 text-lg',
    };

    // Determine if button is in loading state for screen readers
    const isLoading = loading;

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          isLoading && 'opacity-75 cursor-wait',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
