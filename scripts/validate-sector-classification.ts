#!/usr/bin/env tsx
/**
 * Smoke test: classify known bills and check accuracy.
 * Run: npx tsx scripts/validate-sector-classification.ts
 */

import { classifyBillSectors } from '../src/lib/intelligence/embeddings/embedding-classifier';

const bills: Array<[string, string]> = [
  ['CHIPS and Science Act', 'Communications/Electronics'],
  ['National Defense Authorization Act for Fiscal Year 2025', 'Defense'],
  ['Medicare Prescription Drug Price Negotiation Act', 'Health'],
  ['Farm Bill Reauthorization Act of 2024', 'Agribusiness'],
  ['Infrastructure Investment and Jobs Act', 'Construction'],
  ['Clean Energy Innovation Act', 'Energy/Natural Resources'],
  ['Dodd-Frank Wall Street Reform Act', 'Finance/Insurance/Real Estate'],
  ['PRO Act - Protecting the Right to Organize', 'Labor|Ideology/Single-Issue'],
  ['FAA Reauthorization Act', 'Transportation'],
  ['Resolution honoring National Cheese Day', '(none)'],
];

async function main() {
  let passed = 0;
  let total = 0;

  for (const [title, expected] of bills) {
    const results = await classifyBillSectors(title, { threshold: 0.3 });
    const sectors = results.map(r => `${r.sector} (${r.confidence.toFixed(3)})`).join(', ');
    const isNone = expected === '(none)';
    const acceptedSectors = expected.split('|');
    const match = isNone
      ? results.length === 0
      : results.some(r => acceptedSectors.includes(r.sector));

    total++;
    if (match) passed++;

    console.log(`${match ? '  PASS' : '  FAIL'} "${title}"`);
    console.log(`       Got: ${sectors || '(none)'}`);
    if (!match) console.log(`       Expected: ${expected}`);
    console.log();
  }

  console.log(`\n${passed}/${total} classifications correct`);
  if (passed < total) {
    console.log(
      'Some classifications missed — consider adjusting sector descriptions or threshold.'
    );
  }
}

main().catch(console.error);
