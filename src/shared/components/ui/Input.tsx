/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, helperText, id: providedId, ...props }, ref) => {
    // Generate unique IDs for accessibility associations
    const generatedId = useId();
    const inputId = providedId || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    // Build aria-describedby based on what's present
    const describedBy = [error && errorId, helperText && !error && helperId]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-3 border transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-civiq-blue focus:ring-civiq-blue/20',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy || undefined}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
  /** Accessible label for the search input */
  'aria-label'?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, 'aria-label': ariaLabel = 'Search', ...props }, ref) => {
    return (
      <div className="relative" role="search">
        <Search
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="search"
          value={value}
          aria-label={ariaLabel}
          className={cn(
            'w-full pl-12 pr-12 py-3 border border-gray-300 ',
            'focus:outline-none focus:ring-2 focus:ring-civiq-blue/20 focus:border-civiq-blue',
            'transition-all duration-200',
            className
          )}
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
