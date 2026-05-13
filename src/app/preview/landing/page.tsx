import Link from 'next/link';
import { CiviqMark } from '@/components/landing/CiviqMark';
import { LandingUseLocation } from '@/components/landing/LandingUseLocation';
import styles from './landing.module.css';

export const metadata = {
  title: 'CIV.IQ — landing preview',
  robots: { index: false, follow: false },
};

interface FeatureCard {
  tone: 'red' | 'green' | 'blue';
  title: string;
  description: string;
  stat: string;
  href: string;
  iconPath: React.ReactNode;
}

const ICON_BUILDING = (
  <path d="M4 21V8h6v13M14 21V4h6v17M4 21h16" stroke="#fff" strokeWidth={2.5} fill="none" />
);
const ICON_PIN = (
  <>
    <path
      d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"
      stroke="#fff"
      strokeWidth={2.5}
      fill="none"
    />
    <circle cx="12" cy="10" r="3" stroke="#fff" strokeWidth={2.5} fill="none" />
  </>
);
const ICON_GRID = (
  <>
    <rect x="3" y="3" width="18" height="18" stroke="#fff" strokeWidth={2.5} fill="none" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="#fff" strokeWidth={2.5} fill="none" />
  </>
);
const ICON_CHECKBOX = (
  <>
    <rect x="3" y="3" width="18" height="18" rx="1" stroke="#fff" strokeWidth={2.5} fill="none" />
    <path d="m8 12 3 3 5-7" stroke="#fff" strokeWidth={2.5} fill="none" />
  </>
);
const ICON_INFO = (
  <>
    <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth={2.5} fill="none" />
    <path d="M12 7v6M12 17v.01" stroke="#fff" strokeWidth={2.5} fill="none" />
  </>
);
const ICON_DOC = (
  <>
    <path d="M4 4h12l4 4v12H4z" stroke="#fff" strokeWidth={2.5} fill="none" />
    <path d="M8 10h8M8 14h8M8 18h5" stroke="#fff" strokeWidth={2.5} fill="none" />
  </>
);

const FEATURES: FeatureCard[] = [
  {
    tone: 'blue',
    title: 'Federal Representatives',
    description: 'All 535 House and Senate members with profiles and contact info',
    stat: '535 Members',
    href: '/representatives',
    iconPath: ICON_BUILDING,
  },
  {
    tone: 'green',
    title: 'State Legislatures',
    description: 'Track state legislators and bills across all 50 states',
    stat: 'All 50 States',
    href: '/states',
    iconPath: ICON_PIN,
  },
  {
    tone: 'red',
    title: 'District Maps',
    description: 'Interactive maps showing congressional and state legislative boundaries',
    stat: '7,383 Districts',
    href: '/districts',
    iconPath: ICON_GRID,
  },
  {
    tone: 'blue',
    title: 'Voting Records',
    description: 'See how your representatives voted on legislation',
    stat: '1,200+ Votes',
    href: '/representatives',
    iconPath: ICON_CHECKBOX,
  },
  {
    tone: 'green',
    title: 'Campaign Finance',
    description: 'Track contributions and spending from FEC data',
    stat: '$2B+ Tracked',
    href: '/representatives',
    iconPath: ICON_INFO,
  },
  {
    tone: 'red',
    title: 'Committees',
    description: 'Explore congressional committees and their activities',
    stat: '34 Committees',
    href: '/committees',
    iconPath: ICON_BUILDING,
  },
  {
    tone: 'blue',
    title: 'Bill Tracking',
    description: 'Follow legislation from the 119th Congress in real time',
    stat: '8,000+ Bills',
    href: '/legislation',
    iconPath: ICON_DOC,
  },
  {
    tone: 'green',
    title: 'Local Government',
    description: 'Local government coverage — expanding incrementally',
    stat: 'Roadmap',
    href: '/local',
    iconPath: ICON_PIN,
  },
];

const EXAMPLE_PROFILES = [
  { id: 'J000294', name: 'Hakeem Jeffries', role: 'House Minority Leader' },
  { id: 'T000250', name: 'John Thune', role: 'Senate Majority Leader' },
  { id: 'J000299', name: 'Mike Johnson', role: 'Speaker of the House' },
];

const ASK_CARDS = [
  {
    slug: 'campaign-contributions',
    entityId: 'P000197',
    tag: 'Where',
    question: "Where do Nancy Pelosi's campaign contributions come from?",
  },
  {
    slug: 'voting-record',
    entityId: 'J000302',
    tag: 'How',
    question: 'How does Jim Jordan vote?',
  },
  {
    slug: 'donor-voting-alignment',
    entityId: 'M001153',
    tag: 'Why',
    question: "Does Lisa Murkowski's voting align with her donors?",
  },
  {
    slug: 'topic-bills',
    entityId: 'health',
    tag: 'What',
    question: 'What bills are about Health?',
  },
];

const TONE_CLASS = {
  red: styles.cardIconRed,
  green: styles.cardIconGreen,
  blue: styles.cardIconBlue,
};

