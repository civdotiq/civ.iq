import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Local Government',
  description:
    'Local (city and county) government is not covered on CIV.IQ. Why local records are the hardest layer to organize, and where to find your federal and state representatives.',
  openGraph: {
    title: 'Local Government | CIV.IQ',
    description:
      'Local (city and county) government is not covered on CIV.IQ. Why local records are the hardest layer to organize, and where to find your federal and state representatives.',
    url: 'https://civdotiq.org/local',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function LocalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
