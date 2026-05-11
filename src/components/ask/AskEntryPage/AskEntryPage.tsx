/**
 * AskEntryPage — redesign chassis for /ask?v=new.
 *
 * Wire-bulletin reference Q&A entry surface. NOT a chatbot. The primary
 * affordance is the suggested-questions grid below the input — the input
 * itself is design-coherence, not a working NLP query engine (see
 * CqAskInput for the carve-out comment).
 *
 * Server component. CqAskInput is the only piece that needs 'use client'.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqAskInput, CqDisclaimer, CqLabel, CqPage } from '@/components/cq';
import { getAllTemplates, type QuestionTemplate } from '@/lib/questions/question-registry';

const CATEGORY_ORDER: QuestionTemplate['category'][] = ['who', 'how', 'what', 'where', 'why'];

const CATEGORY_LABEL: Record<QuestionTemplate['category'], string> = {
  who: 'Who',
  how: 'How',
  what: 'What',
  where: 'Where',
  why: 'Why',
};

const ENTITY_LABEL: Record<QuestionTemplate['entityType'], string> = {
  representative: 'Official',
  committee: 'Committee',
  topic: 'Topic',
};

// Known example entity IDs for direct deep-linking from the entry page.
// - Committees: HSAS / SSAS / SSBA — well-known standing committees that
//   exist today (see src/types/committee.ts COMMITTEE_ID_MAP).
// - Topics: canonical policy-area slugs from
//   src/lib/connections/policy-area-map.ts.
const COMMITTEE_EXAMPLE = { id: 'SSAS', name: 'Senate Armed Services' };
const TOPIC_EXAMPLE = { id: 'housing-and-community-development', name: 'Housing' };

interface SuggestedQuestion {
  template: QuestionTemplate;
  question: string;
  href: string;
  scope: string;
}

/**
 * For each registered template, build a deep-link to a representative example
 * answer page. Representative templates link to /your-reps (the entity must
 * be picked); committee and topic templates link to a known example entity.
 */
function buildSuggested(): SuggestedQuestion[] {
  return getAllTemplates().map(template => {
    if (template.entityType === 'representative') {
      const question = template.questionPattern.replace(/\{name\}/g, 'your representative');
      return {
        template,
        question,
        href: '/your-reps',
        scope: 'Official · pick one first',
      };
    }
    if (template.entityType === 'committee') {
      const question = template.questionPattern
        .replace(/\{name\}/g, COMMITTEE_EXAMPLE.name)
        .replace(/\{chamber\}/g, 'Senate');
      return {
        template,
        question,
        href: `/ask/${template.slug}/${COMMITTEE_EXAMPLE.id}?v=new`,
        scope: `Committee · ${COMMITTEE_EXAMPLE.id}`,
      };
    }
    // topic
    const question = template.questionPattern.replace(/\{name\}/g, TOPIC_EXAMPLE.name);
    return {
      template,
      question,
      href: `/ask/${template.slug}/${TOPIC_EXAMPLE.id}?v=new`,
      scope: `Topic · ${TOPIC_EXAMPLE.name}`,
    };
  });
}

function CqSuggestedQuestion({ question, scope, href }: SuggestedQuestion) {
  return (
    <Link
      href={href}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 16,
        padding: '12px 0',
        borderTop: '1px solid var(--line)',
        textDecoration: 'none',
        color: 'var(--fg1)',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: 'var(--fg1)', fontWeight: 500, lineHeight: 1.4 }}>
          {question}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            marginTop: 3,
            textTransform: 'uppercase',
          }}
        >
          {scope}
        </div>
      </div>
      <span aria-hidden="true" style={{ fontSize: 16, color: 'var(--fg3)' }}>
        →
      </span>
    </Link>
  );
}

function SectionHead({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingBottom: 8,
        borderBottom: '2px solid var(--ink)',
      }}
    >
      <CqLabel>{label}</CqLabel>
      {right}
    </div>
  );
}

interface AskEntryPageProps {
  /** Echoed back into the input if the visitor was bounced here from a submit. */
  initialQuery?: string;
  /** Build-time / index timestamp shown in the crumb rail. */
  asof?: string;
}

