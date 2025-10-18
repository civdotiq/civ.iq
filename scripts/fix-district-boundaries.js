#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Fix District Boundaries - Direct Census TIGER/Line Processing
 *
 * This script downloads fresh 119th Congress district boundaries from Census Bureau
 * and processes them into optimized GeoJSON files, bypassing the corrupted PMTiles.
 *
 * Data Source: Census TIGER/Line 2023 Congressional Districts (119th Congress)
 * URL: https://www2.census.gov/geo/tiger/TIGER2023/CD/tl_2023_us_cd119.zip
 *
 * Note: This is a Node.js build script that requires CommonJS for system operations.
 */

const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CENSUS_BASE_URL = 'https://www2.census.gov/geo/tiger/TIGER2025/CD/';
const DOWNLOAD_DIR = path.join(__dirname, '..', 'temp_tiger_data');
const OUTPUT_BASE = path.join(__dirname, '..', 'public', 'data', 'districts');
const EXTRACT_DIR = path.join(DOWNLOAD_DIR, 'extracted');
const MERGED_GEOJSON = path.join(DOWNLOAD_DIR, 'congressional_districts_119.geojson');

class DistrictBoundaryFixer {
  constructor() {
    this.stats = {
      startTime: Date.now(),
      districtsProcessed: 0,
      errors: [],
    };
  }

  async run() {
    console.log('🚀 District Boundary Fix Pipeline Starting...');
    console.log('📊 Source: Census TIGER/Line 2025 (119th Congress)\n');

    try {
      await this.setup();
      await this.downloadAllStateFiles();
      await this.mergeStateFiles();
      await this.splitIntoIndividualFiles();
      await this.optimizeDistricts();
      await this.validateDistricts();
      await this.generateManifest();
      await this.cleanup();

      console.log('\n✅ DISTRICT BOUNDARY FIX COMPLETE!');
      console.log(`⏱️  Total time: ${((Date.now() - this.stats.startTime) / 1000).toFixed(1)}s`);
      console.log(`📊 Districts processed: ${this.stats.districtsProcessed}`);

      if (this.stats.errors.length > 0) {
        console.log(`⚠️  Errors: ${this.stats.errors.length}`);
        this.stats.errors.forEach(err => console.log(`   - ${err}`));
      }
    } catch (error) {
      console.error('\n❌ Pipeline failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  async setup() {
    console.log('📁 Setting up directories...');

    // Create temp and output directories
    await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
    await fs.mkdir(EXTRACT_DIR, { recursive: true });
    await fs.mkdir(path.join(OUTPUT_BASE, 'full'), { recursive: true });
    await fs.mkdir(path.join(OUTPUT_BASE, 'standard'), { recursive: true });
    await fs.mkdir(path.join(OUTPUT_BASE, 'simple'), { recursive: true });

    console.log('✅ Directories ready\n');
  }

  getStateFipsCodes() {
    // All US states and territories with congressional districts
    return [
      '01',
      '02',
      '04',
      '05',
      '06',
      '08',
      '09',
      '10',
      '11',
      '12',
      '13',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
      '24',
      '25',
      '26',
      '27',
      '28',
      '29',
      '30',
      '31',
      '32',
      '33',
      '34',
      '35',
      '36',
      '37',
      '38',
      '39',
      '40',
      '41',
      '42',
      '44',
      '45',
      '46',
      '47',
      '48',
      '49',
      '50',
      '51',
      '53',
      '54',
      '55',
      '56',
      '72',
    ]; // Includes PR
  }

  async downloadAllStateFiles() {
    console.log('📥 Downloading TIGER/Line shapefiles from Census Bureau...');
    console.log(`   Source: ${CENSUS_BASE_URL}\n`);

    const stateFips = this.getStateFipsCodes();
    let downloaded = 0;

    for (const fips of stateFips) {
      const filename = `tl_2025_${fips}_cd119.zip`;
      const url = `${CENSUS_BASE_URL}${filename}`;
      const zipPath = path.join(DOWNLOAD_DIR, filename);

      // Check if already downloaded
      try {
        await fs.access(zipPath);
        const stats = await fs.stat(zipPath);
        if (stats.size > 1000) {
          // Valid file
          downloaded++;
          process.stdout.write(`\r   Progress: ${downloaded}/${stateFips.length} states`);
          continue;
        }
      } catch {
        // Download needed
      }

      try {
        await this.downloadFile(url, zipPath);
        downloaded++;
        process.stdout.write(`\r   Progress: ${downloaded}/${stateFips.length} states`);
      } catch (error) {
        this.stats.errors.push(`Failed to download ${filename}: ${error.message}`);
      }
    }

    console.log(`\n✅ Downloaded ${downloaded}/${stateFips.length} state files\n`);
  }

  async downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
      const file = fsSync.createWriteStream(dest);

      https
        .get(url, response => {
          if (response.statusCode === 404) {
            fsSync.unlinkSync(dest);
            reject(new Error('File not found'));
            return;
          }

          if (response.statusCode === 302 || response.statusCode === 301) {
            // Handle redirect
            https
              .get(response.headers.location, redirectResponse => {
                redirectResponse.pipe(file);
                file.on('finish', () => {
                  file.close();
                  resolve();
                });
              })
              .on('error', reject);
          } else {
            response.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve();
            });
          }
        })
        .on('error', err => {
          if (fsSync.existsSync(dest)) {
            fsSync.unlinkSync(dest);
          }
          reject(err);
        });

