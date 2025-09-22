/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-b-2 border-civiq-blue ${sizeClasses[size]} ${className}`}
    />
  );
}

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  className = '',
}: LoadingStateProps) {
  return (
    <div className={`text-center py-8 ${className}`}>
      <LoadingSpinner size={size} />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}
