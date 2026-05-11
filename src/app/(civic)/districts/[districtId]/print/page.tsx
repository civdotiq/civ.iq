/**
 * Printable District Civic Pack
 * Server component — fetches all data server-side, renders print-optimized layout.
 * Designed for browser print → PDF. No client-side JS except QR code.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { getServerBaseUrl } from '@/lib/server-url';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { getStateName } from '@/lib/data/us-states';
import { QRCode } from './QRCode';
import '@/styles/civic-pack-print.css';
import { PrintButton } from './PrintButton';
import { PrintDistrictPage } from '@/components/embed/PrintDistrictPage';

interface PageProps {
  params: Promise<{ districtId: string }>;
  searchParams: Promise<{ v?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { districtId } = await params;
  const upper = districtId.toUpperCase();
  return {
    title: `Civic Pack — ${upper}`,
    description: `Printable civic information pack for congressional district ${upper}.`,
    robots: { index: false, follow: false },
  };
}

interface DistrictApiResponse {
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
      yearsInOffice?: number;
    };
    demographics?: {
      population: number;
      medianIncome: number;
      medianAge: number;
      diversityIndex: number;
      urbanPercentage: number;
      poverty_rate: number;
      bachelor_degree_percent: number;
    };
    geography: {
      area: number;
      counties: string[];
      majorCities: string[];
    };
  };
}

interface SpendingApiResponse {
  government: {
    federalInvestment: {
      totalAnnualSpending: number;
      contractsAndGrants: number;
      majorProjects: Array<{
        title: string;
        amount: number;
        agency: string;
      }>;
      infrastructureInvestment: number;
    };
  };
}

function partyClass(party: string): string {
  if (party === 'Democratic' || party === 'Democrat') return 'civic-pack-party-d';
  if (party === 'Republican') return 'civic-pack-party-r';
  return 'civic-pack-party-i';
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export default async function PrintCivicPackPage({ params, searchParams }: PageProps) {
  const { districtId } = await params;
  const { v } = await searchParams;
  const upper = districtId.toUpperCase();
  const baseUrl = getServerBaseUrl();
  const civiqUrl = `https://civdotiq.org/districts/${districtId}`;

  // Fetch all data in parallel
  const [districtRes, spendingRes, allReps] = await Promise.all([
    fetch(`${baseUrl}/api/districts/${districtId}`, { next: { revalidate: 86400 } })
      .then(r => (r.ok ? (r.json() as Promise<DistrictApiResponse>) : null))
      .catch(() => null),
    fetch(`${baseUrl}/api/districts/${districtId}/government-spending`, {
      next: { revalidate: 86400 },
    })
      .then(r => (r.ok ? (r.json() as Promise<SpendingApiResponse>) : null))
      .catch(() => null),
    getAllEnhancedRepresentatives().catch(() => []),
  ]);

  const district = districtRes?.district;
  const spending = spendingRes?.government;

  if (!district) {
    return (
      <div className="civic-pack" style={{ padding: '40px', textAlign: 'center' }}>
        <h1>District Not Found</h1>
        <p>Could not load data for district {upper}.</p>
      </div>
    );
  }

  // Parse state code from district ID
  const stateCode = upper.split('-')[0] || '';
  const districtNum = upper.split('-')[1] || '';
  const stateName = getStateName(stateCode) || stateCode;

  // Find all federal reps: House rep + senators
  const houseReps = allReps.filter(rep => {
    if (rep.chamber !== 'House' || rep.state !== stateCode) return false;
    const repDist = rep.district?.replace(/^0+/, '') || '0';
    const targetDist = districtNum.replace(/^0+/, '') || '0';
    return (
      repDist === targetDist ||
      (targetDist === '0' && (rep.district === 'At Large' || rep.district === '01'))
    );
  });

  const senators = allReps.filter(rep => rep.chamber === 'Senate' && rep.state === stateCode);

  const federalReps = [...senators, ...houseReps];
  const now = new Date();

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (useRedesign) {
    return (
      <PrintDistrictPage
        districtId={districtId}
        stateName={stateName}
        district={district}
        spending={spending ?? null}
        federalReps={federalReps}
      />
    );
  }

  return (
    <div className="civic-pack">
      {/* Print button - hidden when printing */}
      <div className="civic-pack-no-print" style={{ marginBottom: '16px', textAlign: 'right' }}>
        <PrintButton />
      </div>

      {/* PAGE 1: District ID, QR, Representatives */}
      <header className="civic-pack-header">
        <div>
          <h1>{district.name}</h1>
          <div className="subtitle">
            {stateName} &middot; {district.geography.counties.length} Counties &middot;{' '}
            {district.geography.majorCities.slice(0, 3).join(', ')}
          </div>
        </div>
        <div className="civic-pack-qr">
          <QRCode url={civiqUrl} size={72} />
          <div className="civic-pack-qr-label">civdotiq.org</div>
        </div>
      </header>

      {/* Federal Representatives */}
      <div className="civic-pack-section">Federal Representatives</div>
      {federalReps.length > 0 ? (
        federalReps.map(rep => (
          <div key={rep.bioguideId} className="civic-pack-rep civic-pack-keep-together">
            {rep.imageUrl && (
              <img src={rep.imageUrl} alt={`${rep.name} photo`} width={56} height={56} />
            )}
            <div>
              <div className="civic-pack-rep-name">{rep.name}</div>
              <div className="civic-pack-rep-detail">
                <span className={partyClass(rep.party)}>{rep.party}</span>
                {' \u00b7 '}
                {rep.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative'}
              </div>
              {rep.currentTerm?.phone && (
                <div className="civic-pack-rep-detail">Phone: {rep.currentTerm.phone}</div>
              )}
              {rep.currentTerm?.website && (
                <div className="civic-pack-rep-detail">Web: {rep.currentTerm.website}</div>
              )}
              {rep.currentTerm?.address && (
                <div className="civic-pack-rep-detail">Office: {rep.currentTerm.address}</div>
              )}
              {rep.committees && rep.committees.length > 0 && (
                <div className="civic-pack-rep-detail">
                  Committees:{' '}
                  {rep.committees
                    .slice(0, 4)
                    .map(c => c.name)
                    .join(', ')}
                  {rep.committees.length > 4 && ` +${rep.committees.length - 4} more`}
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <p style={{ fontSize: '9pt', color: '#666' }}>Representative data unavailable.</p>
      )}

      {/* PAGE 2: Spending, Demographics, Sources */}
      <div className="civic-pack-page-break" />

      {/* Key Demographics */}
      {district.demographics && district.demographics.population > 0 && (
        <>
          <div className="civic-pack-section">Key Demographics</div>
          <div className="civic-pack-stats">
            <div className="civic-pack-stat">
              <div className="civic-pack-stat-value">
                {formatNumber(district.demographics.population)}
              </div>
              <div className="civic-pack-stat-label">Population</div>
            </div>
            <div className="civic-pack-stat">
              <div className="civic-pack-stat-value">
                {formatCurrency(district.demographics.medianIncome)}
              </div>
              <div className="civic-pack-stat-label">Median Income</div>
            </div>
            <div className="civic-pack-stat">
              <div className="civic-pack-stat-value">
                {district.demographics.medianAge.toFixed(0)}
              </div>
              <div className="civic-pack-stat-label">Median Age</div>
            </div>
          </div>

          <table className="civic-pack-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bachelor&apos;s Degree or Higher</td>
                <td>{district.demographics.bachelor_degree_percent.toFixed(1)}%</td>
              </tr>
              <tr>
                <td>Poverty Rate</td>
                <td>{district.demographics.poverty_rate.toFixed(1)}%</td>
              </tr>
              <tr>
                <td>Urban Population</td>
                <td>{district.demographics.urbanPercentage.toFixed(0)}%</td>
              </tr>
              <tr>
                <td>Diversity Index</td>
                <td>{district.demographics.diversityIndex.toFixed(1)}</td>
              </tr>
              {district.geography.area > 0 && (
                <tr>
                  <td>Land Area</td>
                  <td>{formatNumber(district.geography.area)} sq mi</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {/* Top Federal Spending */}
      {spending?.federalInvestment && spending.federalInvestment.totalAnnualSpending > 0 && (
        <>
          <div className="civic-pack-section">Federal Spending</div>
          <div className="civic-pack-stats">
            <div className="civic-pack-stat">
              <div className="civic-pack-stat-value">
                {formatCurrency(spending.federalInvestment.totalAnnualSpending)}
              </div>
              <div className="civic-pack-stat-label">Total Annual</div>
            </div>
            <div className="civic-pack-stat">
              <div className="civic-pack-stat-value">
                {formatNumber(spending.federalInvestment.contractsAndGrants)}
              </div>
              <div className="civic-pack-stat-label">Contracts &amp; Grants</div>
            </div>
            <div className="civic-pack-stat">
              <div className="civic-pack-stat-value">
                {formatCurrency(spending.federalInvestment.infrastructureInvestment || 0)}
              </div>
              <div className="civic-pack-stat-label">Infrastructure</div>
            </div>
          </div>

          {spending.federalInvestment.majorProjects.length > 0 && (
            <table className="civic-pack-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Agency</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {spending.federalInvestment.majorProjects.slice(0, 8).map((project, i) => (
                  <tr key={i}>
                    <td>{project.title}</td>
                    <td>{project.agency}</td>
                    <td>{formatCurrency(project.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Geography */}
      {district.geography.counties.length > 0 && (
        <>
          <div className="civic-pack-section">Geography</div>
          <table className="civic-pack-table">
            <thead>
              <tr>
                <th>Counties ({district.geography.counties.length})</th>
                <th>Major Cities</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{district.geography.counties.join(', ')}</td>
                <td>{district.geography.majorCities.join(', ')}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Footer: Data sources + last updated */}
      <footer className="civic-pack-footer">
        <div>
          Data: Congress.gov, Census Bureau ACS 2022, USASpending.gov
          <br />
          Generated{' '}
          {now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
        <div style={{ textAlign: 'right' }}>
          CIV.IQ &middot; civdotiq.org
          <br />
          Open civic data, no accounts required
        </div>
      </footer>
    </div>
  );
}
