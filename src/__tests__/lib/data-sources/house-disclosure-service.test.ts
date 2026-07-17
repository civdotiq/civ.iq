/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for house-disclosure-service.ts
 *
 * STOCK Act *trade* parsing (Periodic Transaction Reports / PDF parsing) was
 * removed 2026-07 — House trades now come from the Congress Trading Monitor
 * via `congressTradingMonitor`. This service now only exposes the annual
 * financial-disclosure index (FilingType 'A') and the member-lookup builder.
 * External network calls are mocked.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest
    .fn()
    .mockImplementation(async (_key: string, fetcher: () => Promise<unknown>) => fetcher()),
}));

const mockLoadAsync = jest.fn();
jest.mock('jszip', () => ({
  __esModule: true,
  default: { loadAsync: (...args: unknown[]) => mockLoadAsync(...args) },
}));

const mockGetAllRepresentatives = jest.fn();
jest.mock('@/services/core/representatives-core.service', () => ({
  RepresentativesCoreService: {
    getInstance: jest.fn().mockReturnValue({ getAll: jest.fn().mockResolvedValue([]) }),
    getAllRepresentatives: (...args: unknown[]) => mockGetAllRepresentatives(...args),
  },
}));

import { HouseDisclosureService } from '@/lib/data-sources/house-disclosure-service';

// -- Fixtures --

const HOUSE_REPS = [
  {
    bioguideId: 'P000197',
    name: 'Nancy Pelosi',
    lastName: 'Pelosi',
    chamber: 'House',
    state: 'CA',
    district: '11',
  },
];

/** Build a House Clerk XML index string from member entries. */
function buildIndexXml(
  members: Array<{
    filingType: string;
    first: string;
    last: string;
    stateDst: string;
    year: string;
    filingDate: string;
    docId: string;
  }>
): string {
  const memberXml = members
    .map(
      m =>
        `<Member><FilingType>${m.filingType}</FilingType><First>${m.first}</First>` +
        `<Last>${m.last}</Last><StateDst>${m.stateDst}</StateDst><Year>${m.year}</Year>` +
        `<FilingDate>${m.filingDate}</FilingDate><DocID>${m.docId}</DocID></Member>`
    )
    .join('');
  return `<FinancialDisclosure>${memberXml}</FinancialDisclosure>`;
}

function setupZipMock(xml: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  });
  mockLoadAsync.mockResolvedValue({
    files: { '2025FD.xml': { async: () => xml } },
  });
}

describe('HouseDisclosureService', () => {
  let service: HouseDisclosureService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllRepresentatives.mockResolvedValue(HOUSE_REPS);
    service = new HouseDisclosureService();
  });

  describe('buildMemberLookup', () => {
    it('indexes House members by "LastName:StateDistrict"', async () => {
      const lookup = await service.buildMemberLookup();

      expect(lookup.get('PELOSI:CA11')).toEqual({ bioguideId: 'P000197', name: 'Nancy Pelosi' });
    });

    it('also indexes by "LastName:State" for at-large fallback', async () => {
      const lookup = await service.buildMemberLookup();

      expect(lookup.get('PELOSI:CA')).toEqual({ bioguideId: 'P000197', name: 'Nancy Pelosi' });
    });
  });

  describe('getAnnualDisclosuresForMember', () => {
    it('returns annual (FilingType "A") filings resolved to the member', async () => {
      setupZipMock(
        buildIndexXml([
          {
            filingType: 'A',
            first: 'Nancy',
            last: 'Pelosi',
            stateDst: 'CA11',
            year: '2025',
            filingDate: '05/15/2025',
            docId: '20012345',
          },
        ])
      );

      const disclosures = await service.getAnnualDisclosuresForMember('P000197');

      const match = disclosures.find(d => d.docId === '20012345');
      expect(match).toBeDefined();
      expect(match!.year).toBe(2025);
      expect(match!.filingDate).toBe('2025-05-15');
      expect(match!.pdfUrl).toContain('20012345.pdf');
    });

    it('excludes non-annual filings (e.g. Periodic Transaction Reports)', async () => {
      setupZipMock(
        buildIndexXml([
          {
            filingType: 'P',
            first: 'Nancy',
            last: 'Pelosi',
            stateDst: 'CA11',
            year: '2025',
            filingDate: '05/15/2025',
            docId: '20099999',
          },
        ])
      );

      const disclosures = await service.getAnnualDisclosuresForMember('P000197');

      expect(disclosures.every(d => d.docId !== '20099999')).toBe(true);
    });

    it('returns empty array when the member has no annual filings', async () => {
      setupZipMock(
        buildIndexXml([
          {
            filingType: 'A',
            first: 'Some',
            last: 'Otherperson',
            stateDst: 'NY01',
            year: '2025',
            filingDate: '05/15/2025',
            docId: '20055555',
          },
        ])
      );

      const disclosures = await service.getAnnualDisclosuresForMember('P000197');

      expect(disclosures).toEqual([]);
    });
  });
});
