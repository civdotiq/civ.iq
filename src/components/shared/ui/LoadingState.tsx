'use client';

import React from 'react';

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export function LoadingState({ message = 'Loading data...', fullPage = false }: LoadingStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-civiq-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-center">{message}</p>
      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
        Initial load may take a moment while we fetch the latest data
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        {content}
      </div>
    );
  }

  return content;
}
