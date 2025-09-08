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

declare module 'pbf' {
  class Protobuf {
    constructor(buffer: Buffer);
  }
  export = Protobuf;
}