      file.on('error', err => {
        if (fsSync.existsSync(dest)) {
          fsSync.unlinkSync(dest);
        }
        reject(err);
      });
    });
  }

  async mergeStateFiles() {
    console.log('🗺️  Extracting and merging state shapefiles...');

    // Check if ogr2ogr is available
    try {
      execSync('which ogr2ogr', { stdio: 'pipe' });
    } catch {
      console.log('\n⚠️  ogr2ogr (GDAL) not found!');
      console.log('   Install with:');
      console.log('   - Ubuntu/Debian: sudo apt-get install gdal-bin');
      console.log('   - macOS: brew install gdal');
      console.log('   - Windows: https://trac.osgeo.org/osgeo4w/\n');
      throw new Error('ogr2ogr not available');
    }

    const allFeatures = [];
    const zipFiles = (await fs.readdir(DOWNLOAD_DIR)).filter(f => f.endsWith('.zip'));
    let processed = 0;

    for (const zipFile of zipFiles) {
      try {
        const zipPath = path.join(DOWNLOAD_DIR, zipFile);
        const stateExtractDir = path.join(EXTRACT_DIR, zipFile.replace('.zip', ''));
        await fs.mkdir(stateExtractDir, { recursive: true });

        // Extract ZIP
        execSync(`unzip -o -q "${zipPath}" -d "${stateExtractDir}"`, { stdio: 'pipe' });

        // Find shapefile
        const files = await fs.readdir(stateExtractDir);
        const shpFile = files.find(f => f.endsWith('.shp'));

        if (shpFile) {
          const shpPath = path.join(stateExtractDir, shpFile);
          const tmpGeoJSON = path.join(stateExtractDir, 'temp.geojson');

          // Convert to GeoJSON
          execSync(`ogr2ogr -f GeoJSON -t_srs EPSG:4326 "${tmpGeoJSON}" "${shpPath}"`, {
            stdio: 'pipe',
          });

          // Read and merge features
          const data = JSON.parse(await fs.readFile(tmpGeoJSON, 'utf8'));
          allFeatures.push(...data.features);
        }

        processed++;
        process.stdout.write(`\r   Processed: ${processed}/${zipFiles.length} states`);
      } catch (error) {
        this.stats.errors.push(`Failed to process ${zipFile}: ${error.message}`);
      }
    }

    // Create merged GeoJSON
    const merged = {
      type: 'FeatureCollection',
      features: allFeatures,
    };

    await fs.writeFile(MERGED_GEOJSON, JSON.stringify(merged));
    this.geoJSONPath = MERGED_GEOJSON;

    console.log(`\n✅ Merged ${allFeatures.length} congressional districts\n`);
  }

  async splitIntoIndividualFiles() {
    console.log('✂️  Splitting into individual district files...');

    const data = JSON.parse(await fs.readFile(this.geoJSONPath, 'utf8'));
    const features = data.features;

    console.log(`   Found ${features.length} districts`);

    for (const feature of features) {
      const geoid = feature.properties.GEOID;

      if (!geoid) {
        this.stats.errors.push('Feature missing GEOID');
        continue;
      }

      // Enhance properties with our standard fields
      feature.properties = {
        ...feature.properties,
        id: `${feature.properties.STATEFP}-${feature.properties.CD119FP}`,
        state_fips: feature.properties.STATEFP,
        district_num: feature.properties.CD119FP,
        name: `${this.getStateAbbr(feature.properties.STATEFP)}-${feature.properties.CD119FP}`,
        geoid: geoid,
      };

      // Add state name and abbreviation
      const stateAbbr = this.getStateAbbr(feature.properties.STATEFP);
      if (stateAbbr) {
        feature.properties.state_abbr = stateAbbr;
        feature.properties.state_name = this.getStateName(stateAbbr);
        feature.properties.full_name = `${feature.properties.state_name} Congressional District ${feature.properties.CD119FP}`;
      }

      // Save to full resolution
      const fullPath = path.join(OUTPUT_BASE, 'full', `${geoid}.json`);
      await fs.writeFile(fullPath, JSON.stringify(feature, null, 2));

      this.stats.districtsProcessed++;

      if (this.stats.districtsProcessed % 50 === 0) {
        console.log(`   Processed ${this.stats.districtsProcessed}/${features.length} districts`);
      }
    }

    console.log(`✅ Split complete: ${this.stats.districtsProcessed} districts\n`);
  }

  async optimizeDistricts() {
    console.log('⚙️  Optimizing district geometries...');
    console.log('   This may take several minutes...\n');

    const files = await fs.readdir(path.join(OUTPUT_BASE, 'full'));
    let processed = 0;

    // Check if mapshaper is available
    let mapshaperAvailable = false;
    try {
      require.resolve('mapshaper');
      mapshaperAvailable = true;
    } catch {
      console.log('⚠️  mapshaper not available, copying files instead of optimizing');
    }

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const fullPath = path.join(OUTPUT_BASE, 'full', file);
      const standardPath = path.join(OUTPUT_BASE, 'standard', file);
      const simplePath = path.join(OUTPUT_BASE, 'simple', file);

      if (mapshaperAvailable) {
        try {
          const mapshaper = require('mapshaper');
          const geoJSON = JSON.parse(await fs.readFile(fullPath, 'utf8'));

          // Standard resolution (1% simplification)
          const standardResult = await mapshaper.applyCommands(geoJSON, {
            '-simplify': '1%',
            '-o': 'format=geojson',
          });
          await fs.writeFile(standardPath, standardResult);

          // Simple resolution (0.1% simplification)
          const simpleResult = await mapshaper.applyCommands(geoJSON, {
            '-simplify': '0.1%',
            '-o': 'format=geojson',
          });
          await fs.writeFile(simplePath, simpleResult);
        } catch (error) {
          // Fallback: copy full resolution
          await fs.copyFile(fullPath, standardPath);
          await fs.copyFile(fullPath, simplePath);
        }
      } else {
        // No mapshaper: copy full resolution
        await fs.copyFile(fullPath, standardPath);
        await fs.copyFile(fullPath, simplePath);
      }

      processed++;
      if (processed % 50 === 0) {
        console.log(`   Optimized ${processed}/${files.length} districts`);
      }
    }

    console.log(`✅ Optimization complete: ${processed} districts\n`);
  }

  async validateDistricts() {
    console.log('🔍 Validating critical districts...');

    const testDistricts = [
      { id: '4504', name: 'SC-4', expectedLat: 34.9, expectedLon: -82.2 },
      { id: '0612', name: 'CA-12', expectedLat: 37.8, expectedLon: -122.4 },
      { id: '3614', name: 'NY-14', expectedLat: 40.7, expectedLon: -73.9 },
      { id: '4803', name: 'TX-3', expectedLat: 33.0, expectedLon: -96.6 },
    ];

    for (const test of testDistricts) {
      try {
        const filePath = path.join(OUTPUT_BASE, 'standard', `${test.id}.json`);
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

        // Get interior point from properties
        const lat = parseFloat(data.properties.INTPTLAT);
        const lon = parseFloat(data.properties.INTPTLON);

        // Get first coordinate from geometry
        let firstCoord;
        if (data.geometry.type === 'Polygon') {
          firstCoord = data.geometry.coordinates[0][0];
        } else if (data.geometry.type === 'MultiPolygon') {
          firstCoord = data.geometry.coordinates[0][0][0];
        }

        const coordsMatch =
          Math.abs(firstCoord[1] - test.expectedLat) < 2.0 &&
          Math.abs(firstCoord[0] - test.expectedLon) < 2.0;

        const centerMatch =
          Math.abs(lat - test.expectedLat) < 2.0 && Math.abs(lon - test.expectedLon) < 2.0;

        if (coordsMatch && centerMatch) {
          console.log(`   ✅ ${test.name}: Valid (center: ${lat.toFixed(2)}, ${lon.toFixed(2)})`);
        } else {
          console.log(`   ⚠️  ${test.name}: Coordinates may be off`);
          console.log(`      Center: ${lat.toFixed(2)}, ${lon.toFixed(2)}`);
          console.log(
            `      First coord: ${firstCoord[1].toFixed(2)}, ${firstCoord[0].toFixed(2)}`
          );
        }
      } catch (error) {
        console.log(`   ❌ ${test.name}: Validation failed - ${error.message}`);
        this.stats.errors.push(`Validation failed for ${test.name}`);
      }
    }

    console.log('');
  }

  async generateManifest() {
    console.log('📋 Generating manifest...');

    const files = await fs.readdir(path.join(OUTPUT_BASE, 'standard'));
    const districts = files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort();

    const manifest = {
      generated: new Date().toISOString(),
      total_districts: districts.length,
      source: 'Census TIGER/Line 2025 (119th Congress)',
      source_url: CENSUS_BASE_URL,
      extraction_stats: {
        duration_ms: Date.now() - this.stats.startTime,
        errors: this.stats.errors.length,
      },
      districts,
      detail_levels: {
        full: 'Original resolution from Census TIGER/Line',
        standard: '1% simplified with mapshaper (web optimized)',
        simple: '0.1% simplified with mapshaper (overview maps)',
      },
    };

    const manifestPath = path.join(OUTPUT_BASE, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`✅ Manifest created: ${manifest.total_districts} districts\n`);
  }

  async cleanup() {
    console.log('🧹 Cleaning up temporary files...');

    try {
      await fs.rm(DOWNLOAD_DIR, { recursive: true, force: true });
      console.log('✅ Cleanup complete\n');
    } catch (error) {
      console.log('⚠️  Could not remove temp directory:', error.message);
    }
  }

  getStateAbbr(fips) {
    const fipsMap = {
      '01': 'AL',
      '02': 'AK',
      '04': 'AZ',
      '05': 'AR',
      '06': 'CA',
      '08': 'CO',
      '09': 'CT',
      10: 'DE',
      11: 'DC',
      12: 'FL',
      13: 'GA',
      15: 'HI',
      16: 'ID',
      17: 'IL',
      18: 'IN',
      19: 'IA',
      20: 'KS',
      21: 'KY',
      22: 'LA',
      23: 'ME',
      24: 'MD',
      25: 'MA',
      26: 'MI',
      27: 'MN',
      28: 'MS',
      29: 'MO',
      30: 'MT',
      31: 'NE',
      32: 'NV',
      33: 'NH',
      34: 'NJ',
      35: 'NM',
      36: 'NY',
      37: 'NC',
      38: 'ND',
      39: 'OH',
      40: 'OK',
      41: 'OR',
      42: 'PA',
      44: 'RI',
      45: 'SC',
      46: 'SD',
      47: 'TN',
      48: 'TX',
      49: 'UT',
      50: 'VT',
      51: 'VA',
      53: 'WA',
      54: 'WV',
      55: 'WI',
      56: 'WY',
      60: 'AS',
      66: 'GU',
      69: 'MP',
      72: 'PR',
      78: 'VI',
    };
    return fipsMap[fips] || null;
  }

  getStateName(abbr) {
    const nameMap = {
      AL: 'Alabama',
      AK: 'Alaska',
      AZ: 'Arizona',
      AR: 'Arkansas',
      CA: 'California',
      CO: 'Colorado',
      CT: 'Connecticut',
      DE: 'Delaware',
      DC: 'District of Columbia',
      FL: 'Florida',
      GA: 'Georgia',
      HI: 'Hawaii',
      ID: 'Idaho',
      IL: 'Illinois',
      IN: 'Indiana',
      IA: 'Iowa',
      KS: 'Kansas',
      KY: 'Kentucky',
      LA: 'Louisiana',
      ME: 'Maine',
      MD: 'Maryland',
      MA: 'Massachusetts',
      MI: 'Michigan',
      MN: 'Minnesota',
      MS: 'Mississippi',
      MO: 'Missouri',
      MT: 'Montana',
      NE: 'Nebraska',
      NV: 'Nevada',
      NH: 'New Hampshire',
      NJ: 'New Jersey',
      NM: 'New Mexico',
      NY: 'New York',
      NC: 'North Carolina',
      ND: 'North Dakota',
      OH: 'Ohio',
      OK: 'Oklahoma',
      OR: 'Oregon',
      PA: 'Pennsylvania',
      RI: 'Rhode Island',
      SC: 'South Carolina',
      SD: 'South Dakota',
      TN: 'Tennessee',
      TX: 'Texas',
      UT: 'Utah',
      VT: 'Vermont',
      VA: 'Virginia',
      WA: 'Washington',
      WV: 'West Virginia',
      WI: 'Wisconsin',
      WY: 'Wyoming',
      AS: 'American Samoa',
      GU: 'Guam',
      MP: 'Northern Mariana Islands',
      PR: 'Puerto Rico',
      VI: 'Virgin Islands',
    };
    return nameMap[abbr] || abbr;
  }
}

// Main execution
if (require.main === module) {
  const fixer = new DistrictBoundaryFixer();
  fixer.run();
}

module.exports = { DistrictBoundaryFixer };
