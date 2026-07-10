import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

export function generateMetadata(): Metadata {
  return {
    title: 'House — U.S. Congress | CIV.IQ',
    alternates: { canonical: 'https://civdotiq.org/congress/house' },
  };
}

export default function CongressHouseRedirect() {
  permanentRedirect('/congress#house');
}
