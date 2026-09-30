/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Legacy route: /representative/state/[state]/[legislatorId]
 *
 * An old second home for state legislator profiles, with its own canonical.
 * It now only forwards: any id form (readable slug, base64, `ocd-person/<uuid>`
 * split across two segments, bare uuid) resolves against the roster corpus and
 * 308s to the one profile URL. Anything else is a 404 — no API call either way.
 */

import { notFound, permanentRedirect } from 'next/navigation';
import {
  getPersonById,
  getPersonByIdSuffix,
} from '@/lib/data-sources/openstates-people/load-people';
import { buildStateLegislatorUrl, parseStateLegislatorParam } from '@/lib/helpers/url-builders';

export default async function LegacyStateLegislatorRoute({
  params,
}: {
  params: Promise<{ state: string; legislatorId: string[] }>;
}) {
  const { legislatorId } = await params;
  const parsed = parseStateLegislatorParam(legislatorId.join('/'));
  if (!parsed) notFound();

  const person =
    parsed.kind === 'suffix'
      ? await getPersonByIdSuffix(parsed.suffix)
      : await getPersonById(parsed.id);
  if (!person) notFound();

  permanentRedirect(buildStateLegislatorUrl(person.jurisdiction, person.id, person.name));
}
