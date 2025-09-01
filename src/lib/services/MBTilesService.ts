/**
 * Congressional District MBTiles Service
 * Phase 1: Real MBTiles file connection (SQLite format despite .pmtiles extension)
 */

import { existsSync } from 'fs';
import { join } from 'path';

interface DistrictBoundaryResult {
  success: boolean;
  district_id: string;
  geometry?: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
  source: 'mbtiles';
  error?: string;
  debug_info?: {
    file_exists: boolean;
    tiles_checked: number;
    features_found: number;
    processing_time_ms: number;
    layer_name?: string;
    tile_coordinates?: { z: number; x: number; y: number };
  };
}

interface MBTilesConnectionInfo {
  connected: boolean;
  header?: {
    name?: string;
    description?: string;
    minzoom?: number;
    maxzoom?: number;
    bounds?: [number, number, number, number];
    center?: [number, number, number];
    sample_tile_available?: boolean;
    layers?: string[];
    district_layers?: string[];
    parse_error?: string;
  };
  error?: string;
}

export class MBTilesService {
  private mbtilesPath: string;
  private cache = new Map<string, DistrictBoundaryResult>();

  constructor() {
    // Keep the existing file path - it's MBTiles despite .pmtiles extension
    this.mbtilesPath = join(
      process.cwd(),
      'public',
      'maps',
      'congressional_districts_119_real.pmtiles'
    );
  }

  /**
   * Phase 1 Success Test: Connect to MBTiles and read header info
   */
  async testConnection(): Promise<MBTilesConnectionInfo> {
    if (!existsSync(this.mbtilesPath)) {
      return {
        connected: false,
        error: `MBTiles file not found: ${this.mbtilesPath}`,
      };
    }

    try {
      // @ts-expect-error - MBTiles library has no TypeScript declarations
      const MBTiles = await import('@mapbox/mbtiles');
      const MBTilesClass = MBTiles.default || MBTiles;

      return new Promise(resolve => {
        new MBTilesClass(this.mbtilesPath, (err: Error | null, mbtiles: unknown) => {
          if (err) {
            resolve({ connected: false, error: err.message });
            return;
          }

          // @ts-expect-error - mbtiles object methods not properly typed
          mbtiles.getInfo((infoErr: Error | null, info: Record<string, unknown>) => {
            if (infoErr) {
              resolve({ connected: false, error: infoErr.message });
              return;
            }

            const header = {
              name: info.name as string,
              description: info.description as string,
              minzoom: info.minzoom as number,
              maxzoom: info.maxzoom as number,
              bounds: info.bounds as [number, number, number, number],
              center: info.center as [number, number, number],
            };

            // Test getting a sample tile
            this.testSampleTile(mbtiles, header, resolve);

            // @ts-expect-error - mbtiles.close method not properly typed
            mbtiles.close();
          });
        });
      });
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private testSampleTile(
    mbtiles: unknown,
    header: MBTilesConnectionInfo['header'],
    resolve: (value: MBTilesConnectionInfo) => void
  ) {
    if (!header) {
      resolve({
        connected: true,
        header,
      });
      return;
    }

    // Get a tile from the center of the US at a reasonable zoom level
    const centerZ = Math.min(header.maxzoom || 10, 9);
    const centerX = 128; // Rough center of US at zoom 9
    const centerY = 96;

    // @ts-expect-error - mbtiles.getTile method not properly typed
    mbtiles.getTile(centerZ, centerX, centerY, async (err: Error | null, data: Buffer) => {
      if (err) {
        // No tile at this location - that's OK for sparse data
        resolve({
          connected: true,
          header: {
            ...header,
            sample_tile_available: false,
          },
        });
        return;
      }

      try {
        // Try to parse the vector tile to verify structure
        const Protobuf = await import('pbf');
        const VectorTileModule = await import('@mapbox/vector-tile');

        const pbf = new Protobuf.default(data);
        const vectorTile = new VectorTileModule.VectorTile(pbf);

        const layers = Object.keys(vectorTile.layers);
        const districtLayers = layers.filter(
          layer =>
            layer.toLowerCase().includes('district') ||
            layer.toLowerCase().includes('congress') ||
            layer.toLowerCase().includes('cd')
        );

        resolve({
          connected: true,
          header: {
            ...header,
            sample_tile_available: true,
            layers,
            district_layers: districtLayers,
          },
        });
      } catch (parseError) {
        resolve({
          connected: true,
          header: {
            ...header,
            sample_tile_available: true,
            parse_error: parseError instanceof Error ? parseError.message : 'Unknown error',
          },
        });
      }
    });
  }

  /**
   * Phase 1 Verification: Ensure MBTiles contains congressional district data
   */
  async verifyPhase1(): Promise<{
    passed: boolean;
    districts_detected: boolean;
    layers_found: string[];
    error?: string;
  }> {
    try {
      const connectionTest = await this.testConnection();
      if (!connectionTest.connected) {
        return {
          passed: false,
          districts_detected: false,
          layers_found: [],
          error: connectionTest.error,
        };
      }

      const layersFound = (connectionTest.header?.layers as string[]) || [];
      const districtLayers = (connectionTest.header?.district_layers as string[]) || [];
      const hasDistrictData = districtLayers.length > 0;

      return {
        passed: connectionTest.connected && hasDistrictData,
        districts_detected: hasDistrictData,
        layers_found: layersFound,
      };
    } catch (error) {
      return {
        passed: false,
        districts_detected: false,
        layers_found: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Placeholder for Phase 2: Get district boundary
   */
  async getDistrictBoundary(districtId: string): Promise<DistrictBoundaryResult> {
    if (this.cache.has(districtId)) {
      return this.cache.get(districtId)!;
    }

    // Phase 1: Just verify connection for now
    const phase1Test = await this.verifyPhase1();

    const result: DistrictBoundaryResult = {
      success: phase1Test.passed,
      district_id: districtId,
      source: 'mbtiles',
      error: phase1Test.passed
        ? 'Phase 2 implementation needed for actual boundary extraction'
        : phase1Test.error,
      debug_info: {
        file_exists: existsSync(this.mbtilesPath),
        tiles_checked: 1,
        features_found: phase1Test.districts_detected ? 1 : 0,
        processing_time_ms: 0,
      },
    };

    this.cache.set(districtId, result);
    return result;
  }
}
