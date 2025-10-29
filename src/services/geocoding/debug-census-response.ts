/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Debug script to inspect raw Census API responses
 * Run with: npx tsx src/services/geocoding/debug-census-response.ts
 */

/* eslint-disable no-console */

async function debugCensusResponse() {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/geographies/address');
  url.searchParams.set('street', '100 Renaissance Center');
  url.searchParams.set('city', 'Detroit');
  url.searchParams.set('state', 'MI');
  url.searchParams.set('zip', '48243');
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('vintage', 'Current_Current');
  url.searchParams.set('format', 'json');

  console.log('=== Census API Raw Response Debug ===\n');
  console.log('URL:', url.toString());
  console.log('\nFetching...\n');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': 'CivIQ-Hub/2.0 (Debug)',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    console.error('Error:', response.status, response.statusText);
    return;
  }

  const data = await response.json();

  // Pretty print full response
  console.log('Full Response:');
  console.log(JSON.stringify(data, null, 2));

  // Extract and list all geography keys
  if (data.result?.addressMatches?.[0]?.geographies) {
    const geographies = data.result.addressMatches[0].geographies;
    console.log('\n=== Available Geography Keys ===');
    console.log(Object.keys(geographies));

    console.log('\n=== Geography Details ===');
    for (const [key, value] of Object.entries(geographies)) {
      console.log(`\n${key}:`);
      console.log(JSON.stringify(value, null, 2));
    }
  }
}

debugCensusResponse().catch(console.error);