export default function LandingPreviewPage() {
  return (
    <div className={styles.root}>
      <div className={styles.previewBanner}>
        <strong>PREVIEW · NOT LIVE</strong> — implementing <code>CIV.IQ Landing.html</code> at{' '}
        <code>/preview/landing</code>. Compare to <Link href="/">/</Link> and{' '}
        <Link href="/preview/citizen">/preview/citizen</Link>.
      </div>

      {/* ============ HERO ============ */}
      <header className={styles.hero}>
        <CiviqMark className={styles.heroMark} size={78} />

        <p className={styles.eyebrow}>
          CIV<span className={styles.eyebrowDot}>.</span>IQ
        </p>

        <h1 className={styles.heroTitle}>
          Know your
          <br />
          Representatives
        </h1>

        <p className={styles.lede}>
          See how your representatives vote, who funds them, and what they sponsor — all from public
          government data.
        </p>

        <form className={styles.searchRow} action="/results" method="get" role="search">
          <svg
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7a7e88"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4-4" />
          </svg>
          <input
            type="text"
            name="q"
            className={styles.searchInput}
            placeholder="Enter address"
            aria-label="Enter address"
          />
          <button type="submit" className={styles.searchSubmit}>
            SEARCH
          </button>
        </form>

        <LandingUseLocation className={styles.locBtn} />

        <p className={styles.tryLine}>
          Try: &ldquo;123 Main St, Detroit, MI&rdquo; or &ldquo;1600 Pennsylvania Ave, Washington,
          DC&rdquo;
        </p>

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
          .<br />
          All data available via <Link href="/open">open API</Link>, <Link href="/open">RSS</Link>,{' '}
          <Link href="/open">Nostr</Link>, and the <Link href="/open">Fediverse</Link>. No account
          required.
        </p>
      </header>

      {/* ============ WHAT YOU CAN DO ============ */}
      <section className={styles.block}>
        <h2 className={styles.sectionTitle}>What you can do</h2>
        <p className={styles.sectionSub}>
          Explore federal and state government data from official sources
        </p>

        <div className={styles.cards}>
          {FEATURES.map(feature => (
            <Link key={feature.title} href={feature.href} className={styles.card}>
              <div className={`${styles.cardIcon} ${TONE_CLASS[feature.tone]}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  {feature.iconPath}
                </svg>
              </div>
              <div className={styles.cardTitle}>{feature.title}</div>
              <div className={styles.cardDesc}>{feature.description}</div>
              <span className={styles.cardLink}>{feature.stat}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ QUICK START ============ */}
      <section className={styles.block}>
        <h2 className={styles.sectionTitle}>Quick start</h2>
        <p className={styles.sectionSub}>Alternative ways to explore the platform</p>

        <div className={styles.qs}>
          <div>
            <h4 className={styles.qsColLabel}>Federal</h4>

            <div className={styles.qsBox}>
              <h5 className={styles.qsBoxTitle}>Example Profiles</h5>
              <p className={styles.qsBoxSub}>See what congressional member profiles look like</p>
              {EXAMPLE_PROFILES.map(p => (
                <Link key={p.id} href={`/representative/${p.id}`} className={styles.qsListItem}>
                  <span className={styles.qsItemName}>{p.name}</span>
                  <span className={styles.qsItemRole}>{p.role}</span>
                </Link>
              ))}
            </div>

            <Link href="/representatives" className={styles.qsListItem}>
              <span className={styles.qsItemName}>All Representatives</span>
              <span className={styles.qsItemRole}>535 members of Congress</span>
            </Link>
            <Link href="/districts" className={styles.qsListItem}>
              <span className={styles.qsItemName}>All Districts</span>
              <span className={styles.qsItemRole}>435 congressional districts</span>
            </Link>
          </div>

          <div>
            <h4 className={styles.qsColLabel}>State</h4>

            <div className={styles.qsBox}>
              <h5 className={styles.qsBoxTitle}>Browse state legislatures</h5>
              <p className={styles.qsBoxSub}>View state legislators and bills</p>
              <select className={styles.qsSelect} aria-label="Select a state" defaultValue="">
                <option value="" disabled>
                  Select a state…
                </option>
              </select>
            </div>

            <Link href="/states" className={styles.qsListItem}>
              <span className={styles.qsItemName}>All State Legislatures</span>
              <span className={styles.qsItemRole}>50 states + territories</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ ASK A QUESTION ============ */}
      <section className={styles.block}>
        <div className={styles.askHead}>
          <h3>Ask a question</h3>
          <Link href="/ask">See all questions</Link>
        </div>
        <div className={styles.askGrid}>
          {ASK_CARDS.map(card => (
            <Link
              key={card.slug + card.entityId}
              href={`/ask/${card.slug}/${card.entityId}`}
              className={styles.askCard}
            >
              <div className={styles.askTag}>{card.tag}</div>
              <div className={styles.askQ}>{card.question}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
