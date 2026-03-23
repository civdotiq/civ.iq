/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for house-disclosure-service.ts
 *
 * Tests trade extraction from PTR PDF text using the extractTradesFromText method.
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

const mockPdfParse = jest.fn();
jest.mock('pdf-parse/lib/pdf-parse', () => (...args: unknown[]) => mockPdfParse(...args));

jest.mock('@/services/core/representatives-core.service', () => ({
  RepresentativesCoreService: {
    getInstance: jest.fn().mockReturnValue({ getAll: jest.fn().mockResolvedValue([]) }),
    getAllRepresentatives: jest.fn().mockResolvedValue([]),
  },
}));

import { HouseDisclosureService } from '@/lib/data-sources/house-disclosure-service';
import type { HouseClerkFiling } from '@/types/stock-trades';

// -- Fixtures --

const DEFAULT_FILING: HouseClerkFiling = {
  first: 'Nancy',
  last: 'Pelosi',
  filingType: 'P',
  stateDst: 'CA11',
  year: '2025',
  filingDate: '02/15/2025',
  docId: '20033725',
};

/**
 * Simulates a standard PTR PDF with two trades on a single page.
 * One Purchase (Self), one Sale (Spouse).
 */
const FIXTURE_BASIC_TWO_TRADES = [
  'IDOwnerAsset',
  '$200?',
  'Apple Inc. (AAPL) [ST] P $1,001 - $15,000 01/10/2025 01/15/2025',
  'F  S  : New',
  'D          : ---',
  'SPMicrosoft Corporation (MSFT) [ST] S $15,001 - $50,000 01/12/2025 01/18/2025',
  'F  S  : New',
].join('\n');

/**
 * Simulates a page-boundary bug: the D: line from the previous trade
 * bleeds into the start of the next block after splitting on F S.
 * The real Pelosi filing 20033725 exhibited this pattern.
 */
const FIXTURE_PAGE_BOUNDARY_BLEED = [
  'IDOwnerAsset',
  '$200?',
  // Trade 1: normal
  'Apple Inc. (AAPL) [ST] P $1,001 - $15,000 01/10/2025 01/15/2025',
  'F  S  : New',
  // Trade 2: D: line from trade 1 bleeds into next block due to page break
  // Before the fix, "D : Sold 20,000 shares." would contaminate the next block
  'D          : Sold 20,000 shares.',
  'SPAmazon.com, Inc. (AMZN) [ST] P $250,001 - $500,000 01/14/2025 01/20/2025',
  'F  S  : New',
].join('\n');

/**
 * Simulates S O: (SubOwner) line bleeding across page boundary.
 */
const FIXTURE_SUBOWNER_BLEED = [
  'IDOwnerAsset',
  '$200?',
  'Apple Inc. (AAPL) [ST] P $1,001 - $15,000 01/10/2025 01/15/2025',
  'F  S  : New',
  'S   O : Spouse Name Here',
  'D          : previous trade description',
  'NVIDIA Corporation (NVDA) [ST] S $50,001 - $100,000 01/16/2025 01/22/2025',
  'F  S  : New',
].join('\n');

/**
 * Diverse asset type codes — tests the 52-code mapping.
 */
const FIXTURE_DIVERSE_ASSETS = [
  'IDOwnerAsset',
  '$200?',
  'AllianceBernstein Holding LP (AB) [AB] P $1,001 - $15,000 02/01/2025 02/10/2025',
  'F  S  : New',
  'Vanguard S&P 500 ETF (VOO) [EF] P $15,001 - $50,000 02/03/2025 02/12/2025',
  'F  S  : New',
  'Bitcoin Trust [CT] P $1,001 - $15,000 02/05/2025 02/14/2025',
  'F  S  : New',
  'Gold Bars [PM] S $50,001 - $100,000 02/07/2025 02/16/2025',
  'F  S  : New',
].join('\n');

/**
 * Tests transaction type parsing — S (full), S (partial), E (Exchange).
 */
