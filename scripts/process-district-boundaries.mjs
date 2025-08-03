#!/usr/bin/env node

/**
 * Congressional District Boundary Processing Pipeline
 *
 * This script processes Census Bureau TIGER/Line shapefiles for the 119th Congress
 * and converts them to PMTiles format for efficient web serving.
 *
 * Data Source: Census Bureau TIGER/Line Shapefiles
 * - ftp://ftp2.census.gov/geo/tiger/TIGER2024/CD/tl_2024_*_cd119.zip
 *
 * Processing Steps:
 * 1. Download TIGER/Line shapefiles for all states
 * 2. Convert shapefiles to GeoJSON using ogr2ogr
 * 3. Process and simplify geometries
 * 4. Generate PMTiles using Tippecanoe
 * 5. Create district metadata and bounding boxes
 * 6. Generate label points for districts
 *
 * Requirements:
 * - Node.js 18+
 * - ogr2ogr (GDAL)
 * - tippecanoe
 * - wget or curl
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  dataDir: path.join(process.cwd(), 'data', 'districts'),
  tempDir: path.join(process.cwd(), 'temp', 'districts'),
  outputDir: path.join(process.cwd(), 'public', 'maps'),
  tigerBaseUrl: 'https://www2.census.gov/geo/tiger/TIGER2024/CD',
  maxConcurrent: 5,
  simplificationTolerance: 0.0001, // ~11m at equator
  pmtilesZoomRange: [0, 12],
};

// State FIPS codes for downloading TIGER data
const STATE_FIPS = [
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
];

class DistrictBoundaryProcessor {
  constructor() {
    this.districtData = new Map();
    this.processedCount = 0;
    this.errors = [];
  }

  async init() {
    console.log('🚀 Initializing Congressional District Boundary Processor');

    // Create directories
    await this.ensureDirectories();

    // Check dependencies
    await this.checkDependencies();

    console.log('✅ Initialization complete');
  }

  async ensureDirectories() {
    const dirs = [CONFIG.dataDir, CONFIG.tempDir, CONFIG.outputDir];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  async checkDependencies() {
    const dependencies = [
      { cmd: 'ogr2ogr --version', name: 'GDAL/OGR' },
      { cmd: 'tippecanoe --version', name: 'Tippecanoe' },
    ];

    for (const dep of dependencies) {
      try {
        await execAsync(dep.cmd);
        console.log(`✅ ${dep.name} is available`);
      } catch (error) {
        console.error(`❌ ${dep.name} is not installed or not in PATH`);
        console.error(`Install ${dep.name} to continue processing`);
        process.exit(1);
      }
    }
  }

  async downloadTigerData() {
    console.log('📥 Downloading TIGER/Line shapefiles...');

    const downloadPromises = STATE_FIPS.map(async fips => {
      const filename = `tl_2024_${fips}_cd119.zip`;
      const url = `${CONFIG.tigerBaseUrl}/${filename}`;
      const filepath = path.join(CONFIG.tempDir, filename);

      try {
        // Check if file already exists
        try {
          await fs.access(filepath);
          console.log(`⏭️  Skipping ${filename} (already exists)`);
          return;
        } catch {}

        console.log(`📥 Downloading ${filename}...`);
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            console.log(`⚠️  No congressional districts for state FIPS ${fips}`);
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = await response.buffer();
        await fs.writeFile(filepath, buffer);
        console.log(`✅ Downloaded ${filename}`);
      } catch (error) {
        console.error(`❌ Failed to download ${filename}:`, error.message);
        this.errors.push({ type: 'download', file: filename, error: error.message });
      }
    });

    // Process downloads with concurrency limit
    const chunks = [];
    for (let i = 0; i < downloadPromises.length; i += CONFIG.maxConcurrent) {
      chunks.push(downloadPromises.slice(i, i + CONFIG.maxConcurrent));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk);
    }

    console.log('📥 Download phase complete');
  }

  async extractAndConvertShapefiles() {
    console.log('🔧 Extracting and converting shapefiles to GeoJSON...');

    const zipFiles = await fs.readdir(CONFIG.tempDir);
    const tigerZips = zipFiles.filter(f => f.endsWith('_cd119.zip'));

    const allFeatures = [];

    for (const zipFile of tigerZips) {
      try {
        const fips = zipFile.match(/tl_2024_(\d+)_cd119\.zip/)[1];
        const extractDir = path.join(CONFIG.tempDir, `extracted_${fips}`);
        const zipPath = path.join(CONFIG.tempDir, zipFile);

        // Extract ZIP file
        await execAsync(`unzip -o "${zipPath}" -d "${extractDir}"`);

        // Find the shapefile
        const extractedFiles = await fs.readdir(extractDir);
        const shpFile = extractedFiles.find(f => f.endsWith('.shp'));

        if (!shpFile) {
          console.log(`⚠️  No shapefile found in ${zipFile}`);
          continue;
        }

        const shpPath = path.join(extractDir, shpFile);
        const geojsonPath = path.join(CONFIG.tempDir, `${fips}_districts.geojson`);

        // Convert to GeoJSON using ogr2ogr
        const ogrCommand = [
          'ogr2ogr',
          '-f',
          'GeoJSON',
          '-t_srs',
          'EPSG:4326',
          '-simplify',
          CONFIG.simplificationTolerance.toString(),
          `"${geojsonPath}"`,
          `"${shpPath}"`,
        ].join(' ');

        await execAsync(ogrCommand);

        // Read and process GeoJSON
        const geojsonData = JSON.parse(await fs.readFile(geojsonPath, 'utf8'));

        for (const feature of geojsonData.features) {
          // Extract district information
          const properties = feature.properties;
          const districtId = `${properties.STATEFP}-${properties.CD119}`;

          // Skip at-large districts coded as '00'
          if (properties.CD119 === '00') {
            properties.CD119 = '01'; // Convert at-large to district 01
          }

          // Enhance properties
          feature.properties = {
            ...properties,
            district_id: districtId,
            state_fips: properties.STATEFP,
            district_num: properties.CD119,
            name: `${this.getStateName(properties.STATEFP)}-${properties.CD119}`,
            full_name: `${this.getStateName(properties.STATEFP)} Congressional District ${parseInt(properties.CD119)}`,
            centroid: this.calculateCentroid(feature.geometry),
            bbox: this.calculateBoundingBox(feature.geometry),
          };

          allFeatures.push(feature);
          this.processedCount++;
        }

        // Clean up extracted files
        await execAsync(`rm -rf "${extractDir}"`);
        console.log(`✅ Processed ${fips} (${geojsonData.features.length} districts)`);
      } catch (error) {
        console.error(`❌ Failed to process ${zipFile}:`, error.message);
        this.errors.push({ type: 'conversion', file: zipFile, error: error.message });
      }
    }

    // Save combined GeoJSON
    const combinedGeojson = {
      type: 'FeatureCollection',
      features: allFeatures,
      metadata: {
        source: 'U.S. Census Bureau TIGER/Line Shapefiles',
        congress: '119th',
        year: '2024',
        processed_at: new Date().toISOString(),
        total_districts: allFeatures.length,
        processing_errors: this.errors.length,
      },
    };

    const combinedPath = path.join(CONFIG.dataDir, 'congressional_districts_119.geojson');
    await fs.writeFile(combinedPath, JSON.stringify(combinedGeojson, null, 2));

    console.log(`✅ Combined GeoJSON saved: ${allFeatures.length} districts processed`);
    return combinedPath;
  }

  async generatePMTiles(geojsonPath) {
    console.log('🗺️  Generating PMTiles with Tippecanoe...');

    const pmtilesPath = path.join(CONFIG.outputDir, 'congressional_districts_119.pmtiles');

    const tippecanoeCommand = [
      'tippecanoe',
      '-o',
      `"${pmtilesPath}"`,
      '--layer=districts',
      '--minimum-zoom=0',
      '--maximum-zoom=12',
      '--simplification=10',
      '--buffer=5',
      '--force',
      '--drop-densest-as-needed',
      '--extend-zooms-if-still-dropping',
      `"${geojsonPath}"`,
    ].join(' ');

    try {
      await execAsync(tippecanoeCommand);
      console.log(`✅ PMTiles generated: ${pmtilesPath}`);

      // Get file size
      const stats = await fs.stat(pmtilesPath);
      console.log(`📊 PMTiles size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      return pmtilesPath;
    } catch (error) {
      console.error('❌ Failed to generate PMTiles:', error.message);
      throw error;
    }
  }

  async generateDistrictMetadata() {
    console.log('📋 Generating district metadata...');

    const geojsonPath = path.join(CONFIG.dataDir, 'congressional_districts_119.geojson');
    const geojsonData = JSON.parse(await fs.readFile(geojsonPath, 'utf8'));

    const metadata = {
      districts: {},
      states: {},
      summary: {
        total_districts: 0,
        states_with_districts: 0,
        last_updated: new Date().toISOString(),
        source: 'U.S. Census Bureau TIGER/Line Shapefiles 2024',
      },
    };

    const stateDistrictCount = {};

    for (const feature of geojsonData.features) {
      const props = feature.properties;
      const districtId = props.district_id;
      const stateFips = props.state_fips;
      const stateName = this.getStateName(stateFips);

      // District metadata
      metadata.districts[districtId] = {
        id: districtId,
        state_fips: stateFips,
        state_name: stateName,
        state_abbr: this.getStateAbbr(stateFips),
        district_num: props.district_num,
        name: props.name,
        full_name: props.full_name,
        centroid: props.centroid,
        bbox: props.bbox,
        area_sqm: this.calculateArea(feature.geometry),
        geoid: props.GEOID,
      };

      // Count districts by state
      stateDistrictCount[stateFips] = (stateDistrictCount[stateFips] || 0) + 1;
    }

    // State metadata
    for (const [fips, count] of Object.entries(stateDistrictCount)) {
      metadata.states[fips] = {
        fips,
        name: this.getStateName(fips),
        abbr: this.getStateAbbr(fips),
        district_count: count,
        districts: Object.keys(metadata.districts)
          .filter(id => id.startsWith(`${fips}-`))
          .sort(),
      };
    }

    metadata.summary.total_districts = Object.keys(metadata.districts).length;
    metadata.summary.states_with_districts = Object.keys(metadata.states).length;

    // Save metadata
    const metadataPath = path.join(CONFIG.dataDir, 'district_metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(
      `✅ District metadata saved: ${metadata.summary.total_districts} districts, ${metadata.summary.states_with_districts} states`
    );
    return metadataPath;
  }

  // Utility methods

  calculateCentroid(geometry) {
    // Simple centroid calculation for polygons
    if (geometry.type === 'Polygon') {
      const coords = geometry.coordinates[0];
      let x = 0,
        y = 0;
      for (const [lng, lat] of coords) {
        x += lng;
        y += lat;
      }
      return [x / coords.length, y / coords.length];
    }
    return [0, 0];
  }

  calculateBoundingBox(geometry) {
    let minLng = Infinity,
      minLat = Infinity;
    let maxLng = -Infinity,
      maxLat = -Infinity;

    const processCoords = coords => {
      if (Array.isArray(coords[0])) {
        coords.forEach(processCoords);
      } else {
        const [lng, lat] = coords;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    };

    processCoords(geometry.coordinates);

    return [minLng, minLat, maxLng, maxLat];
  }

  calculateArea(geometry) {
    // Simplified area calculation (not precise for geographic coordinates)
    if (geometry.type === 'Polygon') {
      const coords = geometry.coordinates[0];
      let area = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
      }
      return Math.abs(area / 2);
    }
    return 0;
  }

  getStateName(fips) {
    const stateNames = {
      '01': 'Alabama',
      '02': 'Alaska',
      '04': 'Arizona',
      '05': 'Arkansas',
      '06': 'California',
      '08': 'Colorado',
      '09': 'Connecticut',
      10: 'Delaware',
      11: 'District of Columbia',
      12: 'Florida',
      13: 'Georgia',
      15: 'Hawaii',
      16: 'Idaho',
      17: 'Illinois',
      18: 'Indiana',
      19: 'Iowa',
      20: 'Kansas',
      21: 'Kentucky',
      22: 'Louisiana',
      23: 'Maine',
      24: 'Maryland',
      25: 'Massachusetts',
      26: 'Michigan',
      27: 'Minnesota',
      28: 'Mississippi',
      29: 'Missouri',
      30: 'Montana',
      31: 'Nebraska',
      32: 'Nevada',
      33: 'New Hampshire',
      34: 'New Jersey',
      35: 'New Mexico',
      36: 'New York',
      37: 'North Carolina',
      38: 'North Dakota',
      39: 'Ohio',
      40: 'Oklahoma',
      41: 'Oregon',
      42: 'Pennsylvania',
      44: 'Rhode Island',
      45: 'South Carolina',
      46: 'South Dakota',
      47: 'Tennessee',
      48: 'Texas',
      49: 'Utah',
      50: 'Vermont',
      51: 'Virginia',
      53: 'Washington',
      54: 'West Virginia',
      55: 'Wisconsin',
      56: 'Wyoming',
    };
    return stateNames[fips] || 'Unknown';
  }

  getStateAbbr(fips) {
    const stateAbbrs = {
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
    };
    return stateAbbrs[fips] || 'XX';
  }

  async generateReport() {
    console.log('\n📊 Processing Report');
    console.log('===================');
    console.log(`✅ Districts processed: ${this.processedCount}`);
    console.log(`❌ Errors encountered: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.log('\nErrors:');
      for (const error of this.errors) {
        console.log(`  - ${error.type}: ${error.file} - ${error.error}`);
      }
    }

    // Validate expected district count
    if (this.processedCount !== 435) {
      console.log(`⚠️  Warning: Expected 435 districts, but processed ${this.processedCount}`);
    } else {
      console.log('✅ All 435 congressional districts processed successfully');
    }
  }

  async run() {
    try {
      await this.init();
      await this.downloadTigerData();
      const geojsonPath = await this.extractAndConvertShapefiles();
      await this.generatePMTiles(geojsonPath);
      await this.generateDistrictMetadata();
      await this.generateReport();

      console.log('\n🎉 Congressional District Boundary Processing Complete!');
      console.log('\nGenerated files:');
      console.log(
        `  - PMTiles: ${path.join(CONFIG.outputDir, 'congressional_districts_119.pmtiles')}`
      );
      console.log(
        `  - GeoJSON: ${path.join(CONFIG.dataDir, 'congressional_districts_119.geojson')}`
      );
      console.log(`  - Metadata: ${path.join(CONFIG.dataDir, 'district_metadata.json')}`);
    } catch (error) {
      console.error('\n❌ Processing failed:', error);
      process.exit(1);
    }
  }
}

// Run the processor if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const processor = new DistrictBoundaryProcessor();
  await processor.run();
}

export default DistrictBoundaryProcessor;
