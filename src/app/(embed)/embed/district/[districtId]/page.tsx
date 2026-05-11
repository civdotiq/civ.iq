/**
 * Embeddable Widget: District Snapshot
 * Server component - fetches data at render time via existing API.
 *
 * PR 22 gate: `?v=new` swaps the legacy body for EmbedDistrictCard while
 * sharing the same resolved `district` object.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { getServerBaseUrl } from '@/lib/server-url';
import { EmbedDistrictCard } from '@/components/embed/EmbedDistrictCard';

interface PageProps {
  params: Promise<{ districtId: string }>;
  searchParams: Promise<{ v?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { districtId } = await params;
  return {
    title: `District ${districtId.toUpperCase()}`,
  };
}

interface DistrictData {
  district: {
    id: string;
    state: string;
    number: string;
    name: string;
    representative: {
      name: string;
      party: string;
      bioguideId: string;
      imageUrl?: string;
    };
    demographics?: {
      population: number;
      medianIncome: number;
      medianAge: number;
    };
    geography: {
      counties: string[];
      majorCities: string[];
    };
  };
}

function partyColor(party: string): string {
  if (party === 'Democratic' || party === 'Democrat') return '#0a9338';
  if (party === 'Republican') return '#e11d07';
  return '#6b7280';
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toLocaleString();
}

export default async function EmbedDistrictPage({ params, searchParams }: PageProps) {
  const { districtId } = await params;
  const { v } = await searchParams;

  let data: DistrictData | null = null;
  try {
    const baseUrl = getServerBaseUrl();
    const response = await fetch(`${baseUrl}/api/districts/${districtId}`, {
      next: { revalidate: 86400 },
    });
    if (response.ok) {
      data = await response.json();
    }
  } catch {
    // Data unavailable
  }

  if (!data?.district) {
    return (
      <div style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          District {districtId.toUpperCase()} not found.
        </p>
      </div>
    );
  }

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (useRedesign) {
    return <EmbedDistrictCard districtId={districtId} district={data.district} />;
  }

  const { district } = data;

  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui, sans-serif', maxWidth: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px',
        }}
      >
        <a
          href={`https://civdotiq.org/districts/${districtId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontWeight: 700,
            fontSize: '16px',
            color: '#111827',
            textDecoration: 'none',
          }}
        >
          {district.name}
        </a>
        <a
          href="https://civdotiq.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '10px',
            color: '#3ea2d4',
            textDecoration: 'none',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          CIV.IQ
        </a>
      </div>

      {/* Representative */}
      <a
        href={`https://civdotiq.org/representative/${district.representative.bioguideId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          border: '2px solid #e5e7eb',
          marginBottom: '12px',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        {district.representative.imageUrl && (
          <img
            src={district.representative.imageUrl}
            alt={`${district.representative.name} photo`}
            width={40}
            height={40}
            style={{ width: '40px', height: '40px', objectFit: 'cover', flexShrink: 0 }}
          />
        )}
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
            {district.representative.name}
          </div>
          <div style={{ fontSize: '12px', color: partyColor(district.representative.party) }}>
            {district.representative.party}
          </div>
        </div>
      </a>

      {/* Stats grid */}
      {district.demographics && district.demographics.population > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f9fafb' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              {formatNumber(district.demographics.population)}
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>
              Population
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f9fafb' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              ${formatNumber(district.demographics.medianIncome)}
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>
              Median Income
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f9fafb' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              {district.demographics.medianAge.toFixed(0)}
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>
              Median Age
            </div>
          </div>
        </div>
      )}

      {/* Geography */}
      {district.geography.majorCities.length > 0 && (
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
          <span style={{ fontWeight: 500 }}>Major cities: </span>
          {district.geography.majorCities.slice(0, 4).join(', ')}
          {district.geography.majorCities.length > 4 &&
            ` +${district.geography.majorCities.length - 4} more`}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          paddingTop: '8px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '10px',
          color: '#9ca3af',
          textAlign: 'right',
        }}
      >
        Data from Census Bureau &amp; Congress.gov via{' '}
        <a
          href="https://civdotiq.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3ea2d4', textDecoration: 'none' }}
        >
          CIV.IQ
        </a>
      </div>
    </div>
  );
}
