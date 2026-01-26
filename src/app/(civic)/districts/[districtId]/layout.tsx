import { Metadata } from 'next';
import { ReactNode } from 'react';

// State names for SEO-friendly titles
const stateNames: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
  PR: 'Puerto Rico',
  VI: 'Virgin Islands',
  GU: 'Guam',
  AS: 'American Samoa',
  MP: 'Northern Mariana Islands',
};

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
      title: 'Congressional District | CIV.IQ',
      description: 'Explore congressional district demographics, representatives, and voting data.',
    };
  }

  const stateName = stateNames[parsed.state] || parsed.state;
  const districtLabel = parsed.district === 'AL' ? 'At-Large' : `District ${parsed.district}`;
  const title = `${stateName} ${districtLabel} | Congressional District | CIV.IQ`;
  const description = `Explore ${stateName}'s ${districtLabel} congressional district. View demographics, current representative, voting history, and campaign finance data.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://civdotiq.org/districts/${districtId}`,
      images: [
        {
          url: `/api/og/district/${districtId}`,
          width: 1200,
          height: 630,
          alt: `${stateName} ${districtLabel} - CIV.IQ`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/api/og/district/${districtId}`],
    },
  };
}

export default function DistrictLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
