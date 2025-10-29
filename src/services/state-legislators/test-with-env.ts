/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * End-to-End Test with Environment Variables Loaded
 * Run with: npx tsx src/services/state-legislators/test-with-env.ts
 */

/* eslint-disable no-console */

import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually for tsx execution
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && match[1] && match[2]) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
  console.log('✅ Loaded .env.local');
  console.log('  OPENSTATES_API_KEY:', process.env.OPENSTATES_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('');
}

import { addressToLegislators } from './address-to-legislators.service';

async function testWithRealData() {
  console.log('=== Testing with Real OpenStates Data ===\n');

  // Test Detroit address
  console.log('Test: Detroit, Michigan (100 Renaissance Center)');
  console.log('Expected: Real state legislators from OpenStates\n');

  try {
    const result = await addressToLegislators.findByAddress({
      street: '100 Renaissance Center',
      city: 'Detroit',
      state: 'MI',
      zip: '48243',
    });

    console.log('✅ Success!\n');
    console.log('Address:', result.matchedAddress);
    console.log('Coordinates:', result.coordinates);
    console.log('\nDistricts:');
    console.log('  Upper:', result.districts.upper?.name);
    console.log('  Lower:', result.districts.lower?.name);
    console.log('\nLegislators:');
    if (result.legislators.senator) {
      console.log('  Senator:', result.legislators.senator.name);
      console.log('    Party:', result.legislators.senator.party);
      console.log('    Email:', result.legislators.senator.email || 'N/A');
      console.log('    District:', result.legislators.senator.district);
    } else {
      console.log('  Senator: ❌ Not found');
    }
    if (result.legislators.representative) {
      console.log('  Representative:', result.legislators.representative.name);
      console.log('    Party:', result.legislators.representative.party);
      console.log('    Email:', result.legislators.representative.email || 'N/A');
      console.log('    District:', result.legislators.representative.district);
    } else {
      console.log('  Representative: ❌ Not found');
    }

    console.log('\nPerformance:');
    console.log('  Census API:', result._metadata?.censusResponseTime, 'ms');
    console.log('  OpenStates API:', result._metadata?.openstatesResponseTime, 'ms');
    console.log('  Total:', result._metadata?.totalResponseTime, 'ms');

    if (result._metadata?.warnings && result._metadata.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result._metadata.warnings.forEach(w => console.log('  -', w));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n=== Test Complete ===');
}

testWithRealData().catch(console.error);
