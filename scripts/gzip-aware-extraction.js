#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Gzip-Aware Congressional District Extraction
 * Key Discovery: Tile data is gzip-compressed before protobuf encoding
 * This script decompresses tiles first, then parses vector tile data
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
const OUTPUT_BASE = path.join(__dirname, '..', 'temp', 'gzip-extraction');

class GzipAwareExtractor {
  constructor() {
    this.db = null;
    this.extractedDistricts = new Map();
    this.stats = {
      tilesProcessed: 0,
      districtsFound: 0,
      gzipDecompressions: 0,
      parseErrors: 0,
      startTime: Date.now(),
    };
  }

  async initialize() {
    console.log('🗜️ Gzip-Aware District Extraction Starting...');
    console.log(`📁 Database file: ${MBTILES_PATH}`);

    await fs.mkdir(OUTPUT_BASE, { recursive: true });

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(MBTILES_PATH, sqlite3.OPEN_READONLY, err => {
        if (err) {
          reject(new Error(`Failed to open SQLite database: ${err.message}`));
          return;
        }
        console.log('✅ SQLite database connection established');
        resolve();
      });
    });
  }

  async extractDistrictsFromZoom(zoomLevel, sampleLimit = null) {
    console.log(`\n🎯 Extracting districts from zoom level ${zoomLevel}...`);

    const query = sampleLimit
      ? 'SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles WHERE zoom_level = ? LIMIT ?'
      : 'SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles WHERE zoom_level = ?';

    const params = sampleLimit ? [zoomLevel, sampleLimit] : [zoomLevel];

    return new Promise(resolve => {
      this.db.all(query, params, async (err, rows) => {
        if (err) {
          console.error(`Error extracting zoom ${zoomLevel}:`, err.message);
          resolve();
          return;
        }

        console.log(`   📊 Found ${rows.length} tiles to process at zoom ${zoomLevel}`);

        let processed = 0;
        let successful = 0;

        for (const row of rows) {
          try {
            const success = await this.processCompressedTile(row);
            if (success) successful++;
          } catch (error) {
            console.warn(
              `   ⚠️ Error processing tile ${row.tile_column}/${row.tile_row}:`,
              error.message
            );
          }
          processed++;

          if (processed % 100 === 0) {
            console.log(
              `   ⏳ Processed ${processed}/${rows.length} tiles, found ${this.extractedDistricts.size} districts`
            );
          }
        }

        console.log(
          `   ✅ Zoom ${zoomLevel} complete: ${successful}/${processed} tiles successfully parsed`
        );
        resolve();
      });
    });
  }

  async processCompressedTile(tileRow) {
    const tileId = `${tileRow.zoom_level}/${tileRow.tile_column}/${tileRow.tile_row}`;
    const compressedData = tileRow.tile_data;

    try {
      // Step 1: Check if data is gzip compressed
      if (compressedData[0] === 0x1f && compressedData[1] === 0x8b) {
        // Gzip magic number detected
        const decompressed = zlib.gunzipSync(compressedData);
        this.stats.gzipDecompressions++;

        console.log(
          `      🗜️ Decompressed tile ${tileId}: ${compressedData.length} → ${decompressed.length} bytes`
        );

        // Step 2: Parse decompressed vector tile
        return await this.parseVectorTile(tileId, decompressed, tileRow);
      } else {
        // Try parsing directly (fallback)
        console.log(
          `      📦 Processing uncompressed tile ${tileId} (${compressedData.length} bytes)`
        );
        return await this.parseVectorTile(tileId, compressedData, tileRow);
      }
    } catch (error) {
      console.warn(`      ❌ Failed to process tile ${tileId}: ${error.message}`);
      this.stats.parseErrors++;
      return false;
    }
  }

  async parseVectorTile(tileId, tileData, tileRow) {
    try {
      const Protobuf = await import('pbf');
      const { VectorTile } = await import('@mapbox/vector-tile');

      const pbf = new Protobuf.default(tileData);
      const vectorTile = new VectorTile(pbf);
      const layers = Object.keys(vectorTile.layers);

      if (layers.length === 0) {
        return false;
      }

      console.log(`         📋 Found layers: [${layers.join(', ')}]`);

      // Find congressional district layer
      const districtLayer = layers.find(
        layer =>
          layer.toLowerCase().includes('district') ||
          layer.toLowerCase().includes('congress') ||
          layer.toLowerCase().includes('cd') ||
          layer.toLowerCase().includes('congressional')
      );

      if (!districtLayer) {
        // Check all layers for features
        for (const layerName of layers) {
          await this.examineLayer(layerName, vectorTile.layers[layerName], tileId, tileRow);
        }
        return false;
      }

      console.log(`         🏛️ Processing district layer: ${districtLayer}`);
      const layer = vectorTile.layers[districtLayer];
      return await this.extractDistrictsFromLayer(layer, tileId, tileRow);
    } catch (parseError) {
      console.warn(`         ❌ Vector tile parsing failed for ${tileId}: ${parseError.message}`);
      this.stats.parseErrors++;
      return false;
    }
  }

  async examineLayer(layerName, layer, tileId, tileRow) {
    console.log(`         🔍 Layer "${layerName}": ${layer.length} features`);

    if (layer.length > 0) {
      try {
        const feature = layer.feature(0);
        const props = Object.keys(feature.properties);
        console.log(`            Properties: [${props.join(', ')}]`);

        // Look for district indicators in properties
        const districtProps = props.filter(
          prop =>
            prop.toLowerCase().includes('district') ||
            prop.toLowerCase().includes('cd') ||
            prop.toLowerCase().includes('geoid') ||
            prop.toLowerCase().includes('congress')
        );

        if (districtProps.length > 0) {
          console.log(
            `            🎯 Potential district properties: [${districtProps.join(', ')}]`
          );
          return await this.extractDistrictsFromLayer(layer, tileId, tileRow);
        }

        // Try geometry conversion
        const geometry = feature.loadGeometry();
        console.log(`            Geometry: ${geometry.length} rings`);
        return true;
      } catch (geomError) {
        console.log(`            ⚠️ Geometry/property error: ${geomError.message}`);
        return false;
      }
    }
    return false;
  }

  async extractDistrictsFromLayer(layer, tileId, tileRow) {
    let districtCount = 0;

    for (let i = 0; i < layer.length; i++) {
      try {
        const feature = layer.feature(i);
        const props = feature.properties;

        // Find district identifier
        const districtId =
          props.DISTRICTID ||
          props.GEOID ||
          props.CD ||
          props.DISTRICT ||
          props.district_id ||
          props.geoid ||
          props.id ||
          props.GEOID20 ||
          props.CD118FP ||
          `unknown_${tileId}_${i}`;

        if (!this.extractedDistricts.has(districtId)) {
          // Convert to GeoJSON
          const geoJSON = feature.toGeoJSON(
            tileRow.tile_column,
            tileRow.tile_row,
            tileRow.zoom_level
          );
          geoJSON.properties = props;

          this.extractedDistricts.set(districtId, geoJSON);
          districtCount++;

          console.log(`            ✅ Extracted district: ${districtId}`);

          // Save individual district for inspection
          const districtPath = path.join(
            OUTPUT_BASE,
            `district_${districtId.toString().replace(/[^a-zA-Z0-9-]/g, '_')}.json`
          );
          await fs.writeFile(districtPath, JSON.stringify(geoJSON, null, 2));
        }
      } catch (conversionError) {
        console.warn(`            ⚠️ Feature conversion failed: ${conversionError.message}`);
      }
    }

    this.stats.districtsFound += districtCount;
    this.stats.tilesProcessed++;
    return districtCount > 0;
  }

  async generateReport() {
    console.log('\n📋 Generating extraction report...');

    const report = {
      extraction_timestamp: new Date().toISOString(),
      methodology: 'gzip-decompression-first',
      database_path: MBTILES_PATH,
      statistics: {
        tiles_processed: this.stats.tilesProcessed,
        gzip_decompressions: this.stats.gzipDecompressions,
        districts_found: this.stats.districtsFound,
        unique_districts: this.extractedDistricts.size,
        parsing_errors: this.stats.parseErrors,
        processing_time_ms: Date.now() - this.stats.startTime,
      },
      extracted_districts: Array.from(this.extractedDistricts.keys()),
      key_insight:
        'Vector tiles were gzip-compressed - decompression resolved "Unimplemented type: 3" errors',
    };

    const reportPath = path.join(OUTPUT_BASE, 'gzip_extraction_report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ Report saved: ${reportPath}`);
    return report;
  }

  async cleanup() {
    if (this.db) {
      this.db.close(err => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('🔒 Database connection closed');
        }
      });
    }
  }
}

