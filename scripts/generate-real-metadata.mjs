#!/usr/bin/env node

/**
 * Generate Real District Metadata
 * 
 * Generates metadata from the processed real GeoJSON file
 */

import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  geoJsonPath: path.join(process.cwd(), 'data', 'districts', 'congressional_districts_119_real.geojson'),
  metadataPath: path.join(process.cwd(), 'data', 'districts', 'district_metadata_real.json'),
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
  stateAbbr: {
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
  }
};

class RealMetadataGenerator {
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

  async generateMetadata() {
    console.log('📋 Generating metadata from real Census GeoJSON...');
    
    // Read the real GeoJSON
    const geoJsonContent = await fs.readFile(CONFIG.geoJsonPath, 'utf8');
    const geoJson = JSON.parse(geoJsonContent);
    
    console.log(`📊 Processing ${geoJson.features.length} real congressional districts...`);
    
    const districts = {};
    const stateStats = {};
    
    for (const feature of geoJson.features) {
      const props = feature.properties;
      const stateFips = props.STATEFP || props.state_fips;
      const districtNum = props.CD119FP || props.district_num || '00';
      const districtId = props.id || `${stateFips}-${districtNum.padStart(2, '0')}`;
      
      // Calculate geographic properties
      const centroid = this.calculateCentroid(feature.geometry);
      const bbox = this.calculateBounds(feature.geometry);
      
      // Create district metadata
      districts[districtId] = {
        id: districtId,
        state_fips: stateFips,
        state_name: CONFIG.stateNames[stateFips] || 'Unknown',
        state_abbr: CONFIG.stateAbbr[stateFips] || stateFips,
        district_num: districtNum,
        name: `${CONFIG.stateAbbr[stateFips] || stateFips}-${districtNum}`,
        full_name: `${CONFIG.stateNames[stateFips] || 'Unknown'} Congressional District ${districtNum}`,
        centroid: centroid,
        bbox: bbox,
        area_sqm: props.ALAND || 0, // Real land area from Census
        geoid: props.GEOID || `${stateFips}${districtNum.padStart(2, '0')}`,
        // Additional Census properties
        namelsad: props.NAMELSAD,
        aland: props.ALAND,
        awater: props.AWATER,
        intptlat: props.INTPTLAT,
        intptlon: props.INTPTLON
      };
      
      // Track state statistics
      if (!stateStats[stateFips]) {
        stateStats[stateFips] = {
          fips: stateFips,
          name: CONFIG.stateNames[stateFips] || 'Unknown',
          abbr: CONFIG.stateAbbr[stateFips] || stateFips,
          district_count: 0,
          districts: []
        };
      }
      
      stateStats[stateFips].district_count++;
      stateStats[stateFips].districts.push(districtId);
    }
    
    // Create final metadata object
    const metadata = {
      districts: districts,
      states: stateStats,
      summary: {
        total_districts: Object.keys(districts).length,
        states_with_districts: Object.keys(stateStats).length,
        last_updated: new Date().toISOString(),
        source: 'U.S. Census Bureau TIGER/Line Shapefiles 2024 - 119th Congress - REAL DATA',
        data_files: {
          geojson: 'congressional_districts_119_real.geojson',
          pmtiles: 'congressional_districts_119_real.pmtiles'
        },
        processing_info: {
          total_features: geoJson.features.length,
          has_territories: Object.keys(stateStats).some(fips => ['60', '66', '69', '72', '78'].includes(fips))
        }
      }
    };
    
    // Save metadata
    await fs.writeFile(CONFIG.metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log(`✅ Real metadata generated: district_metadata_real.json`);
    console.log(`📊 Total districts: ${metadata.summary.total_districts}`);
    console.log(`🏛️  States/territories: ${metadata.summary.states_with_districts}`);
    console.log(`📁 Data files:`);
    console.log(`   - GeoJSON: congressional_districts_119_real.geojson`);
    console.log(`   - PMTiles: congressional_districts_119_real.pmtiles`);
    
    // Show sample districts
    console.log(`\n🎯 Sample districts (REAL Census data):`);
    const sampleDistricts = ['06-12', '36-14', '48-02', '17-05', '25-07'];
    for (const districtId of sampleDistricts) {
      if (districts[districtId]) {
        const d = districts[districtId];
        console.log(`   ✅ ${d.full_name} - ${d.centroid[1].toFixed(4)}, ${d.centroid[0].toFixed(4)}`);
      }
    }
    
    return metadata;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new RealMetadataGenerator();
  await generator.generateMetadata();
}

export default RealMetadataGenerator;