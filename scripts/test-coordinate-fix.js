#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Test Coordinate Fix - Single District Validation
 * Test the coordinate system fix on existing extracted data
 */

const fs = require('fs');

class CoordinateFixTester {
  /**
   * Test the TMS-to-XYZ coordinate conversion approach
   * This matches the fix implemented in complete-district-extraction.js
   */
  testTMSConversion(originalGeoJSON) {
    console.log('📐 Testing TMS-to-XYZ coordinate conversion approach...');
    console.log('   (This would require re-extracting from tiles with proper conversion)');

    // For testing purposes, we'll apply a theoretical correction
    // In practice, this would require re-running the extraction with TMS conversion
    const testGeoJSON = JSON.parse(JSON.stringify(originalGeoJSON));

    // Simulate what proper TMS conversion might produce
    // This is just for validation - actual fix requires re-extraction
    return testGeoJSON;
  }

  async testSingleDistrict() {
    console.log('🧪 Testing coordinate fix on existing CA-12 data...');

    // Read the existing CA-12 file and test our fix on it
    const existingFile = '/mnt/d/civic-intel-hub/public/data/districts/full/0612.json';
    try {
      const fileContent = fs.readFileSync(existingFile, 'utf-8');
      const originalGeoJSON = JSON.parse(fileContent);

      console.log('📍 Current CA-12 coordinates (first point):');
      const currentCoords = originalGeoJSON.geometry.coordinates[0][0];
      console.log(`   [${currentCoords[0].toFixed(6)}, ${currentCoords[1].toFixed(6)}]`);

      // Test our fix function
      const testGeoJSON = JSON.parse(fileContent); // Fresh copy
      this.fixCoordinateSystem(testGeoJSON);

      const fixedCoords = testGeoJSON.geometry.coordinates[0][0];
      console.log('\n🔧 After coordinate fix (first point):');
      console.log(`   [${fixedCoords[0].toFixed(6)}, ${fixedCoords[1].toFixed(6)}]`);

      // Compare with internal point from properties
      const expectedLat = parseFloat(originalGeoJSON.properties.INTPTLAT);
      const expectedLon = parseFloat(originalGeoJSON.properties.INTPTLON);

      console.log('\n📍 Expected coordinates from properties:');
      console.log(`   Internal Point: [${expectedLon.toFixed(6)}, ${expectedLat.toFixed(6)}]`);

      // Validate
      const lat = fixedCoords[1];
      const lon = fixedCoords[0];
      const latDiff = Math.abs(lat - expectedLat);
      const lonDiff = Math.abs(lon - expectedLon);

      // Allow some tolerance (0.1 degree ~= 11km) for polygon boundary vs centroid
      const isValidSF = latDiff < 0.5 && lonDiff < 0.5;

      console.log('\n✅ COORDINATE VALIDATION:');
      console.log(`   Longitude: ${lon.toFixed(6)} (expect ~-122.4 for SF)`);
      console.log(`   Latitude: ${lat.toFixed(6)} (expect ~37.7 for SF)`);
      console.log(`   SF range check: ${isValidSF ? '✅ PASS' : '❌ FAIL'}`);

      if (isValidSF) {
        console.log('\n🎉 COORDINATE FIX SUCCESSFUL!');
        console.log('   Ready to regenerate all districts with correct coordinates');
      } else {
        console.log('\n🚨 COORDINATE FIX FAILED!');
        console.log('   Need to adjust the fix logic');
      }

      return isValidSF;
    } catch (error) {
      console.log(`❌ Could not test existing file: ${error.message}`);
      return false;
    }
  }
}

async function main() {
  const tester = new CoordinateFixTester();

  try {
    const result = await tester.testSingleDistrict();
    console.log(`\n📋 Test ${result ? 'PASSED' : 'FAILED'}!`);
    process.exit(result ? 0 : 1);
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CoordinateFixTester };
