import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Federal Spending',
  description:
    'Explore federal contracts and grants by congressional district. All data from USASpending.gov.',
  openGraph: {
    title: 'Federal Spending | CIV.IQ',
    description:
      'Explore federal contracts and grants by congressional district. All data from USASpending.gov.',
    url: 'https://civdotiq.org/spending',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function SpendingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
