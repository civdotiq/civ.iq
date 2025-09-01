declare module '@mapbox/mbtiles' {
  interface MBTilesInfo {
    name?: string;
    version?: string;
    description?: string;
    minzoom?: number;
    maxzoom?: number;
    bounds?: number[];
  }

  interface MBTilesInstance {
    getTile(
      z: number,
      x: number,
      y: number,
      callback: (err: Error | null, data: Buffer) => void
    ): void;
    getInfo(callback: (err: Error | null, info: MBTilesInfo) => void): void;
    close(): void;
  }

  class MBTiles {
    constructor(path: string, callback: (err: Error | null, mbtiles: MBTilesInstance) => void);
  }

  export = MBTiles;
}

declare module '@mapbox/vector-tile' {
  interface VectorTileFeature {
    properties: Record<string, unknown>;
    toGeoJSON(x: number, y: number, z: number): GeoJSON.Feature;
  }

  interface VectorTileLayer {
    length: number;
    feature(index: number): VectorTileFeature;
  }

  class VectorTile {
    layers: Record<string, VectorTileLayer>;
    constructor(pbf: unknown);
  }

  export { VectorTile, VectorTileLayer, VectorTileFeature };
}

declare module 'pbf' {
  class Protobuf {
    constructor(buffer: Buffer | Uint8Array);
  }

  export = Protobuf;
}
