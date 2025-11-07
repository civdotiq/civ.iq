#!/usr/bin/env node

import fs from 'fs/promises';

const sldlPath = 'temp/state-districts/sldl.geojson';
const slduPath = 'temp/state-districts/sldu.geojson';
const outputPath = 'public/data/state-districts/state-districts-manifest.json';

console.log('📋 Generating state districts manifest with centroid/bbox...');

// Read GeoJSON files
const sldlData = JSON.parse(await fs.readFile(sldlPath, 'utf-8'));
const slduData = JSON.parse(await fs.readFile(slduPath, 'utf-8'));

// Combine features
const allFeatures = [...sldlData.features, ...slduData.features];

// Calculate centroid from coordinates
function calculateCentroid(geometry) {
  const coords = [];
  
  function extractCoords(geom) {
    if (geom.type === 'Polygon') {
      geom.coordinates[0].forEach(c => coords.push(c));
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach(poly => {
        poly[0].forEach(c => coords.push(c));
      });
    }
  }
  
  extractCoords(geometry);
  
  const sumLon = coords.reduce((sum, c) => sum + c[0], 0);
  const sumLat = coords.reduce((sum, c) => sum + c[1], 0);
  
  return [sumLon / coords.length, sumLat / coords.length];
}

// Calculate bounding box
function calculateBbox(geometry) {
  let minLon = Infinity, minLat = Infinity;
  let maxLon = -Infinity, maxLat = -Infinity;
  
  function processCoords(coords) {
    coords.forEach(c => {
      const [lon, lat] = Array.isArray(c[0]) ? c.flat(10).filter(v => typeof v === 'number') : c;
      if (typeof lon === 'number' && typeof lat === 'number') {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
      }
    });
  }
  
  if (geometry.type === 'Polygon') {
    processCoords(geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(poly => processCoords(poly[0]));
  }
  
  return [minLon, minLat, maxLon, maxLat];
}

// Extract metadata with centroid and bbox
const districts = {};
const states = new Set();

for (const feature of allFeatures) {
  const props = feature.properties;
  const centroid = calculateCentroid(feature.geometry);
  const bbox = calculateBbox(feature.geometry);
  
  districts[props.id] = {
    id: props.id,
    state_code: props.state_code,
    state_fips: props.state_fips,
    state_name: props.state_name,
    chamber: props.chamber,
    district_num: props.district_num,
    name: props.name,
    full_name: props.full_name,
    geoid: props.geoid,
    centroid: centroid,
    bbox: bbox
  };
  states.add(props.state_code);
}

const manifest = {
  version: '1.0',
  generated: new Date().toISOString(),
  source: 'U.S. Census Bureau TIGER/Line Shapefiles 2025',
  summary: {
    total_districts: allFeatures.length,
    states: states.size,
    chambers: {
      lower: sldlData.features.length,
      upper: slduData.features.length
    }
  },
  districts
};

await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));

console.log(`✅ Manifest generated: ${outputPath}`);
console.log(`📊 Total districts: ${allFeatures.length}`);
console.log(`📍 States covered: ${states.size}`);
console.log(`   Lower: ${sldlData.features.length}`);
console.log(`   Upper: ${slduData.features.length}`);
console.log(`✅ Includes centroid and bbox for each district`);
