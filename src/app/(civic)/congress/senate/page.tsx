import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

export function generateMetadata(): Metadata {
  return {
    title: 'Senate — U.S. Congress | CIV.IQ',
  };
}

export default function CongressSenateRedirect() {
  permanentRedirect('/congress#senate');
}
