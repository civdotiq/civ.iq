#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * MBTiles Diagnostic Script
 * Quick analysis of what's actually in the congressional_districts_119_real.pmtiles file
 */

const MBTiles = require('@mapbox/mbtiles');
const path = require('path');

const MBTILES_PATH = path.join(
  __dirname,
  '..',
  'public',
  'maps',
  'congressional_districts_119_real.pmtiles'
);

async function diagnoseMBTiles() {
  console.log('🔍 MBTiles Diagnostic Analysis');
  console.log(`📁 File: ${MBTILES_PATH}`);

  return new Promise((resolve, reject) => {
    new MBTiles(MBTILES_PATH, (err, mbtiles) => {
      if (err) {
        reject(new Error(`Failed to open MBTiles: ${err.message}`));
        return;
      }

      // Get metadata
      mbtiles.getInfo((infoErr, info) => {
        if (infoErr) {
          reject(infoErr);
          return;
        }

        console.log('\n📊 MBTiles Metadata:');
        console.log(`   Name: ${info.name || 'N/A'}`);
        console.log(`   Description: ${info.description || 'N/A'}`);
        console.log(`   Format: ${info.format || 'N/A'}`);
        console.log(`   Bounds: ${JSON.stringify(info.bounds)}`);
        console.log(`   Center: ${JSON.stringify(info.center)}`);
        console.log(`   Min Zoom: ${info.minzoom}`);
        console.log(`   Max Zoom: ${info.maxzoom}`);

        // Sample a few tiles to see what layers exist
        sampleTiles(mbtiles, info, resolve);
      });
    });
  });
}

async function sampleTiles(mbtiles, info, resolve) {
  console.log('\n🔍 Sampling tiles to find layers...');

  const samplesToTry = [
    // Sample tiles across different areas and zoom levels
    { z: info.minzoom, x: 0, y: 0 },
    { z: info.minzoom + 1, x: 1, y: 1 },
    { z: Math.floor((info.minzoom + info.maxzoom) / 2), x: 128, y: 96 }, // Center US
    { z: Math.floor((info.minzoom + info.maxzoom) / 2), x: 64, y: 48 },
    { z: Math.floor((info.minzoom + info.maxzoom) / 2), x: 200, y: 120 },
  ];

  const foundLayers = new Set();
  let tilesWithData = 0;

  for (const { z, x, y } of samplesToTry) {
    try {
      await new Promise(sampleResolve => {
        mbtiles.getTile(z, x, y, async (err, data) => {
          if (err || !data) {
            console.log(`   No tile at ${z}/${x}/${y}`);
            sampleResolve();
            return;
          }

          tilesWithData++;
          console.log(`   ✅ Found tile at ${z}/${x}/${y} (${data.length} bytes)`);

          try {
            const Protobuf = await import('pbf');
            const { VectorTile } = await import('@mapbox/vector-tile');

            const pbf = new Protobuf.default(data);
            const vectorTile = new VectorTile(pbf);

            const layers = Object.keys(vectorTile.layers);
            console.log(`      Layers: [${layers.join(', ')}]`);

            layers.forEach(layerName => {
              foundLayers.add(layerName);
              const layer = vectorTile.layers[layerName];
              console.log(`      Layer "${layerName}": ${layer.length} features`);

              // Sample first feature properties
              if (layer.length > 0) {
                const feature = layer.feature(0);
                const props = Object.keys(feature.properties);
                console.log(`         Properties: [${props.join(', ')}]`);
                console.log(`         Sample data:`, feature.properties);
              }
            });
          } catch (parseError) {
            console.log(`      ⚠️ Could not parse tile: ${parseError.message}`);
          }

          sampleResolve();
        });
      });
    } catch (error) {
      console.log(`   Error sampling tile ${z}/${x}/${y}:`, error.message);
    }
  }

  console.log(`\n📋 Summary:`);
  console.log(`   Tiles with data: ${tilesWithData}/${samplesToTry.length}`);
  console.log(`   Unique layers found: [${Array.from(foundLayers).join(', ')}]`);

  // Check if any layers match congressional district patterns
  const districtLayers = Array.from(foundLayers).filter(
    layer =>
      layer.toLowerCase().includes('district') ||
      layer.toLowerCase().includes('congress') ||
      layer.toLowerCase().includes('cd') ||
      layer.toLowerCase().includes('congressional')
  );

  if (districtLayers.length > 0) {
    console.log(`   🏛️ Potential district layers: [${districtLayers.join(', ')}]`);
  } else {
    console.log(`   ⚠️ No obvious district layers found`);
    console.log(`   💡 All layers: [${Array.from(foundLayers).join(', ')}]`);
  }

  mbtiles.close();
  resolve();
}

// Run diagnostic
async function main() {
  try {
    await diagnoseMBTiles();
    console.log('\n✅ Diagnostic complete');
  } catch (error) {
    console.error('💥 Diagnostic failed:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main();
}

module.exports = { diagnoseMBTiles };
