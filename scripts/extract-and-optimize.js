#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Congressional Districts Extraction & Optimization Pipeline
 * Phase 2: Extract all 435 districts from MBTiles and optimize with mapshaper
 *
 * This script runs in Node.js environment where @mapbox/mbtiles works perfectly
 * Bypasses all SQLite bundling issues by preprocessing at build time
 */

const MBTiles = require('@mapbox/mbtiles');
const mapshaper = require('mapshaper');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const MBTILES_PATH = path.join(
  __dirname,
  '..',
  'public',
  'maps',
  'congressional_districts_119_real.pmtiles'
);
const OUTPUT_BASE = path.join(__dirname, '..', 'public', 'data', 'districts');

class DistrictExtractor {
  constructor() {
    this.mbtiles = null;
    this.extractedDistricts = new Map();
    this.stats = {
      tilesProcessed: 0,
      districtsFound: 0,
      optimizationsCreated: 0,
      startTime: Date.now(),
    };
  }

  async initialize() {
    console.log('🚀 Congressional District Extraction Pipeline Starting...');
    console.log(`📁 MBTiles file: ${MBTILES_PATH}`);

    // Ensure output directories exist
    await this.createOutputDirectories();

    // Connect to MBTiles
    return new Promise((resolve, reject) => {
      new MBTiles(MBTILES_PATH, (err, mbtiles) => {
        if (err) {
          reject(new Error(`Failed to open MBTiles: ${err.message}`));
          return;
        }
        this.mbtiles = mbtiles;
        console.log('✅ MBTiles connection established');
        resolve();
      });
    });
  }

