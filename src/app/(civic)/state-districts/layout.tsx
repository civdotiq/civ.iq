import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'State Legislative Districts',
  description:
    'Browse state legislative districts across all 50 states. Upper and lower chamber district maps and legislator profiles.',
  openGraph: {
    title: 'State Legislative Districts | CIV.IQ',
    description:
      'Browse state legislative districts across all 50 states. Upper and lower chamber district maps and legislator profiles.',
    url: 'https://civdotiq.org/state-districts',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function StateDistrictsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
