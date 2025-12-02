/**
 * Aicher-Style Icon System
 * Based on Otl Aicher's 1972 Munich Olympics pictogram design principles:
 * - Grid-based construction (24x24 base grid)
 * - Uniform stroke weight (2px)
 * - Geometric primitives only (circles, rectangles, lines)
 * - Right angles and 45° diagonals
 * - Solid black fills, no gradients
 * - Human figures: circle head (r=2-3), rectangular torso, bar limbs
 */

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Single Representative - Aicher human figure
 * Circle head, rectangular torso, separate legs
 */
export const RepresentativeIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Head */}
    <circle cx="12" cy="4" r="3" />
    {/* Torso */}
    <rect x="9" y="8" width="6" height="7" />
    {/* Left leg */}
    <rect x="9" y="15" width="2" height="7" />
    {/* Right leg */}
    <rect x="13" y="15" width="2" height="7" />
  </svg>
);

/**
 * Two Representatives - for list views
 */
export const RepresentativesIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Left figure */}
    <circle cx="7" cy="5" r="2.5" />
    <rect x="5" y="8" width="4" height="5" />
    <rect x="5" y="13" width="1.5" height="5" />
    <rect x="7.5" y="13" width="1.5" height="5" />
    {/* Right figure */}
    <circle cx="17" cy="5" r="2.5" />
    <rect x="15" y="8" width="4" height="5" />
    <rect x="15" y="13" width="1.5" height="5" />
    <rect x="17.5" y="13" width="1.5" height="5" />
  </svg>
);

/**
 * Bill/Legislation - Document with lines
 */
export const LegislationIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Document outline */}
    <rect x="4" y="2" width="16" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Text lines */}
    <rect x="7" y="6" width="10" height="2" />
    <rect x="7" y="10" width="10" height="2" />
    <rect x="7" y="14" width="6" height="2" />
  </svg>
);

/**
 * Statistics/Chart - Bar chart with baseline
 */
export const StatisticsIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Bars */}
    <rect x="4" y="14" width="4" height="6" />
    <rect x="10" y="8" width="4" height="12" />
    <rect x="16" y="4" width="4" height="16" />
    {/* Baseline */}
    <rect x="2" y="20" width="20" height="2" />
  </svg>
);

/**
 * Search - Magnifying glass (geometric)
 */
export const SearchIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Lens */}
    <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Handle - rectangular bar at 45° */}
    <rect x="15" y="14" width="8" height="2.5" transform="rotate(45 15 14)" />
  </svg>
);

/**
 * Location/Pin - Map marker
 */
export const LocationIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Pin head - circle with hole */}
    <circle cx="12" cy="9" r="7" />
    <circle cx="12" cy="9" r="3" fill="white" />
    {/* Pin point */}
    <polygon points="12,22 7,14 17,14" />
  </svg>
);

/**
 * Vote/Ballot - Checkmark in box
 */
export const VoteIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Ballot box */}
    <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Checkmark */}
    <polygon points="6,12 10,16 18,8 18,11 10,19 6,15" />
  </svg>
);

/**
 * Committee/Group - Three Aicher-style figures
 */
export const CommitteeIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Center person (front) */}
    <circle cx="12" cy="4" r="2.5" />
    <rect x="10" y="7" width="4" height="5" />
    <rect x="10" y="12" width="1.5" height="5" />
    <rect x="12.5" y="12" width="1.5" height="5" />
    {/* Left person (back, smaller) */}
    <circle cx="5" cy="6" r="2" />
    <rect x="3.5" y="9" width="3" height="4" />
    <rect x="3.5" y="13" width="1" height="4" />
    <rect x="5.5" y="13" width="1" height="4" />
    {/* Right person (back, smaller) */}
    <circle cx="19" cy="6" r="2" />
    <rect x="17.5" y="9" width="3" height="4" />
    <rect x="17.5" y="13" width="1" height="4" />
    <rect x="19.5" y="13" width="1" height="4" />
  </svg>
);

/**
 * Finance/Money - Dollar in circle
 */
export const FinanceIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Circle */}
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Dollar sign - vertical bar */}
    <rect x="11" y="4" width="2" height="16" />
    {/* Dollar sign - S curves simplified as horizontal bars */}
    <rect x="8" y="7" width="6" height="2" />
    <rect x="10" y="11" width="4" height="2" />
    <rect x="10" y="15" width="6" height="2" />
  </svg>
);

/**
 * News/Newspaper
 */
export const NewsIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Paper outline */}
    <rect x="2" y="3" width="20" height="18" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Headline */}
    <rect x="5" y="6" width="14" height="3" />
    {/* Column 1 lines */}
    <rect x="5" y="11" width="6" height="1.5" />
    <rect x="5" y="14" width="6" height="1.5" />
    <rect x="5" y="17" width="6" height="1.5" />
    {/* Column 2 lines */}
    <rect x="13" y="11" width="6" height="1.5" />
    <rect x="13" y="14" width="6" height="1.5" />
    <rect x="13" y="17" width="6" height="1.5" />
  </svg>
);

/**
 * District - Map grid with highlighted center
 */
export const DistrictIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Outer border */}
    <rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Grid lines - vertical */}
    <rect x="8" y="2" width="2" height="20" />
    <rect x="14" y="2" width="2" height="20" />
    {/* Grid lines - horizontal */}
    <rect x="2" y="8" width="20" height="2" />
    <rect x="2" y="14" width="20" height="2" />
    {/* Center highlight */}
    <rect x="10" y="10" width="4" height="4" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

/**
 * Arrow Right - Geometric arrow
 */