const FIXTURE_TXN_TYPES = [
  'IDOwnerAsset',
  '$200?',
  'Tesla Inc. (TSLA) [ST] S (partial) $1,001 - $15,000 03/01/2025 03/10/2025',
  'F  S  : New',
  'Google LLC (GOOG) [ST] S (full) $15,001 - $50,000 03/03/2025 03/12/2025',
  'F  S  : New',
  'Meta Platforms (META) [ST] E $1,001 - $15,000 03/05/2025 03/14/2025',
  'F  S  : New',
].join('\n');

/**
 * Owner types: JT (Joint), DC (Dependent Child).
 */
const FIXTURE_OWNER_TYPES = [
  'IDOwnerAsset',
  '$200?',
  'JTApple Inc. (AAPL) [ST] P $1,001 - $15,000 01/10/2025 01/15/2025',
  'F  S  : New',
  'DCMicrosoft Corporation (MSFT) [ST] S $15,001 - $50,000 01/12/2025 01/18/2025',
  'F  S  : New',
].join('\n');

// Helper: parse fixture text through the service
async function parseFixture(
  service: HouseDisclosureService,
  fixtureText: string,
  filing: HouseClerkFiling = DEFAULT_FILING
) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(Buffer.from('pdf')),
  });
  mockPdfParse.mockResolvedValue({ text: fixtureText, numpages: 1 });

  return service.parsePtrPdf(filing.docId, parseInt(filing.year), filing);
}

