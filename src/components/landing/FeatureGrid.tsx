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
    href: '/legislation',
    stat: '8,000+ Bills',
  },
  {
    icon: LocationIcon,
    iconColor: 'civiq-green',
    title: 'Local Government',
    description: 'Find local officials and government contacts by address',
    href: '/local',
    stat: 'All Localities',
  },
];

export default function FeatureGrid() {
  return (
    <section className="max-w-6xl mx-auto px-grid-2 sm:px-grid-3 pt-grid-2 sm:pt-grid-4 pb-grid-4 sm:pb-grid-6">
      {/* Accent Banner - Tier 1 high impact */}
      <div className="accent-banner mb-grid-4 sm:mb-grid-6">
        <span>Who Represents You?</span>
      </div>

      <div className="mb-grid-3 sm:mb-grid-4 text-center">
        <h2 className="accent-display text-2xl sm:text-4xl text-black mb-grid-1 sm:mb-grid-2">
          What You Can Do
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
          Explore federal and state government data from official sources
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-grid-2 sm:gap-grid-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const bgColorClass = `bg-${feature.iconColor}`;

          return (
            <Link
              key={index}
              href={feature.href}
              className="aicher-card aicher-hover flex flex-col p-grid-2 sm:p-grid-3 min-h-[160px] sm:min-h-[180px]"
            >
              <div
                className={`w-8 h-8 sm:w-grid-6 sm:h-grid-6 ${bgColorClass} flex items-center justify-center mb-grid-1 sm:mb-grid-2 aicher-border`}
              >
                <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 aicher-heading leading-tight">
                {feature.title}
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-600 mb-grid-1 sm:mb-grid-2 flex-grow leading-snug line-clamp-2">
                {feature.description}
              </p>
              {feature.stat && (
                <div className="text-[10px] sm:text-xs font-bold text-civiq-blue border-t border-gray-200 pt-1 mt-auto accent-bold">
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
