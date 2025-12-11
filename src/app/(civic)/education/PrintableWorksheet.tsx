/**
 * Printable Worksheet Component - Ulm School Design System
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
  type Worksheet,
  type WorksheetField,
  type GradeLevel,
  getC3StandardsByLesson,
} from '@/lib/data/education-curriculum';

interface PrintableWorksheetProps {
  worksheet: Worksheet;
  onClose: () => void;
}

const GRADE_LABELS: Record<GradeLevel, string> = {
  elementary: 'Elementary · Grades K–5',
  middle: 'Middle School · Grades 6–8',
  high: 'High School · Grades 9–12',
};

export function PrintableWorksheet({ worksheet, onClose }: PrintableWorksheetProps) {
  const c3Standards = getC3StandardsByLesson(worksheet.lessonId);

  const handlePrint = () => {
    window.print();
  };

  // Group fields into sections for better organization
  const groupedFields = groupFieldsIntoSections(worksheet.fields);

  return (
    <div className="print-worksheet-root fixed inset-0 z-50 overflow-auto bg-black/50 flex items-start justify-center p-4 print:p-0 print:bg-white print:block print:static print:overflow-visible">
      <div className="bg-white w-full max-w-[8.5in] my-8 print:m-0 print:max-w-none print:shadow-none shadow-xl print:w-full">
        {/* Modal Header - Hidden when printing */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black print:hidden">
          <h2 className="text-lg font-semibold">Print Worksheet</h2>
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

        {/* Printable Worksheet Content */}
        <div className="p-8 print:p-6 font-['Inter',system-ui,sans-serif] text-[11pt] leading-[1.4] text-[#1a1a1a]">
          {/* Worksheet Header */}
          <header className="grid grid-cols-[1fr_auto] items-start gap-4 pb-4 border-b-2 border-black mb-6">
            <div>
              <div className="text-[9pt] font-semibold text-[#4a4a4a] tracking-[0.05em] uppercase mb-0.5">
                Worksheet {worksheet.lessonId} · {GRADE_LABELS[worksheet.gradeLevel]}
              </div>
              <h1 className="text-[20pt] font-semibold tracking-tight leading-tight">
                {worksheet.title}
              </h1>
              {c3Standards.length > 0 && (
                <div className="text-[7pt] text-[#888] mt-0.5">
                  C3 Framework: {c3Standards.map(s => s.code).join(', ')}
                </div>
              )}
            </div>
            <div className="text-right text-[9pt] text-[#4a4a4a]">
              <div className="font-semibold text-[14pt] tracking-tight">
                CIV<span className="text-[#1976d2]">.</span>IQ
              </div>
              <div>civiq.org</div>
            </div>
          </header>

          {/* Student Info Row */}
          <div className="grid grid-cols-3 gap-6 mb-8 text-[9pt]">
            <StudentInfoField label="Name" />
            <StudentInfoField label="Date" />
            <StudentInfoField label="Class" />
          </div>

          {/* Worksheet Sections */}
          <div className="space-y-8">
            {groupedFields.map((section, sectionIndex) => (
              <WorksheetSection
                key={sectionIndex}
                number={sectionIndex + 1}
                fields={section.fields}
                title={section.title}
              />
            ))}
          </div>

          {/* Footer */}
          <footer className="mt-10 pt-4 border-t border-[#e0e0e0] flex justify-between text-[8pt] text-[#888]">
            <div className="flex items-center gap-1">
              <span className="w-[10px] h-[10px] border border-[#888] rounded-full flex items-center justify-center text-[6pt] font-semibold">
                i
              </span>
              <span>Data source: Congress.gov API via CIV.IQ</span>
            </div>
            <div>CIV.IQ Education Resources · civiq.org/education · CC BY 4.0</div>
          </footer>
        </div>
      </div>

      {/* Print-specific styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: letter;
                margin: 0.5in;
              }

              /* Hide everything except the printable worksheet */
              body > *:not(.print-worksheet-root),
              header,
              nav,
              footer:not(.worksheet-footer),
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
              .print-worksheet-root {
                position: static !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
              }

              .print-worksheet-root > div {
                box-shadow: none !important;
                margin: 0 !important;
                max-width: none !important;
                width: 100% !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}

function StudentInfoField({ label }: { label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[8pt] font-medium uppercase tracking-[0.05em] text-[#4a4a4a] whitespace-nowrap">
        {label}
      </span>
      <span className="flex-1 border-b border-[#888] min-w-[80px] h-[1.2em]" />
    </div>
  );
}

interface WorksheetSectionProps {
  number: number;
  title?: string;
  fields: WorksheetField[];
}

function WorksheetSection({ number, title, fields }: WorksheetSectionProps) {
  return (
    <section>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-6 h-6 bg-black text-white text-[10pt] font-semibold flex items-center justify-center">
          {number}
        </div>
        {title && (
          <h2 className="text-[11pt] font-semibold uppercase tracking-[0.05em]">{title}</h2>
        )}
      </div>

      {/* Section Fields */}
      <div className="space-y-4">
        {fields.map((field, fieldIndex) => (
          <WorksheetFieldRenderer key={fieldIndex} field={field} />
        ))}
      </div>
    </section>
  );
}

function WorksheetFieldRenderer({ field }: { field: WorksheetField }) {
  switch (field.type) {
    case 'text':
      return <TextField field={field} />;
    case 'textarea':
      return <TextareaField field={field} />;
    case 'checkbox':
      return <CheckboxField field={field} />;
    case 'drawing':
      return <DrawingField field={field} />;
    case 'table':
      return <TableField field={field} />;
    default:
      return <TextField field={field} />;
  }
}

function TextField({ field }: { field: WorksheetField }) {
  return (
    <div className="border-2 border-black p-4">
      <div className="text-[9pt] font-medium uppercase tracking-[0.05em] text-[#4a4a4a] mb-3 pb-2 border-b border-[#e0e0e0]">
        {field.label}
      </div>
      <div className="grid grid-cols-[80px_1fr] gap-4 items-baseline">
        <span className="text-[9pt] font-medium text-[#4a4a4a]">Answer</span>
        <span className="border-b border-[#888] min-h-[1.4em]" />
      </div>
    </div>
  );
}

function TextareaField({ field }: { field: WorksheetField }) {
  const rows = field.rows || 3;
  return (
    <div className="border-2 border-black p-4">
      <div className="text-[9pt] font-medium uppercase tracking-[0.05em] text-[#4a4a4a] mb-3 pb-2 border-b border-[#e0e0e0]">
        {field.label}
      </div>
      <div className="flex flex-col gap-6">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-b border-[#888] h-[1.4em]" />
        ))}
      </div>
    </div>
  );
}

