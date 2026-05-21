import Link from 'next/link';
import SearchForm from '@/components/SearchForm';
import styles from './page.module.css';

const civiqMark = (
  <svg
    viewBox="0 0 120 188"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="CIV.IQ mark"
  >
    <circle cx="60" cy="28" r="28" fill="#e11d07" />
    <path d="M 32 62 A 105 105 0 0 0 88 62 L 88 140 L 32 140 Z" fill="#0a9338" />
    <circle cx="32" cy="156" r="7" fill="#3ea2d4" />
    <circle cx="50.7" cy="156" r="7" fill="#3ea2d4" />
    <circle cx="69.3" cy="156" r="7" fill="#3ea2d4" />
    <circle cx="88" cy="156" r="7" fill="#3ea2d4" />
  </svg>
);

type FeatureCard = {
  href: string;
  iconClass: string | undefined;
  title: string;
  desc: string;
  stat: string;
  icon: React.ReactNode;
};

const featureCards: FeatureCard[] = [
  {
    href: '/representatives',
    iconClass: styles.cardIconBlue,
    title: 'Federal Representatives',
    desc: 'All 535 House and Senate members with profiles and contact info',
    stat: '535 Members',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
        <path d="M4 21V8h6v13M14 21V4h6v17M4 21h16" />
      </svg>
    ),
  },
  {
    href: '/states',
    iconClass: styles.cardIconGreen,
    title: 'State Legislatures',
    desc: 'Track state legislators and bills across all 50 states',
    stat: 'All 50 States',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    href: '/districts',
    iconClass: styles.cardIconRed,
    title: 'District Maps',
    desc: 'Interactive maps showing congressional and state legislative districts',
    stat: '7,383 Districts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
        <rect x="3" y="3" width="18" height="18" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </svg>
    ),
  },
  {
    href: '/legislation',
    iconClass: styles.cardIconBlue,
    title: 'Voting Records',
    desc: 'See how your representatives voted on legislation',
    stat: '1,200+ Votes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <path d="m8 12 3 3 5-7" />
      </svg>
    ),
  },
  {
    href: '/industry',
    iconClass: styles.cardIconGreen,
    title: 'Campaign Finance',
    desc: 'Track contributions and spending from FEC data',
    stat: '$2B+ Tracked',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6M12 17v.01" />
      </svg>
    ),
  },
  {
    href: '/committees',
    iconClass: styles.cardIconRed,
    title: 'Committees',
    desc: 'Explore congressional committees and their activities',
    stat: '34 Committees',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
        <path d="M4 21V8h6v13M14 21V4h6v17M4 21h16" />
      </svg>
    ),
  },
  {
    href: '/legislation',
    iconClass: styles.cardIconBlue,
    title: 'Bill Tracking',
    desc: 'Follow legislation from the 119th Congress in real-time',
    stat: '8,000+ Bills',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
        <path d="M4 4h12l4 4v12H4z" />
        <path d="M8 10h8M8 14h8M8 18h5" />
      </svg>
    ),
  },
  {
    href: '/local',
    iconClass: styles.cardIconGreen,
    title: 'Local Government',
    desc: 'Local government coverage — expanding incrementally',
    stat: 'Roadmap',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
];

const usStates = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

const askCards = [
  {
    tag: 'Where',
    q: "Where do Nancy Pelosi's campaign contributions come from?",
    href: '/ask/campaign-contributions/P000197',
  },
  {
    tag: 'How',
    q: 'How does Jim Jordan vote?',
    href: '/ask/voting-record/J000302',
  },
  {
    tag: 'Why',
    q: "Does Lisa Murkowski's voting align with her donors?",
    href: '/ask/donor-voting-alignment/M001153',
  },
  {
    tag: 'What',
    q: 'What bills are about Health?',
    href: '/ask/topic-bills/health',
  },
];

