import { candidateDisplayName } from '@/lib/elections/candidate-name';

describe('candidateDisplayName', () => {
  it('names the current member as the site does', () => {
    expect(candidateDisplayName('DEBBIE DINGELL', { name: 'Debbie Dingell' })).toBe(
      'Debbie Dingell'
    );
    expect(candidateDisplayName('ELEANOR HOLMES NORTON', { name: 'Eleanor Holmes Norton' })).toBe(
      'Eleanor Holmes Norton'
    );
    expect(candidateDisplayName('BERNARD SANDERS', { name: 'Bernie Sanders' })).toBe(
      'Bernie Sanders'
    );
    expect(
      candidateDisplayName('DEBBIE WASSERMAN SCHULTZ', { name: 'Debbie Wasserman Schultz' })
    ).toBe('Debbie Wasserman Schultz');
    expect(candidateDisplayName('NANETTE DIAZ BARRAGAN', { name: 'Nanette Diaz Barragán' })).toBe(
      'Nanette Diaz Barragán'
    );
  });

  it('gives other candidates ordinary capitalization', () => {
    expect(candidateDisplayName('HEATHER SMILEY', { name: 'Debbie Dingell' })).toBe(
      'Heather Smiley'
    );
    expect(candidateDisplayName('CLYDE K. SHABAZZ', { name: 'Debbie Dingell' })).toBe(
      'Clyde K. Shabazz'
    );
    expect(candidateDisplayName("JOHN O'NEIL-MCDONALD III")).toBe("John O'Neil-McDonald III");
    expect(candidateDisplayName('ROBERT SMITH JR.')).toBe('Robert Smith Jr.');
  });

  it('does not match a surname inside another word', () => {
    expect(candidateDisplayName('JOHN CASEY', { name: 'Ed Case' })).toBe('John Casey');
  });

  it('leaves names that already have mixed case', () => {
    expect(candidateDisplayName('Jane Doe')).toBe('Jane Doe');
  });
});
