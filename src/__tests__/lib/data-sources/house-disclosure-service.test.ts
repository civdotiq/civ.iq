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

jest.mock('pdf-parse/lib/pdf-parse', () => jest.fn());

jest.mock('@/services/core/representatives-core.service', () => ({
  RepresentativesCoreService: {
    getInstance: jest.fn().mockReturnValue({ getAll: jest.fn().mockResolvedValue([]) }),
  },
}));

import { HouseDisclosureService } from '@/lib/data-sources/house-disclosure-service';

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

      const filing = {
        first: 'Jane',
        last: 'Doe',
        filingType: 'P',
        stateDst: 'CA12',
        year: '2025',
        filingDate: '01/15/2025',
        docId: '12345',
      };

      const result = await service.parsePtrPdf('12345', 2025, filing);
      expect(result).toEqual([]);
    });
  });
});