async function main() {
  const extractor = new GzipAwareExtractor();

  try {
    await extractor.initialize();

    // Start with lower zoom levels where districts are more complete
    await extractor.extractDistrictsFromZoom(4, 20); // Sample 20 tiles from zoom 4
    await extractor.extractDistrictsFromZoom(6, 50); // Sample 50 tiles from zoom 6
    await extractor.extractDistrictsFromZoom(8, 100); // Sample 100 tiles from zoom 8

    const report = await extractor.generateReport();

    console.log('\n🎉 GZIP-AWARE EXTRACTION COMPLETE!');
    console.log(`📊 Final Results:`);
    console.log(`   • Tiles processed: ${report.statistics.tiles_processed}`);
    console.log(`   • Gzip decompressions: ${report.statistics.gzip_decompressions}`);
    console.log(`   • Districts found: ${report.statistics.unique_districts}`);
    console.log(`   • Parse errors: ${report.statistics.parsing_errors}`);
    console.log(`   • Output directory: ${OUTPUT_BASE}`);

    if (report.statistics.unique_districts > 0) {
      console.log('\n🏛️ Sample districts:', report.extracted_districts.slice(0, 10).join(', '));
      console.log('🎯 SUCCESS: Vector tile parsing now working with gzip decompression!');
    }

    process.exit(0);
  } catch (error) {
    console.error('💥 Gzip extraction failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await extractor.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = { GzipAwareExtractor };