export default function HomePage() {
  return (
    <div className={styles.landing}>
      {/* ============ HERO ============ */}
      <header className={styles.hero}>
        <div className={styles.heroMark}>{civiqMark}</div>
        <p className={styles.eyebrow}>
          CIV<span className={styles.dot}>.</span>IQ
        </p>
        <h1 className={styles.title}>
          Know your
          <br />
          Representatives
        </h1>
        <p className={styles.lede}>
          See how your representatives vote, who funds them, and what they sponsor — all from public
          government data.
        </p>

        <SearchForm />

        <p className={styles.sources}>
          Federal data from{' '}
          <a href="https://www.congress.gov" target="_blank" rel="noopener noreferrer">
            Congress.gov
          </a>
          ,{' '}
          <a href="https://www.fec.gov" target="_blank" rel="noopener noreferrer">
            FEC
          </a>
          , and{' '}
          <a href="https://www.census.gov" target="_blank" rel="noopener noreferrer">
            Census Bureau
          </a>
          . State legislature data from{' '}
          <a href="https://openstates.org" target="_blank" rel="noopener noreferrer">
            Open States
          </a>
          .
          <br />
          All data available via <Link href="/open">open API</Link>,{' '}
          <a href="https://www.civdotiq.org/feeds/bills" target="_blank" rel="noopener noreferrer">
            RSS
          </a>
          , and{' '}
          <a href="https://njump.me/civiq@civdotiq.org" target="_blank" rel="noopener noreferrer">
            Nostr
          </a>
          . No account required.
        </p>
      </header>

      {/* ============ WHAT YOU CAN DO ============ */}
      <section className={styles.block} aria-labelledby="what-title">
        <h2 className={styles.sectionTitle} id="what-title">
          What you can do
        </h2>
        <p className={styles.sectionSub}>
          Explore federal and state government data from official sources
        </p>
        <div className={styles.cards}>
          {featureCards.map(card => (
            <Link key={`${card.title}-${card.href}`} href={card.href} className={styles.card}>
              <div className={`${styles.cardIcon} ${card.iconClass}`}>{card.icon}</div>
              <div className={styles.cardTitle}>{card.title}</div>
              <div className={styles.cardDesc}>{card.desc}</div>
              <span className={styles.cardLink}>{card.stat}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ QUICK START ============ */}
      <section className={styles.block} aria-labelledby="qs-title">
        <h2 className={styles.sectionTitle} id="qs-title">
          Quick start
        </h2>
        <p className={styles.sectionSub}>Alternative ways to explore the platform</p>
        <div className={styles.qs}>
          <div className={styles.qsCol}>
            <h4>Federal</h4>
            <div className={styles.qsBox}>
              <h5>Example Profiles</h5>
              <p>See what congressional member profiles look like</p>
              <Link className={styles.qsItem} href="/representative/J000294">
                <span className={styles.qsName}>Hakeem Jeffries</span>
                <span className={styles.qsRole}>House Minority Leader</span>
              </Link>
              <Link className={styles.qsItem} href="/representative/T000250">
                <span className={styles.qsName}>John Thune</span>
                <span className={styles.qsRole}>Senate Majority Leader</span>
              </Link>
              <Link className={styles.qsItem} href="/representative/J000299">
                <span className={styles.qsName}>Mike Johnson</span>
                <span className={styles.qsRole}>Speaker of the House</span>
              </Link>
            </div>
            <Link className={styles.qsItem} href="/representatives">
              <span className={styles.qsName}>All Representatives</span>
              <span className={styles.qsRole}>535 members of Congress</span>
            </Link>
            <Link className={styles.qsItem} href="/districts">
              <span className={styles.qsName}>All Districts</span>
              <span className={styles.qsRole}>435 congressional districts</span>
            </Link>
          </div>
          <div className={styles.qsCol}>
            <h4>State</h4>
            <div className={styles.qsBox}>
              <h5>Browse by State</h5>
              <p>View state legislators and bills</p>
              <label className="sr-only" htmlFor="state-select">
                Select a state
              </label>
              <select className={styles.qsSelect} id="state-select" defaultValue="">
                <option value="" disabled>
                  Select a state…
                </option>
                {usStates.map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <Link className={styles.qsItem} href="/states">
              <span className={styles.qsName}>All State Legislatures</span>
              <span className={styles.qsRole}>50 states + territories</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ ASK A QUESTION ============ */}
      <section className={styles.block} aria-labelledby="ask-title">
        <div className={styles.askHead}>
          <h3 id="ask-title">Ask a question</h3>
          <Link href="/ask">See all questions</Link>
        </div>
        <div className={styles.askGrid}>
          {askCards.map(c => (
            <Link key={c.href} className={styles.askCard} href={c.href}>
              <div className={styles.askTag}>{c.tag}</div>
              <div className={styles.askQ}>{c.q}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
