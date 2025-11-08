/**
 * Climate Model Module
 * Simulates climate zone shifts due to radial expansion
 */

import type { PolarCoord, ClimateEvent } from '../types';
import { ClimateZone } from '../types';
import { MODEL } from '../constants';

export class ClimateModel {
  private heatingZone: { min: number; max: number };
  private coolingZone: { min: number; max: number };

  constructor() {
    this.heatingZone = {
      min: MODEL.climate.HEATING_ZONE_MIN,
      max: MODEL.climate.HEATING_ZONE_MAX,
    };

    this.coolingZone = {
      min: MODEL.climate.COOLING_ZONE_MIN,
      max: MODEL.climate.COOLING_ZONE_MAX,
    };
  }

  /**
   * Determine climate zone for given radius
   */
  getClimateZone(r: number): ClimateZone {
    // Polar zone (near center)
    if (r < 1000) {
      return ClimateZone.POLAR;
    }

    // Heating zone (Northern regions: 20-35°N equivalent)
    if (r >= this.heatingZone.min && r <= this.heatingZone.max) {
      return ClimateZone.HEATING;
    }

    // Equatorial/stable zone
    if (r > this.heatingZone.max && r < this.coolingZone.min) {
      return ClimateZone.STABLE;
    }

    // Cooling zone (Southern regions: 30-50°S equivalent)
    if (r >= this.coolingZone.min && r <= this.coolingZone.max) {
      return ClimateZone.COOLING;
    }

    // Near Antarctic rim
    if (r > this.coolingZone.max) {
      return ClimateZone.SUBARCTIC;
    }

    return ClimateZone.TEMPERATE;
  }

  /**
   * Calculate temperature anomaly at position and time
   * Returns temperature change in °C relative to baseline
   */
  getTemperatureAnomaly(r: number, time: number): number {
    const zone = this.getClimateZone(r);
    const yearsElapsed = time;

    switch (zone) {
      case ClimateZone.HEATING:
        // Arabia/North Africa: 3x global average warming
        // ~3°C per century
        return 3.0 * (yearsElapsed / 100);

      case ClimateZone.COOLING:
        // South Africa/southern regions: cooling trend
        // ~-1.5°C per century
        return -1.5 * (yearsElapsed / 100);

      case ClimateZone.SUBARCTIC:
        // Near Antarctic rim: strong cooling
        return -3.0 * (yearsElapsed / 100);

      case ClimateZone.STABLE:
        // Equatorial regions: moderate warming
        return 1.0 * (yearsElapsed / 100);

      default:
        return 0;
    }
  }

  /**
   * Calculate distance to Antarctic rim (for cooling influence)
   */
  getDistanceToRim(r: number): number {
    return MODEL.geometry.ANTARCTIC_RIM_RADIUS - r;
  }

  /**
   * Calculate climate scalar C(r,t)
   * Positive = heating, Negative = cooling, 0 = stable
   */
  getClimateScalar(r: number, time: number): number {
    const anomaly = this.getTemperatureAnomaly(r, time);

    // Normalize to [-1, 1] range
    return Math.max(-1, Math.min(1, anomaly / 5));
  }

  /**
   * Predict future climate zone for a location
   * As expansion occurs, regions move radially outward
   */
  predictFutureZone(currentR: number, years: number, expansionRate: number): ClimateZone {
    // Calculate future radius
    const futureR = currentR * (1 + expansionRate * years * 1000 / 1000);
    return this.getClimateZone(futureR);
  }

  /**
   * Check if location will enter cooling zone
   */
  willEnterCoolingZone(currentR: number, years: number, expansionRate: number): boolean {
    const futureR = currentR * (1 + expansionRate * years * 1000 / 1000);
    const currentZone = this.getClimateZone(currentR);
    const futureZone = this.getClimateZone(futureR);

    return currentZone !== ClimateZone.COOLING && futureZone === ClimateZone.COOLING;
  }

