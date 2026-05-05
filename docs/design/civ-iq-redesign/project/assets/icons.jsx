/* CIV.IQ Aicher-style icon set — 24x24 grid, 2px stroke, geometric primitives only.
   Ported from src/components/icons/AicherIcons.tsx. */

const RepresentativeIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="12" cy="4" r="3" />
    <rect x="9" y="8" width="6" height="7" />
    <rect x="9" y="15" width="2" height="7" />
    <rect x="13" y="15" width="2" height="7" />
  </svg>
);

const RepresentativesIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="7" cy="5" r="2.5" />
    <rect x="5" y="8" width="4" height="5" />
    <rect x="5" y="13" width="1.5" height="5" />
    <rect x="7.5" y="13" width="1.5" height="5" />
    <circle cx="17" cy="5" r="2.5" />
    <rect x="15" y="8" width="4" height="5" />
    <rect x="15" y="13" width="1.5" height="5" />
    <rect x="17.5" y="13" width="1.5" height="5" />
  </svg>
);

const LegislationIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="4" y="2" width="16" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="7" y="6" width="10" height="2" />
    <rect x="7" y="10" width="10" height="2" />
    <rect x="7" y="14" width="6" height="2" />
  </svg>
);

const StatisticsIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="4" y="14" width="4" height="6" />
    <rect x="10" y="8" width="4" height="12" />
    <rect x="16" y="4" width="4" height="16" />
    <rect x="2" y="20" width="20" height="2" />
  </svg>
);

const SearchIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="15" y="14" width="8" height="2.5" transform="rotate(45 15 14)" />
  </svg>
);

const LocationIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="12" cy="9" r="7" />
    <circle cx="12" cy="9" r="3" fill="white" />
    <polygon points="12,22 7,14 17,14" />
  </svg>
);

const VoteIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" />
    <polygon points="6,12 10,16 18,8 18,11 10,19 6,15" />
  </svg>
);

const CommitteeIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="12" cy="4" r="2.5" />
    <rect x="10" y="7" width="4" height="5" />
    <rect x="10" y="12" width="1.5" height="5" />
    <rect x="12.5" y="12" width="1.5" height="5" />
    <circle cx="5" cy="6" r="2" />
    <rect x="3.5" y="9" width="3" height="4" />
    <rect x="3.5" y="13" width="1" height="4" />
    <rect x="5.5" y="13" width="1" height="4" />
    <circle cx="19" cy="6" r="2" />
    <rect x="17.5" y="9" width="3" height="4" />
    <rect x="17.5" y="13" width="1" height="4" />
    <rect x="19.5" y="13" width="1" height="4" />
  </svg>
);

const FinanceIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="11" y="4" width="2" height="16" />
    <rect x="8" y="7" width="6" height="2" />
    <rect x="10" y="11" width="4" height="2" />
    <rect x="10" y="15" width="6" height="2" />
  </svg>
);

const DistrictIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="8" y="2" width="2" height="20" />
    <rect x="14" y="2" width="2" height="20" />
    <rect x="2" y="8" width="20" height="2" />
    <rect x="2" y="14" width="20" height="2" />
    <rect x="10" y="10" width="4" height="4" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const ArrowRightIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="4" y="11" width="12" height="2" />
    <polygon points="20,12 14,7 14,17" />
  </svg>
);
const ArrowLeftIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="8" y="11" width="12" height="2" />
    <polygon points="4,12 10,7 10,17" />
  </svg>
);
const CheckIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <polygon points="20,6 9,17 4,12 6,10 9,13 18,4" />
  </svg>
);
const CrossIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="10.5" y="2" width="3" height="20" transform="rotate(45 12 12)" />
    <rect x="10.5" y="2" width="3" height="20" transform="rotate(-45 12 12)" />
  </svg>
);
const PhoneIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="5" y="2" width="6" height="5" />
    <rect x="7" y="7" width="2" height="10" />
    <rect x="5" y="17" width="6" height="5" />
  </svg>
);
const EmailIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="2" y="5" width="20" height="14" fill="none" stroke="currentColor" strokeWidth="2" />
    <polygon points="2,5 12,13 22,5 22,7 12,15 2,7" />
  </svg>
);
const MenuIcon = ({ className, size = 24 }) => (
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
const CapitolIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="9" y="2" width="6" height="3" />
    <rect x="7" y="5" width="10" height="2" />
    <rect x="4" y="7" width="16" height="2" />
    <rect x="5" y="9" width="2" height="9" />
    <rect x="9" y="9" width="2" height="9" />
    <rect x="13" y="9" width="2" height="9" />
    <rect x="17" y="9" width="2" height="9" />
    <rect x="3" y="18" width="18" height="2" />
  </svg>
);
const InfoIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="11" y="6" width="2" height="2" />
    <rect x="11" y="10" width="2" height="8" />
  </svg>
);
const IntelligenceIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="3" y="16" width="3" height="6" />
    <rect x="8" y="12" width="3" height="10" />
    <rect x="13" y="14" width="3" height="8" />
    <rect x="1" y="22" width="17" height="2" />
    <circle cx="17" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="20" y="10.5" width="5" height="2" transform="rotate(45 20 10.5)" />
  </svg>
);
const LobbyingIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="2" y="10" width="8" height="2" transform="rotate(-15 2 10)" />
    <rect x="14" y="10" width="8" height="2" transform="rotate(15 22 10)" />
    <rect x="9" y="9" width="6" height="3" />
    <rect x="7" y="8" width="3" height="5" />
    <rect x="14" y="8" width="3" height="5" />
    <rect x="11" y="15" width="2" height="6" />
    <rect x="9" y="16" width="4" height="2" />
    <rect x="11" y="19" width="4" height="2" />
  </svg>
);
const CalendarIcon = ({ className, size = 24 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="17" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="3" y="5" width="18" height="4" />
    <rect x="7" y="2" width="2" height="5" />
    <rect x="15" y="2" width="2" height="5" />
    <rect x="6" y="12" width="2" height="2" />
    <rect x="11" y="12" width="2" height="2" />
    <rect x="16" y="12" width="2" height="2" />
    <rect x="6" y="16" width="2" height="2" />
    <rect x="11" y="16" width="2" height="2" />
  </svg>
);

Object.assign(window, {
  RepresentativeIcon,
  RepresentativesIcon,
  LegislationIcon,
  StatisticsIcon,
  SearchIcon,
  LocationIcon,
  VoteIcon,
  CommitteeIcon,
  FinanceIcon,
  DistrictIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  CrossIcon,
  PhoneIcon,
  EmailIcon,
  MenuIcon,
  CapitolIcon,
  InfoIcon,
  IntelligenceIcon,
  LobbyingIcon,
  CalendarIcon,
});
