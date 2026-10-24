/**
 * Google service-account auth shared by the stats clients (GA4, Search Console).
 *
 * A service-account JWT, RS256-signed with node:crypto, exchanged for an
 * OAuth access token. No google-auth-library: the flow is ~40 lines and these
 * are dev scripts, so a dependency would cost more than it saves.
 */

import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
}

/** The GA4 service account from .env.local; Search Console reuses it. */
export function readServiceAccount(): ServiceAccount | null {
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  // Env files store the PEM with literal \n; restore real newlines for crypto.
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey };
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

/** Build and RS256-sign the service-account assertion. */
function signJwt(account: ServiceAccount, scope: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  signer.end();
  const signature = base64url(signer.sign(account.privateKey));

  return `${header}.${claims}.${signature}`;
}

export async function getAccessToken(account: ServiceAccount, scope: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signJwt(account, scope),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OAuth token exchange failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('OAuth response contained no access_token');
  return json.access_token;
}
