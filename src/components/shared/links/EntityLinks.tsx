/**
 * Entity Link Components
 *
 * Typed, inline links for every entity type on CIV.IQ.
 * Renders as blue text (civiq-blue) using Next.js Link with prefetch.
 * If the required ID is missing/null, renders as plain text — never a broken link.
 */

import Link from 'next/link';
import { displaySector } from '@/lib/mesh/sector-display';
import { parseBillSlug } from '@/lib/data/route-slugs';

const linkClass = 'text-[#3ea2d4] hover:underline';

interface RepLinkProps {
  bioguideId: string | null | undefined;
  name: string;
  className?: string;
}

export function RepLink({ bioguideId, name, className }: RepLinkProps) {
  if (!bioguideId) return <span className={className}>{name}</span>;
  return (
    <Link href={`/representative/${bioguideId}`} className={`${linkClass} ${className ?? ''}`}>
      {name}
    </Link>
  );
}

interface CommitteeLinkProps {
  code: string | null | undefined;
  name: string;
  className?: string;
}

export function CommitteeLink({ code, name, className }: CommitteeLinkProps) {
  if (!code) return <span className={className}>{name}</span>;
  return (
    <Link href={`/committee/${code}`} className={`${linkClass} ${className ?? ''}`}>
      {name}
    </Link>
  );
}

interface BillLinkProps {
  billId: string | null | undefined;
  title: string;
  className?: string;
}

export function BillLink({ billId, title, className }: BillLinkProps) {
  if (!billId) return <span className={className}>{title}</span>;
  // Normalize any accepted slug shape (e.g. the type-first "hr8814-119" that
  // callers like the influence-chain analyzer produce) to the canonical
  // <congress>-<type>-<number> form so the link resolves without a 308 hop.
  const parsed = parseBillSlug(billId);
  const slug = parsed.kind === 'invalid' ? billId : parsed.canonical;
  return (
    <Link href={`/bill/${slug}`} className={`${linkClass} ${className ?? ''}`}>
      {title}
    </Link>
  );
}

interface PACLinkProps {
  committeeId: string | null | undefined;
  name: string;
  className?: string;
}

export function PACLink({ committeeId, name, className }: PACLinkProps) {
  if (!committeeId) return <span className={className}>{name}</span>;
  return (
    <Link href={`/influence/${committeeId}`} className={`${linkClass} ${className ?? ''}`}>
      {name}
    </Link>
  );
}

interface LobbyLinkProps {
  registrantId: string | null | undefined;
  name: string;
  className?: string;
}

export function LobbyLink({ registrantId, name, className }: LobbyLinkProps) {
  if (!registrantId) return <span className={className}>{name}</span>;
  return (
    <Link href={`/lobby/${registrantId}`} className={`${linkClass} ${className ?? ''}`}>
      {name}
    </Link>
  );
}

interface SectorLinkProps {
  sector: string | null | undefined;
  label?: string;
  className?: string;
}

export function SectorLink({ sector, label, className }: SectorLinkProps) {
  if (!sector) return label ? <span className={className}>{label}</span> : null;
  return (
    <Link
      href={`/industry/${encodeURIComponent(sector)}`}
      className={`${linkClass} ${className ?? ''}`}
    >
      {displaySector(sector)}
    </Link>
  );
}

interface RegulationLinkProps {
  documentNumber: string | null | undefined;
  title: string;
  className?: string;
}

export function RegulationLink({ documentNumber, title, className }: RegulationLinkProps) {
  if (!documentNumber) return <span className={className}>{title}</span>;
  return (
    <Link href={`/regulations/${documentNumber}`} className={`${linkClass} ${className ?? ''}`}>
      {title}
    </Link>
  );
}

interface VoteLinkProps {
  voteId: string | null | undefined;
  label: string;
  className?: string;
}

export function VoteLink({ voteId, label, className }: VoteLinkProps) {
  if (!voteId) return <span className={className}>{label}</span>;
  return (
    <Link href={`/vote/${voteId}`} className={`${linkClass} ${className ?? ''}`}>
      {label}
    </Link>
  );
}
