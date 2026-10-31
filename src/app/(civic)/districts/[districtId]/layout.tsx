import { Metadata } from 'next';
import { ReactNode } from 'react';
import { getStateName } from '@/lib/data/us-states';
import { canonicalizeDistrictId } from '@/lib/helpers/url-builders';

// Parse district ID - supports multiple formats:
// - Hyphenated: "MI-12", "CA-04", "AK-AL" (canonical format)
// - Non-hyphenated: "MI12", "CA04", "AKAL" (legacy/backwards compatibility)
function parseDistrictId(districtId: string): { state: string; district: string } | null {
  // Try hyphenated format first (canonical): MI-12, CA-04, AK-AL, MI-STATE
  const hyphenatedMatch = districtId.match(/^([A-Z]{2})-(\d{1,2}|AL|STATE)$/i);
  if (hyphenatedMatch?.[1] && hyphenatedMatch[2]) {
    return {
      state: hyphenatedMatch[1].toUpperCase(),
      district: hyphenatedMatch[2].toUpperCase(),
    };
  }

  // Try non-hyphenated format (legacy): MI12, CA04, AKAL
  const nonHyphenatedMatch = districtId.match(/^([A-Z]{2})(\d{1,2}|AL)$/i);
  if (nonHyphenatedMatch?.[1] && nonHyphenatedMatch[2]) {
    return {
      state: nonHyphenatedMatch[1].toUpperCase(),
      district: nonHyphenatedMatch[2].toUpperCase(),
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ districtId: string }>;
}): Promise<Metadata> {
  const { districtId } = await params;
  const parsed = parseDistrictId(districtId);

  if (!parsed) {
    return {
      title: 'Congressional District',
      description: 'Explore congressional district demographics, representatives, and voting data.',
    };
  }

  const stateName = getStateName(parsed.state) || parsed.state;
  const districtLabel = parsed.district === 'AL' ? 'At-Large' : `District ${parsed.district}`;
  const title = `${stateName} ${districtLabel} | Congressional District`;
  const description = `Explore ${stateName}'s ${districtLabel} congressional district. View demographics, current representative, voting history, and campaign finance data.`;

  // Build canonical feed URL for hyphenated format
  const feedDistrictId = `${parsed.state}-${parsed.district}`;
  // Middleware 308s every variant to this form, so it is the page's own URL.
  const canonicalId = canonicalizeDistrictId(districtId)?.canonical ?? feedDistrictId;

  return {
    title,
    description,
    alternates: {
      canonical: `https://civdotiq.org/districts/${canonicalId}`,
      types: {
        'application/atom+xml': `/api/feed/district/${feedDistrictId}`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://civdotiq.org/districts/${canonicalId}`,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

// The AdministrativeArea JSON-LD is rendered by the page, which has the
// district record its dateModified comes from.
export default function DistrictLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
