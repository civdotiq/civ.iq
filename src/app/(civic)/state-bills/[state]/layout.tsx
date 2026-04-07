import type { Metadata } from 'next';
import { getStateName } from '@/lib/data/us-states';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { state } = await params;
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return {
    title: `${stateName} Bills`,
    description: `Browse current and recent bills in the ${stateName} state legislature. Search by topic, sponsor, or status.`,
    openGraph: {
      title: `${stateName} Bills | CIV.IQ`,
      description: `Browse current and recent bills in the ${stateName} state legislature. Search by topic, sponsor, or status.`,
      url: `https://civdotiq.org/state-bills/${state.toLowerCase()}`,
      siteName: 'CIV.IQ',
      type: 'website',
    },
  };
}

export default function StateBillsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
