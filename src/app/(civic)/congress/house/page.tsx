import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

export function generateMetadata(): Metadata {
  return {
    title: 'House — U.S. Congress | CIV.IQ',
  };
}

export default function CongressHouseRedirect() {
  permanentRedirect('/congress#house');
}
