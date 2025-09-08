/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';

interface FECSourceLinkProps {
  candidateId: string;
  metric?: string;
  className?: string;
  showText?: boolean;
}

export const FECSourceLink: React.FC<FECSourceLinkProps> = ({
  candidateId,
  metric,
  className = '',
  showText = false,
}) => {
  // Generate FEC.gov URL based on candidate ID
  const fecUrl = `https://www.fec.gov/data/candidate/${candidateId}/`;

  const linkText = metric ? `View ${metric} data on FEC.gov` : 'View on FEC.gov';

  return (
    <a
      href={fecUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors ${className}`}
      title={linkText}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
      {showText && <span className="text-xs font-medium">FEC.gov</span>}
    </a>
  );
};

export default FECSourceLink;
