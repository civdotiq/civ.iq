import Link from 'next/link';
import { CqChip, CqDisclaimer, CqLabel, CqPlainReading } from '@/components/cq';
import { getSearchData } from './data';
import { FacetRail } from './FacetRail';
import { SectionHead } from './SectionHead';
import { ResultRow } from './ResultRow';
import { BillResultRow } from './BillResultRow';
import { CommitteeResultRow } from './CommitteeResultRow';
import { TopMatchBill } from './TopMatchBill';

type FacetKey = 'all' | 'officials' | 'bills' | 'committees';

interface SearchResultsProps {
  query: string;
  type?: string;
}

const TODAY_LABEL = new Date().toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function normalizeType(type: string | undefined): FacetKey {
  if (type === 'officials' || type === 'bills' || type === 'committees') return type;
  return 'all';
}

function NoQueryState() {
  return (
    <div style={{ padding: '32px 36px 56px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ paddingBottom: 20, borderBottom: '2px solid var(--ink)', marginBottom: 24 }}>
        <CqLabel>Search</CqLabel>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
            margin: '6px 0 12px',
            textTransform: 'uppercase',
          }}
        >
          Find officials, bills, committees
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--fg2)',
            lineHeight: 1.5,
            maxWidth: 640,
            margin: 0,
          }}
        >
          Use the search bar above to look up a representative by name, a bill number, or a
          committee. For accurate district lookup, enter a full home address — ZIP codes match the
          wrong district 10–20% of the time.
        </p>
      </div>
      <CqPlainReading label="Tip.">
        Try “infrastructure”, “Jeffries”, “Murkowski”, or “Energy and Commerce”.
      </CqPlainReading>
    </div>
  );
}

export async function SearchResults({ query, type }: SearchResultsProps) {
  const trimmed = query.trim();
  if (!trimmed) return <NoQueryState />;

  const data = await getSearchData(trimmed);
  const active: FacetKey = normalizeType(type);
  const counts = {
    all: data.totals.all,
    officials: data.totals.officials,
    bills: data.totals.bills,
    committees: data.totals.committees,
  };

  const showOfficials = active === 'all' || active === 'officials';
  const showBills = active === 'all' || active === 'bills';
  const showCommittees = active === 'all' || active === 'committees';
  const topBill = showBills ? data.bills[0] : undefined;
  const remainingBills = topBill ? data.bills.slice(1) : data.bills;

  return (
    <div style={{ padding: '32px 36px 56px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ paddingBottom: 20, borderBottom: '2px solid var(--ink)', marginBottom: 24 }}>
        <CqLabel>You searched for</CqLabel>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
            margin: '6px 0 12px',
            textTransform: 'uppercase',
            wordBreak: 'break-word',
          }}
        >
          “{trimmed}”
        </h1>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <CqChip variant="ink" filled={false} size="sm">
            Officials · {data.totals.officials}
          </CqChip>
          <CqChip variant="ink" filled={false} size="sm">
            Bills · {data.totals.bills}
          </CqChip>
          <CqChip variant="ink" filled={false} size="sm">
            Committees · {data.totals.committees}
          </CqChip>
          <span
            style={{
              fontSize: 11,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            For representative lookup by location, enter a full home address →{' '}
            <Link
              href="/"
              style={{
                color: 'var(--civiq-blue)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Address search
            </Link>
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        <FacetRail query={trimmed} active={active} counts={counts} />

        <div>
          {data.totals.all === 0 && (
            <div style={{ marginBottom: 16 }}>
              <CqPlainReading label="No matches.">
                The current search index covers federal officials, Congress.gov bills, and federal
                committees. Try a representative’s last name, a bill number like “HR 3684”, or a
                committee keyword.
              </CqPlainReading>
            </div>
          )}

          {showBills && topBill && <TopMatchBill bill={topBill} />}

          {showOfficials && (
            <>
              <SectionHead
                label={`Officials · ${data.officials.length}`}
                right={
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--fg3)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Sorted by relevance
                  </span>
                }
              />
              {data.officials.length === 0 ? (
                <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--fg3)' }}>
                  No officials match.
                </div>
              ) : (
                data.officials.map((o, i) => <ResultRow key={o.bioguideId} o={o} first={i === 0} />)
              )}
              <div style={{ height: 24 }} />
            </>
          )}

          {showBills && (
            <>
              <SectionHead
                label={`Bills · ${data.bills.length}`}
                right={
                  <Link
                    href="/legislation"
                    style={{
                      fontFamily: 'var(--font-primary)',
                      fontSize: 11,
                      color: 'var(--civiq-blue)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--tracking-label)',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    View all bills →
                  </Link>
                }
              />
              {remainingBills.length === 0 ? (
                <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--fg3)' }}>
                  {topBill ? '' : 'No bills match.'}
                </div>
              ) : (
                remainingBills.map((b, i) => (
                  <BillResultRow key={`${b.type}-${b.number}`} b={b} first={i === 0} />
                ))
              )}
              <div style={{ height: 24 }} />
            </>
          )}

          {showCommittees && (
            <>
              <SectionHead label={`Committees · ${data.committees.length}`} />
              {data.committees.length === 0 ? (
                <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--fg3)' }}>
                  No committees match.
                </div>
              ) : (
                data.committees.map((c, i) => (
                  <CommitteeResultRow key={c.id} c={c} first={i === 0} />
                ))
              )}
            </>
          )}

          <div
            style={{
              marginTop: 32,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 0',
              borderTop: '2px solid var(--ink)',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {data.totals.all === 0
                ? 'Showing 0 of 0'
                : `Showing 1–${data.totals.all} of ${data.totals.all}`}
            </span>
            <span
              style={{
                fontSize: 10,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Search · {(data.elapsedMs / 1000).toFixed(2)}s
            </span>
          </div>

          <div style={{ marginTop: 16 }}>
            <CqDisclaimer
              confidence={0.95}
              asof={TODAY_LABEL}
              method="Search index built from Congress.gov + congress-legislators committee map"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
