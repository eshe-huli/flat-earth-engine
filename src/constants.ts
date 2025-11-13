/**
 * Model constants for the Expanding Earth Electromagnetic Model
 */

import type { ModelConstants } from './types';

export const MODEL: ModelConstants = {
  geometry: {
    NORTH_POLE_CENTER: { r: 0, theta: 0 },
    ANTARCTIC_RIM_RADIUS: 20000, // km
    TROPIC_CANCER_RADIUS: 2600, // km from center (≈23.5°N)
    EQUATOR_RADIUS: 10000, // km from center
    TROPIC_CAPRICORN_RADIUS: 4100, // km from center (≈23.5°S)
  },

  expansion: {
    RATE: 0.033, // meters/year (3.3 cm/year)
    CONSTANT_K: 0.033,
  },

  electromagnetic: {
    VORTEX_STRENGTH_B0: 1000, // Arbitrary units
    FIELD_TYPE: 'toroidal',
  },

  solar: {
    ALTITUDE: 7500, // km (midpoint of 5,000-10,000 range)
    ORBITAL_PERIOD: 365.24, // days
    DAILY_PERIOD: 24, // hours
    TROPIC_CANCER_RADIUS: 2600, // Summer solstice
    TROPIC_CAPRICORN_RADIUS: 4100, // Winter solstice
    ILLUMINATION_ANGLE: Math.PI / 6, // 30° cone
  },

  climate: {
    HEATING_ZONE_MIN: 2000, // km (≈20°N)
    HEATING_ZONE_MAX: 3500, // km (≈35°N)
    COOLING_ZONE_MIN: 12000, // km (≈30°S)
    COOLING_ZONE_MAX: 18000, // km (≈50°S)
  },
};

// Rendering constants
export const RENDER_CONFIG = {
  CLEAR_COLOR: [0.05, 0.08, 0.2, 1.0] as [number, number, number, number],
  GRID_LINES: 50,
  RADIAL_SEGMENTS: 128,
  CIRCLE_SEGMENTS: 64,
  FIELD_RESOLUTION: 512,
  STREAMLINE_COUNT: 24,
  GPS_STATION_COUNT: 1000,
  FPS_SAMPLE_SIZE: 60,
};

// Physics constants
export const PHYSICS = {
  YEARS_TO_SECONDS: 365.24 * 24 * 3600,
  SECONDS_TO_YEARS: 1 / (365.24 * 24 * 3600),
  KM_TO_METERS: 1000,
  METERS_TO_KM: 0.001,
  DAY_LENGTH_BASE: 24, // hours
  DAY_LENGTH_INCREASE: 10.91e-6, // seconds per year
};

// Color schemes
export const COLORS = {
  EARTH: {
    DISK: [0.05, 0.15, 0.25, 1.0] as [number, number, number, number],
    GRID: [0.2, 0.3, 0.5, 0.5] as [number, number, number, number],
    RIM: [0.6, 0.7, 0.9, 1.0] as [number, number, number, number],
  },
  EM_FIELD: {
    LOW: [0.2, 0.3, 0.6, 0.3] as [number, number, number, number],
    MED: [0.3, 0.5, 0.9, 0.6] as [number, number, number, number],
    HIGH: [0.5, 0.7, 1.0, 0.9] as [number, number, number, number],
    VORTEX: [0.6, 0.2, 0.7, 1.0] as [number, number, number, number],
  },
  SOLAR: {
    SUN: [1.0, 0.9, 0.3, 1.0] as [number, number, number, number],
    GLOW: [1.0, 0.75, 0.1, 0.5] as [number, number, number, number],
    DAY: [1.0, 0.95, 0.7, 0.3] as [number, number, number, number],
    NIGHT: [0.05, 0.05, 0.15, 0.8] as [number, number, number, number],
  },
  CLIMATE: {
    HEATING: [1.0, 0.3, 0.1, 0.6] as [number, number, number, number],
    COOLING: [0.1, 0.4, 1.0, 0.6] as [number, number, number, number],
    STABLE: [0.5, 0.5, 0.5, 0.3] as [number, number, number, number],
  },
  GPS: {
    STATION: [0.0, 1.0, 0.5, 1.0] as [number, number, number, number],
    VECTOR: [1.0, 0.5, 0.0, 0.8] as [number, number, number, number],
  },
};
