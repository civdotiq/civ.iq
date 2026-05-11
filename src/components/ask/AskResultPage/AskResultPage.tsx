/**
 * AskResultPage — redesign chassis for /ask/[slug]/[entityId]?v=new.
 *
 * Wraps the existing typed answer pod (CampaignContributionsAnswer,
 * VotingRecordAnswer, etc.) with a wire-bulletin Q&A chassis:
 *
 *   - Question echo with entity chips
 *   - "Answer about" entity header (portrait for officials)
 *   - Two-column grid:
 *       left  = pod body + open-the-underlying-data CTAs + related Qs
 *       right = sticky aside with confidence band + methodology + limits
 *
 * v1 carve-outs (deliberate honesty):
 *   1. CqInlineCite is NOT applied inside pod bodies. The typed pods render
 *      structured data, not generated prose; no per-claim provenance to
 *      anchor to. Citation rail names the data sources the pod consulted,
 *      not per-sentence anchors. CqInlineCite is reserved for a future
 *      synthesis surface.
 *   2. Methodology copy is hard-coded per slug (methodology-by-slug.ts).
 *      The typed pods don't self-describe their sources / refresh cadence.
 *      That's a separate ARCHITECTURE-level addition.
 *   3. Reading-level indicator is intentionally omitted. The pods emit
 *      structured data, not prose — Flesch-Kincaid on a render layer is
 *      a fabricated number. Reading-level enforcement belongs upstream.
 *
 * Server component.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  CqChip,
  CqCitation,
  CqConfidenceBand,
  CqDisclaimer,
  CqLabel,
  CqLimitations,
  CqMethodologyBlock,
  CqPage,
  CqPortrait,
  CqQAColumn,
} from '@/components/cq';
import { getMethodologyForSlug } from '@/components/ask/methodology-by-slug';
import type { RelatedQuestionItem } from '@/lib/questions/related-questions';

export type AskEntity =
  | {
      type: 'representative';
      name: string;
      bioguideId: string;
      party: 'd' | 'r' | 'i';
      chamber: 'House' | 'Senate';
      state: string;
      district?: string;
      portraitSrc?: string;
      tenureCaption?: string;
    }
  | {
      type: 'committee';
      name: string;
      committeeId: string;
      chamber: 'House' | 'Senate' | 'Joint';
      jurisdiction?: string;
    }
  | {
      type: 'topic';
      name: string;
      slug: string;
    };

interface AskResultPageProps {
  slug: string;
  category: string;
  question: string;
  entity: AskEntity;
  /** Pre-resolved typed pod component (CampaignContributionsAnswer, etc.). */
  children: ReactNode;
  /**
   * Heuristic confidence (0–1) computed by the page from resolved data:
   *   - 0.91 when the pod's primary data field resolved
   *   - 0.74 when the pod has partial / fallback data
   *   - 0.40 when the pod returned empty
   * The chassis bands this to a label and does not invent the score.
   */
  confidence: number;
  /** One-sentence basis for the confidence value. */
  confidenceBasis: string;
  /** Existing computeRelatedQuestions() output. */
  relatedQuestions: ReadonlyArray<RelatedQuestionItem>;
  /** Render timestamp shown in the crumb rail. */
  asof?: string;
}

function PartyVariant(p: 'd' | 'r' | 'i'): 'd' | 'r' | 'i' {
  return p;
}

function SectionHead({ label, right }: { label: string; right?: ReactNode }) {
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

function EntityHeader({ entity }: { entity: AskEntity }) {
  if (entity.type === 'representative') {
    const districtLine = entity.district ? `${entity.state}-${entity.district}` : entity.state;
    return (
      <div
        style={{
          border: '2px solid var(--ink)',
          background: 'var(--bg1)',
          display: 'grid',
          gridTemplateColumns: '88px 1fr',
          marginBottom: 24,
        }}
      >
        <CqPortrait
          name={entity.name}
          size={88}
          party={PartyVariant(entity.party)}
          src={entity.portraitSrc}
        />
        <div style={{ padding: '14px 18px' }}>
          <CqLabel>Answer about</CqLabel>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              color: 'var(--fg1)',
            }}
          >
            {entity.name}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              marginTop: 6,
              flexWrap: 'wrap',
            }}
          >
            <CqChip variant={entity.party} size="sm">
              {entity.party.toUpperCase()} · {districtLine} · {entity.chamber}
            </CqChip>
            {entity.tenureCaption && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                }}
              >
                {entity.tenureCaption}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // committee / topic — no portrait, labeled tile
  const title = entity.name;
  const subtitle =
    entity.type === 'committee'
      ? `${entity.chamber} committee · ${entity.committeeId}`
      : 'Policy topic';

  return (
    <div
      style={{
        border: '2px solid var(--ink)',
        background: 'var(--bg1)',
        padding: '14px 18px',
        marginBottom: 24,
      }}
    >
      <CqLabel>Answer about</CqLabel>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          textTransform: 'uppercase',
          color: 'var(--fg1)',
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg3)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {subtitle}
      </div>
      {entity.type === 'committee' && entity.jurisdiction && (
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 13,
            color: 'var(--fg2)',
            lineHeight: 1.55,
          }}
        >
          {entity.jurisdiction}
        </p>
      )}
    </div>
  );
}

