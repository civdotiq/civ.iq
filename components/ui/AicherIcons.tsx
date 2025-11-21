/**
 * Otl Aicher / Munich 1972 Style Pictogram Icons
 *
 * Geometric construction rules:
 * - 24x24 grid with 2px stroke width
 * - Outline only (no fills)
 * - Geometric primitives: circles, squares, rectangles, straight lines
 * - Angles: 90° or 45° only
 * - No freeform curves
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

const defaultProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

/**
 * Map Pin - Location marker
 * Construction: Circle head + V-shape pointer + horizontal base
 */
export function AicherMapPin({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Circle head */}
      <circle cx="12" cy="7" r="4" />
      {/* V-shape pointer */}
      <line x1="8" y1="10" x2="12" y2="18" />
      <line x1="16" y1="10" x2="12" y2="18" />
      {/* Horizontal base */}
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  );
}

/**
 * Book Open - Reading/documentation
 * Construction: Two angled pages from central spine with text lines
 */
export function AicherBookOpen({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Central spine */}
      <line x1="12" y1="4" x2="12" y2="20" />
      {/* Left page outline */}
      <polyline points="12,4 3,6 3,18 12,20" />
      {/* Right page outline */}
      <polyline points="12,4 21,6 21,18 12,20" />
      {/* Left page text lines */}
      <line x1="6" y1="9" x2="10" y2="8" />
      <line x1="6" y1="12" x2="10" y2="11" />
      <line x1="6" y1="15" x2="10" y2="14" />
      {/* Right page text lines */}
      <line x1="14" y1="8" x2="18" y2="9" />
      <line x1="14" y1="11" x2="18" y2="12" />
      <line x1="14" y1="14" x2="18" y2="15" />
    </svg>
  );
}

/**
 * Graduation Cap - Education
 * Construction: Diamond on top + shallow triangle base + tassel
 */
export function AicherGraduationCap({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Diamond shape (mortarboard top) */}
      <polygon points="12,3 20,8 12,13 4,8" />
      {/* Cap base - shallow trapezoid */}
      <polyline points="6,10 6,15 12,18 18,15 18,10" />
      {/* Tassel line */}
      <line x1="20" y1="8" x2="20" y2="16" />
      {/* Tassel end */}
      <circle cx="20" cy="18" r="1.5" />
    </svg>
  );
}

/**
 * Briefcase - Work/professional
 * Construction: Rectangle body + handle + horizontal divider
 */
export function AicherBriefcase({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Main body */}
      <rect x="2" y="7" width="20" height="14" rx="1" />
      {/* Handle */}
      <path d="M8,7 L8,5 Q8,3 10,3 L14,3 Q16,3 16,5 L16,7" />
      {/* Horizontal divider */}
      <line x1="2" y1="12" x2="22" y2="12" />
      {/* Center clasp */}
      <rect x="10" y="10" width="4" height="4" />
    </svg>
  );
}

/**
 * Users - People/community
 * Construction: Three figures with semi-circle bodies and circle heads
 */
export function AicherUsers({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Back left figure */}
      <circle cx="6" cy="6" r="2" />
      <path d="M2,16 Q2,11 6,11 Q10,11 10,16" />
      {/* Back right figure */}
      <circle cx="18" cy="6" r="2" />
      <path d="M14,16 Q14,11 18,11 Q22,11 22,16" />
      {/* Front center figure (larger) */}
      <circle cx="12" cy="9" r="3" />
      <path d="M5,22 Q5,15 12,15 Q19,15 19,22" />
    </svg>
  );
}

/**
 * Phone - Contact/call
 * Construction: Classic handset at 45 degrees
 */
export function AicherPhone({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Earpiece (top circle) */}
      <circle cx="6" cy="6" r="3" />
      {/* Mouthpiece (bottom circle) */}
      <circle cx="18" cy="18" r="3" />
      {/* Connecting handle - two parallel lines */}
      <line x1="8" y1="8" x2="16" y2="16" />
      <line x1="6" y1="9" x2="15" y2="18" />
      <line x1="9" y1="6" x2="18" y2="15" />
    </svg>
  );
}

/**
 * Mail - Email/correspondence
 * Construction: Rectangle with V-shaped envelope flap
 */
