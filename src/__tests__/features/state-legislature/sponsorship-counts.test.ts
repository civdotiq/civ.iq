import { countSponsorships } from '@/features/state-legislature/utils/sponsorship-counts';

describe('countSponsorships', () => {
  const primary = (name: string) => ({ sponsorships: [{ name, primary: true }] });
  const cosponsor = (name: string) => ({
    sponsorships: [
      { name: 'Someone Else', primary: true },
      { name, primary: false },
    ],
  });

  it('splits primary sponsorships from co-sponsorships', () => {
    const bills = [primary('Angela Rigas'), cosponsor('Rigas'), cosponsor('Angela Rigas')];
    expect(countSponsorships(bills, 'Angela Rigas', 'Rigas')).toEqual({
      sponsored: 1,
      cosponsored: 2,
      examined: 3,
    });
  });

  it('counts a bill with no matching sponsor as sponsored (the query filter is authoritative)', () => {
    expect(countSponsorships([{ sponsorships: [] }, {}], 'Angela Rigas')).toEqual({
      sponsored: 2,
      cosponsored: 0,
      examined: 2,
    });
  });

  it('returns zeros for no bills', () => {
    expect(countSponsorships([], 'Angela Rigas')).toEqual({
      sponsored: 0,
      cosponsored: 0,
      examined: 0,
    });
  });
});
