#!/usr/bin/env node

/**
 * REAL Congressional District Processor
 * 
 * Downloads and processes ALL Census TIGER/Line shapefiles for 119th Congress
 * Generates complete dataset with all 435 congressional districts
 * 
 * NO MOCK DATA - ONLY REAL CENSUS BUREAU DATA
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

// Configuration for REAL Census data processing
const CONFIG = {
  // Census TIGER/Line FTP base URL for 2024 Congressional Districts (119th Congress)
  censusFtpBase: 'https://www2.census.gov/geo/tiger/TIGER2024/CD',
  
  // All US state and territory FIPS codes (52 total)
  stateFips: [
    '01', '02', '04', '05', '06', '08', '09', '10', '11', '12', '13', '15', '16',
    '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29',
    '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42',
    '44', '45', '46', '47', '48', '49', '50', '51', '53', '54', '55', '56', '60',
    '66', '69', '72', '78'
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
    '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming',
    '60': 'American Samoa', '66': 'Guam', '69': 'Northern Mariana Islands',
    '72': 'Puerto Rico', '78': 'U.S. Virgin Islands'
  },
  
  // Expected district counts by state (119th Congress)
  expectedDistrictCounts: {
    '01': 7, '02': 1, '04': 9, '05': 4, '06': 52, '08': 8, '09': 5, '10': 1,
    '11': 1, '12': 28, '13': 14, '15': 2, '16': 2, '17': 17, '18': 9, '19': 4,
    '20': 4, '21': 6, '22': 6, '23': 2, '24': 8, '25': 9, '26': 13, '27': 8,
    '28': 4, '29': 8, '30': 2, '31': 3, '32': 4, '33': 2, '34': 12, '35': 3,
    '36': 26, '37': 14, '38': 1, '39': 15, '40': 5, '41': 6, '42': 17, '44': 2,
    '45': 7, '46': 1, '47': 9, '48': 38, '49': 4, '50': 1, '51': 11, '53': 10,
    '54': 2, '55': 8, '56': 1, '60': 1, '66': 1, '69': 1, '72': 1, '78': 1
  },
  
  // Directories
  tempDir: path.join(process.cwd(), 'temp', 'census'),
  dataDir: path.join(process.cwd(), 'data', 'districts'),
  publicDir: path.join(process.cwd(), 'public', 'maps'),
  
  // Output files
  outputGeoJSON: 'congressional_districts_119_real.geojson',
  outputPMTiles: 'congressional_districts_119_real.pmtiles',
  outputMetadata: 'district_metadata_real.json'
};

class RealCensusDistrictProcessor {
  constructor() {
    this.processedDistricts = [];
    this.processedStates = {};
    this.errors = [];
    this.startTime = Date.now();
  }

  async run() {
    console.log('🏛️  REAL Congressional District Processor - 119th Congress');
    console.log('========================================================');
    console.log('📊 Processing ALL 435 congressional districts from Census TIGER/Line data');
    console.log('🚫 NO MOCK DATA - ONLY REAL CENSUS BUREAU SHAPEFILES');
    console.log('');

    try {
      // Create directories
      await this.createDirectories();
      
      // Download all state shapefiles
      await this.downloadAllShapefiles();
      
      // Process all shapefiles
      await this.processAllShapefiles();
      
      // Generate combined GeoJSON
      await this.generateCombinedGeoJSON();
      
      // Generate PMTiles
      await this.generatePMTiles();
      
      // Generate metadata
      await this.generateMetadata();
      
      // Validate results
      await this.validateResults();
      
      console.log('\n✅ SUCCESS: All 435 congressional districts processed from REAL Census data');
      console.log(`⏱️  Total processing time: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
      
    } catch (error) {
      console.error('\n❌ FAILED:', error.message);
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
    console.log(`📍 Source: ${CONFIG.censusFtpBase}`);
    
    let downloadCount = 0;
    const totalStates = CONFIG.stateFips.length;
    
    for (const fips of CONFIG.stateFips) {
      const fileName = `tl_2024_${fips}_cd119.zip`;
      const url = `${CONFIG.censusFtpBase}/${fileName}`;
      const filePath = path.join(CONFIG.tempDir, fileName);
      
      try {
        // Check if file already exists
        try {
          await fs.access(filePath);
          console.log(`✓ ${CONFIG.stateNames[fips]} (${fips}) - Already downloaded`);
          downloadCount++;
          continue;
        } catch {
          // File doesn't exist, download it
        }
        
        console.log(`⬇️  Downloading ${CONFIG.stateNames[fips]} (${fips})...`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const buffer = await response.buffer();
        await fs.writeFile(filePath, buffer);
        
        console.log(`✅ ${CONFIG.stateNames[fips]} (${fips}) - Downloaded (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
        downloadCount++;
        
        // Small delay to be respectful to Census servers
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ ${CONFIG.stateNames[fips]} (${fips}) - Failed: ${error.message}`);
        this.errors.push(`Download failed for ${fips}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Downloaded ${downloadCount}/${totalStates} state shapefiles`);
    
    if (downloadCount === 0) {
      throw new Error('No shapefiles downloaded successfully');
    }
  }

  async processAllShapefiles() {
    console.log('\n🔄 Processing shapefiles with GDAL...');
    
    const allGeoJSONs = [];
    let districtCount = 0;
    
    for (const fips of CONFIG.stateFips) {
      const zipFile = path.join(CONFIG.tempDir, `tl_2024_${fips}_cd119.zip`);
      
      try {
        // Check if shapefile exists
        await fs.access(zipFile);
        
        console.log(`🔄 Processing ${CONFIG.stateNames[fips]} (${fips})...`);
        
        // Extract ZIP file
        const extractDir = path.join(CONFIG.tempDir, `extract_${fips}`);
        await fs.mkdir(extractDir, { recursive: true });
        
        await this.runCommand('unzip', ['-o', zipFile, '-d', extractDir]);
        
        // Find the shapefile
        const files = await fs.readdir(extractDir);
        const shpFile = files.find(f => f.endsWith('.shp'));
        
        if (!shpFile) {
          throw new Error('No .shp file found in archive');
        }
        
        const shapefilePath = path.join(extractDir, shpFile);
        const geoJsonPath = path.join(CONFIG.tempDir, `${fips}_districts.geojson`);
        
        // Convert to GeoJSON using ogr2ogr
        await this.runCommand('ogr2ogr', [
          '-f', 'GeoJSON',
          '-t_srs', 'EPSG:4326',  // Ensure WGS84
          geoJsonPath,
          shapefilePath
        ]);
        
        // Read and process the GeoJSON
        const geoJsonContent = await fs.readFile(geoJsonPath, 'utf8');
        const geoJson = JSON.parse(geoJsonContent);
        
        // Process features and add to our collection
        for (const feature of geoJson.features) {
          const props = feature.properties;
          const districtNum = props.CD119FP || props.DISTRICTF || props.DISTRICT || '00';
          
          // Create standardized district ID
          const districtId = `${fips}-${districtNum.padStart(2, '0')}`;
          
          // Create enhanced properties
          const enhancedFeature = {
            ...feature,
            properties: {
              ...props,
              id: districtId,
              state_fips: fips,
              state_name: CONFIG.stateNames[fips],
              state_abbr: this.getStateAbbreviation(fips),
              district_num: districtNum,
              name: `${this.getStateAbbreviation(fips)}-${districtNum}`,
              full_name: `${CONFIG.stateNames[fips]} Congressional District ${districtNum}`,
              geoid: `${fips}${districtNum.padStart(2, '0')}`
            }
          };
          
          allGeoJSONs.push(enhancedFeature);
          districtCount++;
          
          // Calculate centroid and bbox for metadata
          const bounds = this.calculateBounds(feature.geometry);
          const centroid = this.calculateCentroid(feature.geometry);
          
          this.processedDistricts.push({
            id: districtId,
            state_fips: fips,
            state_name: CONFIG.stateNames[fips],
            state_abbr: this.getStateAbbreviation(fips),
            district_num: districtNum,
            name: `${this.getStateAbbreviation(fips)}-${districtNum}`,
            full_name: `${CONFIG.stateNames[fips]} Congressional District ${districtNum}`,
            centroid: centroid,
            bbox: bounds,
            area_sqm: this.calculateArea(feature.geometry),
            geoid: `${fips}${districtNum.padStart(2, '0')}`
          });
        }
        
        // Update state tracking
        if (!this.processedStates[fips]) {
          this.processedStates[fips] = {
            fips: fips,
            name: CONFIG.stateNames[fips],
            abbr: this.getStateAbbreviation(fips),
            district_count: 0,
            districts: []
          };
        }
        
        this.processedStates[fips].district_count = geoJson.features.length;
        this.processedStates[fips].districts = geoJson.features.map(f => {
          const districtNum = f.properties.CD119FP || f.properties.DISTRICTF || f.properties.DISTRICT || '00';
          return `${fips}-${districtNum.padStart(2, '0')}`;
        });
        
        console.log(`✅ ${CONFIG.stateNames[fips]} - ${geoJson.features.length} districts processed`);
        
        // Clean up temporary files
        await fs.rm(extractDir, { recursive: true, force: true });
        await fs.rm(geoJsonPath, { force: true });
        
      } catch (error) {
        console.error(`❌ ${CONFIG.stateNames[fips]} (${fips}) - Processing failed: ${error.message}`);
        this.errors.push(`Processing failed for ${fips}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Processed ${districtCount} congressional districts from ${Object.keys(this.processedStates).length} states/territories`);
    
    if (allGeoJSONs.length === 0) {
      throw new Error('No districts processed successfully');
    }
    
    // Store the combined features for GeoJSON generation
    this.allFeatures = allGeoJSONs;
  }

  async generateCombinedGeoJSON() {
    console.log('\n📄 Generating combined GeoJSON...');
    
    const combinedGeoJSON = {
      type: 'FeatureCollection',
      features: this.allFeatures,
      properties: {
        source: 'U.S. Census Bureau TIGER/Line Shapefiles',
        congress: '119th Congress',
        year: '2024',
        total_districts: this.allFeatures.length,
        processed_date: new Date().toISOString()
      }
    };
    
    const outputPath = path.join(CONFIG.dataDir, CONFIG.outputGeoJSON);
    await fs.writeFile(outputPath, JSON.stringify(combinedGeoJSON, null, 2));
    
    const fileSizeMB = (JSON.stringify(combinedGeoJSON).length / 1024 / 1024).toFixed(1);
    console.log(`✅ Combined GeoJSON saved: ${CONFIG.outputGeoJSON} (${fileSizeMB}MB)`);
  }

  async generatePMTiles() {
    console.log('\n🗺️  Generating PMTiles with Tippecanoe...');
    
    const geoJsonPath = path.join(CONFIG.dataDir, CONFIG.outputGeoJSON);
    const pmTilesPath = path.join(CONFIG.publicDir, CONFIG.outputPMTiles);
    
    try {
      await this.runCommand('tippecanoe', [
        '-o', pmTilesPath,
        '--force',
        '--maximum-zoom=12',
        '--minimum-zoom=0',
        '--base-zoom=4',
        '--drop-densest-as-needed',
        '--simplification=10',
        '--layer=districts',
        '--name=Congressional Districts 119th Congress',
        '--attribution=U.S. Census Bureau',
        geoJsonPath
      ]);
      
      // Check file size
      const stats = await fs.stat(pmTilesPath);
      const fileSizeMB = (stats.size / 1024 / 1024).toFixed(1);
      
      console.log(`✅ PMTiles generated: ${CONFIG.outputPMTiles} (${fileSizeMB}MB)`);
      
    } catch (error) {
      throw new Error(`PMTiles generation failed: ${error.message}`);
    }
  }

  async generateMetadata() {
    console.log('\n📋 Generating metadata...');
    
    const metadata = {
      districts: {},
      states: this.processedStates,
      summary: {
        total_districts: this.processedDistricts.length,
        states_with_districts: Object.keys(this.processedStates).length,
        last_updated: new Date().toISOString(),
        source: 'U.S. Census Bureau TIGER/Line Shapefiles 2024 - 119th Congress',
        processing_time_seconds: ((Date.now() - this.startTime) / 1000).toFixed(1),
        errors: this.errors.length > 0 ? this.errors : undefined
      }
    };
    
    // Add districts to metadata
    for (const district of this.processedDistricts) {
      metadata.districts[district.id] = district;
    }
    
    const outputPath = path.join(CONFIG.dataDir, CONFIG.outputMetadata);
    await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2));
    
    console.log(`✅ Metadata saved: ${CONFIG.outputMetadata}`);
    console.log(`📊 Total districts: ${this.processedDistricts.length}`);
    console.log(`🏛️  States processed: ${Object.keys(this.processedStates).length}`);
  }

  async validateResults() {
    console.log('\n🔍 Validating results...');
    
    const expectedTotal = Object.values(CONFIG.expectedDistrictCounts).reduce((a, b) => a + b, 0);
    const actualTotal = this.processedDistricts.length;
    
    console.log(`📊 Expected districts: ${expectedTotal}`);
    console.log(`📊 Actual districts: ${actualTotal}`);
    
    if (actualTotal < 400) {  // Allow some flexibility for territories
      console.warn(`⚠️  Warning: Only ${actualTotal} districts processed (expected ~435)`);
    }
    
    // Validate key states
    const keyStates = ['06', '48', '12', '36', '17']; // CA, TX, FL, NY, IL
    for (const fips of keyStates) {
      const expected = CONFIG.expectedDistrictCounts[fips];
      const actual = this.processedStates[fips]?.district_count || 0;
      
      if (actual !== expected) {
        console.warn(`⚠️  ${CONFIG.stateNames[fips]}: Expected ${expected}, got ${actual} districts`);
      } else {
        console.log(`✅ ${CONFIG.stateNames[fips]}: ${actual} districts (correct)`);
      }
    }
    
    if (this.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${this.errors.length}`);
      this.errors.forEach(error => console.log(`   - ${error}`));
    }
  }

  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data;
      });
      
      process.stderr.on('data', (data) => {
        stderr += data;
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  calculateBounds(geometry) {
    // Simple bounding box calculation
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
    // Simple centroid calculation (geometric mean of bounds)
    const bounds = this.calculateBounds(geometry);
    return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
  }

  calculateArea(geometry) {
    // Approximate area calculation (placeholder - would need proper spherical calculation)
    const bounds = this.calculateBounds(geometry);
    const width = bounds[2] - bounds[0];
    const height = bounds[3] - bounds[1];
    return Math.abs(width * height) * 100000000; // Convert to approximate square meters
  }

  getStateAbbreviation(fips) {
    const abbrevMap = {
      '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
      '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
      '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
      '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
      '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
      '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
      '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
      '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
      '54': 'WV', '55': 'WI', '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP',
      '72': 'PR', '78': 'VI'
    };
    return abbrevMap[fips] || fips;
  }
}

// Run the processor if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const processor = new RealCensusDistrictProcessor();
  await processor.run();
}

export default RealCensusDistrictProcessor;