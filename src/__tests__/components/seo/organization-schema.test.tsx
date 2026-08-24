/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Organization JSON-LD contactPoint rules: the CIV.IQ org node carries a
 * real contact point by default; third-party orgs (PACs, lobby groups —
 * identified by a custom @id) must never inherit it.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { OrganizationSchema } from '@/components/seo/JsonLd';

function renderedSchema(element: React.ReactElement): Record<string, unknown> {
  const html = renderToStaticMarkup(element);
  const match = html.match(/<script type="application\/ld\+json">(.*)<\/script>/s);
  if (!match?.[1]) throw new Error('no JSON-LD script emitted');
  return JSON.parse(match[1]);
}

describe('OrganizationSchema contactPoint', () => {
  it('CIV.IQ default org emits a full contactPoint', () => {
    const schema = renderedSchema(<OrganizationSchema />);
    expect(schema['@id']).toBe('https://civdotiq.org/#organization');
    expect(schema.contactPoint).toEqual({
      '@type': 'ContactPoint',
      email: 'contact@civdotiq.org',
      contactType: 'customer support',
      url: 'https://civdotiq.org/support',
      availableLanguage: 'English',
    });
  });

  it('third-party orgs (custom id) never inherit the CIV.IQ contact', () => {
    const schema = renderedSchema(
      <OrganizationSchema
        name="Example PAC"
        id="https://civdotiq.org/pacs/C00123456#organization"
        logo={null}
        sameAs={[]}
      />
    );
    expect(schema.contactPoint).toBeUndefined();
  });

  it('contactPoint={null} suppresses it even on the CIV.IQ node', () => {
    const schema = renderedSchema(<OrganizationSchema contactPoint={null} />);
    expect(schema.contactPoint).toBeUndefined();
  });

  it('an explicit contactPoint wins over the default', () => {
    const schema = renderedSchema(
      <OrganizationSchema contactPoint={{ email: 'press@example.org', contactType: 'press' }} />
    );
    expect(schema.contactPoint).toMatchObject({
      email: 'press@example.org',
      contactType: 'press',
    });
  });
});
