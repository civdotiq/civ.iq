#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Direct SQLite MBTiles District Extraction
 * Bypasses vector tile parsing by accessing SQLite database directly
 * Extracts raw tile data and attempts alternative parsing approaches
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

const MBTILES_PATH = path.join(
  __dirname,
  '..',
  'public',
  'maps',
  'congressional_districts_119_real.pmtiles'
);
const OUTPUT_BASE = path.join(__dirname, '..', 'temp', 'sqlite-extraction');

class DirectSQLiteExtractor {
  constructor() {
    this.db = null;
    this.stats = {
      totalTiles: 0,
      tilesWithData: 0,
      layersFound: new Set(),
      parseErrors: 0,
      startTime: Date.now(),
    };
  }

  async initialize() {
    console.log('🗃️ Direct SQLite MBTiles Extraction Starting...');
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

  async analyzeDatabase() {
    console.log('\n📊 Analyzing database structure...');

    // Get database schema
    await this.showTables();
    await this.showMetadata();
    await this.analyzeTileTable();
  }

  async showTables() {
    return new Promise(resolve => {
      this.db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) {
          console.error('Error getting tables:', err.message);
          resolve();
          return;
        }
        console.log('📋 Database tables:', rows.map(row => row.name).join(', '));
        resolve();
      });
    });
  }

  async showMetadata() {
    return new Promise(resolve => {
      this.db.all('SELECT name, value FROM metadata', (err, rows) => {
        if (err) {
          console.error('Error getting metadata:', err.message);
          resolve();
          return;
        }
        console.log('\n📝 Database metadata:');
        rows.forEach(row => {
          console.log(`   ${row.name}: ${row.value}`);
        });
        resolve();
      });
    });
  }

  async analyzeTileTable() {
    console.log('\n🔍 Analyzing tiles table...');

    // Get tile count by zoom level
    return new Promise(resolve => {
      this.db.all(
        `
        SELECT zoom_level, COUNT(*) as tile_count, 
               MIN(tile_column) as min_x, MAX(tile_column) as max_x,
               MIN(tile_row) as min_y, MAX(tile_row) as max_y,
               AVG(LENGTH(tile_data)) as avg_size
        FROM tiles 
        GROUP BY zoom_level 
        ORDER BY zoom_level
      `,
        (err, rows) => {
          if (err) {
            console.error('Error analyzing tiles:', err.message);
            resolve();
            return;
          }

          console.log('📊 Tile distribution:');
          rows.forEach(row => {
            console.log(
              `   Zoom ${row.zoom_level}: ${row.tile_count} tiles, ` +
                `X(${row.min_x}-${row.max_x}), Y(${row.min_y}-${row.max_y}), ` +
                `avg ${Math.round(row.avg_size)} bytes`
            );
          });

          this.stats.totalTiles = rows.reduce((sum, row) => sum + row.tile_count, 0);
          resolve();
        }
      );
    });
  }

  async extractSampleTiles() {
    console.log('\n📦 Extracting sample tiles for analysis...');

    // Get a representative sample of tiles from different zoom levels
    const sampleQueries = [
      { zoom: 0, limit: 1, description: 'World view' },
      { zoom: 4, limit: 5, description: 'Country level' },
      { zoom: 9, limit: 10, description: 'State/district level' },
    ];

    for (const { zoom, limit, description } of sampleQueries) {
      console.log(`\n🎯 Sampling zoom level ${zoom} (${description})...`);
      await this.extractTilesAtZoom(zoom, limit);
    }
  }

  async extractTilesAtZoom(zoom, limit) {
    return new Promise(resolve => {
      this.db.all(
        `
        SELECT zoom_level, tile_column, tile_row, tile_data
        FROM tiles 
        WHERE zoom_level = ?
        LIMIT ?
      `,
        [zoom, limit],
        async (err, rows) => {
          if (err) {
            console.error(`Error extracting zoom ${zoom}:`, err.message);
            resolve();
            return;
          }

          console.log(`   Found ${rows.length} tiles at zoom ${zoom}`);

          for (const row of rows) {
            const tileId = `${row.zoom_level}_${row.tile_column}_${row.tile_row}`;
            const tileData = row.tile_data;

            console.log(`   Processing tile ${tileId} (${tileData.length} bytes)`);

            // Save raw tile data
            const rawPath = path.join(OUTPUT_BASE, `tile_${tileId}.pbf`);
            await fs.writeFile(rawPath, tileData);

            // Attempt to parse with multiple methods
            await this.attemptTileParsing(tileId, tileData, row);
          }

          resolve();
        }
      );
    });
  }

  async attemptTileParsing(tileId, tileData, tileInfo) {
    const results = {
      tileId,
      size: tileData.length,
      zoom: tileInfo.zoom_level,
      x: tileInfo.tile_column,
      y: tileInfo.tile_row,
      parsing_attempts: [],
    };

    // Method 1: Try @mapbox/vector-tile (original)
    try {
      const Protobuf = await import('pbf');
      const { VectorTile } = await import('@mapbox/vector-tile');

      const pbf = new Protobuf.default(tileData);
      const vectorTile = new VectorTile(pbf);
      const layers = Object.keys(vectorTile.layers);

      console.log(`      ✅ @mapbox/vector-tile: Found layers [${layers.join(', ')}]`);

      layers.forEach(layerName => {
        this.stats.layersFound.add(layerName);
        const layer = vectorTile.layers[layerName];
        console.log(`         Layer "${layerName}": ${layer.length} features`);

        // Try to parse first feature
        if (layer.length > 0) {
          try {
            const feature = layer.feature(0);
            const props = Object.keys(feature.properties);
            console.log(`            Properties: [${props.join(', ')}]`);

            // Try geometry conversion
            const geometry = feature.loadGeometry();
            console.log(`            Geometry: ${geometry.length} rings, type unknown`);
          } catch (geomError) {
            console.log(`            ⚠️ Geometry error: ${geomError.message}`);
            this.stats.parseErrors++;
          }
        }
      });

      results.parsing_attempts.push({
        method: '@mapbox/vector-tile',
        success: true,
        layers: layers,
        error: null,
      });
    } catch (error) {
      console.log(`      ❌ @mapbox/vector-tile failed: ${error.message}`);
      results.parsing_attempts.push({
        method: '@mapbox/vector-tile',
        success: false,
        error: error.message,
      });
    }

    // Method 2: Raw PBF inspection
    try {
      const Protobuf = await import('pbf');
      const pbf = new Protobuf.default(tileData);

      // Try to read raw protobuf structure
      console.log(
        `      🔍 Raw PBF: ${tileData.length} bytes, buffer starts with [${Array.from(tileData.slice(0, 8)).join(', ')}]`
      );

      results.parsing_attempts.push({
        method: 'raw-pbf-inspection',
        success: true,
        raw_data_preview: Array.from(tileData.slice(0, 16)),
        error: null,
      });
    } catch (error) {
      console.log(`      ❌ Raw PBF inspection failed: ${error.message}`);
      results.parsing_attempts.push({
        method: 'raw-pbf-inspection',
        success: false,
        error: error.message,
      });
    }

    // Save parsing results
    const resultsPath = path.join(OUTPUT_BASE, `parsing_${tileId}.json`);
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  }

  async generateReport() {
    console.log('\n📋 Generating extraction report...');

    const report = {
      extraction_timestamp: new Date().toISOString(),
      database_path: MBTILES_PATH,
      statistics: {
        total_tiles_in_db: this.stats.totalTiles,
        tiles_analyzed: this.stats.tilesWithData,
        unique_layers_found: Array.from(this.stats.layersFound),
        parsing_errors: this.stats.parseErrors,
        processing_time_ms: Date.now() - this.stats.startTime,
      },
      findings: {
        database_accessible: true,
        vector_tile_format: true,
        geometry_parsing_issues: this.stats.parseErrors > 0,
        recommended_next_steps: [
          'Examine saved .pbf files with external tools',
          'Try alternative vector tile parsers',
          'Consider geometry type 3 polygon parsing solutions',
          'Investigate direct protobuf parsing without high-level libraries',
        ],
      },
    };

    const reportPath = path.join(OUTPUT_BASE, 'sqlite_extraction_report.json');
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
  const extractor = new DirectSQLiteExtractor();

  try {
    await extractor.initialize();
    await extractor.analyzeDatabase();
    await extractor.extractSampleTiles();
    const report = await extractor.generateReport();

    console.log('\n🎉 SQLITE EXTRACTION COMPLETE!');
    console.log(`📊 Summary:`);
    console.log(`   • Total tiles in DB: ${report.statistics.total_tiles_in_db}`);
    console.log(`   • Layers found: [${report.statistics.unique_layers_found.join(', ')}]`);
    console.log(`   • Parsing errors: ${report.statistics.parsing_errors}`);
    console.log(`   • Output directory: ${OUTPUT_BASE}`);

    process.exit(0);
  } catch (error) {
    console.error('💥 SQLite extraction failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await extractor.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = { DirectSQLiteExtractor };