export function AicherMail({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Outer envelope */}
      <rect x="2" y="4" width="20" height="16" rx="1" />
      {/* V-shape flap from top */}
      <polyline points="2,4 12,13 22,4" />
      {/* Bottom fold lines */}
      <line x1="2" y1="20" x2="8" y2="13" />
      <line x1="22" y1="20" x2="16" y2="13" />
    </svg>
  );
}

/**
 * Building - Government/institution
 * Construction: Main tower + side building + windows + door
 */
export function AicherBuilding({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Main building */}
      <rect x="3" y="3" width="12" height="18" />
      {/* Side building */}
      <rect x="15" y="9" width="6" height="12" />
      {/* Main building windows - 2x3 grid */}
      <rect x="5" y="5" width="2" height="2" />
      <rect x="9" y="5" width="2" height="2" />
      <rect x="5" y="9" width="2" height="2" />
      <rect x="9" y="9" width="2" height="2" />
      <rect x="5" y="13" width="2" height="2" />
      <rect x="9" y="13" width="2" height="2" />
      {/* Main door */}
      <rect x="6" y="17" width="4" height="4" />
      {/* Side building windows */}
      <rect x="17" y="11" width="2" height="2" />
      <rect x="17" y="15" width="2" height="2" />
      {/* Baseline */}
      <line x1="1" y1="21" x2="23" y2="21" />
    </svg>
  );
}

/**
 * Calendar - Date/schedule
 * Construction: Square frame + header with rings + date grid + "31"
 */
export function AicherCalendar({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Outer frame */}
      <rect x="3" y="4" width="18" height="18" rx="1" />
      {/* Header bar */}
      <line x1="3" y1="9" x2="21" y2="9" />
      {/* Ring holders */}
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      {/* Date grid - simplified */}
      <line x1="7" y1="12" x2="9" y2="12" />
      <line x1="11" y1="12" x2="13" y2="12" />
      <line x1="15" y1="12" x2="17" y2="12" />
      <line x1="7" y1="15" x2="9" y2="15" />
      <line x1="11" y1="15" x2="13" y2="15" />
      {/* "31" - geometric construction */}
      <text
        x="15"
        y="19"
        fontSize="6"
        fontWeight="bold"
        fontFamily="monospace"
        fill="currentColor"
        stroke="none"
      >
        31
      </text>
    </svg>
  );
}

/**
 * Clock - Time
 * Construction: Thick outer circle + two hands at angles
 */
export function AicherClock({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Outer circle */}
      <circle cx="12" cy="12" r="9" />
      {/* Hour markers - cardinal points */}
      <line x1="12" y1="3" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="21" />
      <line x1="3" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="21" y2="12" />
      {/* Minute hand - pointing up */}
      <line x1="12" y1="12" x2="12" y2="6" strokeWidth={2.5} />
      {/* Hour hand - pointing to ~4 o'clock (45 degrees) */}
      <line x1="12" y1="12" x2="16" y2="15" strokeWidth={2.5} />
      {/* Center dot */}
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * External Link - Navigate out
 * Construction: Square outline + arrow pointing out top-right
 */
export function AicherExternalLink({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Square frame - open corner */}
      <polyline points="10,4 4,4 4,20 20,20 20,10" />
      {/* Arrow line */}
      <line x1="9" y1="15" x2="20" y2="4" />
      {/* Arrow head */}
      <polyline points="14,4 20,4 20,10" />
    </svg>
  );
}

/**
 * Alert Circle - Warning/important
 * Construction: Thick outer circle + exclamation mark
 */
export function AicherAlertCircle({ className, size = 24 }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className}>
      {/* Outer circle */}
      <circle cx="12" cy="12" r="9" />
      {/* Exclamation mark - top bar */}
      <line x1="12" y1="7" x2="12" y2="13" strokeWidth={2.5} />
      {/* Exclamation mark - bottom dot */}
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

// Named exports for tree-shaking
export const AicherIcons = {
  AicherMapPin,
  AicherBookOpen,
  AicherGraduationCap,
  AicherBriefcase,
  AicherUsers,
  AicherPhone,
  AicherMail,
  AicherBuilding,
  AicherCalendar,
  AicherClock,
  AicherExternalLink,
  AicherAlertCircle,
};

export default AicherIcons;
