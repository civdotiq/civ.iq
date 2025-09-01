#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Test Single District Extraction - CA-12 Focus Test
 * Validates the TMS coordinate conversion fix on a single district
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');

const MBTILES_PATH = path.join(
  __dirname,
  '..',
  'public',
  'maps',
  'congressional_districts_119_real.pmtiles'
);

class SingleDistrictTester {
  constructor() {
    this.db = null;
    this.targetDistrict = '0612'; // CA-12
    this.expectedLat = 37.7801271;
    this.expectedLon = -122.2408008;
  }

  async initialize() {
    console.log('🎯 Single District Extraction Test - CA-12');
    console.log(`📁 Database: ${MBTILES_PATH}`);

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(MBTILES_PATH, sqlite3.OPEN_READONLY, err => {
        if (err) {
          reject(new Error(`Failed to open database: ${err.message}`));
          return;
        }
        console.log('✅ Database connected');
        resolve();
      });
    });
  }

  async extractCA12WithFixedCoordinates() {
    console.log('\n🔍 Searching for CA-12 in vector tiles...');

    // Search multiple zoom levels for CA-12
    const zoomLevels = [8, 9, 10, 11];

    for (const zoom of zoomLevels) {
      console.log(`\n📊 Checking zoom level ${zoom}...`);

      const districts = await this.searchZoomLevel(zoom);
      if (districts.length > 0) {
        console.log(`✅ Found ${districts.length} CA-12 candidates at zoom ${zoom}`);

        for (let i = 0; i < districts.length; i++) {
          const district = districts[i];
          console.log(`\n🧪 Testing candidate ${i + 1}:`);
          console.log(`   Tile: ${district.tileInfo}`);

          const isValid = await this.validateDistrict(district.geoJSON);
          if (isValid) {
            console.log('🎉 FOUND VALID CA-12! Saving...');
            await this.saveTestDistrict(district.geoJSON);
            return district.geoJSON;
          }
        }
      }
    }

    console.log('❌ CA-12 not found with valid coordinates');
    return null;
  }

  async searchZoomLevel(zoomLevel) {
    return new Promise(resolve => {
      const query =
        'SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles WHERE zoom_level = ?';

      this.db.all(query, [zoomLevel], async (err, rows) => {
        if (err) {
          console.error(`Error at zoom ${zoomLevel}:`, err.message);
          resolve([]);
          return;
        }

        console.log(`   📊 Found ${rows.length} tiles to process at zoom ${zoomLevel}`);
        const candidates = [];
        let processed = 0;
        let foundAnyDistricts = 0;

        for (const row of rows) {
          try {
            const districts = await this.processCompressedTile(row);
            if (districts.length > 0) {
              candidates.push(...districts);
              foundAnyDistricts += districts.length;
            }
          } catch {
            // Skip failed tiles
          }
          processed++;

          if (processed % 200 === 0 || candidates.length > 0) {
            console.log(
              `   📈 ${processed}/${rows.length} tiles processed, ${foundAnyDistricts} districts found`
            );
            if (candidates.length > 0) {
              console.log(`   🎯 Found CA-12 candidates! Breaking search...`);
              break;
            }
          }
        }

        console.log(`   ✅ Zoom ${zoomLevel} complete: ${foundAnyDistricts} total districts found`);
        resolve(candidates);
      });
    });
  }

  async processCompressedTile(tileRow) {
    const compressedData = tileRow.tile_data;
    const candidates = [];

    try {
      // Gzip decompression
      let tileData;
      if (compressedData[0] === 0x1f && compressedData[1] === 0x8b) {
        tileData = zlib.gunzipSync(compressedData);
      } else {
        tileData = compressedData;
      }

      // Parse vector tile
      const Protobuf = await import('pbf');
      const { VectorTile } = await import('@mapbox/vector-tile');

      const pbf = new Protobuf.default(tileData);
      const vectorTile = new VectorTile(pbf);
      const layers = Object.keys(vectorTile.layers);

      if (layers.length === 0) return candidates;

      const districtLayer = vectorTile.layers['districts'] || vectorTile.layers[layers[0]];
      if (!districtLayer) return candidates;

      // Check each feature in the layer
      for (let i = 0; i < districtLayer.length; i++) {
        try {
          const feature = districtLayer.feature(i);
          const props = feature.properties;

          // Look for CA-12 specifically
          const districtId = this.extractDistrictId(props);

          // Debug: Log found districts for analysis
          if (districtId && districtId.includes('06')) {
            console.log(`   🔍 Found CA district: ${districtId} (target: ${this.targetDistrict})`);
          }

          if (districtId === this.targetDistrict) {
            // Apply TMS-to-XYZ conversion
            const zoomLevel = tileRow.zoom_level;
            const xyzY = Math.pow(2, zoomLevel) - 1 - tileRow.tile_row;

            const geoJSON = feature.toGeoJSON(tileRow.tile_column, xyzY, zoomLevel);
            geoJSON.properties = props;

            candidates.push({
              geoJSON,
              tileInfo: `(${tileRow.tile_column}, ${tileRow.tile_row} -> ${xyzY}, z${zoomLevel})`,
            });
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Skip failed tiles
    }

    return candidates;
  }

  extractDistrictId(props) {
    return (
      props.GEOID ||
      props.DISTRICTID ||
      props.CD ||
      props.DISTRICT ||
      props.district_id ||
      props.geoid ||
      props.GEOID20 ||
      props.CD118FP ||
      props.NAMELSAD ||
      props.id ||
      null
    );
  }

  async validateDistrict(geoJSON) {
    if (!geoJSON?.geometry?.coordinates) return false;

    const firstCoord = geoJSON.geometry.coordinates[0][0];
    const lat = firstCoord[1];
    const lon = firstCoord[0];

    console.log(`   📍 Coordinates: [${lon.toFixed(6)}, ${lat.toFixed(6)}]`);

    // Check if coordinates are in San Francisco area
    const latDiff = Math.abs(lat - this.expectedLat);
    const lonDiff = Math.abs(lon - this.expectedLon);

    console.log(`   📏 Distance from expected:`);
    console.log(`      Lat difference: ${latDiff.toFixed(4)}° (expect < 0.5°)`);
    console.log(`      Lon difference: ${lonDiff.toFixed(4)}° (expect < 0.5°)`);

    const isValid = latDiff < 0.5 && lonDiff < 0.5;
    console.log(`   ${isValid ? '✅ VALID' : '❌ INVALID'} SF coordinates`);

    return isValid;
  }

  async saveTestDistrict(geoJSON) {
    const outputPath = path.join(
      __dirname,
      '..',
      'public',
      'data',
      'districts',
      'full',
      '0612_fixed.json'
    );
    await fs.writeFile(outputPath, JSON.stringify(geoJSON, null, 2));
    console.log(`💾 Saved corrected CA-12 to: ${outputPath}`);
  }

  async cleanup() {
    if (this.db) {
      this.db.close(err => {
        if (err) {
          console.error('Database close error:', err.message);
        } else {
          console.log('🔒 Database closed');
        }
      });
    }
  }
}

async function main() {
  const tester = new SingleDistrictTester();

  try {
    await tester.initialize();
    const result = await tester.extractCA12WithFixedCoordinates();

    if (result) {
      console.log('\n🎉 SUCCESS! CA-12 extracted with correct coordinates');
      console.log('📍 TMS coordinate conversion fix is working!');
      process.exit(0);
    } else {
      console.log('\n❌ FAILED to find valid CA-12');
      console.log('🔧 May need to adjust search parameters or fix logic');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = { SingleDistrictTester };
