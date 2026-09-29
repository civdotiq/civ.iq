import { groupCommittees } from '../ProfileSidebar';

describe('groupCommittees', () => {
  it('nests subcommittee seats under their parent committee, preserving order', () => {
    const groups = groupCommittees([
      { name: 'Finance', id: 'SSFI' },
      { name: 'Health Care', id: 'SSFI10' },
      { name: 'Budget', id: 'SSBU' },
      { name: 'Social Security', id: 'SSFI02', role: 'Ranking Member' },
    ]);
    expect(groups.map(g => g.committee.name)).toEqual(['Finance', 'Budget']);
    expect(groups[0]?.subcommittees.map(s => s.name)).toEqual(['Health Care', 'Social Security']);
    expect(groups[1]?.subcommittees).toEqual([]);
  });

  it('keeps an orphan subcommittee visible at top level', () => {
    const groups = groupCommittees([{ name: 'Orphan sub', thomas_id: 'HSHM09' }]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.committee.name).toBe('Orphan sub');
  });
});
