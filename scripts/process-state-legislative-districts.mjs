#!/usr/bin/env node

/**
 * State Legislative Districts Processor
 *
 * Downloads and processes ALL Census TIGER/Line shapefiles for state legislative districts
 * (both upper and lower chambers) to generate PMTiles and metadata for interactive mapping.
 *
 * Data Source: U.S. Census Bureau TIGER/Line Shapefiles 2025
 * - SLDL (State Legislative District - Lower Chamber)
 * - SLDU (State Legislative District - Upper Chamber)
 *
 * Output:
 * - state_legislative_districts.pmtiles (vector tiles)
 * - state-districts-manifest.json (metadata with centroids, bboxes)
 *
 * NO MOCK DATA - ONLY REAL CENSUS BUREAU DATA
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for REAL Census data processing
const CONFIG = {
  // Census TIGER/Line FTP base URL for 2025 State Legislative Districts
  censusTigerBase: 'https://www2.census.gov/geo/tiger/TIGER2025',

  // All US state and DC FIPS codes (51 total - 50 states + DC)
  stateFips: [
    '01', '02', '04', '05', '06', '08', '09', '10', '11', '12', '13', '15', '16',
    '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29',
    '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42',
    '44', '45', '46', '47', '48', '49', '50', '51', '53', '54', '55', '56'
  ],

  // State names mapping for FIPS codes
  stateNames: {
    '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas',
    '06': 'California', '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware',
    '11': 'District of Columbia', '12': 'Florida', '13': 'Georgia', '15': 'Hawaii',
    '16': 'Idaho', '17': 'Illinois', '18': 'Indiana', '19': 'Iowa',
    '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine',
    '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota',
    '28': 'Mississippi', '29': 'Missouri', '30': 'Montana', '31': 'Nebraska',
    '32': 'Nevada', '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico',
    '36': 'New York', '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio',
    '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island',
    '45': 'South Carolina', '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas',
    '49': 'Utah', '50': 'Vermont', '51': 'Virginia', '53': 'Washington',
    '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming'
  },

  // State abbreviations (FIPS to 2-letter code)
  stateAbbreviations: {
    '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
    '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
    '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
    '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
    '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
    '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
    '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
    '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
    '54': 'WV', '55': 'WI', '56': 'WY'
  },

  // Chamber configuration
  chambers: {
    lower: {
      code: 'sldl',
      name: 'Lower Chamber',
      fullName: 'State House',
      tippecanoeLayer: 'sldl'
    },
    upper: {
      code: 'sldu',
      name: 'Upper Chamber',
      fullName: 'State Senate',
      tippecanoeLayer: 'sldu'
    }
  },

  // Directories
  tempDir: path.join(process.cwd(), 'temp', 'state-districts'),
  dataDir: path.join(process.cwd(), 'data', 'state-districts'),
  publicDir: path.join(process.cwd(), 'public', 'maps'),

  // Output files
  outputPMTiles: 'state_legislative_districts.pmtiles',
  outputManifest: 'state-districts-manifest.json'
};

class StateDistrictProcessor {
  constructor() {
    this.processedDistricts = [];
    this.allFeatures = [];
    this.errors = [];
    this.startTime = Date.now();
    this.stats = {
      downloaded: 0,
      processed: 0,
      skipped: 0
    };
  }

  async run() {
    console.log('🏛️  State Legislative Districts Processor');
    console.log('==========================================');
    console.log('📊 Processing ALL state legislative districts (upper and lower chambers)');
    console.log('🚫 NO MOCK DATA - ONLY REAL CENSUS BUREAU SHAPEFILES');
    console.log('');

    try {
      // Create directories
      await this.createDirectories();

      // Download all shapefiles (both chambers)
      await this.downloadAllShapefiles();

      // Process all shapefiles and build unified IDs
      await this.processAllShapefiles();

      // Generate combined GeoJSON files (split by chamber)
      await this.generateChamberGeoJSONs();

      // Generate PMTiles with separate layers
      await this.generatePMTiles();

      // Generate metadata manifest
      await this.generateManifest();

      // Print summary
      this.printSummary();

      console.log('\n✅ SUCCESS: All state legislative districts processed');
      console.log(`⏱️  Total processing time: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);

    } catch (error) {
      console.error('\n❌ FAILED:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  async createDirectories() {
    console.log('📁 Creating directories...');
    await fs.mkdir(CONFIG.tempDir, { recursive: true });
    await fs.mkdir(CONFIG.dataDir, { recursive: true });
    await fs.mkdir(CONFIG.publicDir, { recursive: true });
  }

  async downloadAllShapefiles() {
    console.log('\n⬇️  Downloading Census TIGER/Line shapefiles...');
    console.log(`📍 Source: ${CONFIG.censusTigerBase}`);

    for (const chamber of ['lower', 'upper']) {
      const chamberConfig = CONFIG.chambers[chamber];
      const chamberCode = chamberConfig.code.toUpperCase(); // SLDL or SLDU

      console.log(`\n🔽 Downloading ${chamberConfig.fullName} districts (${chamberCode})...`);

      for (const fips of CONFIG.stateFips) {
        // Nebraska has unicameral legislature (no lower chamber)
        if (fips === '31' && chamber === 'lower') {
          console.log(`⊗ ${CONFIG.stateNames[fips]} (${fips}) - Skipped (unicameral legislature)`);
          this.stats.skipped++;
          continue;
        }

        const fileName = `tl_2025_${fips}_${chamberConfig.code}.zip`;
        const url = `${CONFIG.censusTigerBase}/${chamberCode}/${fileName}`;
        const filePath = path.join(CONFIG.tempDir, fileName);

        try {
          // Check if file already exists
          try {
            await fs.access(filePath);
            console.log(`✓ ${CONFIG.stateNames[fips]} (${fips}) - Already downloaded`);
            this.stats.downloaded++;
            continue;
          } catch {
            // File doesn't exist, download it
          }

          console.log(`⬇️  Downloading ${CONFIG.stateNames[fips]} (${fips}) ${chamber}...`);

          // Use fetch to download (Node 18+ has native fetch)
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          await fs.writeFile(filePath, buffer);

          console.log(`✅ ${CONFIG.stateNames[fips]} (${fips}) - Downloaded (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
          this.stats.downloaded++;

          // Small delay to be respectful to Census servers
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ ${CONFIG.stateNames[fips]} (${fips}) - Failed: ${error.message}`);
          this.errors.push({
            state: CONFIG.stateNames[fips],
            fips,
            chamber,
            error: error.message
          });
        }
      }
    }

    console.log(`\n📊 Download complete: ${this.stats.downloaded} files, ${this.stats.skipped} skipped`);

    if (this.stats.downloaded === 0) {
      throw new Error('No shapefiles downloaded successfully');
    }
  }

  async processAllShapefiles() {
    console.log('\n🔄 Processing shapefiles with GDAL...');

    for (const chamber of ['lower', 'upper']) {
      const chamberConfig = CONFIG.chambers[chamber];
      console.log(`\n🔄 Processing ${chamberConfig.fullName} districts...`);

      for (const fips of CONFIG.stateFips) {
        // Skip Nebraska lower chamber
        if (fips === '31' && chamber === 'lower') continue;

        const zipFile = path.join(CONFIG.tempDir, `tl_2025_${fips}_${chamberConfig.code}.zip`);

        try {
          // Check if shapefile exists
          await fs.access(zipFile);

          console.log(`🔄 Processing ${CONFIG.stateNames[fips]} (${fips}) ${chamber}...`);

          // Extract ZIP file
          const extractDir = path.join(CONFIG.tempDir, `extract_${fips}_${chamber}`);
          await fs.mkdir(extractDir, { recursive: true });

          await this.runCommand('unzip', ['-o', '-q', zipFile, '-d', extractDir]);

          // Find the shapefile
          const files = await fs.readdir(extractDir);
          const shpFile = files.find(f => f.endsWith('.shp'));

          if (!shpFile) {
            throw new Error('No .shp file found in archive');
          }

          const shapefilePath = path.join(extractDir, shpFile);
          const geoJsonPath = path.join(CONFIG.tempDir, `${fips}_${chamber}.geojson`);

          // Convert to GeoJSON using ogr2ogr with simplification
          await this.runCommand('ogr2ogr', [
            '-f', 'GeoJSON',
            '-t_srs', 'EPSG:4326',  // Reproject to WGS84
            '-simplify', '0.0001',  // Simplify geometry for smaller file size
            geoJsonPath,
            shapefilePath
          ]);

          // Read and process the GeoJSON
          const geoJsonContent = await fs.readFile(geoJsonPath, 'utf8');
          const geoJson = JSON.parse(geoJsonContent);

          // Process each feature and add to our collection
          for (const feature of geoJson.features) {
            const enhancedFeature = this.enhanceFeature(feature, fips, chamber);
            this.allFeatures.push(enhancedFeature);

            // Calculate metadata
            const metadata = this.extractMetadata(enhancedFeature);
            this.processedDistricts.push(metadata);
          }

          console.log(`✅ ${CONFIG.stateNames[fips]} - ${geoJson.features.length} ${chamber} districts processed`);
          this.stats.processed += geoJson.features.length;

          // Clean up temporary files
          await fs.rm(extractDir, { recursive: true, force: true });
          await fs.rm(geoJsonPath, { force: true });

        } catch (error) {
          console.error(`❌ ${CONFIG.stateNames[fips]} (${fips}) ${chamber} - Processing failed: ${error.message}`);
          this.errors.push({
            state: CONFIG.stateNames[fips],
            fips,
            chamber,
            error: error.message
          });
        }
      }
    }

    console.log(`\n📊 Processed ${this.stats.processed} total districts`);

    if (this.allFeatures.length === 0) {
      throw new Error('No districts processed successfully');
    }
  }

  /**
   * Enhance feature with unified ID and standardized properties
   */
  enhanceFeature(feature, stateFips, chamber) {
    const props = feature.properties;

    // Extract district code from TIGER attributes
    // Lower chamber: SLDLST or SLDLCE (e.g., "012")
    // Upper chamber: SLDUST or SLDUCE (e.g., "006")
    const districtCode = chamber === 'lower'
      ? (props.SLDLST || props.SLDLCE || props.SLDL || '000')
      : (props.SLDUST || props.SLDUCE || props.SLDU || '000');

    const stateCode = CONFIG.stateAbbreviations[stateFips];
    const districtNum = this.normalizeDistrictNumber(districtCode);

    // Build unified ID: {STATE}-{CHAMBER}-{DISTRICT}
    const districtId = `${stateCode}-${chamber}-${districtNum}`;

    return {
      ...feature,
      properties: {
        // Keep original TIGER properties
        ...props,

        // Add our unified schema
        id: districtId,
        state_code: stateCode,
        state_fips: stateFips,
        state_name: CONFIG.stateNames[stateFips],
        chamber: chamber,
        district_num: districtNum,
        district_code_original: districtCode,

        // Human-readable names
        name: `${stateCode}-${chamber}-${districtNum}`,
        full_name: `${CONFIG.stateNames[stateFips]} ${CONFIG.chambers[chamber].fullName} District ${districtNum}`,

        // Keep TIGER GEOID for validation
        geoid: props.GEOID || `${stateFips}${districtCode}`
      }
    };
  }

  /**
   * Normalize district number (remove leading zeros, handle at-large)
   */
  normalizeDistrictNumber(code) {
    // Handle at-large districts
    if (code === '00' || code === '000' || code === 'ZZZ' || code === 'AL') {
      return 'AL';
    }

    // Remove leading zeros: "012" -> "12"
    const normalized = code.replace(/^0+/, '');
    return normalized || '0';
  }

  /**
   * Extract metadata from enhanced feature
   */
  extractMetadata(feature) {
    const props = feature.properties;
    const bounds = this.calculateBounds(feature.geometry);
    const centroid = this.calculateCentroid(feature.geometry);

    return {
      id: props.id,
      state_code: props.state_code,
      state_fips: props.state_fips,
      state_name: props.state_name,
      chamber: props.chamber,
      district_num: props.district_num,
      name: props.name,
      full_name: props.full_name,
      centroid: centroid,
      bbox: bounds,
      geoid: props.geoid,
      district_code_original: props.district_code_original
    };
  }

  async generateChamberGeoJSONs() {
    console.log('\n📄 Generating chamber-specific GeoJSON files...');

    // Split features by chamber
    const lowerFeatures = this.allFeatures.filter(f => f.properties.chamber === 'lower');
    const upperFeatures = this.allFeatures.filter(f => f.properties.chamber === 'upper');

    const lowerGeoJSON = {
      type: 'FeatureCollection',
      features: lowerFeatures
    };

    const upperGeoJSON = {
      type: 'FeatureCollection',
      features: upperFeatures
    };

    await fs.writeFile(
      path.join(CONFIG.tempDir, 'sldl.geojson'),
      JSON.stringify(lowerGeoJSON)
    );

    await fs.writeFile(
      path.join(CONFIG.tempDir, 'sldu.geojson'),
      JSON.stringify(upperGeoJSON)
    );

    console.log(`✅ Lower chamber: ${lowerFeatures.length} districts`);
    console.log(`✅ Upper chamber: ${upperFeatures.length} districts`);
  }

  async generatePMTiles() {
    console.log('\n🗺️  Generating PMTiles with Tippecanoe...');

    const sldlPath = path.join(CONFIG.tempDir, 'sldl.geojson');
    const slduPath = path.join(CONFIG.tempDir, 'sldu.geojson');
    const pmTilesPath = path.join(CONFIG.publicDir, CONFIG.outputPMTiles);

    try {
      await this.runCommand('tippecanoe', [
        '-o', pmTilesPath,
        '--force',
        '--maximum-zoom=12',
        '--minimum-zoom=0',
        '--base-zoom=6',
        '--drop-densest-as-needed',
        '--simplification=10',
        '--coalesce-densest-as-needed',
        '--extend-zooms-if-still-dropping',
        '--layer=sldl',
        '--layer=sldu',
        '--named-layer=sldl:' + sldlPath,
        '--named-layer=sldu:' + slduPath,
        '--name=State Legislative Districts 2025',
        '--attribution=U.S. Census Bureau'
      ]);

      // Check file size
      const stats = await fs.stat(pmTilesPath);
      const fileSizeMB = (stats.size / 1024 / 1024).toFixed(1);

      console.log(`✅ PMTiles generated: ${CONFIG.outputPMTiles} (${fileSizeMB}MB)`);

    } catch (error) {
      throw new Error(`PMTiles generation failed: ${error.message}`);
    }
  }

  async generateManifest() {
    console.log('\n📋 Generating metadata manifest...');

    const manifest = {
      version: '1.0',
      generated: new Date().toISOString(),
      source: 'U.S. Census Bureau TIGER/Line Shapefiles 2025',

      summary: {
        total_districts: this.processedDistricts.length,
        states: [...new Set(this.processedDistricts.map(d => d.state_code))].length,
        chambers: {
          lower: this.processedDistricts.filter(d => d.chamber === 'lower').length,
          upper: this.processedDistricts.filter(d => d.chamber === 'upper').length
        }
      },

      districts: {}
    };

    // Add each district's metadata
    for (const district of this.processedDistricts) {
      manifest.districts[district.id] = district;
    }

    const outputPath = path.join(CONFIG.dataDir, CONFIG.outputManifest);
    await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));

    console.log(`✅ Metadata saved: ${CONFIG.outputManifest}`);
    console.log(`📊 Total districts: ${this.processedDistricts.length}`);
  }

  printSummary() {
    console.log('\n📊 Processing Summary:');
    console.log('======================');
    console.log(`Downloaded: ${this.stats.downloaded} files`);
    console.log(`Processed: ${this.stats.processed} districts`);
    console.log(`Skipped: ${this.stats.skipped} (Nebraska lower chamber)`);

    if (this.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${this.errors.length}`);
      this.errors.forEach(err => {
        console.log(`   - ${err.state} (${err.fips}) ${err.chamber}: ${err.error}`);
      });
    }
  }

  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data;
      });

      proc.stderr.on('data', (data) => {
        stderr += data;
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  calculateBounds(geometry) {
    let minLon = Infinity, minLat = Infinity;
    let maxLon = -Infinity, maxLat = -Infinity;

    const processCoordinates = (coords) => {
      if (Array.isArray(coords[0])) {
        coords.forEach(processCoordinates);
      } else {
        const [lon, lat] = coords;
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    };

    if (geometry.type === 'Polygon') {
      geometry.coordinates.forEach(processCoordinates);
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(poly => poly.forEach(processCoordinates));
    }

    return [minLon, minLat, maxLon, maxLat];
  }

  calculateCentroid(geometry) {
    const bounds = this.calculateBounds(geometry);
    return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    states: null, // Array of state codes (e.g., ['CA', 'TX', 'NE'])
  };

  for (const arg of args) {
    if (arg.startsWith('--states=')) {
      const statesStr = arg.split('=')[1];
      options.states = statesStr.split(',').map(s => s.trim().toUpperCase());
    }
  }

  return options;
}

/**
 * Filter FIPS codes based on state codes
 */
function filterStateFips(stateCodes) {
  if (!stateCodes || stateCodes.length === 0) {
    return CONFIG.stateFips; // Return all states
  }

  // Map state codes to FIPS
  const codeToFips = {};
  for (const [fips, abbr] of Object.entries(CONFIG.stateAbbreviations)) {
    codeToFips[abbr] = fips;
  }

  // Convert state codes to FIPS
  const filteredFips = [];
  for (const stateCode of stateCodes) {
    const fips = codeToFips[stateCode];
    if (fips) {
      filteredFips.push(fips);
    } else {
      console.warn(`⚠️  Unknown state code: ${stateCode}`);
    }
  }

  return filteredFips;
}

// Run the processor if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();

  // Filter states if --states flag provided
  if (options.states) {
    const filteredFips = filterStateFips(options.states);
    console.log(`🔬 TEST MODE: Processing ${filteredFips.length} states: ${options.states.join(', ')}`);
    CONFIG.stateFips = filteredFips;
  }

  const processor = new StateDistrictProcessor();
  await processor.run();
}

export default StateDistrictProcessor;
