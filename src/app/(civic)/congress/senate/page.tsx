import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

export function generateMetadata(): Metadata {
  return {
    title: 'Senate — U.S. Congress | CIV.IQ',
    alternates: { canonical: 'https://civdotiq.org/congress/senate' },
  };
}

export default function CongressSenateRedirect() {
  permanentRedirect('/congress#senate');
}
