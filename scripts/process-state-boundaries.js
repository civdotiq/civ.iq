#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * State Boundaries Processor - Census TIGER/Line Data Pipeline
 *
 * Downloads and processes state boundary data for Senator profiles.
 * Creates optimized GeoJSON files for all 50 states + DC + territories.
 *
 * Data Source: Census TIGER/Line 2025 State Boundaries
 * URL: https://www2.census.gov/geo/tiger/TIGER2025/STATE/
 */

const https = require('https');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CENSUS_URL = 'https://www2.census.gov/geo/tiger/TIGER2025/STATE/tl_2025_us_state.zip';
const DOWNLOAD_DIR = path.join(__dirname, '..', 'temp_state_data');
const OUTPUT_BASE = path.join(__dirname, '..', 'public', 'data', 'states');
const ZIP_FILE = path.join(DOWNLOAD_DIR, 'tl_2025_us_state.zip');
const EXTRACT_DIR = path.join(DOWNLOAD_DIR, 'extracted');

class StateBoundaryProcessor {
  constructor() {
    this.stats = {
      startTime: Date.now(),
      statesProcessed: 0,
      errors: [],
    };
  }

  async run() {
    console.log('🚀 State Boundary Processing Pipeline Starting...');
    console.log('📊 Source: Census TIGER/Line 2025 (State Boundaries)\n');

    try {
      await this.setup();
      await this.downloadStateData();
      await this.extractZipFile();
      await this.convertToGeoJSON();
      await this.splitIntoStateFiles();
      await this.optimizeStates();
      await this.validateStates();
      await this.generateManifest();
      await this.cleanup();

      console.log('\n✅ STATE BOUNDARY PROCESSING COMPLETE!');
      console.log(`⏱️  Total time: ${((Date.now() - this.stats.startTime) / 1000).toFixed(1)}s`);
      console.log(`📊 States processed: ${this.stats.statesProcessed}`);

      if (this.stats.errors.length > 0) {
        console.log(`⚠️  Errors: ${this.stats.errors.length}`);
        this.stats.errors.forEach(err => console.log(`   - ${err}`));
      }
    } catch (error) {
      console.error('\n❌ Pipeline failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  async setup() {
    console.log('📁 Setting up directories...');

    await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
    await fs.mkdir(EXTRACT_DIR, { recursive: true });
    await fs.mkdir(path.join(OUTPUT_BASE, 'full'), { recursive: true });
    await fs.mkdir(path.join(OUTPUT_BASE, 'standard'), { recursive: true });
    await fs.mkdir(path.join(OUTPUT_BASE, 'simple'), { recursive: true });

    console.log('✅ Directories ready\n');
  }

  async downloadStateData() {
    console.log('📥 Downloading state boundaries from Census Bureau...');
    console.log(`   URL: ${CENSUS_URL}`);

    // Check if already downloaded
    try {
      await fs.access(ZIP_FILE);
      const stats = await fs.stat(ZIP_FILE);
      if (stats.size > 1000) {
        console.log(`✅ File already exists (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
        return;
      }
    } catch {
      // File doesn't exist, download it
    }

    return new Promise((resolve, reject) => {
      const file = fsSync.createWriteStream(ZIP_FILE);

      https
        .get(CENSUS_URL, response => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            https
              .get(response.headers.location, redirectResponse => {
                const totalSize = parseInt(redirectResponse.headers['content-length'], 10);
                let downloaded = 0;

                redirectResponse.on('data', chunk => {
                  downloaded += chunk.length;
                  const percent = ((downloaded / totalSize) * 100).toFixed(1);
                  process.stdout.write(
                    `\r   Downloading: ${percent}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`
                  );
                });

                redirectResponse.pipe(file);
                file.on('finish', () => {
                  file.close();
                  console.log('\n✅ Download complete\n');
                  resolve();
                });
              })
              .on('error', reject);
          } else {
            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloaded = 0;

            response.on('data', chunk => {
              downloaded += chunk.length;
              const percent = ((downloaded / totalSize) * 100).toFixed(1);
              process.stdout.write(
                `\r   Downloading: ${percent}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`
              );
            });

            response.pipe(file);
            file.on('finish', () => {
              file.close();
              console.log('\n✅ Download complete\n');
              resolve();
            });
          }
        })
        .on('error', err => {
          if (fsSync.existsSync(ZIP_FILE)) {
            fsSync.unlinkSync(ZIP_FILE);
          }
          reject(err);
        });

      file.on('error', err => {
        if (fsSync.existsSync(ZIP_FILE)) {
          fsSync.unlinkSync(ZIP_FILE);
        }
        reject(err);
      });
    });
  }

  async extractZipFile() {
    console.log('📦 Extracting ZIP file...');

    try {
      execSync(`unzip -o -q "${ZIP_FILE}" -d "${EXTRACT_DIR}"`, { stdio: 'pipe' });
      console.log('✅ Extraction complete\n');
    } catch (error) {
      throw new Error(`Failed to extract ZIP: ${error.message}`);
    }
  }

  async convertToGeoJSON() {
    console.log('🗺️  Converting shapefile to GeoJSON...');

    // Check if ogr2ogr is available
    try {
      execSync('which ogr2ogr', { stdio: 'pipe' });
    } catch {
      console.log('\n⚠️  ogr2ogr (GDAL) not found!');
      throw new Error('ogr2ogr not available');
    }

    const shapefilePath = path.join(EXTRACT_DIR, 'tl_2025_us_state.shp');
    const geoJSONPath = path.join(DOWNLOAD_DIR, 'us_states.geojson');

    try {
      execSync(`ogr2ogr -f GeoJSON -t_srs EPSG:4326 "${geoJSONPath}" "${shapefilePath}"`, {
        stdio: 'pipe',
      });
      console.log('✅ Conversion complete\n');
      this.geoJSONPath = geoJSONPath;
    } catch (error) {
      throw new Error(`Failed to convert shapefile: ${error.message}`);
    }
  }

  async splitIntoStateFiles() {
    console.log('✂️  Splitting into individual state files...');

    const data = JSON.parse(await fs.readFile(this.geoJSONPath, 'utf8'));
    const features = data.features;

    console.log(`   Found ${features.length} states/territories`);

    for (const feature of features) {
      const stateAbbr = this.getStateAbbr(feature.properties.STATEFP);

      if (!stateAbbr) {
        this.stats.errors.push(`Unknown FIPS: ${feature.properties.STATEFP}`);
        continue;
      }

      // Enhance properties
      feature.properties = {
        ...feature.properties,
        state_abbr: stateAbbr,
        state_name: feature.properties.NAME,
        state_fips: feature.properties.STATEFP,
      };

      // Save to full resolution
      const fullPath = path.join(OUTPUT_BASE, 'full', `${stateAbbr}.json`);
      await fs.writeFile(fullPath, JSON.stringify(feature, null, 2));

      this.stats.statesProcessed++;
    }

    console.log(`✅ Split complete: ${this.stats.statesProcessed} states\n`);
  }

  async optimizeStates() {
    console.log('⚙️  Optimizing state geometries...');

    const files = await fs.readdir(path.join(OUTPUT_BASE, 'full'));
    let processed = 0;

    // Check if mapshaper is available
    let mapshaperAvailable = false;
    try {
      require.resolve('mapshaper');
      mapshaperAvailable = true;
    } catch {
      console.log('⚠️  mapshaper not available, copying files instead');
    }

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const fullPath = path.join(OUTPUT_BASE, 'full', file);
      const standardPath = path.join(OUTPUT_BASE, 'standard', file);
      const simplePath = path.join(OUTPUT_BASE, 'simple', file);

      if (mapshaperAvailable) {
        try {
          const mapshaper = require('mapshaper');
          const geoJSON = JSON.parse(await fs.readFile(fullPath, 'utf8'));

          // Standard resolution (1% simplification)
          const standardResult = await mapshaper.applyCommands(geoJSON, {
            '-simplify': '1%',
            '-o': 'format=geojson',
          });
          await fs.writeFile(standardPath, standardResult);

          // Simple resolution (0.1% simplification)
          const simpleResult = await mapshaper.applyCommands(geoJSON, {
            '-simplify': '0.1%',
            '-o': 'format=geojson',
          });
          await fs.writeFile(simplePath, simpleResult);
        } catch {
          await fs.copyFile(fullPath, standardPath);
          await fs.copyFile(fullPath, simplePath);
        }
      } else {
        await fs.copyFile(fullPath, standardPath);
        await fs.copyFile(fullPath, simplePath);
      }

      processed++;
    }

    console.log(`✅ Optimization complete: ${processed} states\n`);
  }

  async validateStates() {
    console.log('🔍 Validating state boundaries...');

    const testStates = [
      { abbr: 'CA', name: 'California' },
      { abbr: 'NY', name: 'New York' },
      { abbr: 'TX', name: 'Texas' },
      { abbr: 'FL', name: 'Florida' },
    ];

    for (const test of testStates) {
      try {
        const filePath = path.join(OUTPUT_BASE, 'standard', `${test.abbr}.json`);
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

        if (data.properties.state_name === test.name) {
          console.log(`   ✅ ${test.abbr}: Valid (${test.name})`);
        } else {
          console.log(`   ⚠️  ${test.abbr}: Name mismatch`);
        }
      } catch (error) {
        console.log(`   ❌ ${test.abbr}: Validation failed - ${error.message}`);
        this.stats.errors.push(`Validation failed for ${test.abbr}`);
      }
    }

    console.log('');
  }

  async generateManifest() {
    console.log('📋 Generating manifest...');

    const files = await fs.readdir(path.join(OUTPUT_BASE, 'standard'));
    const states = files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort();

    const manifest = {
      generated: new Date().toISOString(),
      total_states: states.length,
      source: 'Census TIGER/Line 2025 (State Boundaries)',
      source_url: CENSUS_URL,
      extraction_stats: {
        duration_ms: Date.now() - this.stats.startTime,
        errors: this.stats.errors.length,
      },
      states,
      detail_levels: {
        full: 'Original resolution from Census TIGER/Line',
        standard: '1% simplified with mapshaper (web optimized)',
        simple: '0.1% simplified with mapshaper (overview maps)',
      },
    };

    const manifestPath = path.join(OUTPUT_BASE, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`✅ Manifest created: ${manifest.total_states} states\n`);
  }

  async cleanup() {
    console.log('🧹 Cleaning up temporary files...');

    try {
      await fs.rm(DOWNLOAD_DIR, { recursive: true, force: true });
      console.log('✅ Cleanup complete\n');
    } catch (error) {
      console.log('⚠️  Could not remove temp directory:', error.message);
    }
  }

  getStateAbbr(fips) {
    const fipsMap = {
      '01': 'AL',
      '02': 'AK',
      '04': 'AZ',
      '05': 'AR',
      '06': 'CA',
      '08': 'CO',
      '09': 'CT',
      10: 'DE',
      11: 'DC',
      12: 'FL',
      13: 'GA',
      15: 'HI',
      16: 'ID',
      17: 'IL',
      18: 'IN',
      19: 'IA',
      20: 'KS',
      21: 'KY',
      22: 'LA',
      23: 'ME',
      24: 'MD',
      25: 'MA',
      26: 'MI',
      27: 'MN',
      28: 'MS',
      29: 'MO',
      30: 'MT',
      31: 'NE',
      32: 'NV',
      33: 'NH',
      34: 'NJ',
      35: 'NM',
      36: 'NY',
      37: 'NC',
      38: 'ND',
      39: 'OH',
      40: 'OK',
      41: 'OR',
      42: 'PA',
      44: 'RI',
      45: 'SC',
      46: 'SD',
      47: 'TN',
      48: 'TX',
      49: 'UT',
      50: 'VT',
      51: 'VA',
      53: 'WA',
      54: 'WV',
      55: 'WI',
      56: 'WY',
      60: 'AS',
      66: 'GU',
      69: 'MP',
      72: 'PR',
      78: 'VI',
    };
    return fipsMap[fips] || null;
  }
}

// Main execution
if (require.main === module) {
  const processor = new StateBoundaryProcessor();
  processor.run();
}

module.exports = { StateBoundaryProcessor };
