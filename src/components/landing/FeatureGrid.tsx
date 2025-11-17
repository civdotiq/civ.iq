import Link from 'next/link';
import {
  RepresentativesIcon,
  LegislationIcon,
  VoteIcon,
  FinanceIcon,
  DistrictIcon,
  CommitteeIcon,
  LocationIcon,
} from '@/components/icons/AicherIcons';

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: 'civiq-red' | 'civiq-green' | 'civiq-blue';
  title: string;
  description: string;
  href: string;
  stat?: string;
}

const features: Feature[] = [
  {
    icon: RepresentativesIcon,
    iconColor: 'civiq-blue',
    title: 'Federal Representatives',
    description: 'All 540 House and Senate members with profiles and contact info',
    href: '/representatives',
    stat: '540 Members',
  },
  {
    icon: LocationIcon,
    iconColor: 'civiq-green',
    title: 'State Legislatures',
    description: 'Track state legislators and bills across all 50 states',
    href: '/states',
    stat: 'All 50 States',
  },
  {
    icon: DistrictIcon,
    iconColor: 'civiq-red',
    title: 'District Maps',
    description: 'Interactive maps showing congressional and state legislative boundaries',
    href: '/districts',
    stat: '7,383 Districts',
  },
  {
    icon: VoteIcon,
    iconColor: 'civiq-blue',
    title: 'Voting Records',
    description: 'See how your representatives voted on legislation',
    href: '/representatives',
    stat: '1,200+ Votes',
  },
  {
    icon: FinanceIcon,
    iconColor: 'civiq-green',
    title: 'Campaign Finance',
    description: 'Track contributions and spending from FEC data',
    href: '/representatives',
    stat: '$2B+ Tracked',
  },
  {
    icon: CommitteeIcon,
    iconColor: 'civiq-red',
    title: 'Committees',
    description: 'Explore congressional committees and their activities',
    href: '/representatives',
    stat: '34 Committees',
  },
  {
    icon: LegislationIcon,
    iconColor: 'civiq-blue',
    title: 'Bill Tracking',
    description: 'Follow legislation from the 119th Congress in real-time',
    href: '/representatives',
    stat: '8,000+ Bills',
  },
  {
    icon: LocationIcon,
    iconColor: 'civiq-green',
    title: 'Local Government',
    description: 'Find local officials and government contacts by address',
    href: '/representatives',
    stat: 'All Localities',
  },
];

export default function FeatureGrid() {
  return (
    <section className="max-w-6xl mx-auto px-grid-2 sm:px-grid-3 py-grid-6 sm:py-grid-8">
      <div className="mb-grid-4 sm:mb-grid-6 text-center">
        <h2 className="text-2xl sm:text-4xl font-bold text-black aicher-heading mb-grid-2">
          WHAT YOU CAN DO
        </h2>
        <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto">
          Explore federal and state government data from official sources
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-grid-3 sm:gap-grid-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const bgColorClass = `bg-${feature.iconColor}`;

          return (
            <Link
              key={index}
              href={feature.href}
              className="aicher-card aicher-hover flex flex-col p-grid-3 sm:p-grid-4"
            >
              <div
                className={`w-grid-6 h-grid-6 ${bgColorClass} flex items-center justify-center mb-grid-2 aicher-border`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-grid-1 aicher-heading">
                {feature.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-grid-2 flex-grow leading-snug">
                {feature.description}
              </p>
              {feature.stat && (
                <div className="text-xs font-bold text-gray-900 border-t border-gray-200 pt-grid-1 mt-auto">
                  {feature.stat}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
