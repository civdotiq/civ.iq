declare module '@mapbox/mbtiles' {
  interface MBTilesOptions {
    mode?: string;
    domain?: string;
  }

  interface MBTilesInfo {
    name?: string;
    format?: string;
    bounds?: number[];
    center?: number[];
    minzoom?: number;
    maxzoom?: number;
    [key: string]: unknown;
  }

  interface MBTilesHeaders {
    'Content-Type'?: string;
    'Content-Encoding'?: string;
    [key: string]: string | undefined;
  }

  interface MBTiles {
    getInfo(callback: (err: Error | null, info?: MBTilesInfo) => void): void;
    getTile(
      z: number,
      x: number,
      y: number,
      callback: (err: Error | null, data?: Buffer, headers?: MBTilesHeaders) => void
    ): void;
    close(callback?: (err: Error | null) => void): void;
  }

  interface MBTilesConstructor {
    new (
      uri: string,
      options?: MBTilesOptions,
      callback?: (err: Error | null, mbtiles?: MBTiles) => void
    ): MBTiles;
    new (uri: string, callback?: (err: Error | null, mbtiles?: MBTiles) => void): MBTiles;
  }

  const MBTiles: MBTilesConstructor;
  export = MBTiles;
}