  /**
   * Generate climate event markers (e.g., South Africa snow events)
   */
  generateClimateEvents(): ClimateEvent[] {
    const events: ClimateEvent[] = [];

    // South Africa snow events (2024-2025)
    const southAfricaR = 13500; // Approximate radius for South Africa

    events.push({
      id: 'SA_SNOW_2024_07',
      type: 'snow',
      location: { r: southAfricaR, theta: 0.35 },
      date: new Date('2024-07-08'),
      severity: 1.5,
      description: 'Rare snowfall at Aquila Safari',
      rarity: 0.95,
    });

    events.push({
      id: 'SA_SNOW_2024_09',
      type: 'snow',
      location: { r: southAfricaR, theta: 0.35 },
      date: new Date('2024-09-20'),
      severity: 3.0,
      description: '2 meters snow, highway closures',
      rarity: 0.99,
    });

    events.push({
      id: 'SA_SNOW_2024_11',
      type: 'snow',
      location: { r: southAfricaR, theta: 0.36 },
      date: new Date('2024-11-15'),
      severity: 2.0,
      description: 'First snow in 85 years',
      rarity: 0.98,
    });

    // Argentina cold events (2025)
    const argentinaR = 15000;

    events.push({
      id: 'ARG_COLD_2025_06',
      type: 'cold',
      location: { r: argentinaR, theta: -0.8 },
      date: new Date('2025-06-26'),
      severity: 2.5,
      description: 'Record cold, 15 deaths',
      rarity: 0.97,
    });

    // Arabia heat events
    const arabiaR = 2800;

    events.push({
      id: 'ARABIA_HEAT_2024',
      type: 'heat',
      location: { r: arabiaR, theta: 0.8 },
      date: new Date('2024-06-15'),
      severity: 3.0,
      description: 'Warming 3x faster than global average',
      rarity: 0.95,
    });

    return events;
  }

  /**
   * Get climate zone color for visualization
   */
  getZoneColor(zone: ClimateZone): [number, number, number, number] {
    switch (zone) {
      case ClimateZone.HEATING:
        return [1.0, 0.3, 0.1, 0.6]; // Red/orange
      case ClimateZone.COOLING:
        return [0.1, 0.4, 1.0, 0.6]; // Blue
      case ClimateZone.SUBARCTIC:
        return [0.8, 0.9, 1.0, 0.7]; // Light blue
      case ClimateZone.POLAR:
        return [1.0, 1.0, 1.0, 0.8]; // White
      case ClimateZone.STABLE:
        return [0.5, 0.5, 0.5, 0.3]; // Gray
      default:
        return [0.5, 0.5, 0.5, 0.3]; // Gray
    }
  }

  /**
   * Get temperature anomaly color (for heatmap)
   */
  getAnomalyColor(anomaly: number): [number, number, number, number] {
    // anomaly: -5°C to +5°C
    const normalized = (anomaly + 5) / 10; // Map to [0, 1]

    if (normalized < 0.5) {
      // Blue (cold) to white (neutral)
      const t = normalized * 2;
      return [t, t, 1.0, 0.6];
    } else {
      // White (neutral) to red (hot)
      const t = (normalized - 0.5) * 2;
      return [1.0, 1 - t, 1 - t, 0.6];
    }
  }

  /**
   * Set climate zone boundaries
   */
  setZoneBoundaries(
    heatingMin: number,
    heatingMax: number,
    coolingMin: number,
    coolingMax: number
  ): void {
    this.heatingZone = { min: heatingMin, max: heatingMax };
    this.coolingZone = { min: coolingMin, max: coolingMax };
  }
}

/**
 * Analyze climate trend for a region over time
 */
export function analyzeClimateTrend(
  position: PolarCoord,
  years: number,
  samples: number = 20
): Array<{ time: number; anomaly: number; zone: ClimateZone }> {
  const model = new ClimateModel();
  const trend = [];

  for (let i = 0; i <= samples; i++) {
    const time = (i / samples) * years;
    const anomaly = model.getTemperatureAnomaly(position.r, time);
    const zone = model.getClimateZone(position.r);

    trend.push({ time, anomaly, zone });
  }

  return trend;
}
