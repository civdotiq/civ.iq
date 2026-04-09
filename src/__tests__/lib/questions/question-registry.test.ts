/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for question registry, slug utilities, and topic resolution.
 */

import {
  getTemplate,
  getAllTemplates,
  getAllSlugs,
  getTemplatesByEntityType,
  slugifyPolicyArea,
  fillPattern,
} from '@/lib/questions/question-registry';
import { resolvePolicyAreaSlug } from '@/lib/services/policy-area-search.service';
import { getAllPolicyAreas } from '@/lib/connections/policy-area-map';
import { computeRelatedQuestions } from '@/lib/questions/related-questions';

describe('question-registry', () => {
  describe('getTemplate', () => {
    it('returns template for known slug', () => {
      const t = getTemplate('campaign-contributions');
      expect(t).toBeDefined();
      expect(t!.entityType).toBe('representative');
    });

    it('returns topic-bills template', () => {
      const t = getTemplate('topic-bills');
      expect(t).toBeDefined();
      expect(t!.entityType).toBe('topic');
      expect(t!.category).toBe('what');
    });

    it('returns undefined for unknown slug', () => {
      expect(getTemplate('nonexistent')).toBeUndefined();
    });
  });

  describe('getTemplatesByEntityType', () => {
    it('returns only representative templates (7)', () => {
      const reps = getTemplatesByEntityType('representative');
      expect(reps.length).toBe(7);
      expect(reps.every(t => t.entityType === 'representative')).toBe(true);
    });

    it('returns only topic templates', () => {
      const topics = getTemplatesByEntityType('topic');
      expect(topics.length).toBeGreaterThanOrEqual(1);
      expect(topics.every(t => t.entityType === 'topic')).toBe(true);
    });

    it('does not mix entity types', () => {
      const reps = getTemplatesByEntityType('representative');
      expect(reps.some(t => t.entityType === 'topic')).toBe(false);
    });
  });

  describe('getAllSlugs', () => {
    it('includes topic-bills', () => {
      expect(getAllSlugs()).toContain('topic-bills');
    });

    it('includes all representative slugs', () => {
      const slugs = getAllSlugs();
      expect(slugs).toContain('campaign-contributions');
      expect(slugs).toContain('voting-record');
      expect(slugs).toContain('contact-info');
    });
  });

  describe('fillPattern', () => {
    it('fills {name} placeholder', () => {
      expect(fillPattern('What bills are about {name}?', { name: 'Health' })).toBe(
        'What bills are about Health?'
      );
    });

    it('fills multiple placeholders', () => {
      const result = fillPattern('{name} ({party}-{state})', {
        name: 'Jane Doe',
        party: 'D',
        state: 'CA',
      });
      expect(result).toBe('Jane Doe (D-CA)');
    });
  });
});

describe('slugifyPolicyArea', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyPolicyArea('Health')).toBe('health');
    expect(slugifyPolicyArea('Armed Forces and National Security')).toBe(
      'armed-forces-and-national-security'
    );
  });

  it('strips commas', () => {
    expect(slugifyPolicyArea('Civil Rights and Liberties, Minority Issues')).toBe(
      'civil-rights-and-liberties-minority-issues'
    );
    expect(slugifyPolicyArea('Science, Technology, Communications')).toBe(
      'science-technology-communications'
    );
  });
});

describe('slugifyPolicyArea ↔ resolvePolicyAreaSlug round-trip', () => {
  const allAreas = getAllPolicyAreas();

  it('has at least 30 policy areas', () => {
    expect(allAreas.length).toBeGreaterThanOrEqual(30);
  });

  it.each(allAreas)('round-trips "%s"', (area: string) => {
    const slug = slugifyPolicyArea(area);
    const resolved = resolvePolicyAreaSlug(slug);
    expect(resolved).toBe(area);
  });

  it('returns null for unknown slug', () => {
    expect(resolvePolicyAreaSlug('nonexistent-policy-area')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(resolvePolicyAreaSlug('HEALTH')).toBe('Health');
    expect(resolvePolicyAreaSlug('Health')).toBe('Health');
  });
});

describe('committee templates', () => {
  it('returns committee-members template', () => {
    const t = getTemplate('committee-members');
    expect(t).toBeDefined();
    expect(t!.entityType).toBe('committee');
    expect(t!.category).toBe('who');
  });

  it('returns committee-activity template', () => {
    const t = getTemplate('committee-activity');
    expect(t).toBeDefined();
    expect(t!.entityType).toBe('committee');
    expect(t!.category).toBe('what');
  });

  it('returns committee-lobbying template', () => {
    const t = getTemplate('committee-lobbying');
    expect(t).toBeDefined();
    expect(t!.entityType).toBe('committee');
    expect(t!.category).toBe('where');
  });

  it('returns only committee templates', () => {
    const committees = getTemplatesByEntityType('committee');
    expect(committees.length).toBe(3);
    expect(committees.every(t => t.entityType === 'committee')).toBe(true);
  });

  it('does not mix committee with other entity types', () => {
    const committees = getTemplatesByEntityType('committee');
    expect(committees.some(t => t.entityType === 'representative')).toBe(false);
    expect(committees.some(t => t.entityType === 'topic')).toBe(false);
  });

  it('getAllSlugs includes committee slugs', () => {
    const slugs = getAllSlugs();
    expect(slugs).toContain('committee-members');
    expect(slugs).toContain('committee-activity');
    expect(slugs).toContain('committee-lobbying');
  });

  it('fills committee pattern with name and chamber', () => {
    expect(
      fillPattern('Members of the {name} ({chamber})', {
        name: 'Committee on Finance',
        chamber: 'Senate',
      })
    ).toBe('Members of the Committee on Finance (Senate)');
  });

  it('all relatedSlugs for committee templates point to valid committee templates', () => {
    const committeeTemplates = getTemplatesByEntityType('committee');
    for (const t of committeeTemplates) {
      for (const rs of t.relatedSlugs) {
        const related = getTemplate(rs);
        expect(related).toBeDefined();
        expect(related!.entityType).toBe('committee');
      }
    }
  });
});

describe('related questions — topic templates', () => {
  it('returns empty array for topic-bills (no cross-entity linking)', () => {
    const related = computeRelatedQuestions('topic-bills', 'health', 'Health');
    expect(related).toEqual([]);
  });

  it('returns related questions for representative templates', () => {
    const related = computeRelatedQuestions('campaign-contributions', 'P000197', 'Nancy Pelosi');
    expect(related.length).toBeGreaterThan(0);
    for (const q of related) {
      expect(q.href).toMatch(/^\/ask\/.+\/P000197$/);
      expect(q.question).toContain('Nancy Pelosi');
    }
  });

  it('all relatedSlugs for representative templates point to valid templates', () => {
    const repTemplates = getTemplatesByEntityType('representative');
    const allSlugs = new Set(getAllSlugs());
    for (const t of repTemplates) {
      for (const rs of t.relatedSlugs) {
        expect(allSlugs.has(rs)).toBe(true);
      }
    }
  });

  it('relatedSlugs for representative templates only reference representative templates', () => {
    const repTemplates = getTemplatesByEntityType('representative');
    for (const t of repTemplates) {
      for (const rs of t.relatedSlugs) {
        const related = getTemplate(rs);
        expect(related).toBeDefined();
        expect(related!.entityType).toBe('representative');
      }
    }
  });
});
