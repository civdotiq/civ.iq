/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * PrintDistrictPage — redesign chassis for /districts/[id]/print?v=new.
 * Letter-sized (768px body), two-column on screen and print. Same data the
 * legacy print page resolves; the chassis just re-renders for paper.
 *
 * Print rules live in embed-print.css (@media print): black ink on white,
 * inline URL print, no buttons, no hover, page-break-inside: avoid.
 */

import type { EnhancedRepresentative } from '@/types/representative';
import { CqLogoMark } from '@/components/cq';
import { PrintButton } from '@/app/(civic)/districts/[districtId]/print/PrintButton';
import '../embed-print.css';

interface PrintDistrictData {
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
}

interface PrintSpendingData {
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
  stateContext?: {
    state: string;
    medicaidChipEnrollment: number | null;
    medicaidChipPeriod: string | null;
    medicaidChipPreliminary: boolean;
    veteranPopulation: number | null;
    veteranPopulationFiscalYear: string | null;
  };
}

interface PrintDistrictPageProps {
  districtId: string;
  stateName: string;
  district: PrintDistrictData;
  spending: PrintSpendingData | null;
  federalReps: EnhancedRepresentative[];
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

/** Format a YYYYMM reporting period (e.g. "202602") as "Feb 2026". */
function formatReportingPeriod(period: string | null): string | null {
  if (!period || period.length !== 6) return null;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const monthIndex = parseInt(period.slice(4, 6), 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${months[monthIndex]} ${period.slice(0, 4)}`;
}

function partyInitial(party: string): string {
  if (party === 'Democratic' || party === 'Democrat') return 'D';
  if (party === 'Republican') return 'R';
  return party.charAt(0).toUpperCase() || 'I';
}

function PrintRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="civiq-print-row">
      <span className="civiq-print-row-label">{label}</span>
      <span className="civiq-print-row-value">{value}</span>
    </div>
  );
}

export function PrintDistrictPage({
  districtId,
  stateName,
  district,
  spending,
  federalReps,
}: PrintDistrictPageProps) {
  const upper = districtId.toUpperCase();
  const now = new Date();
  const compiledLabel = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="civiq-print-shell">
      <div className="civiq-print-no-print" style={{ marginBottom: 16, textAlign: 'right' }}>
        <PrintButton />
      </div>

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingBottom: 12,
          borderBottom: '2px solid var(--ink)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CqLogoMark size={20} />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              color: 'var(--fg1)',
            }}
          >
            CIV.IQ <span style={{ color: 'var(--fg3)', fontWeight: 500 }}>· Print edition</span>
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="civiq-print-label" style={{ color: 'var(--fg3)' }}>
            Compiled
          </span>
          <div
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              marginTop: 2,
              color: 'var(--fg2)',
            }}
          >
            {compiledLabel}
          </div>
        </div>
      </header>

      <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--ink)', marginBottom: 18 }}>
        <span className="civiq-print-label" style={{ color: 'var(--fg3)' }}>
          Federal House district profile
        </span>
        <h1
          style={{
            margin: '6px 0 4px',
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
            textTransform: 'uppercase',
            color: 'var(--fg1)',
          }}
        >
          {upper}
        </h1>
        <div style={{ fontSize: 12, color: 'var(--fg2)' }}>
          {district.geography.majorCities[0] ?? district.name}, {stateName} · 119th Congress
        </div>
      </div>

      <div className="civiq-print-columns">
        <section className="civiq-print-section">
          <span className="civiq-print-label">Federal representatives</span>
          <div className="civiq-print-rule" />
          {federalReps.length > 0 ? (
            federalReps.map(rep => (
              <div
                key={rep.bioguideId}
                className="civiq-print-section"
                style={{ marginBottom: 14 }}
              >
                <div
                  style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: 'var(--fg1)' }}
                >
                  {rep.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--fg2)',
                    marginTop: 3,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {partyInitial(rep.party)} ·{' '}
                  {rep.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative'}
                </div>
                {rep.currentTerm?.phone && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--fg2)',
                      fontFamily: 'var(--font-mono)',
                      marginTop: 3,
                    }}
                  >
                    Phone: {rep.currentTerm.phone}
                  </div>
                )}
                {rep.currentTerm?.website && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--fg2)',
                      fontFamily: 'var(--font-mono)',
                      marginTop: 3,
                    }}
                  >
                    Web: {rep.currentTerm.website}
                  </div>
                )}
                {rep.committees && rep.committees.length > 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--fg2)',
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    Committees:{' '}
                    {rep.committees
                      .slice(0, 4)
                      .map(c => c.name)
                      .join(', ')}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ fontSize: 10, color: 'var(--fg3)' }}>
              Representative data unavailable.
            </div>
          )}
        </section>

        {district.demographics && district.demographics.population > 0 && (
          <section className="civiq-print-section">
            <span className="civiq-print-label">Key demographics</span>
            <div className="civiq-print-rule" />
            <PrintRow label="Population" value={formatNumber(district.demographics.population)} />
            <PrintRow
              label="Median income"
              value={formatCurrency(district.demographics.medianIncome)}
            />
            <PrintRow label="Median age" value={district.demographics.medianAge.toFixed(0)} />
            <PrintRow
              label="Bachelor's+"
              value={`${district.demographics.bachelor_degree_percent.toFixed(1)}%`}
            />
            <PrintRow
              label="Poverty rate"
              value={`${district.demographics.poverty_rate.toFixed(1)}%`}
            />
            <PrintRow
              label="Urban"
              value={`${district.demographics.urbanPercentage.toFixed(0)}%`}
            />
            {district.geography.area > 0 && (
              <PrintRow
                label="Land area"
                value={`${formatNumber(district.geography.area)} sq mi`}
              />
            )}
          </section>
        )}

        {spending?.federalInvestment && spending.federalInvestment.totalAnnualSpending > 0 && (
          <section className="civiq-print-section">
            <span className="civiq-print-label">Federal spending</span>
            <div className="civiq-print-rule" />
            <PrintRow
              label="Total annual"
              value={formatCurrency(spending.federalInvestment.totalAnnualSpending)}
            />
            <PrintRow
              label="Contracts + grants"
              value={formatNumber(spending.federalInvestment.contractsAndGrants)}
            />
            <PrintRow
              label="Infrastructure"
              value={formatCurrency(spending.federalInvestment.infrastructureInvestment || 0)}
            />
            {spending.federalInvestment.majorProjects.slice(0, 5).map((project, i) => (
              <div
                key={i}
                style={{
                  paddingTop: 6,
                  fontSize: 10,
                  lineHeight: 1.35,
                  borderBottom: '0.5px solid var(--line)',
                  paddingBottom: 4,
                }}
              >
                <div style={{ color: 'var(--fg1)', fontWeight: 600 }}>{project.title}</div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--fg3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 2,
                  }}
                >
                  <span>{project.agency}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(project.amount)}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {(spending?.stateContext?.medicaidChipEnrollment != null ||
          spending?.stateContext?.veteranPopulation != null) && (
          <section className="civiq-print-section">
            <span className="civiq-print-label">Statewide context</span>
            <div className="civiq-print-rule" />
            {spending.stateContext.medicaidChipEnrollment != null && (
              <PrintRow
                label={`Medicaid + CHIP${
                  formatReportingPeriod(spending.stateContext.medicaidChipPeriod)
                    ? ` (${formatReportingPeriod(spending.stateContext.medicaidChipPeriod)})`
                    : ''
                }`}
                value={formatNumber(spending.stateContext.medicaidChipEnrollment)}
              />
            )}
            {spending.stateContext.veteranPopulation != null && (
              <PrintRow
                label={`Veteran population${
                  spending.stateContext.veteranPopulationFiscalYear
                    ? ` (${spending.stateContext.veteranPopulationFiscalYear})`
                    : ''
                }`}
                value={formatNumber(spending.stateContext.veteranPopulation)}
              />
            )}
            <div style={{ fontSize: 9, color: 'var(--fg3)', marginTop: 6, lineHeight: 1.4 }}>
              Statewide totals for {stateName}, not specific to this district — these federal
              programs report only at the state level.
            </div>
          </section>
        )}

        {district.geography.counties.length > 0 && (
          <section className="civiq-print-section">
            <span className="civiq-print-label">Geography</span>
            <div className="civiq-print-rule" />
            <div style={{ fontSize: 10.5, lineHeight: 1.5, color: 'var(--fg1)' }}>
              <div style={{ marginBottom: 6 }}>
                <strong>Counties ({district.geography.counties.length}):</strong>{' '}
                {district.geography.counties.join(', ')}
              </div>
              {district.geography.majorCities.length > 0 && (
                <div>
                  <strong>Major cities:</strong> {district.geography.majorCities.join(', ')}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="civiq-print-section">
          <span className="civiq-print-label">Data sources</span>
          <div className="civiq-print-rule" />
          <ul
            style={{
              margin: 0,
              padding: '0 0 0 14px',
              fontSize: 9.5,
              color: 'var(--fg2)',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.6,
            }}
          >
            <li>Congress.gov · /member directory</li>
            <li>U.S. Census · ACS 2023 5-year</li>
            <li>USAspending.gov · FY current</li>
            {spending?.stateContext?.medicaidChipEnrollment != null && (
              <li>CMS · data.medicaid.gov (statewide)</li>
            )}
            {spending?.stateContext?.veteranPopulation != null && (
              <li>VA NCVAS · datahub.va.gov (statewide)</li>
            )}
          </ul>
        </section>
      </div>

      <footer
        style={{
          marginTop: 18,
          paddingTop: 8,
          borderTop: '2px solid var(--ink)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--fg3)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        <span>civdotiq.org/districts/{districtId}/print</span>
        <span>As of {compiledLabel} · Direct ingestion · No inference</span>
      </footer>
    </main>
  );
}
