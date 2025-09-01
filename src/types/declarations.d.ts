/**
 * Type declarations for MBTiles and vector tile libraries
 * Phase 1: Proper type safety for congressional district boundaries
 */

declare module '@mapbox/mbtiles' {
  interface MBTilesInfo {
    name?: string;
    version?: string;
    description?: string;
    minzoom?: number;
    maxzoom?: number;
    bounds?: [number, number, number, number];
    center?: [number, number, number];
  }

  interface MBTilesInstance {
    getTile(
      z: number,
      x: number,
      y: number,
      callback: (err: Error | null, data: Buffer | null) => void
    ): void;
    getInfo(callback: (err: Error | null, info: MBTilesInfo) => void): void;
    close(callback?: (err: Error | null) => void): void;
  }

  class MBTiles {
    constructor(
      path: string,
      callback: (err: Error | null, mbtiles: MBTilesInstance | null) => void
    );
  }

  export = MBTiles;
}

declare module '@mapbox/vector-tile' {
  interface VectorTileFeature {
    properties: Record<string, string | number | boolean>;
    type: 1 | 2 | 3; // Point, LineString, Polygon
    coordinates: number[][];
    toGeoJSON(x: number, y: number, z: number): GeoJSON.Feature<GeoJSON.Polygon>;
  }

  interface VectorTileLayer {
    name: string;
    version: number;
    extent: number;
    length: number;
    feature(index: number): VectorTileFeature;
  }

  class VectorTile {
    layers: Record<string, VectorTileLayer>;
    constructor(pbf: Buffer);
  }

  export { VectorTile, VectorTileLayer, VectorTileFeature };
}

declare module 'pbf' {
  class Protobuf {
    constructor(buffer: Buffer);
  }
  export = Protobuf;
}
