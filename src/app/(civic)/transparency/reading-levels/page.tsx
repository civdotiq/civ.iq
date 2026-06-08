/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useEffect, useState } from 'react';
import { Breadcrumbs } from '@/components/shared/navigation/Breadcrumbs';

interface DailyStats {
  date: string;
  distribution: Record<number, number>;
  total: number;
  avgGrade: number;
  passRate: number;
}

interface ReadingLevelData {
  dateRange: { startDate: string; endDate: string };
  daily: DailyStats[];
  aggregate: {
    totalSummaries: number;
    avgGradeLevel: number;
    passRate: number;
    targetGrade: number;
    avgFleschEase: number;
    fleschEasePassRate: number;
    fleschEaseTarget: number;
  };
}

export default function ReadingLevelDashboard() {
  const [data, setData] = useState<ReadingLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics/reading-levels')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Transparency' },
            { label: 'Reading Level Compliance', href: '/transparency/reading-levels' },
          ]}
          className="mb-6"
        />
        <h1 className="text-2xl font-bold mb-4">Reading Level Compliance</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 w-1/3" />
          <div className="h-48 bg-gray-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Transparency' },
            { label: 'Reading Level Compliance', href: '/transparency/reading-levels' },
          ]}
          className="mb-6"
        />
        <h1 className="text-2xl font-bold mb-4">Reading Level Compliance</h1>
        <p className="text-amber-600">Failed to load data: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { aggregate, daily } = data;

  // Build histogram data from aggregate distribution
  const histogram: Record<number, number> = {};
  for (const day of daily) {
    for (const [grade, count] of Object.entries(day.distribution)) {
      const g = parseInt(grade);
      histogram[g] = (histogram[g] ?? 0) + count;
    }
  }

  const maxCount = Math.max(...Object.values(histogram), 1);
  const grades = Array.from({ length: 16 }, (_, i) => i + 1);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <nav className="text-sm text-gray-500 mb-6">
        <a href="/" className="hover:text-civiq-blue">
          Home
        </a>
        <span className="mx-2">&rsaquo;</span>
        <span className="font-medium text-gray-900">Reading Level Compliance</span>
      </nav>
      <h1 className="text-2xl font-bold mb-2">Reading Level Compliance</h1>
      <p className="text-sm text-gray-600 mb-8">
        CIV.IQ commits to generating summaries at an 8th-grade reading level or below, following the{' '}
        <a
          href="https://www.plainlanguage.gov"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3ea2d4' }}
        >
          Federal Plain Language Guidelines
        </a>{' '}
        and the{' '}
        <a
          href="https://www.govinfo.gov/content/pkg/PLAW-111publ274/pdf/PLAW-111publ274.pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3ea2d4' }}
        >
          Plain Writing Act of 2010
        </a>
        . This dashboard tracks actual Flesch-Kincaid grade levels across all AI-generated bill
        summaries.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="border-2 border-black p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Summaries</p>
          <p className="text-3xl font-bold mt-1">{aggregate.totalSummaries}</p>
        </div>
        <div className="border-2 border-black p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Grade Level</p>
          <p className="text-3xl font-bold mt-1">{aggregate.avgGradeLevel}</p>
          <p className="text-xs text-gray-500">Target: {aggregate.targetGrade}</p>
        </div>
        <div className="border-2 border-black p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pass Rate</p>
          <p
            className={`text-3xl font-bold mt-1 ${
              aggregate.passRate >= 80 ? 'text-civiq-blue' : 'text-amber-600'
            }`}
          >
            {aggregate.passRate}%
          </p>
          <p className="text-xs text-gray-500">&le; Grade 8</p>
        </div>
        <div className="border-2 border-black p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Flesch Reading Ease</p>
          <p
            className={`text-3xl font-bold mt-1 ${
              aggregate.avgFleschEase >= aggregate.fleschEaseTarget
                ? 'text-civiq-blue'
                : 'text-amber-600'
            }`}
          >
            {aggregate.avgFleschEase}
          </p>
          <p className="text-xs text-gray-500">Target: &ge; {aggregate.fleschEaseTarget}</p>
        </div>
      </div>

      {/* Histogram */}
      <div className="border-2 border-black p-4 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-4">Grade Level Distribution</h2>
        <div className="flex items-end gap-1" style={{ height: 160 }}>
          {grades.map(grade => {
            const count = histogram[grade] ?? 0;
            const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const isPass = grade <= 8;

            return (
              <div key={grade} className="flex-1 flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">{count || ''}</span>
                <div
                  className={`w-full ${isPass ? 'bg-civiq-blue' : 'bg-amber-600'}`}
                  style={{ height: `${Math.max(heightPct, count > 0 ? 2 : 0)}%` }}
                />
                <span className="text-xs mt-1">{grade}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Grade Level</span>
          <span>
            <span className="inline-block w-3 h-2 bg-civiq-blue mr-1" />
            Pass (&le;8)
            <span className="inline-block w-3 h-2 bg-amber-600 ml-3 mr-1" />
            Fail (&gt;8)
          </span>
        </div>
      </div>

      {/* Daily Trend */}
      {daily.length > 0 && (
        <div className="border-2 border-black p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide mb-4">Daily Pass Rate</h2>
          <div className="space-y-1">
            {daily.slice(-14).map(day => (
              <div key={day.date} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20 shrink-0">{day.date}</span>
                <div className="flex-1 bg-gray-100 h-4">
                  <div
                    className={`h-full ${day.passRate >= 80 ? 'bg-civiq-blue' : 'bg-amber-600'}`}
                    style={{ width: `${day.passRate}%` }}
                  />
                </div>
                <span className="text-xs w-12 text-right">{day.passRate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data state */}
      {daily.length === 0 && (
        <div className="border-2 border-gray-300 p-8 text-center">
          <p className="text-gray-500">
            No reading level data yet. Scores are tracked when bill summaries are generated.
          </p>
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-gray-500 mt-4">
        Measured using Flesch-Kincaid Grade Level formula. Compliance per the{' '}
        <a
          href="https://www.plainlanguage.gov"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3ea2d4' }}
        >
          Plain Writing Act of 2010
        </a>{' '}
        (Public Law 111-274). Data retained for 30 days.
      </p>
    </div>
  );
}
