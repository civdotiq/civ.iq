import { foldForSearch } from '../fold-for-search';

describe('foldForSearch', () => {
  it('drops accents and case', () => {
    expect(foldForSearch('Mario Díaz-Balart')).toBe('mario diaz-balart');
    expect(foldForSearch('María Elvira Salazar')).toBe('maria elvira salazar');
    expect(foldForSearch('Nanette Barragán')).toBe('nanette barragan');
  });

  it('treats a decomposed accent like a precomposed one', () => {
    expect(foldForSearch('Díaz')).toBe(foldForSearch('Díaz'));
  });
});
