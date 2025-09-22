'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  showItemsPerPage?: boolean;
  showInfo?: boolean;
  maxVisiblePages?: number;
  loading?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  showInfo = true,
  maxVisiblePages = 7,
  loading = false,
  className = '',
}: PaginationProps) {
  const [visiblePages, setVisiblePages] = useState<number[]>([]);

  // Calculate visible page numbers
  useEffect(() => {
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, currentPage + half);

    // Adjust if we're near the beginning or end
    if (end - start + 1 < maxVisiblePages) {
      if (start === 1) {
        end = Math.min(totalPages, start + maxVisiblePages - 1);
      } else if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    setVisiblePages(pages);
  }, [currentPage, totalPages, maxVisiblePages]);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const itemsPerPageOptions = [10, 20, 50, 100];

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Items info */}
      {showInfo && (
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          className={`
      px-3 py-2 text-sm font-medium transition-colors
      ${
        currentPage <= 1 || loading
          ? 'text-gray-400 cursor-not-allowed bg-white border-2 border-gray-300'
          : 'text-gray-700 bg-white border border-gray-300 hover:bg-white'
      }
     `}
        >
          Previous
        </button>

        {/* First page */}
        {visiblePages[0] && visiblePages[0] > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              disabled={loading}
              className={`
        px-3 py-2 text-sm font-medium transition-colors
        ${
          currentPage === 1
            ? 'bg-civiq-red text-white'
            : 'text-gray-700 bg-white border border-gray-300 hover:bg-white'
        }
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
       `}
            >
              1
            </button>
            {visiblePages[0] && visiblePages[0] > 2 && (
              <span className="px-2 py-2 text-gray-500">...</span>
            )}
          </>
        )}

        {/* Visible page numbers */}
        {visiblePages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={loading}
            className={`
       px-3 py-2 text-sm font-medium transition-colors
       ${
         currentPage === page
           ? 'bg-civiq-red text-white'
           : 'text-gray-700 bg-white border border-gray-300 hover:bg-white'
       }
       ${loading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
          >
            {page}
          </button>
        ))}

        {/* Last page */}
        {visiblePages.length > 0 && visiblePages[visiblePages.length - 1]! < totalPages && (
          <>
            {visiblePages.length > 0 && visiblePages[visiblePages.length - 1]! < totalPages - 1 && (
              <span className="px-2 py-2 text-gray-500">...</span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={loading}
              className={`
        px-3 py-2 text-sm font-medium transition-colors
        ${
          currentPage === totalPages
            ? 'bg-civiq-red text-white'
            : 'text-gray-700 bg-white border border-gray-300 hover:bg-white'
        }
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
       `}
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          className={`
      px-3 py-2 text-sm font-medium transition-colors
      ${
        currentPage >= totalPages || loading
          ? 'text-gray-400 cursor-not-allowed bg-white border-2 border-gray-300'
          : 'text-gray-700 bg-white border border-gray-300 hover:bg-white'
      }
     `}
        >
          Next
        </button>
      </div>

      {/* Items per page selector */}
      {showItemsPerPage && onItemsPerPageChange && (
        <div className="flex items-center gap-2">
          <label htmlFor="items-per-page" className="text-sm text-gray-700">
            Items per page:
          </label>
          <select
            id="items-per-page"
            value={itemsPerPage}
            onChange={e => onItemsPerPageChange(Number(e.target.value))}
            disabled={loading}
            className={`
       border border-gray-300 px-3 py-1 text-sm
       ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
          >
            {itemsPerPageOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// Hook for managing pagination state
export function usePagination(initialPage: number = 1, initialItemsPerPage: number = 20) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = (totalPages: number) => {
    setCurrentPage(totalPages);
  };

  const changeItemsPerPage = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const reset = () => {
    setCurrentPage(initialPage);
    setItemsPerPage(initialItemsPerPage);
  };

  return {
    currentPage,
    itemsPerPage,
    goToPage,
    goToFirstPage,
    goToLastPage,
    changeItemsPerPage,
    reset,
  };
}

// Utility function to calculate pagination data
export function calculatePagination(totalItems: number, currentPage: number, itemsPerPage: number) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return {
    totalPages,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

// Simple pagination component for basic use cases
export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1 || loading}
        className={`
     px-4 py-2 text-sm font-medium transition-colors
     ${
       currentPage <= 1 || loading
         ? 'text-gray-400 cursor-not-allowed'
         : 'text-civiq-red hover:bg-civiq-red hover:text-white border border-civiq-red'
     }
    `}
      >
        ← Previous
      </button>

      <span className="px-4 py-2 text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages || loading}
        className={`
     px-4 py-2 text-sm font-medium transition-colors
     ${
       currentPage >= totalPages || loading
         ? 'text-gray-400 cursor-not-allowed'
         : 'text-civiq-red hover:bg-civiq-red hover:text-white border border-civiq-red'
     }
    `}
      >
        Next →
      </button>
    </div>
  );
}
