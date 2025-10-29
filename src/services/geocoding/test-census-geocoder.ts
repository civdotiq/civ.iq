/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Test script for Census Geocoder Service
 * Run with: npx tsx src/services/geocoding/test-census-geocoder.ts
 */

/* eslint-disable no-console */

import { censusGeocoder } from './census-geocoder.service';
import type { CensusGeocodeRequest } from './census-geocoder.types';

async function testCensusGeocoder() {
  console.log('=== Census Geocoder Service Test ===\n');

  // Test 1: White House (known DC address - no state legislature)
  console.log('Test 1: White House (Washington, DC)');
  const whiteHouseRequest: CensusGeocodeRequest = {
    street: '1600 Pennsylvania Ave NW',
    city: 'Washington',
    state: 'DC',
    zip: '20500',
  };

  try {
    const whiteHouseResult = await censusGeocoder.geocodeAddress(whiteHouseRequest);
    console.log('✅ Success:', JSON.stringify(whiteHouseResult, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('');
  }

  // Test 2: Detroit address (Michigan - should have both chambers)
  console.log('Test 2: Detroit, Michigan (ZIP 48221 area)');
  const detroitRequest: CensusGeocodeRequest = {
    street: '100 Renaissance Center',
    city: 'Detroit',
    state: 'MI',
    zip: '48243',
  };

  try {
    const detroitResult = await censusGeocoder.geocodeAddress(detroitRequest);
    console.log('✅ Success:', JSON.stringify(detroitResult, null, 2));
    console.log('');

    // Test GEOID parsing
    if (detroitResult.upperDistrict) {
      console.log('Testing GEOID parsing for upper district:');
      const parsed = censusGeocoder.parseGEOID(detroitResult.upperDistrict.geoid);
      console.log('  Parsed GEOID:', JSON.stringify(parsed, null, 2));
    }
    if (detroitResult.lowerDistrict) {
      console.log('Testing GEOID parsing for lower district:');
      const parsed = censusGeocoder.parseGEOID(detroitResult.lowerDistrict.geoid);
      console.log('  Parsed GEOID:', JSON.stringify(parsed, null, 2));
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('');
  }

  // Test 3: Nebraska (unicameral legislature - only upper chamber)
  console.log('Test 3: Lincoln, Nebraska (Unicameral legislature)');
  const nebraskaRequest: CensusGeocodeRequest = {
    street: '1445 K Street',
    city: 'Lincoln',
    state: 'NE',
    zip: '68508',
  };

  try {
    const nebraskaResult = await censusGeocoder.geocodeAddress(nebraskaRequest);
    console.log('✅ Success:', JSON.stringify(nebraskaResult, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('');
  }

  // Test 4: Health check
  console.log('Test 4: API Health Check');
  try {
    const isHealthy = await censusGeocoder.healthCheck();
    console.log(`✅ Census Geocoder API Health: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('');
  }

  console.log('=== Test Complete ===');
}

// Run tests
testCensusGeocoder().catch(console.error);