function QuestionEcho({
  question,
  entity,
  category,
}: {
  question: string;
  entity: AskEntity;
  category: string;
}) {
  const lensChip = (
    <CqChip variant="info" filled={false} size="sm">
      Lens · {category.toUpperCase()}
    </CqChip>
  );

  let entityChip: ReactNode;
  if (entity.type === 'representative') {
    entityChip = (
      <CqChip variant={PartyVariant(entity.party)} size="sm">
        Official · {entity.bioguideId}
      </CqChip>
    );
  } else if (entity.type === 'committee') {
    entityChip = (
      <CqChip variant="ink" filled={false} size="sm">
        Committee · {entity.committeeId}
      </CqChip>
    );
  } else {
    entityChip = (
      <CqChip variant="ink" filled={false} size="sm">
        Topic · {entity.name}
      </CqChip>
    );
  }

  return (
    <div
      style={{
        paddingBottom: 20,
        borderBottom: '2px solid var(--ink)',
        marginBottom: 24,
      }}
    >
      <CqLabel>Question</CqLabel>
      <h1
        style={{
          fontSize: 'clamp(28px, 4vw, 36px)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          margin: '6px 0 14px',
          color: 'var(--fg1)',
          textWrap: 'balance',
        }}
      >
        {question}
      </h1>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {entityChip}
        {lensChip}
      </div>
    </div>
  );
}

function CqSuggestedQuestionLink({ q }: { q: RelatedQuestionItem }) {
  return (
    <Link
      href={q.href}
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
          {q.question}
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
          {q.category} · {q.href}
        </div>
      </div>
      <span aria-hidden="true" style={{ fontSize: 16, color: 'var(--fg3)' }}>
        →
      </span>
    </Link>
  );
}

function renderUnderlyingDataTiles(slug: string, entityId: string) {
  const meth = getMethodologyForSlug(slug);
  if (!meth || meth.underlyingData.length === 0) return null;

  return (
    <div>
      <SectionHead label="Open the underlying data" />
      <div
        style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {meth.underlyingData.map(tile => {
          const route = tile.route.replace('{entityId}', entityId);
          return (
            <Link
              key={route}
              href={route}
              style={{
                border: '2px solid var(--ink)',
                background: 'var(--bg1)',
                padding: '16px 18px',
                textDecoration: 'none',
                color: 'var(--fg1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--civiq-blue-active)',
                  letterSpacing: '0.04em',
                }}
              >
                {route}
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01em',
                  color: 'var(--fg1)',
                }}
              >
                {tile.title}{' '}
                <span aria-hidden="true" style={{ color: 'var(--fg3)' }}>
                  →
                </span>
              </span>
              <span style={{ fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>
                {tile.sub}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AskResultPage({
  slug,
  category,
  question,
  entity,
  children,
  confidence,
  confidenceBasis,
  relatedQuestions,
  asof,
}: AskResultPageProps) {
  const today = asof ?? new Date().toISOString().slice(0, 10);
  const methodology = getMethodologyForSlug(slug);
  const entityId =
    entity.type === 'representative'
      ? entity.bioguideId
      : entity.type === 'committee'
        ? entity.committeeId
        : entity.slug;

  return (
    <CqPage
      currentNav="find"
      crumbs={['Ask', slug, `${entityId} · ${entity.name}`]}
      crumbRight={
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg3)' }}>
          Answered {today} · Confidence {confidence.toFixed(2)}
        </span>
      }
    >
      <QuestionEcho question={question} entity={entity} category={category} />

      {/* Two-column grid: answer body + right rail */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 36,
          alignItems: 'flex-start',
        }}
        className="ask-result-grid"
      >
        {/* Answer column */}
        <div>
          <EntityHeader entity={entity} />
          <CqQAColumn>
            <div>
              <CqLabel>Answer · Structured data</CqLabel>
              <div style={{ marginTop: 10 }}>{children}</div>
            </div>

            {methodology && methodology.citations.length > 0 && (
              <div>
                <SectionHead
                  label={`Sources used · ${methodology.citations.length}`}
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
                      Anchored to records
                    </span>
                  }
                />
                <div>
                  {methodology.citations.map((c, i) => (
                    <CqCitation
                      key={`${c.source}-${c.entity}-${i}`}
                      n={i + 1}
                      source={c.source}
                      entity={c.entity}
                      href={c.href}
                    />
                  ))}
                </div>
              </div>
            )}

            {renderUnderlyingDataTiles(slug, entityId)}

            {relatedQuestions.length > 0 && (
              <div>
                <SectionHead
                  label="Related questions"
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
                      Same entity · different lens
                    </span>
                  }
                />
                <div style={{ marginTop: 4 }}>
                  {relatedQuestions.map(q => (
                    <CqSuggestedQuestionLink key={q.href} q={q} />
                  ))}
                </div>
              </div>
            )}
          </CqQAColumn>
        </div>

        {/* Right rail — sticky on desktop */}
        <aside
          style={{
            position: 'sticky',
            top: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <CqConfidenceBand score={confidence} basis={confidenceBasis} />
          {methodology && (
            <CqMethodologyBlock
              sources={methodology.sources}
              retrieval={methodology.retrieval}
              generation={methodology.generation}
              refresh={methodology.refresh}
            />
          )}
          {methodology && <CqLimitations items={methodology.limitations} />}
          <CqDisclaimer
            confidence={confidence}
            asof={today}
            method="Retrieval over canonical sources · extractive only"
          />
        </aside>
      </div>
    </CqPage>
  );
}