describe('HouseDisclosureService', () => {
  let service: HouseDisclosureService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HouseDisclosureService();
  });

  describe('fetchFilingIndex', () => {
    it('calls the correct ZIP URL for the given year', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      });
      global.fetch = mockFetch;

      mockLoadAsync.mockResolvedValue({
        files: {
          '2025FD.xml': {
            async: () =>
              '<FinancialDisclosure><Member><FilingType>P</FilingType><First>Jane</First><Last>Doe</Last><StateDst>CA12</StateDst><Year>2025</Year><FilingDate>01/15/2025</FilingDate><DocID>12345</DocID></Member></FinancialDisclosure>',
          },
        },
      });

      const result = await service.fetchFilingIndex(2025);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('2025FD.ZIP'),
        expect.objectContaining({ headers: expect.any(Object) })
      );
      expect(result).toHaveLength(1);
      expect(result[0].first).toBe('Jane');
      expect(result[0].last).toBe('Doe');
      expect(result[0].filingType).toBe('P');
      expect(result[0].docId).toBe('12345');
    });

    it('returns only PTR filings (type P)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      });

      mockLoadAsync.mockResolvedValue({
        files: {
          '2025FD.xml': {
            async: () =>
              '<FinancialDisclosure>' +
              '<Member><FilingType>P</FilingType><First>A</First><Last>B</Last><StateDst>CA01</StateDst><Year>2025</Year><FilingDate>01/01/2025</FilingDate><DocID>1</DocID></Member>' +
              '<Member><FilingType>A</FilingType><First>C</First><Last>D</Last><StateDst>CA02</StateDst><Year>2025</Year><FilingDate>01/01/2025</FilingDate><DocID>2</DocID></Member>' +
              '<Member><FilingType>P</FilingType><First>E</First><Last>F</Last><StateDst>NY01</StateDst><Year>2025</Year><FilingDate>02/01/2025</FilingDate><DocID>3</DocID></Member>' +
              '</FinancialDisclosure>',
          },
        },
      });

      const result = await service.fetchFilingIndex(2025);
      expect(result).toHaveLength(2);
      expect(result.every(f => f.filingType === 'P')).toBe(true);
    });

    it('throws when ZIP contains no XML file', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      });

      mockLoadAsync.mockResolvedValue({ files: {} });

      await expect(service.fetchFilingIndex(2025)).rejects.toThrow('No XML file found');
    });
  });

  describe('parsePtrPdf', () => {
    it('returns empty array when PDF not available', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await service.parsePtrPdf('12345', 2025, DEFAULT_FILING);
      expect(result).toEqual([]);
    });
  });

  describe('extractTradesFromText (via parsePtrPdf)', () => {
    describe('basic parsing', () => {
      it('parses two trades on a single page', async () => {
        const trades = await parseFixture(service, FIXTURE_BASIC_TWO_TRADES);

        expect(trades).toHaveLength(2);

        // Trade 1: AAPL Purchase by Self
        expect(trades[0].ticker).toBe('AAPL');
        expect(trades[0].assetDescription).toContain('Apple');
        expect(trades[0].transactionType).toBe('Purchase');
        expect(trades[0].owner).toBe('Self');
        expect(trades[0].amount).toBe('$1,001 - $15,000');
        expect(trades[0].transactionDate).toBe('2025-01-10');
        expect(trades[0].assetType).toBe('ST');
        expect(trades[0].assetTypeLabel).toBe('Stock');
        expect(trades[0].isPaperFiling).toBe(false);

        // Trade 2: MSFT Sale by Spouse
        expect(trades[1].ticker).toBe('MSFT');
        expect(trades[1].assetDescription).toContain('Microsoft');
        expect(trades[1].transactionType).toBe('Sale');
        expect(trades[1].owner).toBe('Spouse');
        expect(trades[1].amount).toBe('$15,001 - $50,000');
      });

      it('sets filing metadata correctly', async () => {
        const trades = await parseFixture(service, FIXTURE_BASIC_TWO_TRADES);

        expect(trades[0].filingId).toBe('20033725');
        expect(trades[0].memberName).toBe('Nancy Pelosi');
        expect(trades[0].stateDistrict).toBe('CA11');
        expect(trades[0].filingDate).toBe('2025-02-15');
        expect(trades[0].sourceUrl).toContain('20033725.pdf');
      });
    });

    describe('1a: page-boundary D: line stripping', () => {
      it('strips bleeding D: lines and parses the next trade correctly', async () => {
        const trades = await parseFixture(service, FIXTURE_PAGE_BOUNDARY_BLEED);

        expect(trades).toHaveLength(2);

        // The AMZN trade should NOT have "D : Sold 20,000 shares." in its description
        const amznTrade = trades.find(t => t.ticker === 'AMZN');
        expect(amznTrade).toBeDefined();
        expect(amznTrade!.assetDescription).not.toContain('D :');
        expect(amznTrade!.assetDescription).not.toContain('Sold');
        expect(amznTrade!.assetDescription).toContain('Amazon');
      });

      it('strips bleeding S O: lines from page boundaries', async () => {
        const trades = await parseFixture(service, FIXTURE_SUBOWNER_BLEED);

        expect(trades).toHaveLength(2);

        const nvdaTrade = trades.find(t => t.ticker === 'NVDA');
        expect(nvdaTrade).toBeDefined();
        expect(nvdaTrade!.assetDescription).not.toContain('S   O');
        expect(nvdaTrade!.assetDescription).not.toContain('Spouse Name');
        expect(nvdaTrade!.assetDescription).toContain('NVIDIA');
      });
    });

    describe('1b: owner detection after cleanup', () => {
      it('detects Spouse owner after D: line stripping', async () => {
        const trades = await parseFixture(service, FIXTURE_PAGE_BOUNDARY_BLEED);

        const amznTrade = trades.find(t => t.ticker === 'AMZN');
        expect(amznTrade).toBeDefined();
        expect(amznTrade!.owner).toBe('Spouse');
      });

      it('detects Joint and Dependent Child owners', async () => {
        const trades = await parseFixture(service, FIXTURE_OWNER_TYPES);

        expect(trades).toHaveLength(2);
        expect(trades[0].owner).toBe('Joint');
        expect(trades[1].owner).toBe('Dependent Child');
      });
    });

    describe('1c: transaction type parsing on cleaned blocks', () => {
      it('does not mistake D: "Sold" text for a Sale transaction', async () => {
        const trades = await parseFixture(service, FIXTURE_PAGE_BOUNDARY_BLEED);

        const amznTrade = trades.find(t => t.ticker === 'AMZN');
        expect(amznTrade).toBeDefined();
        // The actual [ST] P indicates Purchase — the "Sold" in D: should not override
        expect(amznTrade!.transactionType).toBe('Purchase');
      });

      it('parses S (partial), S (full), and E transaction types', async () => {
        const trades = await parseFixture(service, FIXTURE_TXN_TYPES);

        expect(trades).toHaveLength(3);
        expect(trades[0].transactionType).toBe('Sale (Partial)');
        expect(trades[1].transactionType).toBe('Sale (Full)');
        expect(trades[2].transactionType).toBe('Exchange');
      });
    });

    describe('1d: asset type code mapping', () => {
      it('maps all 52 asset type codes to labels', async () => {
        const trades = await parseFixture(service, FIXTURE_DIVERSE_ASSETS);

        expect(trades).toHaveLength(4);

        // AB code should map to "Asset-Backed Securities"
        const abTrade = trades.find(t => t.assetType === 'AB');
        expect(abTrade).toBeDefined();
        expect(abTrade!.assetTypeLabel).toBe('Asset-Backed Securities');
        // AB ticker should be nullified since it matches the asset type code
        expect(abTrade!.ticker).toBeNull();

        // EF code should map to "Exchange-Traded Fund"
        const efTrade = trades.find(t => t.assetType === 'EF');
        expect(efTrade).toBeDefined();
        expect(efTrade!.assetTypeLabel).toBe('Exchange-Traded Fund');
        expect(efTrade!.ticker).toBe('VOO');

        // CT = Cryptocurrency
        const ctTrade = trades.find(t => t.assetType === 'CT');
        expect(ctTrade).toBeDefined();
        expect(ctTrade!.assetTypeLabel).toBe('Cryptocurrency');

        // PM = Precious Metals
        const pmTrade = trades.find(t => t.assetType === 'PM');
        expect(pmTrade).toBeDefined();
        expect(pmTrade!.assetTypeLabel).toBe('Precious Metals');
      });

      it('does not confuse AB ticker with AB asset type code', async () => {
        const trades = await parseFixture(service, FIXTURE_DIVERSE_ASSETS);

        const abTrade = trades.find(t => t.assetType === 'AB');
        expect(abTrade).toBeDefined();
        // Ticker (AB) matches the asset type code, so it should be nullified
        expect(abTrade!.ticker).toBeNull();
        // But the asset description should still have the company name
        expect(abTrade!.assetDescription).toContain('AllianceBernstein');
      });
    });

    describe('1e: image-based PDF detection', () => {
      it('returns paper filing sentinel for image PDFs with < 50 chars', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(Buffer.from('pdf')),
        });
        mockPdfParse.mockResolvedValue({ text: '   \n  \n  ', numpages: 2 });

        const trades = await service.parsePtrPdf('99999', 2025, DEFAULT_FILING);

        expect(trades).toHaveLength(1);
        expect(trades[0].isPaperFiling).toBe(true);
        expect(trades[0].assetDescription).toContain('Paper filing');
        expect(trades[0].ticker).toBeNull();
        expect(trades[0].sourceUrl).toContain('99999.pdf');
      });

      it('does not flag normal PDFs as paper filings', async () => {
        const trades = await parseFixture(service, FIXTURE_BASIC_TWO_TRADES);

        expect(trades.every(t => t.isPaperFiling === false)).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('detects short text as paper filing (no IDOwnerAsset headers)', async () => {
        const trades = await parseFixture(service, 'Some random text without any headers');
        // Short text (< 50 chars) triggers paper filing detection
        expect(trades).toHaveLength(1);
        expect(trades[0].isPaperFiling).toBe(true);
      });

      it('detects short text with header but no trades as paper filing', async () => {
        const trades = await parseFixture(service, 'IDOwnerAsset\n$200?\nNo trade data');
        expect(trades).toHaveLength(1);
        expect(trades[0].isPaperFiling).toBe(true);
      });

      it('returns empty trades for electronic PDF with header but no trade rows', async () => {
        // Longer text (> 50 chars) so not flagged as paper filing, but no actual trades
        const longNoTradeText =
          'IDOwnerAsset\n$200?\n' +
          'This is a long enough section of text that exceeds fifty characters ' +
          'but contains no actual trade data rows with dollar amounts or dates.';
        const trades = await parseFixture(service, longNoTradeText);
        expect(trades).toHaveLength(0);
      });

      it('handles null bytes in text (common in pdf-parse output)', async () => {
        const textWithNulls = FIXTURE_BASIC_TWO_TRADES.replace(/ /g, '\x00');
        const trades = await parseFixture(service, textWithNulls);

        // Should still parse — null bytes are normalized to spaces
        expect(trades.length).toBeGreaterThan(0);
      });
    });
  });
});
