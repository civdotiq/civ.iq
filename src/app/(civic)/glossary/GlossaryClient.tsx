/**
 * Civic Glossary Client Component - Interactive search and filtering
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Search, BookOpen, ChevronDown } from 'lucide-react';
import {
  CIVIC_GLOSSARY,
  GLOSSARY_CATEGORIES,
  type GlossaryTerm,
  type GlossaryCategory,
} from '@/lib/data/civic-glossary';

// Color mapping for categories
const CATEGORY_COLORS: Record<GlossaryCategory, { bg: string; text: string; border: string }> = {
  'legislative-process': {
    bg: 'bg-civiq-blue/10',
    text: 'text-civiq-blue',
    border: 'border-civiq-blue/30',
  },
  congress: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  elections: { bg: 'bg-civiq-red/10', text: 'text-civiq-red', border: 'border-civiq-red/30' },
  committees: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  voting: { bg: 'bg-civiq-green/10', text: 'text-civiq-green', border: 'border-civiq-green/30' },
  executive: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  judiciary: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  'state-government': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'campaign-finance': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  regulatory: { bg: 'bg-civiq-red/10', text: 'text-civiq-red', border: 'border-civiq-red' },
  budget: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};

export function GlossaryClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GlossaryCategory | 'all'>('all');
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [activeLetterFromScroll, setActiveLetterFromScroll] = useState<string>('A');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filteredTerms = useMemo(() => {
    let terms = CIVIC_GLOSSARY;

    if (selectedCategory !== 'all') {
      terms = terms.filter(term => term.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      terms = terms.filter(
        term =>
          term.term.toLowerCase().includes(query) ||
          term.definition.toLowerCase().includes(query) ||
          term.relatedTerms?.some(rt => rt.toLowerCase().includes(query))
      );
    }

    return terms.sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery, selectedCategory]);

  // Group terms by first letter
  const groupedTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    filteredTerms.forEach(term => {
      const firstChar = term.term.charAt(0);
      if (!firstChar) return;
      const letter = firstChar.toUpperCase();
      const group = groups[letter] ?? [];
      group.push(term);
      groups[letter] = group;
    });
    return groups;
  }, [filteredTerms]);

  // All available letters
  const availableLetters = useMemo(() => {
    const allLetters = new Set(CIVIC_GLOSSARY.map(t => t.term.charAt(0).toUpperCase()));
    return Array.from(allLetters).sort();
  }, []);

  const activeLetters = useMemo(() => new Set(Object.keys(groupedTerms)), [groupedTerms]);

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = { all: CIVIC_GLOSSARY.length };
    CIVIC_GLOSSARY.forEach(term => {
      counts[term.category] = (counts[term.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Track which letter section is in view
  useEffect(() => {
    if (searchQuery.trim()) return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const letter = entry.target.getAttribute('data-letter');
            if (letter) setActiveLetterFromScroll(letter);
          }
        }
      },
      { rootMargin: '-120px 0px -70% 0px' }
    );

    Object.values(sectionRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [groupedTerms, searchQuery]);

  const scrollToLetter = useCallback((letter: string) => {
    const el = sectionRefs.current[letter];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  const handleTermClick = (termName: string) => {
    setExpandedTerm(expandedTerm === termName ? null : termName);
  };

  const scrollToTerm = (termName: string) => {
    setSearchQuery(termName);
    setSelectedCategory('all');
    setExpandedTerm(termName);
  };

  const sortedLetters = Object.keys(groupedTerms).sort();

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Search terms or definitions..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border-2 border-black focus:border-civiq-blue focus:outline-none text-lg"
          aria-label="Search glossary terms"
        />
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 text-sm font-medium border-2 transition-colors ${
            selectedCategory === 'all'
              ? 'bg-black text-white border-black'
              : 'bg-white text-gray-700 border-gray-300 hover:border-black'
          }`}
        >
          All ({categoryCount.all})
        </button>
        {(Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
            className={`px-3 py-1.5 text-sm font-medium border transition-colors ${
              selectedCategory === cat
                ? `${CATEGORY_COLORS[cat].bg} ${CATEGORY_COLORS[cat].text} ${CATEGORY_COLORS[cat].border} border-2`
                : `bg-white text-gray-600 border-gray-200 hover:${CATEGORY_COLORS[cat].bg} hover:${CATEGORY_COLORS[cat].text}`
            }`}
          >
            {GLOSSARY_CATEGORIES[cat]} ({categoryCount[cat] || 0})
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500">
        {filteredTerms.length === CIVIC_GLOSSARY.length
          ? `${filteredTerms.length} terms`
          : `${filteredTerms.length} of ${CIVIC_GLOSSARY.length} terms`}
      </div>

      {/* Alphabet Quick-Jump Bar */}
      {!searchQuery.trim() && (
        <nav
          className="sticky top-[64px] z-10 bg-white border-b-2 border-black py-2 -mx-4 px-4"
          aria-label="Jump to letter"
        >
          <div className="flex flex-wrap justify-center gap-1">
            {availableLetters.map(letter => {
              const isActive = activeLetters.has(letter);
              const isCurrent = activeLetterFromScroll === letter;
              return (
                <button
                  key={letter}
                  onClick={() => isActive && scrollToLetter(letter)}
                  disabled={!isActive}
                  className={`w-8 h-8 flex items-center justify-center text-sm font-medium transition-colors ${
                    isCurrent && isActive
                      ? 'bg-black text-white'
                      : isActive
                        ? 'text-black hover:bg-gray-100'
                        : 'text-gray-300 cursor-default'
                  }`}
                  aria-label={`Jump to ${letter}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Terms grouped by letter */}
      {filteredTerms.length === 0 ? (
        <div className="border-2 border-black p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-600 font-medium">No terms found</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedLetters.map(letter => (
            <div
              key={letter}
              ref={el => {
                sectionRefs.current[letter] = el;
              }}
              data-letter={letter}
            >
              {/* Letter Header */}
              <div className="flex items-baseline gap-3 mb-3 border-b-2 border-black pb-1">
                <span className="text-3xl font-bold text-black">{letter}</span>
                <span className="text-sm text-gray-400">
                  {(groupedTerms[letter] ?? []).length} term
                  {(groupedTerms[letter] ?? []).length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Terms in this letter group */}
              <div className="divide-y divide-gray-200 border-2 border-gray-200">
                {(groupedTerms[letter] ?? []).map(term => (
                  <TermRow
                    key={term.term}
                    term={term}
                    isExpanded={expandedTerm === term.term}
                    onToggle={() => handleTermClick(term.term)}
                    onRelatedClick={scrollToTerm}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TermRowProps {
  term: GlossaryTerm;
  isExpanded: boolean;
  onToggle: () => void;
  onRelatedClick: (termName: string) => void;
}

function TermRow({ term, isExpanded, onToggle, onRelatedClick }: TermRowProps) {
  const colors = CATEGORY_COLORS[term.category];

  return (
    <div className={isExpanded ? 'bg-gray-50' : ''}>
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
        aria-expanded={isExpanded}
      >
        {/* Category indicator dot */}
        <span
          className={`w-2 h-2 flex-shrink-0 ${colors.bg} border ${colors.border}`}
          style={{ borderRadius: '1px' }}
          title={GLOSSARY_CATEGORIES[term.category]}
        />

        {/* Term name */}
        <span className="font-semibold text-gray-900 min-w-[140px] md:min-w-[200px]">
          {term.term}
        </span>

        {/* Definition preview */}
        <span className="text-gray-500 text-sm flex-1 truncate hidden sm:block">
          {term.definition}
        </span>

        {/* Category label - hidden on mobile */}
        <span
          className={`hidden md:inline-block px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border flex-shrink-0`}
        >
          {GLOSSARY_CATEGORIES[term.category]}
        </span>

        {/* Expand icon */}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 ml-6">
          {/* Full definition */}
          <p className="text-gray-700 leading-relaxed mb-3">{term.definition}</p>

          {/* Category on mobile */}
          <div className="md:hidden mb-3">
            <span
              className={`inline-block px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}
            >
              {GLOSSARY_CATEGORIES[term.category]}
            </span>
          </div>

          {term.example && (
            <div className="mb-3">
              <p className="text-sm text-gray-600 italic border-l-4 border-civiq-blue pl-3 py-1">
                {term.example}
              </p>
            </div>
          )}

          {term.relatedTerms && term.relatedTerms.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Related
              </span>
              {term.relatedTerms.map(related => {
                const exists = CIVIC_GLOSSARY.some(
                  t => t.term.toLowerCase() === related.toLowerCase()
                );
                return exists ? (
                  <button
                    key={related}
                    onClick={e => {
                      e.stopPropagation();
                      onRelatedClick(related);
                    }}
                    className="px-2 py-0.5 text-xs bg-civiq-blue/10 text-civiq-blue hover:bg-civiq-blue/20 transition-colors border border-civiq-blue/20"
                  >
                    {related}
                  </button>
                ) : (
                  <span
                    key={related}
                    className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 border border-gray-200"
                  >
                    {related}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