  async createOutputDirectories() {
    const dirs = ['full', 'standard', 'simple'];
    for (const dir of dirs) {
      const fullPath = path.join(OUTPUT_BASE, dir);
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`📂 Created directory: ${fullPath}`);
    }
  }

  async extractAllDistricts() {
    console.log('🔍 Scanning MBTiles for congressional districts...');

    return new Promise((resolve, reject) => {
      this.mbtiles.getInfo((err, info) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`📊 MBTiles Info:`, {
          name: info.name,
          description: info.description,
          minzoom: info.minzoom,
          maxzoom: info.maxzoom,
          bounds: info.bounds,
        });

        // Process tiles at zoom level 9 (good balance of detail vs. coverage)
        this.processTilesAtZoom(9, info.bounds, resolve, reject);
      });
    });
  }

  async processTilesAtZoom(zoom, bounds, resolve, reject) {
    console.log(`🗺️ Processing tiles at zoom level ${zoom}...`);

    // Calculate tile bounds for continental US
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const minX = Math.floor(this.lon2tile(minLon, zoom));
    const maxX = Math.floor(this.lon2tile(maxLon, zoom));
    const minY = Math.floor(this.lat2tile(maxLat, zoom)); // Note: lat2tile is inverted
    const maxY = Math.floor(this.lat2tile(minLat, zoom));

    console.log(`📍 Tile range: X(${minX}-${maxX}), Y(${minY}-${maxY})`);

    let tilesProcessed = 0;
    let tilesWithData = 0;
    const totalTiles = (maxX - minX + 1) * (maxY - minY + 1);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        try {
          const hasData = await this.processTile(zoom, x, y);
          if (hasData) tilesWithData++;
          tilesProcessed++;

          if (tilesProcessed % 100 === 0) {
            console.log(
              `⏳ Processed ${tilesProcessed}/${totalTiles} tiles, found ${this.extractedDistricts.size} districts`
            );
          }
        } catch (error) {
          // Skip tiles that don't exist - expected for sparse data
          tilesProcessed++;
        }
      }
    }

    console.log(
      `✅ Tile processing complete: ${tilesProcessed} tiles processed, ${tilesWithData} contained data`
    );
    console.log(`🏛️ Found ${this.extractedDistricts.size} congressional districts`);

    await this.optimizeAllDistricts();
    resolve();
  }

  async processTile(z, x, y) {
    return new Promise(resolve => {
      this.mbtiles.getTile(z, x, y, async (err, data) => {
        if (err || !data) {
          resolve(false);
          return;
        }

        try {
          const Protobuf = await import('pbf');
          const { VectorTile } = await import('@mapbox/vector-tile');
          const pbf = new Protobuf.default(data);
          const vectorTile = new VectorTile(pbf);
          const layers = Object.keys(vectorTile.layers);

          // Find congressional district layer
          const districtLayer = layers.find(
            layer =>
              layer.toLowerCase().includes('district') ||
              layer.toLowerCase().includes('congress') ||
              layer.toLowerCase().includes('cd') ||
              layer.toLowerCase().includes('congressional')
          );

          if (!districtLayer) {
            resolve(false);
            return;
          }

          const layer = vectorTile.layers[districtLayer];

          for (let i = 0; i < layer.length; i++) {
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
              props.id;

            if (districtId && !this.extractedDistricts.has(districtId)) {
              try {
                // Convert to GeoJSON
                const geoJSON = feature.toGeoJSON(x, y, z);
                geoJSON.properties = props;

                this.extractedDistricts.set(districtId, geoJSON);
                console.log(`📍 Found district ${districtId} in tile ${z}/${x}/${y}`);
              } catch (conversionError) {
                console.warn(
                  `⚠️ Could not convert district ${districtId} to GeoJSON:`,
                  conversionError.message
                );
              }
            }
          }

          this.stats.tilesProcessed++;
          resolve(true);
        } catch (parseError) {
          console.warn(`⚠️ Could not parse tile ${z}/${x}/${y}:`, parseError.message);
          resolve(false);
        }
      });
    });
  }

  async optimizeAllDistricts() {
    console.log(`🔧 Starting optimization for ${this.extractedDistricts.size} districts...`);

    let processed = 0;
    for (const [districtId, geoJSON] of this.extractedDistricts) {
      try {
        await this.optimizeDistrict(districtId, geoJSON);
        processed++;

        if (processed % 50 === 0) {
          console.log(`⚙️ Optimized ${processed}/${this.extractedDistricts.size} districts`);
        }
      } catch (error) {
        console.error(`❌ Failed to optimize district ${districtId}:`, error.message);
      }
    }

    console.log(`✅ Optimization complete: ${processed} districts processed`);
  }

  async optimizeDistrict(districtId, geoJSON) {
    const safeId = districtId.toString().replace(/[^a-zA-Z0-9-]/g, '_');

    // Full resolution (original)
    const fullPath = path.join(OUTPUT_BASE, 'full', `${safeId}.json`);
    await fs.writeFile(fullPath, JSON.stringify(geoJSON, null, 2));

    try {
      // Standard resolution (1% simplification - good for web viewing)
      const standardResult = await mapshaper.applyCommands(geoJSON, {
        '-simplify': '1%',
        '-o': 'format=geojson',
      });
      const standardPath = path.join(OUTPUT_BASE, 'standard', `${safeId}.json`);
      await fs.writeFile(standardPath, standardResult);

      // Simple resolution (0.1% simplification - for overview maps)
      const simpleResult = await mapshaper.applyCommands(geoJSON, {
        '-simplify': '0.1%',
        '-o': 'format=geojson',
      });
      const simplePath = path.join(OUTPUT_BASE, 'simple', `${safeId}.json`);
      await fs.writeFile(simplePath, simpleResult);

      this.stats.optimizationsCreated += 3; // full, standard, simple
    } catch (mapshaperError) {
      console.warn(`⚠️ Mapshaper optimization failed for ${districtId}, saving original only`);

      // Fallback: save original to all levels
      const standardPath = path.join(OUTPUT_BASE, 'standard', `${safeId}.json`);
      const simplePath = path.join(OUTPUT_BASE, 'simple', `${safeId}.json`);
      await fs.writeFile(standardPath, JSON.stringify(geoJSON, null, 2));
      await fs.writeFile(simplePath, JSON.stringify(geoJSON, null, 2));

      this.stats.optimizationsCreated += 3;
    }
  }

  async generateManifest() {
    console.log('📋 Generating district manifest...');

    const manifest = {
      generated: new Date().toISOString(),
      total_districts: this.extractedDistricts.size,
      extraction_stats: {
        ...this.stats,
        duration_ms: Date.now() - this.stats.startTime,
      },
      districts: Array.from(this.extractedDistricts.keys()).sort(),
      detail_levels: {
        full: 'Original resolution from MBTiles',
        standard: '1% simplified with mapshaper',
        simple: '0.1% simplified with mapshaper',
      },
    };

    const manifestPath = path.join(OUTPUT_BASE, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`✅ Manifest saved: ${manifest.total_districts} districts available`);
    return manifest;
  }

  async cleanup() {
    if (this.mbtiles) {
      this.mbtiles.close();
    }
  }

  // Utility functions for tile math
  lon2tile(lon, zoom) {
    return ((lon + 180) / 360) * Math.pow(2, zoom);
  }

  lat2tile(lat, zoom) {
    return (
      ((1 -
        Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
        2) *
      Math.pow(2, zoom)
    );
  }
}

// Main execution
async function main() {
  const extractor = new DistrictExtractor();

  try {
    await extractor.initialize();
    await extractor.extractAllDistricts();
    const manifest = await extractor.generateManifest();

    console.log('\n🎉 EXTRACTION COMPLETE!');
    console.log(`📊 Final Stats:`);
    console.log(`   • Districts extracted: ${manifest.total_districts}`);
    console.log(`   • Files created: ${extractor.stats.optimizationsCreated}`);
    console.log(
      `   • Processing time: ${(manifest.extraction_stats.duration_ms / 1000).toFixed(1)}s`
    );
    console.log(`   • Output directory: ${OUTPUT_BASE}`);

    process.exit(0);
  } catch (error) {
    console.error('💥 Extraction failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await extractor.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DistrictExtractor };
