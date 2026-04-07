import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transparency',
  description:
    'CIV.IQ transparency tools: reading level analysis of intelligence outputs and data quality metrics.',
  openGraph: {
    title: 'Transparency | CIV.IQ',
    description:
      'CIV.IQ transparency tools: reading level analysis of intelligence outputs and data quality metrics.',
    url: 'https://civdotiq.org/transparency',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function TransparencyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
