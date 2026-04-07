import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Local Government',
  description:
    'Find your local government officials and services. City councils, county boards, school districts, and more.',
  openGraph: {
    title: 'Local Government | CIV.IQ',
    description:
      'Find your local government officials and services. City councils, county boards, school districts, and more.',
    url: 'https://civdotiq.org/local',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function LocalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
