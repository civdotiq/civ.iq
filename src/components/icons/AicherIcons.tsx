/**
 * Geometric icons inspired by Otl Aicher's 1972 Munich Olympics design system
 * Simple, bold shapes with no gradients or complex paths
 */

export const RepresentativesIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Two figures representing representatives */}
    <circle cx="8" cy="6" r="2" />
    <circle cx="16" cy="6" r="2" />
    <rect x="4" y="11" width="8" height="10" />
    <rect x="12" y="11" width="8" height="10" />
  </svg>
);

export const LegislationIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Document lines */}
    <rect x="4" y="4" width="16" height="2" />
    <rect x="4" y="8" width="16" height="2" />
    <rect x="4" y="12" width="16" height="2" />
    <rect x="4" y="16" width="12" height="2" />
  </svg>
);

export const StatisticsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Bar chart */}
    <rect x="4" y="16" width="4" height="4" />
    <rect x="10" y="12" width="4" height="8" />
    <rect x="16" y="8" width="4" height="12" />
  </svg>
);

export const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Magnifying glass as geometric shapes */}
    <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="14" y="14" width="8" height="2" transform="rotate(45 15 15)" />
  </svg>
);

export const LocationIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Pin shape */}
    <circle cx="12" cy="10" r="3" />
    <polygon points="12,20 8,13 16,13" />
  </svg>
);

export const VoteIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Ballot box */}
    <rect x="4" y="6" width="16" height="14" />
    <rect x="8" y="3" width="8" height="5" />
  </svg>
);

export const CommitteeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Group of circles representing committee */}
    <circle cx="12" cy="8" r="2" />
    <circle cx="7" cy="14" r="2" />
    <circle cx="17" cy="14" r="2" />
  </svg>
);

export const FinanceIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Dollar sign simplified */}
    <rect x="7" y="4" width="10" height="2" />
    <rect x="7" y="11" width="10" height="2" />
    <rect x="7" y="18" width="10" height="2" />
    <rect x="11" y="2" width="2" height="20" />
  </svg>
);

export const NewsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Newspaper lines */}
    <rect x="3" y="5" width="18" height="2" />
    <rect x="3" y="9" width="8" height="2" />
    <rect x="3" y="13" width="8" height="2" />
    <rect x="3" y="17" width="8" height="2" />
    <rect x="13" y="9" width="8" height="10" />
  </svg>
);

export const DistrictIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Map grid */}
    <rect x="3" y="3" width="6" height="6" />
    <rect x="9" y="3" width="6" height="6" />
    <rect x="15" y="3" width="6" height="6" />
    <rect x="3" y="9" width="6" height="6" />
    <rect x="9" y="9" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="15" y="9" width="6" height="6" />
    <rect x="3" y="15" width="6" height="6" />
    <rect x="9" y="15" width="6" height="6" />
    <rect x="15" y="15" width="6" height="6" />
  </svg>
);

export const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Simple arrow */}
    <rect x="4" y="11" width="12" height="2" />
    <polygon points="20,12 14,8 14,16" />
  </svg>
);

export const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Checkmark */}
    <polygon points="20,7 9,18 4,13 6,11 9,14 18,5" />
  </svg>
);

export const CrossIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* X mark */}
    <rect x="11" y="3" width="2" height="18" transform="rotate(45 12 12)" />
    <rect x="11" y="3" width="2" height="18" transform="rotate(-45 12 12)" />
  </svg>
);

export const LoadingIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    {/* Loading spinner */}
    <rect x="11" y="2" width="2" height="6" fill="currentColor" opacity="0.8" />
    <rect x="11" y="16" width="2" height="6" fill="currentColor" opacity="0.3" />
    <rect x="2" y="11" width="6" height="2" fill="currentColor" opacity="0.5" />
    <rect x="16" y="11" width="6" height="2" fill="currentColor" opacity="1" />
  </svg>
);
