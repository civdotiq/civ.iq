/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Atom Feed Validation Tests
 *
 * Validates Atom 1.0 XML structure, RFC 3339 dates, and XML escaping
 * for the atom-generator module and all 5 feed routes.
 */

import {
  generateAtomFeed,
  createRepresentativeFeedConfig,
  createBillsFeedConfig,
  createFloorFeedConfig,
} from '@/lib/feeds/atom-generator';
import type { AtomFeedConfig, AtomEntry } from '@/lib/feeds/atom-generator';

// Helper: create a minimal valid feed config
function minimalConfig(overrides?: Partial<AtomFeedConfig>): AtomFeedConfig {
  return {
    id: 'https://civdotiq.org/feeds/test',
    title: 'Test Feed',
    link: 'https://civdotiq.org/test',
    updated: new Date('2025-01-15T12:00:00Z'),
    ...overrides,
  };
}

// Helper: create a minimal valid entry
function minimalEntry(overrides?: Partial<AtomEntry>): AtomEntry {
  return {
    id: 'https://civdotiq.org/test/entry-1',
    title: 'Test Entry',
    link: 'https://civdotiq.org/test/1',
    updated: new Date('2025-01-15T12:00:00Z'),
    ...overrides,
  };
}

describe('Atom Feed Generator', () => {
  describe('XML Structure', () => {
    it('should start with XML declaration', () => {
      const xml = generateAtomFeed(minimalConfig(), []);
      expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    });

    it('should include feed element with Atom namespace', () => {
      const xml = generateAtomFeed(minimalConfig(), []);
      expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    });

    it('should close the feed element', () => {
      const xml = generateAtomFeed(minimalConfig(), []);
      expect(xml).toMatch(/<\/feed>\s*$/);
    });

    it('should include required <id> element', () => {
      const config = minimalConfig({ id: 'https://civdotiq.org/feeds/test-id' });
      const xml = generateAtomFeed(config, []);
      expect(xml).toContain('<id>https://civdotiq.org/feeds/test-id</id>');
    });

    it('should include required <title> element', () => {
      const xml = generateAtomFeed(minimalConfig({ title: 'My Feed Title' }), []);
      expect(xml).toContain('<title>My Feed Title</title>');
    });

    it('should include required <updated> element', () => {
      const xml = generateAtomFeed(minimalConfig(), []);
      expect(xml).toMatch(/<updated>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include <link> element', () => {
      const xml = generateAtomFeed(minimalConfig(), []);
      expect(xml).toContain('<link href=');
    });

    it('should include alternate link', () => {
      const xml = generateAtomFeed(minimalConfig(), []);
      expect(xml).toMatch(/<link href="[^"]*" rel="alternate" type="text\/html"\/>/);
    });

    it('should include self link', () => {
      const xml = generateAtomFeed(minimalConfig(), []);
      expect(xml).toMatch(/<link href="[^"]*" rel="self" type="application\/atom\+xml"\/>/);
    });

    it('should use selfLink for self link when provided', () => {
      const xml = generateAtomFeed(
        minimalConfig({
          link: 'https://civdotiq.org/test',
          selfLink: 'https://civdotiq.org/api/feed/test',
        }),
        []
      );
      expect(xml).toContain('href="https://civdotiq.org/test" rel="alternate"');
      expect(xml).toContain('href="https://civdotiq.org/api/feed/test" rel="self"');
    });

    it('should fall back to link for self link when selfLink not provided', () => {
      const xml = generateAtomFeed(minimalConfig({ link: 'https://civdotiq.org/fallback' }), []);
      expect(xml).toContain('href="https://civdotiq.org/fallback" rel="self"');
    });

    it('should include <generator> element', () => {
      const xml = generateAtomFeed(minimalConfig(), []);
      expect(xml).toContain('<generator');
      expect(xml).toContain('CIV.IQ</generator>');
    });
  });

  describe('Optional Feed Elements', () => {
    it('should include <subtitle> when provided', () => {
      const xml = generateAtomFeed(minimalConfig({ subtitle: 'A great subtitle' }), []);
      expect(xml).toContain('<subtitle>A great subtitle</subtitle>');
    });

    it('should omit <subtitle> when not provided', () => {
      const xml = generateAtomFeed(minimalConfig(), []);
      expect(xml).not.toContain('<subtitle>');
    });

    it('should include <author> when provided', () => {
      const xml = generateAtomFeed(
        minimalConfig({ author: { name: 'CIV.IQ', uri: 'https://civdotiq.org' } }),
        []
      );
      expect(xml).toContain('<author>');
      expect(xml).toContain('<name>CIV.IQ</name>');
      expect(xml).toContain('<uri>https://civdotiq.org</uri>');
    });

    it('should include <icon> when provided', () => {
      const xml = generateAtomFeed(minimalConfig({ icon: 'https://civdotiq.org/favicon.ico' }), []);
      expect(xml).toContain('<icon>https://civdotiq.org/favicon.ico</icon>');
    });

    it('should include <logo> when provided', () => {
      const xml = generateAtomFeed(
        minimalConfig({ logo: 'https://civdotiq.org/images/logo.png' }),
        []
      );
      expect(xml).toContain('<logo>https://civdotiq.org/images/logo.png</logo>');
    });

    it('should include <rights> when provided', () => {
      const xml = generateAtomFeed(minimalConfig({ rights: 'Data sourced from Congress.gov' }), []);
      expect(xml).toContain('<rights>Data sourced from Congress.gov</rights>');
    });
  });

  describe('Entry Structure', () => {
    it('should generate entry with required <id>', () => {
      const xml = generateAtomFeed(minimalConfig(), [minimalEntry()]);
      expect(xml).toContain('<entry>');
      expect(xml).toContain('<id>https://civdotiq.org/test/entry-1</id>');
      expect(xml).toContain('</entry>');
    });

    it('should generate entry with required <title>', () => {
      const xml = generateAtomFeed(minimalConfig(), [minimalEntry({ title: 'Entry Title Here' })]);
      expect(xml).toContain('<title>Entry Title Here</title>');
    });

    it('should generate entry with required <link>', () => {
      const xml = generateAtomFeed(minimalConfig(), [minimalEntry()]);
      expect(xml).toMatch(/<entry>[\s\S]*<link href="[^"]*" rel="alternate"/);
    });

    it('should generate entry with required <updated>', () => {
      const entry = minimalEntry({ updated: new Date('2025-06-15T10:00:00Z') });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      expect(xml).toContain('<updated>2025-06-15T10:00:00.000Z</updated>');
    });

    it('should include <published> when provided', () => {
      const entry = minimalEntry({ published: new Date('2025-01-01T00:00:00Z') });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      expect(xml).toContain('<published>2025-01-01T00:00:00.000Z</published>');
    });

    it('should include entry <author> when provided', () => {
      const entry = minimalEntry({ author: { name: 'John Doe', uri: 'https://example.com' } });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      // Entry author should be inside <entry>
      const entrySection = xml.split('<entry>')[1]!.split('</entry>')[0]!;
      expect(entrySection).toContain('<author>');
      expect(entrySection).toContain('<name>John Doe</name>');
    });

    it('should include <summary> when provided', () => {
      const entry = minimalEntry({ summary: 'A brief summary of the entry' });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      expect(xml).toContain('<summary>A brief summary of the entry</summary>');
    });

    it('should include <content> when provided', () => {
      const entry = minimalEntry({ content: 'Full content here', contentType: 'text' });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      expect(xml).toContain('<content type="text">Full content here</content>');
    });

    it('should include <content type="html"> for HTML content', () => {
      const entry = minimalEntry({ content: '<p>HTML content</p>', contentType: 'html' });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      expect(xml).toContain('<content type="html">');
    });

    it('should include <category> elements', () => {
      const entry = minimalEntry({
        categories: [{ term: 'vote' }, { term: 'legislation', label: 'Legislation' }],
      });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      expect(xml).toContain('<category term="vote"/>');
      expect(xml).toContain('<category term="legislation" label="Legislation"/>');
    });

    it('should handle multiple entries', () => {
      const entries = [
        minimalEntry({ id: 'urn:entry:1', title: 'First' }),
        minimalEntry({ id: 'urn:entry:2', title: 'Second' }),
        minimalEntry({ id: 'urn:entry:3', title: 'Third' }),
      ];
      const xml = generateAtomFeed(minimalConfig(), entries);
      const entryCount = (xml.match(/<entry>/g) || []).length;
      expect(entryCount).toBe(3);
    });

    it('should handle zero entries', () => {
      const xml = generateAtomFeed(minimalConfig(), []);
      expect(xml).not.toContain('<entry>');
      expect(xml).toContain('</feed>');
    });
  });

  describe('RFC 3339 Date Format', () => {
    const RFC3339_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

    it('should format feed updated as RFC 3339', () => {
      const xml = generateAtomFeed(minimalConfig(), []);
      const match = xml.match(/<updated>([^<]+)<\/updated>/);
      expect(match).toBeTruthy();
      expect(match![1]).toMatch(RFC3339_PATTERN);
    });

    it('should format entry updated as RFC 3339', () => {
      const xml = generateAtomFeed(minimalConfig(), [minimalEntry()]);
      const matches = xml.match(/<updated>([^<]+)<\/updated>/g);
      expect(matches).toBeTruthy();
      for (const m of matches!) {
        const dateStr = m.replace(/<\/?updated>/g, '');
        expect(dateStr).toMatch(RFC3339_PATTERN);
      }
    });

    it('should format published as RFC 3339', () => {
      const entry = minimalEntry({ published: new Date('2025-03-01T08:30:00Z') });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      const match = xml.match(/<published>([^<]+)<\/published>/);
      expect(match).toBeTruthy();
      expect(match![1]).toMatch(RFC3339_PATTERN);
    });
  });

  describe('XML Character Escaping', () => {
    it('should escape ampersand (&)', () => {
      const xml = generateAtomFeed(minimalConfig({ title: 'A & B' }), []);
      expect(xml).toContain('<title>A &amp; B</title>');
      expect(xml).not.toContain('<title>A & B</title>');
    });

    it('should escape less-than (<)', () => {
      const entry = minimalEntry({ title: 'Value < 100' });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      expect(xml).toContain('Value &lt; 100');
    });

    it('should escape greater-than (>)', () => {
      const entry = minimalEntry({ title: 'Value > 50' });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      expect(xml).toContain('Value &gt; 50');
    });

    it('should escape double quotes (")', () => {
      const xml = generateAtomFeed(minimalConfig({ link: 'https://example.com/?q="test"' }), []);
      expect(xml).toContain('&quot;test&quot;');
    });

    it("should escape apostrophe (')", () => {
      const entry = minimalEntry({ title: "O'Malley's Bill" });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      expect(xml).toContain('O&apos;Malley&apos;s Bill');
    });

    it('should handle multiple special characters in one string', () => {
      const entry = minimalEntry({ summary: 'A & B < C > D "E" \'F\'' });
      const xml = generateAtomFeed(minimalConfig(), [entry]);
      expect(xml).toContain('A &amp; B &lt; C &gt; D &quot;E&quot; &apos;F&apos;');
    });
  });

  describe('Feed Config Helpers', () => {
    describe('createRepresentativeFeedConfig()', () => {
      it('should create valid config for a representative', () => {
        const config = createRepresentativeFeedConfig('P000197', 'Nancy Pelosi', 'D', 'CA');

        expect(config.id).toContain('P000197');
        expect(config.title).toContain('Nancy Pelosi');
        expect(config.title).toContain('D-CA');
        expect(config.link).toContain('/representative/P000197');
        expect(config.author?.name).toBe('CIV.IQ');
        expect(config.updated).toBeInstanceOf(Date);
      });

      it('should include standard metadata', () => {
        const config = createRepresentativeFeedConfig('J000295', 'Mike Johnson', 'R', 'LA');

        expect(config.icon).toContain('favicon.ico');
        expect(config.logo).toContain('civiq-logo');
        expect(config.rights).toBeTruthy();
      });
    });

    describe('createBillsFeedConfig()', () => {
      it('should create valid config for bills feed', () => {
        const config = createBillsFeedConfig();

        expect(config.id).toContain('/feeds/bills');
        expect(config.title).toContain('Bills');
        expect(config.subtitle).toBeTruthy();
        expect(config.link).toContain('/bills');
        expect(config.author?.name).toBe('CIV.IQ');
      });
    });

    describe('createFloorFeedConfig()', () => {
      it('should create valid config for floor activity feed', () => {
        const config = createFloorFeedConfig();

        expect(config.id).toContain('/feeds/floor');
        expect(config.title).toContain('Floor');
        expect(config.link).toContain('/floor');
        expect(config.author?.name).toBe('CIV.IQ');
      });
    });
  });

  describe('Full Feed Roundtrip', () => {
    it('should generate a complete valid feed with entries', () => {
      const config = createRepresentativeFeedConfig('K000367', 'Amy Klobuchar', 'D', 'MN');
      const entries: AtomEntry[] = [
        {
          id: 'https://civdotiq.org/representative/K000367#role',
          title: 'Senator Amy Klobuchar (D-MN)',
          link: 'https://civdotiq.org/representative/K000367',
          updated: new Date('2025-01-20T12:00:00Z'),
          summary: 'Senior Senator from Minnesota',
          categories: [{ term: 'role' }, { term: 'senate' }],
        },
        {
          id: 'https://civdotiq.org/representative/K000367#committee-judiciary',
          title: 'Committee on the Judiciary',
          link: 'https://civdotiq.org/representative/K000367',
          updated: new Date('2025-01-20T12:00:00Z'),
          summary: 'Chair of the Committee on the Judiciary',
          categories: [{ term: 'committee' }],
        },
      ];

      const xml = generateAtomFeed(config, entries);

      // Verify it's well-formed enough for basic parsing
      expect(xml).toMatch(/^<\?xml/);
      expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
      expect(xml).toContain('<id>');
      expect(xml).toContain('<title>');
      expect(xml).toContain('<updated>');
      expect(xml).toContain('<entry>');
      expect(xml).toContain('</entry>');
      expect(xml).toContain('</feed>');

      // Verify entries are present
      const entryCount = (xml.match(/<entry>/g) || []).length;
      expect(entryCount).toBe(2);

      // Verify categories
      expect(xml).toContain('term="role"');
      expect(xml).toContain('term="committee"');
    });
  });
});
