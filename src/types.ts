/**
 * Core type definitions for the Flat Earth Engine
 */

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PolarCoord {
  r: number; // Radial distance from North Pole (km)
  theta: number; // Angle from prime meridian (radians)
}

export interface PolarCoord3D extends PolarCoord {
  z: number; // Altitude (km)
}

export interface CameraState {
  x: number; // Camera position X
  y: number; // Camera position Y
  zoom: number; // Zoom level (0.1 to 10)
  rotation: number; // Camera rotation (radians)
}

export interface SimulationState {
  time: number; // Simulation time (years)
  timeScale: number; // Time multiplier
  expansionRate: number; // k constant (meters/year)
  fieldStrength: number; // B0 multiplier
  isPaused: boolean;
}

export interface ModelConstants {
  geometry: {
    NORTH_POLE_CENTER: PolarCoord;
    ANTARCTIC_RIM_RADIUS: number;
    TROPIC_CANCER_RADIUS: number;
    EQUATOR_RADIUS: number;
    TROPIC_CAPRICORN_RADIUS: number;
  };
  expansion: {
    RATE: number; // meters/year
    CONSTANT_K: number;
  };
  electromagnetic: {
    VORTEX_STRENGTH_B0: number;
    FIELD_TYPE: string;
  };
  solar: {
    ALTITUDE: number;
    ORBITAL_PERIOD: number;
    DAILY_PERIOD: number;
    TROPIC_CANCER_RADIUS: number;
    TROPIC_CAPRICORN_RADIUS: number;
    ILLUMINATION_ANGLE: number;
  };
  climate: {
    HEATING_ZONE_MIN: number;
    HEATING_ZONE_MAX: number;
    COOLING_ZONE_MIN: number;
    COOLING_ZONE_MAX: number;
  };
}

export enum ViewMode {
  EARTH = 'earth',
  EM_FIELD = 'field',
  SOLAR = 'solar',
  CLIMATE = 'climate',
  GPS = 'gps',
}

export enum ClimateZone {
  POLAR,
  SUBARCTIC,
  TEMPERATE,
  SUBTROPICAL,
  TROPICAL,
  HEATING, // Northern zones (20-35°N)
  COOLING, // Southern zones (30-50°S)
  STABLE,
}

export interface GPSStation {
  id: string;
  name?: string;
  position: PolarCoord;
  initialPosition: PolarCoord;
  velocity: Vector2;
  displacement?: Vector2;
}

export interface ClimateEvent {
  id: string;
  type: 'snow' | 'heat' | 'cold' | 'drought';
  location: PolarCoord;
  date: Date;
  severity: number;
  description?: string;
  rarity?: number;
}

export interface Streamline {
  points: Vector2[];
  color?: string;
  thickness?: number;
}

export interface RenderPass {
  name: string;
  enabled: boolean;
  opacity: number;
  render: (gl: WebGL2RenderingContext, deltaTime: number) => void;
}
