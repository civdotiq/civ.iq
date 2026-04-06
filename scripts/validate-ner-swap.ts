/**
 * NER Model Swap Validation Script
 *
 * Compares entity extraction between the old model (Xenova/bert-base-NER)
 * and the new model (onnx-community/distilbert-NER-ONNX) using real
 * Federal Register documents.
 *
 * Usage: npx tsx scripts/validate-ner-swap.ts
 *
 * NOT shipped — local validation only.
 */

import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

const OLD_MODEL = 'Xenova/bert-base-NER';
const NEW_MODEL = 'onnx-community/distilbert-NER-ONNX';
const FR_API = 'https://www.federalregister.gov/api/v1';

interface NERToken {
  word: string;
  entity: string;
  score: number;
  start: number;
  end: number;
}

interface FRDocument {
  document_number: string;
  title: string;
  abstract: string;
  body_html_url?: string;
}

// ── Fetch real Federal Register documents ──────────────────────────

async function fetchDocuments(): Promise<FRDocument[]> {
  const params = new URLSearchParams({
    per_page: '5',
    order: 'newest',
    'fields[]': ['document_number', 'title', 'abstract'].join(','),
    'conditions[type][]': 'RULE',
  });

  // The fields[] param needs to be repeated
  const url = `${FR_API}/documents.json?per_page=5&order=newest&conditions[type][]=RULE&fields[]=document_number&fields[]=title&fields[]=abstract`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FR API failed: ${res.status}`);

  const data = await res.json();
  return data.results as FRDocument[];
}

// ── Run NER with a given model ─────────────────────────────────────

async function runNER(modelId: string, texts: string[]): Promise<Map<string, NERToken[]>> {
  console.log(`\nLoading model: ${modelId}...`);
  const t0 = performance.now();
  const ner = await pipeline('token-classification', modelId, { dtype: 'q8' });
  const loadMs = Math.round(performance.now() - t0);
  console.log(`  Loaded in ${loadMs}ms`);

  const results = new Map<string, NERToken[]>();
  for (const text of texts) {
    const tokens = (await ner(text)) as NERToken[];
    results.set(text, tokens);
  }

  // Dispose to free memory before loading second model
  await ner.dispose();
  return results;
}

// ── Merge BIO tokens into entity spans ─────────────────────────────

interface Entity {
  text: string;
  type: string;
}

function mergeTokens(tokens: NERToken[]): Entity[] {
  const entities: Entity[] = [];
  let current: { words: string[]; type: string } | null = null;

  for (const token of tokens) {
    const prefix = token.entity.substring(0, 2);
    const entityType = token.entity.substring(2);

    if (prefix === 'B-') {
      if (current) entities.push({ text: current.words.join(' '), type: current.type });
      current = { words: [token.word.replace(/^##/, '')], type: entityType };
    } else if (prefix === 'I-' && current && entityType === current.type) {
      current.words.push(token.word.replace(/^##/, ''));
    } else {
      if (current) entities.push({ text: current.words.join(' '), type: current.type });
      current = null;
    }
  }
  if (current) entities.push({ text: current.words.join(' '), type: current.type });

  return entities;
}

// ── Compare results ────────────────────────────────────────────────

function compare(
  docTitle: string,
  oldTokens: NERToken[],
  newTokens: NERToken[]
): { passed: boolean } {
  const oldEntities = mergeTokens(oldTokens);
  const newEntities = mergeTokens(newTokens);

  const oldByType = countByType(oldEntities);
  const newByType = countByType(newEntities);

  console.log(`\n── ${docTitle.substring(0, 80)}...`);
  console.log(
    `  Old model: ${oldEntities.length} entities | New model: ${newEntities.length} entities`
  );

  const allTypes = new Set([...Object.keys(oldByType), ...Object.keys(newByType)]);
  for (const type of allTypes) {
    const oldCount = oldByType[type] ?? 0;
    const newCount = newByType[type] ?? 0;
    const delta = newCount - oldCount;
    const pct =
      oldCount > 0 ? Math.round(((newCount - oldCount) / oldCount) * 100) : newCount > 0 ? 100 : 0;
    const flag = pct < -20 ? ' ⚠ LOSS >20%' : pct > 50 ? ' ⚠ GAIN >50%' : '';
    console.log(
      `  ${type}: ${oldCount} → ${newCount} (${delta >= 0 ? '+' : ''}${delta}, ${pct >= 0 ? '+' : ''}${pct}%)${flag}`
    );
  }

  // Flag if total entities drop by >20% or gain >50%
  const totalOld = oldEntities.length;
  const totalNew = newEntities.length;
  const totalPct = totalOld > 0 ? ((totalNew - totalOld) / totalOld) * 100 : 0;

  if (totalPct < -20) {
    console.log(`  ⚠ OVERALL LOSS: ${Math.round(totalPct)}% fewer entities`);
    return { passed: false };
  }
  if (totalPct > 50) {
    console.log(`  ⚠ OVERALL GAIN: ${Math.round(totalPct)}% more entities`);
    return { passed: false };
  }

  console.log(`  ✓ Within acceptable range`);
  return { passed: true };
}

function countByType(entities: Entity[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of entities) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  return counts;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching Federal Register documents...');
  const docs = await fetchDocuments();
  console.log(`Fetched ${docs.length} documents`);

  // Use abstracts as test texts (they're substantial enough for NER)
  const texts = docs.filter(d => d.abstract && d.abstract.length > 50).map(d => d.abstract);

  if (texts.length < 3) {
    console.error('Not enough documents with abstracts. Need at least 3.');
    process.exit(1);
  }

  console.log(`Using ${texts.length} document abstracts for comparison`);

  // Run old model
  const oldResults = await runNER(OLD_MODEL, texts);

  // Run new model
  const newResults = await runNER(NEW_MODEL, texts);

  // Compare
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('COMPARISON RESULTS');
  console.log('═══════════════════════════════════════════════════════════');

  let allPassed = true;
  for (const text of texts) {
    const oldTokens = oldResults.get(text) ?? [];
    const newTokens = newResults.get(text) ?? [];
    const { passed } = compare(
      docs.find(d => d.abstract === text)?.title ?? text.substring(0, 40),
      oldTokens,
      newTokens
    );
    if (!passed) allPassed = false;
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('✓ ALL DOCUMENTS PASSED — safe to swap models');
  } else {
    console.log('⚠ SOME DOCUMENTS FLAGGED — review before proceeding');
  }
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
