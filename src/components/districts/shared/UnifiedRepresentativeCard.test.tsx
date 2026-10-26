import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnifiedRepresentativeCard from './UnifiedRepresentativeCard';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

jest.mock('@/features/representatives/components/RepresentativePhoto', () => ({
  __esModule: true,
  default: () => null,
}));

const stateSenator: EnhancedStateLegislator = {
  id: 'ocd-person/c96aa62f-0000-0000-0000-000000000000',
  name: 'Thomas Albert',
  party: 'Republican',
  state: 'MI',
  chamber: 'upper',
  district: '18',
};

describe('UnifiedRepresentativeCard', () => {
  it('calls a state senator "Senator", not "Representative"', () => {
    render(
      <UnifiedRepresentativeCard
        representative={stateSenator}
        districtName="Michigan Senate District 18"
      />
    );
    expect(screen.getByText('Senator for Michigan Senate District 18')).toBeInTheDocument();
    expect(screen.queryByText(/Representative for/)).not.toBeInTheDocument();
  });

  it('keeps "Representative" for a state house member', () => {
    render(
      <UnifiedRepresentativeCard
        representative={{ ...stateSenator, chamber: 'lower', party: 'Democratic' }}
        districtName="Michigan House of Representatives District 18"
      />
    );
    expect(
      screen.getByText('Representative for Michigan House of Representatives District 18')
    ).toBeInTheDocument();
  });

  it('labels the party "Democratic" for federal and state members alike', () => {
    const { rerender } = render(
      <UnifiedRepresentativeCard
        representative={{ ...stateSenator, party: 'Democratic' }}
        districtName="Michigan Senate District 18"
      />
    );
    expect(screen.getByText('Democratic')).toBeInTheDocument();

    rerender(
      <UnifiedRepresentativeCard
        representative={{ bioguideId: 'S001208', name: 'Elissa Slotkin', party: 'Democrat' }}
        districtName="Michigan's 7th District"
      />
    );
    expect(screen.getByText('Democratic')).toBeInTheDocument();
    expect(screen.queryByText('Democrat')).not.toBeInTheDocument();
  });
});

describe('UnifiedRepresentativeCard non-voting seats', () => {
  it('calls the DC member "Delegate", not "Representative"', () => {
    render(
      <UnifiedRepresentativeCard
        representative={{ bioguideId: 'N000147', name: 'Eleanor Holmes Norton', party: 'Democrat' }}
        districtName="District of Columbia At-Large"
        federalTitle="Delegate"
      />
    );
    expect(screen.getByText('Delegate for District of Columbia At-Large')).toBeInTheDocument();
    expect(screen.queryByText(/Representative for/)).not.toBeInTheDocument();
  });
});