export function AskEntryPage({ initialQuery = '', asof }: AskEntryPageProps) {
  const suggested = buildSuggested();

  // Group suggested questions by category for the grid below the input.
  const grouped = new Map<QuestionTemplate['category'], SuggestedQuestion[]>();
  for (const s of suggested) {
    const list = grouped.get(s.template.category) ?? [];
    list.push(s);
    grouped.set(s.template.category, list);
  }
  const renderedCategories = CATEGORY_ORDER.filter(c => (grouped.get(c)?.length ?? 0) > 0);
  const today = asof ?? new Date().toISOString().slice(0, 10);

  return (
    <CqPage
      currentNav="find"
      crumbs={['Ask', 'Reference Q&A']}
      crumbRight={
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg3)' }}>
          Indexed {today} · 19 sources
        </span>
      }
    >
      {/* Hero — wire-bulletin. Not a chat composer. */}
      <div
        style={{
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
          marginBottom: 28,
        }}
      >
        <CqLabel>Reference Q&A</CqLabel>
        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 0.95,
            margin: '6px 0 12px',
            color: 'var(--fg1)',
            textTransform: 'uppercase',
            textWrap: 'balance',
          }}
        >
          Ask one question.
          <br />
          <span style={{ color: 'var(--fg3)' }}>Get one answer with sources.</span>
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--fg2)',
            lineHeight: 1.55,
            maxWidth: 720,
            margin: 0,
          }}
        >
          Every answer is built from the same government sources that drive the rest of CIV.IQ.
          Every claim is anchored to a record. One question per submission — no multi-turn back and
          forth. If the data is not there, the answer says so.
        </p>
      </div>

      {/* Single primary input — design-coherence, not a query engine. */}
      <div style={{ marginBottom: 32 }}>
        <CqAskInput initialValue={initialQuery} />
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--fg3)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span>v1 limitation · free-text answers not live yet</span>
          <span aria-hidden="true" style={{ color: 'var(--fg4)' }}>
            ·
          </span>
          <span>Browse suggested questions below</span>
        </div>
      </div>

      {/* Suggested questions, grouped by category */}
      <div style={{ marginBottom: 36 }}>
        <SectionHead
          label={`Suggested questions · ${suggested.length}`}
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
              Grouped by category
            </span>
          }
        />
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {renderedCategories.map(category => {
            const items = grouped.get(category) ?? [];
            return (
              <div
                key={category}
                style={{
                  border: '2px solid var(--ink)',
                  background: 'var(--bg1)',
                  padding: '18px 22px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                  }}
                >
                  <CqLabel>{CATEGORY_LABEL[category]}</CqLabel>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--fg3)',
                      border: '1px solid var(--line)',
                      padding: '1px 5px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {ENTITY_LABEL[items[0]?.template.entityType ?? 'representative']}
                  </span>
                </div>
                <div>
                  {items.map(s => (
                    <CqSuggestedQuestion key={s.template.slug} {...s} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* What this can and cannot answer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 28,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            border: '2px solid var(--ink)',
            background: 'var(--bg1)',
            padding: '22px 26px',
          }}
        >
          <CqLabel color="green">What this can answer</CqLabel>
          <ul
            style={{
              margin: '10px 0 0',
              padding: '0 0 0 18px',
              fontSize: 13,
              color: 'var(--fg2)',
              lineHeight: 1.6,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <li>How an official voted on bills tracked by Congress.gov.</li>
            <li>Who funded a campaign, by donor, PAC, or industry sector.</li>
            <li>What bills an official has sponsored or cosponsored.</li>
            <li>Which committees an official sits on, and who else sits there.</li>
            <li>Which organizations lobby a committee, and how much they spent.</li>
            <li>Which bills, rules, and federal spending touch a policy topic.</li>
          </ul>
        </div>
        <div
          style={{
            border: '2px solid var(--ink)',
            background: 'var(--bg1)',
            padding: '22px 26px',
          }}
        >
          <CqLabel color="amber">What this cannot answer</CqLabel>
          <ul
            style={{
              margin: '10px 0 0',
              padding: '0 0 0 18px',
              fontSize: 13,
              color: 'var(--fg2)',
              lineHeight: 1.6,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <li>Why an official voted a certain way. CIV.IQ tracks behavior, not motive.</li>
            <li>Predictions, projections, or political handicapping.</li>
            <li>Closed-door committee deliberations — only recorded floor votes are tracked.</li>
            <li>State campaign finance — federal only.</li>
            <li>Free-text questions outside the supported templates (v1 limitation).</li>
            <li>Local government below state legislatures (expanding incrementally).</li>
          </ul>
        </div>
      </div>

      <CqDisclaimer
        confidence={0.94}
        asof={today}
        method="Retrieval over canonical government sources · no synthesis"
      >
        {' '}
        No claim survives without a source-rail anchor.
      </CqDisclaimer>
    </CqPage>
  );
}
