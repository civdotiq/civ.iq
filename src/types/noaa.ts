/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NOAA Climate Data Types
 *
 * Types for climate normals and severe weather events from NOAA CDO.
 *
 * API: https://www.ncdc.noaa.gov/cdo-web/api/v2/
 * Requires NOAA_TOKEN.
 */

/** Climate normals for a state */
export interface NoaaClimateNormals {
  state: string;
  stations: number;
  avgTemperature: number | null;
  avgMinTemperature: number | null;
  avgMaxTemperature: number | null;
  avgPrecipitation: number | null;
  avgSnowfall: number | null;
  period: string;
}

/** Severe weather event record */
export interface NoaaSevereWeatherEvent {
  eventId: string;
  eventType: string;
  state: string;
  countyOrZone: string;
  beginDate: string;
  endDate: string;
  injuries: number;
  deaths: number;
  damageProperty: number;
  damageCrops: number;
  source: string;
  narrative: string | null;
}

// ── Raw API response types ──────────────────────────────────────

/** NOAA CDO API response envelope */
export interface NoaaCdoResponse<T> {
  metadata: {
    resultset: {
      offset: number;
      count: number;
      limit: number;
    };
  };
  results: T[];
}

/** Raw NOAA data value from CDO API */
export interface RawNoaaDataValue {
  date: string;
  datatype: string;
  station: string;
  attributes: string;
  value: number;
}

/** Raw NOAA storm event from Storm Events API */
export interface RawNoaaStormEvent {
  EVENT_ID: string;
  EVENT_TYPE: string;
  STATE: string;
  CZ_NAME: string;
  BEGIN_DATE_TIME: string;
  END_DATE_TIME: string;
  INJURIES_DIRECT: number;
  INJURIES_INDIRECT: number;
  DEATHS_DIRECT: number;
  DEATHS_INDIRECT: number;
  DAMAGE_PROPERTY: string;
  DAMAGE_CROPS: string;
  SOURCE: string;
  EVENT_NARRATIVE: string;
}
