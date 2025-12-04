/**
 * Civic Glossary Client Component - Interactive search and filtering
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, BookOpen, ChevronRight } from 'lucide-react';
import {
  CIVIC_GLOSSARY,
  GLOSSARY_CATEGORIES,
  type GlossaryTerm,
  type GlossaryCategory,
} from '@/lib/data/civic-glossary';

export function GlossaryClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GlossaryCategory | 'all'>('all');
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    let terms = CIVIC_GLOSSARY;

    // Filter by category
    if (selectedCategory !== 'all') {
      terms = terms.filter(term => term.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      terms = terms.filter(
        term =>
          term.term.toLowerCase().includes(query) ||
          term.definition.toLowerCase().includes(query) ||
          term.relatedTerms?.some(rt => rt.toLowerCase().includes(query))
      );
    }

    // Sort alphabetically
    return terms.sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery, selectedCategory]);

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = { all: CIVIC_GLOSSARY.length };
    CIVIC_GLOSSARY.forEach(term => {
      counts[term.category] = (counts[term.category] || 0) + 1;
    });
    return counts;
  }, []);

  const handleTermClick = (termName: string) => {
    setExpandedTerm(expandedTerm === termName ? null : termName);
  };

  const scrollToTerm = (termName: string) => {
    setSearchQuery(termName);
    setSelectedCategory('all');
    setExpandedTerm(termName);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="bg-white border-2 border-black p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search terms or definitions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-black focus:border-civiq-blue focus:outline-none"
              aria-label="Search glossary terms"
            />
          </div>

          {/* Category Filter */}
          <div className="md:w-64">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as GlossaryCategory | 'all')}
              className="w-full px-4 py-2 border-2 border-black focus:border-civiq-blue focus:outline-none bg-white"
              aria-label="Filter by category"
            >
              <option value="all">All Categories ({categoryCount.all})</option>
              {(Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[]).map(cat => (
                <option key={cat} value={cat}>
                  {GLOSSARY_CATEGORIES[cat]} ({categoryCount[cat] || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          {filteredTerms.length === CIVIC_GLOSSARY.length
            ? `${filteredTerms.length} terms`
            : `${filteredTerms.length} of ${CIVIC_GLOSSARY.length} terms`}
        </div>
      </div>

      {/* Terms List */}
      <div className="space-y-2">
        {filteredTerms.length === 0 ? (
          <div className="bg-white border-2 border-black p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
            <p className="text-gray-600 font-medium">No terms found</p>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          filteredTerms.map(term => (
            <TermCard
              key={term.term}
              term={term}
              isExpanded={expandedTerm === term.term}
              onToggle={() => handleTermClick(term.term)}
              onRelatedClick={scrollToTerm}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TermCardProps {
  term: GlossaryTerm;
  isExpanded: boolean;
  onToggle: () => void;
  onRelatedClick: (termName: string) => void;
}

function TermCard({ term, isExpanded, onToggle, onRelatedClick }: TermCardProps) {
  return (
    <div className="bg-white border-2 border-black">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{term.term}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
              {GLOSSARY_CATEGORIES[term.category]}
            </span>
          </div>
          <p className={`text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}>{term.definition}</p>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          {term.example && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Example</h4>
              <p className="text-sm text-gray-600 italic bg-gray-50 p-3 border-l-4 border-civiq-blue">
                {term.example}
              </p>
            </div>
          )}

          {term.relatedTerms && term.relatedTerms.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Related Terms</h4>
              <div className="flex flex-wrap gap-2">
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
                      className="px-3 py-1 text-sm bg-civiq-blue/10 text-civiq-blue hover:bg-civiq-blue/20 transition-colors border border-civiq-blue/20"
                    >
                      {related} →
                    </button>
                  ) : (
                    <span
                      key={related}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-600 border border-gray-200"
                    >
                      {related}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
