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

declare module 'pbf' {
  class Protobuf {
    constructor(buffer: Buffer | Uint8Array);
  }

  export = Protobuf;
}
