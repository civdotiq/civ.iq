/**
 * Printable Rubric Component - Ulm School Design System
 * Based on Otl Aicher / Dieter Rams principles:
 * - Systematic grid (8px base)
 * - Borders, not shadows
 * - Minimal color: red, green, blue + grayscale
 * - Functional typography
 * - Every element serves a purpose
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { X } from 'lucide-react';
import {
  type AssessmentRubric,
  type GradeLevel,
  GRADE_LEVEL_INFO,
} from '@/lib/data/education-curriculum';

interface PrintableRubricProps {
  rubric: AssessmentRubric;
  gradeLevel: GradeLevel;
  onClose: () => void;
}

const GRADE_LABELS: Record<GradeLevel, string> = {
  elementary: 'Elementary · Grades K–5',
  middle: 'Middle School · Grades 6–8',
  high: 'High School · Grades 9–12',
};

export function PrintableRubric({ rubric, gradeLevel, onClose }: PrintableRubricProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-rubric-root fixed inset-0 z-50 overflow-auto bg-black/50 flex items-start justify-center p-4 print:p-0 print:bg-white print:block print:static print:overflow-visible">
      <div className="bg-white w-full max-w-[8.5in] my-8 print:m-0 print:max-w-none print:shadow-none shadow-xl print:w-full">
        {/* Modal Header - Hidden when printing */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black print:hidden">
          <h2 className="text-lg font-semibold">Print Rubric</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Rubric Content */}
        <div className="p-8 print:p-6 font-['Inter',system-ui,sans-serif] text-[11pt] leading-[1.4] text-[#1a1a1a]">
          {/* Rubric Header */}
          <header className="grid grid-cols-[1fr_auto] items-start gap-4 pb-4 border-b-2 border-black mb-6">
            <div>
              <div className="text-[9pt] font-semibold text-[#4a4a4a] tracking-[0.05em] uppercase mb-0.5">
                Assessment Rubric · {GRADE_LABELS[gradeLevel]}
              </div>
              <h1 className="text-[20pt] font-semibold tracking-tight leading-tight">
                {rubric.title}
              </h1>
              <div className="text-[9pt] text-[#888] mt-1">
                Unit: {GRADE_LEVEL_INFO[gradeLevel].unitTitle}
              </div>
            </div>
            <div className="text-right text-[9pt] text-[#4a4a4a]">
              <div className="font-semibold text-[14pt] tracking-tight">
                CIV<span className="text-[#1976d2]">.</span>IQ
              </div>
              <div>civiq.org</div>
            </div>
          </header>

          {/* Student Info Row */}
          <div className="grid grid-cols-3 gap-6 mb-6 text-[9pt]">
            <StudentInfoField label="Student Name" />
            <StudentInfoField label="Date" />
            <StudentInfoField label="Total Score" suffix="/ 16" />
          </div>

          {/* Instructions */}
          <div className="mb-6 p-3 bg-[#f5f5f5] border border-[#e0e0e0] text-[9pt]">
            <span className="font-semibold">Instructions:</span> Rate each criterion on a scale of
            1-4. Circle or highlight the appropriate level for each row.
          </div>

          {/* Rubric Table */}
          <table className="w-full border-collapse text-[9pt]">
            <thead>
              <tr>
                <th className="border-2 border-black bg-black text-white p-2 text-left font-semibold uppercase tracking-[0.03em] text-[8pt] w-[18%]">
                  Criterion
                </th>
                <th className="border-2 border-black bg-black text-white p-2 text-left font-semibold uppercase tracking-[0.03em] text-[8pt] w-[20.5%]">
                  <span className="block">Exemplary</span>
                  <span className="font-normal text-[7pt] opacity-80">(4 points)</span>
                </th>
                <th className="border-2 border-black bg-black text-white p-2 text-left font-semibold uppercase tracking-[0.03em] text-[8pt] w-[20.5%]">
                  <span className="block">Proficient</span>
                  <span className="font-normal text-[7pt] opacity-80">(3 points)</span>
                </th>
                <th className="border-2 border-black bg-black text-white p-2 text-left font-semibold uppercase tracking-[0.03em] text-[8pt] w-[20.5%]">
                  <span className="block">Developing</span>
                  <span className="font-normal text-[7pt] opacity-80">(2 points)</span>
                </th>
                <th className="border-2 border-black bg-black text-white p-2 text-left font-semibold uppercase tracking-[0.03em] text-[8pt] w-[20.5%]">
                  <span className="block">Beginning</span>
                  <span className="font-normal text-[7pt] opacity-80">(1 point)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rubric.criteria.map((criterion, index) => (
                <tr key={index}>
                  <td className="border-2 border-black p-2 font-semibold bg-[#f5f5f5] align-top">
                    {criterion.criterion}
                  </td>
                  <td className="border-2 border-black p-2 align-top text-[8pt] leading-[1.3]">
                    {criterion.levels.exemplary}
                  </td>
                  <td className="border-2 border-black p-2 align-top text-[8pt] leading-[1.3]">
                    {criterion.levels.proficient}
                  </td>
                  <td className="border-2 border-black p-2 align-top text-[8pt] leading-[1.3]">
                    {criterion.levels.developing}
                  </td>
                  <td className="border-2 border-black p-2 align-top text-[8pt] leading-[1.3]">
                    {criterion.levels.beginning}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Scoring Guide */}
          <div className="mt-6 grid grid-cols-4 gap-4 text-[8pt]">
            <div className="border-2 border-black p-2 text-center">
              <div className="font-semibold">Exemplary</div>
              <div className="text-[12pt] font-bold">13-16</div>
            </div>
            <div className="border-2 border-black p-2 text-center">
              <div className="font-semibold">Proficient</div>
              <div className="text-[12pt] font-bold">9-12</div>
            </div>
            <div className="border-2 border-black p-2 text-center">
              <div className="font-semibold">Developing</div>
              <div className="text-[12pt] font-bold">5-8</div>
            </div>
            <div className="border-2 border-black p-2 text-center">
              <div className="font-semibold">Beginning</div>
              <div className="text-[12pt] font-bold">1-4</div>
            </div>
          </div>

          {/* Teacher Notes Section */}
          <div className="mt-6 border-2 border-black p-4">
            <div className="text-[9pt] font-medium uppercase tracking-[0.05em] text-[#4a4a4a] mb-3 pb-2 border-b border-[#e0e0e0]">
              Teacher Notes / Feedback
            </div>
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border-b border-[#888] h-[1.4em]" />
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 pt-4 border-t border-[#e0e0e0] flex justify-between text-[8pt] text-[#888]">
            <div className="flex items-center gap-1">
              <span className="w-[10px] h-[10px] border border-[#888] rounded-full flex items-center justify-center text-[6pt] font-semibold">
                i
              </span>
              <span>Based on NCSS C3 Framework standards</span>
            </div>
            <div>CIV.IQ Education Resources · civiq.org/education · CC BY 4.0</div>
          </footer>
        </div>

        {/* Print-specific styles */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                @page {
                  size: letter landscape;
                  margin: 0.4in;
                }

                /* Hide everything except the printable rubric */
                body > *:not(.print-rubric-root),
                header,
                nav,
                footer:not(.rubric-footer),
                aside,
                .no-print,
                [data-radix-portal],
                [role="navigation"] {
                  display: none !important;
                }

                /* Reset body styles for print */
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  background: white !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }

                /* Make the modal fill the page */
                .print-rubric-root {
                  position: static !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  display: block !important;
                }

                .print-rubric-root > div {
                  box-shadow: none !important;
                  margin: 0 !important;
                  max-width: none !important;
                  width: 100% !important;
                }

                /* Prevent table rows from breaking across pages */
                tr {
                  page-break-inside: avoid;
                }
              }
            `,
          }}
        />
      </div>
    </div>
  );
}

function StudentInfoField({ label, suffix }: { label: string; suffix?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[8pt] font-medium uppercase tracking-[0.05em] text-[#4a4a4a] whitespace-nowrap">
        {label}
      </span>
      <span className="flex-1 border-b border-[#888] min-w-[80px] h-[1.2em]" />
      {suffix && <span className="text-[8pt] text-[#888]">{suffix}</span>}
    </div>
  );
}

export default PrintableRubric;
