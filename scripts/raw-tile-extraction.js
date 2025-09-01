#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Raw Tile Extraction Script
 * Alternative approach: Extract tile data without parsing geometry type 3
 * Focus on getting tile metadata and raw coordinates
 */

const MBTiles = require('@mapbox/mbtiles');
const fs = require('fs').promises;
const path = require('path');

const MBTILES_PATH = path.join(
  __dirname,
  '..',
  'public',
  'maps',
  'congressional_districts_119_real.pmtiles'
);

class RawTileExtractor {
  constructor() {
    this.mbtiles = null;
    this.tilesWithData = [];
    this.rawTileData = new Map();
  }

  async initialize() {
    console.log('🚀 Raw Tile Extraction - Bypassing Geometry Type 3 Issues');
    console.log(`📁 MBTiles file: ${MBTILES_PATH}`);

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

  async extractAllRawTiles() {
    console.log('🔍 Extracting all tiles with data...');

    return new Promise((resolve, reject) => {
      this.mbtiles.getInfo((err, info) => {
        if (err) {
          reject(err);
          return;
        }

        console.log('📊 MBTiles Info:', {
          bounds: info.bounds,
          minzoom: info.minzoom,
          maxzoom: info.maxzoom,
          center: info.center,
        });

        // Focus on zoom levels where congressional districts are meaningful
        this.scanZoomLevels([0, 1, 2, 3, 4, 5], info.bounds, resolve);
      });
    });
  }

  async scanZoomLevels(zoomLevels, bounds, resolve) {
    console.log(`🗺️ Scanning zoom levels: [${zoomLevels.join(', ')}]`);

    for (const zoom of zoomLevels) {
      console.log(`\n📍 Scanning zoom level ${zoom}...`);
      await this.scanZoomLevel(zoom, bounds);
    }

    console.log(`\n✅ Scan complete: found ${this.tilesWithData.length} tiles with data`);
    await this.analyzeTileContents();
    resolve();
  }

  async scanZoomLevel(zoom, bounds) {
    const [minLon, minLat, maxLon, maxLat] = bounds;

    // Calculate reasonable tile bounds for this zoom level
    const minX = Math.max(0, Math.floor(this.lon2tile(minLon, zoom)));
    const maxX = Math.min(Math.pow(2, zoom) - 1, Math.floor(this.lon2tile(maxLon, zoom)));
    const minY = Math.max(0, Math.floor(this.lat2tile(maxLat, zoom)));
    const maxY = Math.min(Math.pow(2, zoom) - 1, Math.floor(this.lat2tile(minLat, zoom)));

    console.log(`   Tile range: X(${minX}-${maxX}), Y(${minY}-${maxY})`);

    let tilesFound = 0;
    let tilesChecked = 0;
    const maxTilesToCheck = 100; // Limit to prevent excessive scanning

    for (let x = minX; x <= maxX && tilesChecked < maxTilesToCheck; x++) {
      for (let y = minY; y <= maxY && tilesChecked < maxTilesToCheck; y++) {
        tilesChecked++;
        const hasData = await this.checkTile(zoom, x, y);
        if (hasData) {
          tilesFound++;
          console.log(`   ✅ Found data tile ${zoom}/${x}/${y}`);
        }
      }
    }

    console.log(`   Result: ${tilesFound}/${tilesChecked} tiles contain data`);
  }

  async checkTile(z, x, y) {
    return new Promise(resolve => {
      this.mbtiles.getTile(z, x, y, (err, data) => {
        if (err || !data) {
          resolve(false);
          return;
        }

        // Store tile info without trying to parse the problematic geometry
        const tileInfo = {
          z,
          x,
          y,
          size: data.length,
          coords: {
            bounds: this.tile2bounds(x, y, z),
          },
        };

        this.tilesWithData.push(tileInfo);
        this.rawTileData.set(`${z}/${x}/${y}`, data);

        resolve(true);
      });
    });
  }

  async analyzeTileContents() {
    console.log('\n🔍 Analyzing tile contents...');

    const outputDir = path.join(__dirname, '..', 'temp', 'raw-tiles');
    await fs.mkdir(outputDir, { recursive: true });

    // Save a few sample tiles for manual inspection
    const samplesToSave = this.tilesWithData.slice(0, 5);

    for (const tile of samplesToSave) {
      const tileKey = `${tile.z}/${tile.x}/${tile.y}`;
      const tileData = this.rawTileData.get(tileKey);

      if (tileData) {
        const filename = `tile_${tile.z}_${tile.x}_${tile.y}.pbf`;
        const filepath = path.join(outputDir, filename);
        await fs.writeFile(filepath, tileData);

        console.log(`💾 Saved sample tile: ${filename} (${tileData.length} bytes)`);
        console.log(`   Bounds: ${JSON.stringify(tile.coords.bounds)}`);
      }
    }

    // Generate summary
    const summary = {
      total_tiles: this.tilesWithData.length,
      zoom_distribution: {},
      total_size_bytes: 0,
      sample_tiles: samplesToSave.map(tile => ({
        coordinates: `${tile.z}/${tile.x}/${tile.y}`,
        bounds: tile.coords.bounds,
        size_bytes: tile.size,
      })),
    };

    // Calculate zoom distribution and total size
    for (const tile of this.tilesWithData) {
      summary.zoom_distribution[tile.z] = (summary.zoom_distribution[tile.z] || 0) + 1;
      summary.total_size_bytes += tile.size;
    }

    const summaryPath = path.join(outputDir, 'tile_summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

    console.log('\n📊 Tile Analysis Summary:');
    console.log(`   Total tiles with data: ${summary.total_tiles}`);
    console.log(`   Total data size: ${(summary.total_size_bytes / 1024).toFixed(1)} KB`);
    console.log(`   Zoom distribution:`, summary.zoom_distribution);
    console.log(`   Summary saved: ${summaryPath}`);
  }

  // Utility functions
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

  tile2bounds(x, y, z) {
    const n = Math.pow(2, z);
    const lon_deg = (x / n) * 360.0 - 180.0;
    const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
    const lat_deg = (lat_rad * 180.0) / Math.PI;

    const lon_deg_max = ((x + 1) / n) * 360.0 - 180.0;
    const lat_rad_min = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
    const lat_deg_min = (lat_rad_min * 180.0) / Math.PI;

    return [lon_deg, lat_deg_min, lon_deg_max, lat_deg];
  }

  async cleanup() {
    if (this.mbtiles) {
      this.mbtiles.close();
    }
  }
}

async function main() {
  const extractor = new RawTileExtractor();

  try {
    await extractor.initialize();
    await extractor.extractAllRawTiles();

    console.log('\n🎉 RAW EXTRACTION COMPLETE!');
    console.log('💡 Next steps:');
    console.log('   1. Examine saved .pbf files with external tools');
    console.log('   2. Try different vector tile parsers');
    console.log('   3. Consider direct SQLite database access');

    process.exit(0);
  } catch (error) {
    console.error('💥 Extraction failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await extractor.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = { RawTileExtractor };
