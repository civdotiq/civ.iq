/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * llms.txt once sent AI agents to /ask/party-alignment/{id}, a template that
 * no longer existed (every request 404'd), while leaving six live templates
 * unlisted. The question-page docs must list exactly the registry's templates,
 * each with the id its entity type takes.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllSlugs, getAllTemplates } from '@/lib/questions/question-registry';

const read = (file: string): string => readFileSync(join(process.cwd(), 'public', file), 'utf8');

const ENTITY_PLACEHOLDER = {
  representative: '{bioguideId}',
  committee: '{committeeId}',
  topic: '{topic}',
} as const;

describe('llms.txt question pages match the question registry', () => {
  const llms = read('llms.txt');
  const listed = [...llms.matchAll(/^- `\/ask\/([a-z-]+)\/(\{[A-Za-z]+\})`/gm)];

  it('lists every registry template and nothing else', () => {
    expect(listed.map(m => m[1]).sort()).toEqual(getAllSlugs().sort());
  });

  it('gives each template the id its entity type takes', () => {
    for (const template of getAllTemplates()) {
      const entry = listed.find(m => m[1] === template.slug);
      expect(`${template.slug} ${entry?.[2]}`).toBe(
        `${template.slug} ${ENTITY_PLACEHOLDER[template.entityType]}`
      );
    }
  });
});

describe('llms-full.txt question-page row matches the question registry', () => {
  it('names every registry template and nothing else', () => {
    const row = read('llms-full.txt')
      .split('\n')
      .find(line => line.startsWith('| `/ask/'));
    expect(row).toBeDefined();
    const description = row!.split('|')[2] ?? '';
    const slugs = [...description.matchAll(/`([a-z-]+)`/g)].map(m => m[1]);
    expect(slugs.sort()).toEqual(getAllSlugs().sort());
  });
});
