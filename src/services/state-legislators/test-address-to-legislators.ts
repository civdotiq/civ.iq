/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * End-to-End Test: Address to State Legislators
 * Run with: npx tsx src/services/state-legislators/test-address-to-legislators.ts
 */

/* eslint-disable no-console */

import { addressToLegislators } from './address-to-legislators.service';

async function testAddressToLegislators() {
  console.log('=== Address to State Legislators - End-to-End Test ===\n');

  // Test 1: Detroit, Michigan (should find both senator and representative)
  console.log('Test 1: Detroit, Michigan (100 Renaissance Center)');
  console.log('Expected: State Senate District 3, State House District 9');
  try {
    const detroitResult = await addressToLegislators.findByAddress({
      street: '100 Renaissance Center',
      city: 'Detroit',
      state: 'MI',
      zip: '48243',
    });

    console.log('✅ Success!');
    console.log('Matched Address:', detroitResult.matchedAddress);
    console.log('Coordinates:', detroitResult.coordinates);
    console.log('\nDistricts:');
    console.log('  Upper:', detroitResult.districts.upper?.name);
    console.log('  Lower:', detroitResult.districts.lower?.name);
    console.log('  Congressional:', detroitResult.districts.congressional?.name);
    console.log('\nLegislators:');
    console.log(
      '  Senator:',
      detroitResult.legislators.senator?.name,
      '(',
      detroitResult.legislators.senator?.party,
      ')'
    );
    console.log(
      '  Representative:',
      detroitResult.legislators.representative?.name,
      '(',
      detroitResult.legislators.representative?.party,
      ')'
    );
    console.log('\nPerformance:');
    console.log('  Census API:', detroitResult._metadata?.censusResponseTime, 'ms');
    console.log('  OpenStates API:', detroitResult._metadata?.openstatesResponseTime, 'ms');
    console.log('  Total:', detroitResult._metadata?.totalResponseTime, 'ms');

    if (detroitResult._metadata?.warnings && detroitResult._metadata.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      detroitResult._metadata.warnings.forEach(warning => console.log('  -', warning));
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('');
  }

  // Test 2: Lincoln, Nebraska (unicameral - only upper chamber)
  console.log('Test 2: Lincoln, Nebraska (1445 K Street)');
  console.log('Expected: State Senate District 28 (no lower chamber - Nebraska unicameral)');
  try {
    const lincolnResult = await addressToLegislators.findByAddress({
      street: '1445 K Street',
      city: 'Lincoln',
      state: 'NE',
      zip: '68508',
    });

    console.log('✅ Success!');
    console.log('Matched Address:', lincolnResult.matchedAddress);
    console.log('\nDistricts:');
    console.log('  Upper:', lincolnResult.districts.upper?.name);
    console.log('  Lower:', lincolnResult.districts.lower?.name || 'null (Nebraska unicameral)');
    console.log('\nLegislators:');
    console.log(
      '  Senator:',
      lincolnResult.legislators.senator?.name,
      '(',
      lincolnResult.legislators.senator?.party,
      ')'
    );
    console.log(
      '  Representative:',
      lincolnResult.legislators.representative?.name || 'null (Nebraska unicameral)'
    );
    console.log('\nPerformance:');
    console.log('  Total:', lincolnResult._metadata?.totalResponseTime, 'ms');

    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('');
  }

  // Test 3: White House, Washington DC (special case - DC has wards, no state legislature)
  console.log('Test 3: Washington, DC (1600 Pennsylvania Ave NW)');
  console.log('Expected: Ward 2 (DC has local wards, but no traditional state legislature)');
  try {
    const dcResult = await addressToLegislators.findByAddress({
      street: '1600 Pennsylvania Ave NW',
      city: 'Washington',
      state: 'DC',
      zip: '20500',
    });

    console.log('✅ Success!');
    console.log('Matched Address:', dcResult.matchedAddress);
    console.log('\nDistricts:');
    console.log('  Upper:', dcResult.districts.upper?.name || 'null');
    console.log('  Lower:', dcResult.districts.lower?.name || 'null');
    console.log('  Congressional:', dcResult.districts.congressional?.name);
    console.log('\nLegislators:');
    console.log('  Senator:', dcResult.legislators.senator?.name || 'null (DC has no senators)');
    console.log(
      '  Representative:',
      dcResult.legislators.representative?.name || 'null (DC has council members, not state reps)'
    );
    console.log('\nNote: DC has a unique government structure with wards and council members');
    console.log('');
  } catch (error) {
    console.error('❌ Error (expected for DC):', error);
    console.log('');
  }

  // Test 4: Invalid address (should fail gracefully)
  console.log('Test 4: Invalid Address');
  console.log('Expected: Address not found error');
  try {
    await addressToLegislators.findByAddress({
      street: '99999 Nonexistent Street',
      city: 'Nowhere',
      state: 'ZZ',
    });
    console.log('❌ Unexpected success - should have failed');
    console.log('');
  } catch (error) {
    console.log('✅ Correctly failed:', (error as Error).message);
    console.log('');
  }

  // Test 5: Input validation
  console.log('Test 5: Input Validation');
  const invalidAddress = {
    street: '',
    city: 'Detroit',
    state: 'MICHIGAN', // Wrong format - should be 2 letters
  };
  const validation = addressToLegislators.validate(invalidAddress);
  if (!validation.valid) {
    console.log('✅ Validation correctly failed:');
    validation.errors.forEach(error => console.log('  -', error));
  } else {
    console.log('❌ Validation should have failed');
  }

  console.log('\n=== End-to-End Test Complete ===');
}

testAddressToLegislators().catch(console.error);