function CheckboxField({ field }: { field: WorksheetField }) {
  return (
    <div className="border-2 border-black p-4">
      <div className="text-[9pt] font-medium uppercase tracking-[0.05em] text-[#4a4a4a] mb-3 pb-2 border-b border-[#e0e0e0]">
        {field.label}
      </div>
      <div className="flex flex-wrap gap-6 mt-2">
        {field.options?.map((option, i) => (
          <label key={i} className="flex items-center gap-2 text-[10pt]">
            <span className="w-4 h-4 border-2 border-black flex-shrink-0" />
            <span>{option}</span>
            {option === 'Democratic' && (
              <span className="w-[10px] h-[10px] rounded-full bg-[#1976d2]" />
            )}
            {option === 'Republican' && (
              <span className="w-[10px] h-[10px] rounded-full bg-[#d32f2f]" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function DrawingField({ field }: { field: WorksheetField }) {
  return (
    <div className="border-2 border-black p-4">
      <div className="text-[9pt] font-medium uppercase tracking-[0.05em] text-[#4a4a4a] mb-3 pb-2 border-b border-[#e0e0e0]">
        {field.label}
      </div>
      <div className="border-2 border-black h-[180px] flex items-center justify-center mt-2">
        <span className="text-[9pt] text-[#888] uppercase tracking-[0.1em]">Draw here</span>
      </div>
    </div>
  );
}

function TableField({ field }: { field: WorksheetField }) {
  const columns = field.columns || ['Column 1', 'Column 2'];
  const rows = field.rows || 5;

  return (
    <div className="border-2 border-black p-4">
      <div className="text-[9pt] font-medium uppercase tracking-[0.05em] text-[#4a4a4a] mb-3 pb-2 border-b border-[#e0e0e0]">
        {field.label}
      </div>
      <table className="w-full border-collapse text-[8pt]">
        <thead>
          <tr>
            <th className="border border-black bg-black text-white p-2 text-left font-semibold uppercase tracking-[0.03em] text-[7pt] w-6">
              #
            </th>
            {columns.map((col, i) => (
              <th
                key={i}
                className="border border-black bg-black text-white p-2 text-left font-semibold uppercase tracking-[0.03em] text-[7pt]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              <td className="border border-black p-2 text-center bg-[#f5f5f5] font-semibold">
                {rowIndex + 1}
              </td>
              {columns.map((_, colIndex) => (
                <td key={colIndex} className="border border-black p-2 min-h-[24px]" />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper function to intelligently group fields into sections
interface FieldSection {
  title?: string;
  fields: WorksheetField[];
}

function groupFieldsIntoSections(fields: WorksheetField[]): FieldSection[] {
  const sections: FieldSection[] = [];
  let currentSection: WorksheetField[] = [];
  let currentTitle: string | undefined;

  // Group related fields together based on content patterns
  fields.forEach((field, index) => {
    const label = field.label.toLowerCase();

    // Check if this starts a new logical section
    const isNewSection =
      label.includes('zip') ||
      label.includes('senator') ||
      label.includes('representative') ||
      label.includes('draw') ||
      label.includes('notice') ||
      label.includes('committee') ||
      label.includes('bill') ||
      label.includes('message') ||
      label.includes('why') ||
      label.includes('what i');

    // Determine section title based on content
    let sectionTitle: string | undefined;
    if (label.includes('zip')) sectionTitle = 'My ZIP Code';
    else if (label.includes('senator') && !currentTitle?.includes('Senator'))
      sectionTitle = 'My Senators';
    else if (label.includes('representative') && !label.includes('senator'))
      sectionTitle = 'My Representative';
    else if (label.includes('draw')) sectionTitle = 'Draw';
    else if (label.includes('notice') || label.includes('what i')) sectionTitle = 'Reflection';
    else if (label.includes('committee')) sectionTitle = 'Committees';
    else if (label.includes('bill')) sectionTitle = 'Bill Information';
    else if (label.includes('message')) sectionTitle = 'My Message';

    // If this is a new major section and we have accumulated fields, save them
    if (isNewSection && currentSection.length > 0 && sectionTitle !== currentTitle) {
      sections.push({ title: currentTitle, fields: currentSection });
      currentSection = [];
      currentTitle = sectionTitle;
    } else if (!currentTitle && sectionTitle) {
      currentTitle = sectionTitle;
    }

    currentSection.push(field);

    // If this is the last field, save the current section
    if (index === fields.length - 1 && currentSection.length > 0) {
      sections.push({ title: currentTitle, fields: currentSection });
    }
  });

  // If no sections were created, put all fields in one section
  if (sections.length === 0) {
    return [{ fields }];
  }

  return sections;
}

export default PrintableWorksheet;
