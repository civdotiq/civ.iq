/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Loader for the redesigned FECFilingDetail page. Reuses the existing
 * FEC API service to fetch a single committee filing by file_number.
 */

import { fecApiService, type FECFilingRecord } from '@/lib/fec/fec-api-service';
import logger from '@/lib/logging/simple-logger';
import type { FECFilingDetailData, FundingMixSlice, Party } from './types';

function num(value: number | null | undefined): number {
  return Number.isFinite(value as number) && value !== null && value !== undefined
    ? (value as number)
    : 0;
}

function normalizeParty(party: string | null | undefined): Party {
  if (!party) return 'O';
  const upper = party.toUpperCase();
  if (upper === 'DEM' || upper === 'D' || upper === 'DEMOCRAT') return 'D';
  if (upper === 'REP' || upper === 'R' || upper === 'REPUBLICAN') return 'R';
  if (upper === 'IND' || upper === 'I' || upper === 'INDEPENDENT') return 'I';
  return 'O';
}

function isAmended(raw: FECFilingRecord): boolean {
  if (raw.is_amended === true) return true;
  const indicator = (raw.amendment_indicator ?? '').toUpperCase();
  if (indicator === 'A') return true;
  return false;
}

function buildFundingMix(
  individual: number,
  unitemized: number,
  pac: number,
  party: number,
  totalReceipts: number
): FundingMixSlice[] {
  if (totalReceipts <= 0) return [];
  const accountedFor = individual + unitemized + pac + party;
  const other = Math.max(0, totalReceipts - accountedFor);
  const slices: FundingMixSlice[] = [
    {
      label: 'Indiv ≥ $200',
      pct: Math.round((individual / totalReceipts) * 100),
      color: 'var(--civiq-blue)',
    },
    {
      label: 'Indiv < $200',
      pct: Math.round((unitemized / totalReceipts) * 100),
      color: 'var(--civiq-blue-active)',
    },
    {
      label: 'PAC',
      pct: Math.round((pac / totalReceipts) * 100),
      color: 'var(--data-vlau)',
    },
    {
      label: 'Party',
      pct: Math.round((party / totalReceipts) * 100),
      color: 'var(--data-greige)',
    },
    {
      label: 'Other',
      pct: Math.round((other / totalReceipts) * 100),
      color: 'var(--fg3)',
    },
  ].filter(s => s.pct > 0);
  return slices;
}

export async function loadFECFilingDetailData(
  fileNumber: number | string
): Promise<FECFilingDetailData | null> {
  let raw: FECFilingRecord | null = null;
  try {
    raw = await fecApiService.getFilingByFileNumber(fileNumber);
  } catch (error) {
    logger.error('FECFilingDetail: load failed', error as Error, { fileNumber });
    return null;
  }
  if (!raw) return null;

  const totalReceipts = num(raw.total_receipts);
  const totalDisbursements = num(raw.total_disbursements);
  const individual = num(raw.total_individual_contributions);
  const unitemized = num(raw.total_unitemized_contributions);
  const pac = num(raw.total_other_political_committee_contributions);
  const party = num(raw.total_political_party_committee_contributions);

  const candidateOfficeParts = [
    raw.candidate_office === 'P'
      ? 'U.S. President'
      : raw.candidate_office === 'S'
        ? 'U.S. Senate'
        : raw.candidate_office === 'H'
          ? 'U.S. House'
          : raw.candidate_office,
    raw.candidate_office_state,
    raw.candidate_office_district ? `District ${raw.candidate_office_district}` : null,
  ].filter(Boolean);

  return {
    fileNumber: raw.file_number,
    committeeId: raw.committee_id,
    committeeName: raw.committee_name ?? `Committee ${raw.committee_id}`,
    committeeType: raw.committee_type_full ?? raw.committee_type ?? null,
    candidateName: raw.candidate_name ?? null,
    candidateOffice: candidateOfficeParts.length > 0 ? candidateOfficeParts.join(' · ') : null,
    treasurerName: raw.treasurer_name ?? null,
    party: normalizeParty(raw.party),
    formType: raw.form_type ?? '—',
    reportType: raw.report_type ?? null,
    reportTypeFull: raw.report_type_full ?? null,
    reportYear: raw.report_year ?? null,
    coverageStart: raw.coverage_start_date ?? null,
    coverageEnd: raw.coverage_end_date ?? null,
    receiptDate: raw.receipt_date ?? null,
    amended: isAmended(raw),
    totalReceipts,
    totalDisbursements,
    cashOnHandBegin: num(raw.cash_on_hand_beginning_period),
    cashOnHandEnd: num(raw.cash_on_hand_end_period),
    contributionsIndividual: individual,
    contributionsUnitemized: unitemized,
    contributionsParty: party,
    contributionsPac: pac,
    fundingMix: buildFundingMix(individual, unitemized, pac, party, totalReceipts),
    pdfUrl: raw.pdf_url ?? null,
    htmlUrl: raw.html_url ?? raw.fec_url ?? null,
  };
}
