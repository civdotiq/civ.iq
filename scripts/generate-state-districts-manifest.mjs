#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

const sldlPath = 'temp/state-districts/sldl.geojson';
const slduPath = 'temp/state-districts/sldu.geojson';
const outputPath = 'public/data/state-districts-manifest.json';

console.log('📋 Generating state districts manifest...');

// Read GeoJSON files
const sldlData = JSON.parse(await fs.readFile(sldlPath, 'utf-8'));
const slduData = JSON.parse(await fs.readFile(slduPath, 'utf-8'));

// Combine features
const allFeatures = [...sldlData.features, ...slduData.features];

// Extract metadata
const districts = {};
const states = new Set();

for (const feature of allFeatures) {
  const props = feature.properties;
  districts[props.id] = {
    id: props.id,
    state_code: props.state_code,
    state_fips: props.state_fips,
    state_name: props.state_name,
    chamber: props.chamber,
    district_num: props.district_num,
    name: props.name,
    full_name: props.full_name,
    geoid: props.geoid
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
