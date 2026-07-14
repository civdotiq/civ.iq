import type { Metadata } from 'next';
import Link from 'next/link';
import SearchForm from '@/components/SearchForm';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import styles from './page.module.css';

// The homepage is the only page whose canonical is the bare origin; the root
// layout deliberately sets none (see src/app/layout.tsx alternates comment).
export const metadata: Metadata = {
  alternates: { canonical: 'https://civdotiq.org' },
};

// Live counts refresh once a day; the hero must never block on Congress.gov.
export const revalidate = 86400;

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

type HomeCounts = { bills: string; committees: string };

// Fallbacks used when Congress.gov is unreachable — the hero shows a stable
// number rather than breaking or fabricating one.
const COUNTS_FALLBACK: HomeCounts = { bills: '8,000+ Bills', committees: '40 Committees' };

async function fetchHomeCounts(): Promise<HomeCounts> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) return COUNTS_FALLBACK;

  const congress = process.env.CURRENT_CONGRESS || String(getCurrentCongressNumber());
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
    'X-API-Key': apiKey,
  };
  const base = 'https://api.congress.gov/v3';

  const bills = async (): Promise<string> => {
    try {
      const res = await fetch(`${base}/bill/${congress}?limit=1&format=json`, {
        headers,
        next: { revalidate: 86400 },
      });
      if (!res.ok) return COUNTS_FALLBACK.bills;
      const raw = await res.json();
      const n = raw?.pagination?.count;
      return typeof n === 'number' ? `${n.toLocaleString('en-US')} Bills` : COUNTS_FALLBACK.bills;
    } catch {
      return COUNTS_FALLBACK.bills;
    }
  };

  const committees = async (): Promise<string> => {
    try {
      const res = await fetch(`${base}/committee/${congress}?limit=250&format=json`, {
        headers,
        next: { revalidate: 86400 },
      });
      if (!res.ok) return COUNTS_FALLBACK.committees;
      const raw = await res.json();
      const list: Array<{ parent?: unknown; committeeTypeCode?: string }> = raw?.committees ?? [];
      // Count only top-level committees: exclude subcommittees (which carry a
      // `parent`) and caucuses/commissions — the honest sense of "committees".
      const n = list.filter(
        c => !c.parent && c.committeeTypeCode !== 'Commission or Caucus'
      ).length;
      return n > 0 ? `${n} Committees` : COUNTS_FALLBACK.committees;
    } catch {
      return COUNTS_FALLBACK.committees;
    }
  };

  const [billStat, committeeStat] = await Promise.all([bills(), committees()]);
  return { bills: billStat, committees: committeeStat };
}

function buildFeatureCards(counts: HomeCounts): FeatureCard[] {
  return [
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
      stat: 'Roll-call votes',
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
      stat: 'From FEC data',
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
      stat: counts.committees,
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
      stat: counts.bills,
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
}

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

const exampleProfiles = [
  { href: '/representative/J000294', name: 'Hakeem Jeffries', role: 'House Minority Leader' },
  { href: '/representative/T000250', name: 'John Thune', role: 'Senate Majority Leader' },
  { href: '/representative/J000299', name: 'Mike Johnson', role: 'Speaker of the House' },
];

export default async function HomePage() {
  const featureCards = buildFeatureCards(await fetchHomeCounts());

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

      {/* ============ EXAMPLE PROFILES ============ */}
      <section className={styles.examples} aria-label="Example representative profiles">
        <span className={styles.examplesLabel}>See an example profile</span>
        <div className={styles.examplesRow}>
          {exampleProfiles.map(p => (
            <Link key={p.href} className={styles.exampleItem} href={p.href}>
              <span className={styles.exampleName}>{p.name}</span>
              <span className={styles.exampleRole}>{p.role}</span>
            </Link>
          ))}
        </div>
      </section>

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