export const ArrowRightIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Shaft */}
    <rect x="4" y="11" width="12" height="2" />
    {/* Arrowhead */}
    <polygon points="20,12 14,7 14,17" />
  </svg>
);

/**
 * Arrow Left - Geometric arrow
 */
export const ArrowLeftIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Shaft */}
    <rect x="8" y="11" width="12" height="2" />
    {/* Arrowhead */}
    <polygon points="4,12 10,7 10,17" />
  </svg>
);

/**
 * Check/Success
 */
export const CheckIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Checkmark - thick geometric */}
    <polygon points="20,6 9,17 4,12 6,10 9,13 18,4" />
  </svg>
);

/**
 * Close/X
 */
export const CrossIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* X - two rectangles rotated 45° */}
    <rect x="10.5" y="2" width="3" height="20" transform="rotate(45 12 12)" />
    <rect x="10.5" y="2" width="3" height="20" transform="rotate(-45 12 12)" />
  </svg>
);

/**
 * Loading - Spinner bars
 */
export const LoadingIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Four bars with varying opacity */}
    <rect x="11" y="2" width="2" height="6" opacity="1" />
    <rect x="16" y="11" width="6" height="2" opacity="0.75" />
    <rect x="11" y="16" width="2" height="6" opacity="0.5" />
    <rect x="2" y="11" width="6" height="2" opacity="0.25" />
  </svg>
);

/**
 * Phone - Handset
 */
export const PhoneIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Earpiece */}
    <rect x="5" y="2" width="6" height="5" />
    {/* Handle */}
    <rect x="7" y="7" width="2" height="10" />
    {/* Mouthpiece */}
    <rect x="5" y="17" width="6" height="5" />
  </svg>
);

/**
 * Email - Envelope
 */
export const EmailIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Envelope body */}
    <rect x="2" y="5" width="20" height="14" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Envelope flap - V shape as two lines */}
    <polygon points="2,5 12,13 22,5 22,7 12,15 2,7" />
  </svg>
);

/**
 * Website/Globe
 */
export const WebsiteIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    {/* Globe circle */}
    <circle cx="12" cy="12" r="10" />
    {/* Horizontal line */}
    <line x1="2" y1="12" x2="22" y2="12" />
    {/* Vertical ellipse */}
    <ellipse cx="12" cy="12" rx="4" ry="10" />
  </svg>
);

/**
 * Menu/Hamburger
 */
export const MenuIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="2" />
    <rect x="3" y="11" width="18" height="2" />
    <rect x="3" y="17" width="18" height="2" />
  </svg>
);

/**
 * Calendar/Date
 */
export const CalendarIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Calendar body */}
    <rect x="3" y="5" width="18" height="17" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Header bar */}
    <rect x="3" y="5" width="18" height="4" />
    {/* Hanging tabs */}
    <rect x="7" y="2" width="2" height="5" />
    <rect x="15" y="2" width="2" height="5" />
    {/* Date grid */}
    <rect x="6" y="12" width="2" height="2" />
    <rect x="11" y="12" width="2" height="2" />
    <rect x="16" y="12" width="2" height="2" />
    <rect x="6" y="16" width="2" height="2" />
    <rect x="11" y="16" width="2" height="2" />
  </svg>
);

/**
 * Capitol/Building - Government building
 */
export const CapitolIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Dome */}
    <rect x="9" y="2" width="6" height="3" />
    {/* Dome base */}
    <rect x="7" y="5" width="10" height="2" />
    {/* Pediment */}
    <rect x="4" y="7" width="16" height="2" />
    {/* Columns */}
    <rect x="5" y="9" width="2" height="9" />
    <rect x="9" y="9" width="2" height="9" />
    <rect x="13" y="9" width="2" height="9" />
    <rect x="17" y="9" width="2" height="9" />
    {/* Base */}
    <rect x="3" y="18" width="18" height="2" />
  </svg>
);

/**
 * Info - i in circle
 */
export const InfoIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Circle */}
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* i dot */}
    <rect x="11" y="6" width="2" height="2" />
    {/* i stem */}
    <rect x="11" y="10" width="2" height="8" />
  </svg>
);

/**
 * External Link
 */
export const ExternalLinkIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Box */}
    <rect x="3" y="7" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Arrow shaft */}
    <rect x="12" y="3" width="9" height="2" transform="rotate(45 12 3)" />
    {/* Arrow head */}
    <polygon points="21,3 21,9 19,9 19,5 15,5 15,3" />
  </svg>
);

/**
 * Export all icons as a collection
 */
export const AicherIcons = {
  Representative: RepresentativeIcon,
  Representatives: RepresentativesIcon,
  Committee: CommitteeIcon,
  Vote: VoteIcon,
  Bill: LegislationIcon,
  Legislation: LegislationIcon,
  Money: FinanceIcon,
  Finance: FinanceIcon,
  Statistics: StatisticsIcon,
  Chart: StatisticsIcon,
  District: DistrictIcon,
  Location: LocationIcon,
  Search: SearchIcon,
  Phone: PhoneIcon,
  Email: EmailIcon,
  Website: WebsiteIcon,
  Menu: MenuIcon,
  ArrowRight: ArrowRightIcon,
  ArrowLeft: ArrowLeftIcon,
  Check: CheckIcon,
  Close: CrossIcon,
  Cross: CrossIcon,
  Loading: LoadingIcon,
  Calendar: CalendarIcon,
  Capitol: CapitolIcon,
  Info: InfoIcon,
  ExternalLink: ExternalLinkIcon,
  News: NewsIcon,
};

export default AicherIcons;
