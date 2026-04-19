/**
 * Compare Layer-0 sample path vs Layer-1 aggregate path on real FEC data.
 * Prints industry breakdown and data-quality metrics side by side for three
 * representatives of very different fundraising sizes.
 *
 * Usage: tsx scripts/compare-finance-paths.ts
 */

import {
  aggregateFinanceData,
  aggregateFinanceDataFromAggregates,
} from '../src/lib/fec/finance-aggregator';

type Rep = { name: string; fecId: string; state: string };

const REPS: Rep[] = [
  { name: 'Pelosi (top raiser)', fecId: 'H8CA05035', state: 'CA' },
  { name: 'Murkowski (mid)', fecId: 'S4AK00099', state: 'AK' },
  { name: 'Gillen (freshman)', fecId: 'H2NY04244', state: 'NY' },
];

const CYCLE = 2024;

function fmtMoney(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function printBreakdown(
  label: string,
  data: Awaited<ReturnType<typeof aggregateFinanceData>>
): void {
  console.log(`\n  ${label}:`);
  if (!data) {
    console.log('    (no data)');
    return;
  }
  const q = data.dataQuality.industry;
  console.log(
    `    total=${fmtMoney(data.totalRaised)}  analyzed=${q.totalContributionsAnalyzed.toLocaleString()}  ` +
      `withEmployer=${q.contributionsWithEmployer.toLocaleString()}  completeness=${pct(q.completenessPercentage)}  ` +
      `confidence=${data.dataQuality.overallDataConfidence}`
  );
  const top = data.industryBreakdown.slice(0, 8);
  for (const ind of top) {
    console.log(
      `    ${ind.industry.padEnd(40)} ${fmtMoney(ind.amount).padStart(10)}  ${pct(ind.percentage).padStart(7)}  (${ind.count.toLocaleString()} contribs)`
    );
  }
}

async function runOne(rep: Rep): Promise<void> {
  console.log(`\n=== ${rep.name} (${rep.fecId}, ${rep.state}) ===`);
  const startOld = Date.now();
  const oldData = await aggregateFinanceData(rep.fecId, CYCLE, rep.state, true).catch(
    (e: Error) => {
      console.log(`  OLD path ERROR: ${e.message}`);
      return null;
    }
  );
  const oldMs = Date.now() - startOld;

  const startNew = Date.now();
  const newData = await aggregateFinanceDataFromAggregates(rep.fecId, CYCLE, rep.state).catch(
    (e: Error) => {
      console.log(`  NEW path ERROR: ${e.message}`);
      return null;
    }
  );
  const newMs = Date.now() - startNew;

  printBreakdown(`OLD Layer-0 sample (${oldMs}ms)`, oldData);
  printBreakdown(`NEW Layer-1 aggregates (${newMs}ms)`, newData);
}

async function main(): Promise<void> {
  for (const rep of REPS) {
    await runOne(rep);
  }
}

main().catch(e => {
  console.error('fatal:', e);
  process.exit(1);
});
