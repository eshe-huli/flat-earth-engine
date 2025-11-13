/**
 * GPS Simulator Module
 * Generates and tracks GPS station positions and displacement vectors
 */

import type { GPSStation, PolarCoord, Vector2 } from '../types';
import { MODEL } from '../constants';
import { polarToCartesian, calculateGPSDisplacement } from './expansion';

export class GPSSimulator {
  private stations: GPSStation[] = [];
  private expansionRate: number;

  constructor(expansionRate: number = MODEL.expansion.RATE) {
    this.expansionRate = expansionRate;
  }

  /**
   * Generate GPS stations distributed across the plane
   */
  generateStations(count: number): void {
    this.stations = [];
    const maxRadius = MODEL.geometry.ANTARCTIC_RIM_RADIUS;

    // Generate stations in roughly concentric pattern
    for (let i = 0; i < count; i++) {
      // Bias toward mid-latitudes (where most stations actually are)
      const r_normalized = Math.pow(Math.random(), 0.7); // Bias toward outer regions
      const r = r_normalized * maxRadius;
      const theta = Math.random() * 2 * Math.PI;

      const position: PolarCoord = { r, theta };

      this.stations.push({
        id: `GPS_${i.toString().padStart(4, '0')}`,
        name: this.generateStationName(r, theta),
        position: { ...position },
        initialPosition: { ...position },
        velocity: this.calculateVelocity(position),
        displacement: { x: 0, y: 0 },
      });
    }
  }

  /**
   * Generate realistic station name based on location
   */
  private generateStationName(r: number, theta: number): string {
    // Map radius to approximate latitude
    const lat = 90 - (r / MODEL.geometry.ANTARCTIC_RIM_RADIUS) * 180;

    // Determine region
    if (lat > 60) return 'Arctic Station';
    if (lat > 45) return 'Northern Station';
    if (lat > 23.5) return 'Mid-North Station';
    if (lat > 0) return 'Tropical Station';
    if (lat > -23.5) return 'South Tropical Station';
    if (lat > -35) return 'Mid-South Station';
    if (lat > -50) return 'Southern Station';
    return 'Antarctic Station';
  }

  /**
   * Calculate expansion velocity for station at position
   * v(r) = kr (radial outward)
   */
  private calculateVelocity(pos: PolarCoord): Vector2 {
    const speed = this.expansionRate * pos.r; // meters/year

    // Velocity is purely radial
    return {
      x: speed * Math.cos(pos.theta),
      y: speed * Math.sin(pos.theta),
    };
  }

  /**
   * Update all station positions based on expansion
   */
  updatePositions(deltaTime: number): void {
    for (const station of this.stations) {
      // Update radial position
      const expansionFactor = 1 + this.expansionRate * deltaTime * 1000 / 1000;
      station.position.r *= expansionFactor;

      // Recalculate velocity
      station.velocity = this.calculateVelocity(station.position);

      // Calculate displacement from initial position
      const initialCart = polarToCartesian(station.initialPosition);
      const currentCart = polarToCartesian(station.position);

      station.displacement = {
        x: currentCart.x - initialCart.x,
        y: currentCart.y - initialCart.y,
      };
    }
  }

  /**
   * Get all stations
   */
  getStations(): GPSStation[] {
    return this.stations;
  }

  /**
   * Get stations within a specific radius range
   */
  getStationsInRange(minR: number, maxR: number): GPSStation[] {
    return this.stations.filter((s) => s.position.r >= minR && s.position.r <= maxR);
  }

  /**
   * Analyze radial displacement pattern
   * Should show linear relationship: displacement ∝ radius
   */
  analyzeDisplacementPattern(): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const data: Array<{ r: number; displacement: number }> = [];

    for (const station of this.stations) {
      const disp = Math.sqrt(
        station.displacement!.x ** 2 + station.displacement!.y ** 2
      );
      data.push({ r: station.initialPosition.r, displacement: disp });
    }

    // Simple linear regression
    const n = data.length;
    const sumX = data.reduce((sum, p) => sum + p.r, 0);
    const sumY = data.reduce((sum, p) => sum + p.displacement, 0);
    const sumXY = data.reduce((sum, p) => sum + p.r * p.displacement, 0);
    const sumX2 = data.reduce((sum, p) => sum + p.r * p.r, 0);
    const sumY2 = data.reduce((sum, p) => sum + p.displacement * p.displacement, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    const ssTotal = data.reduce((sum, p) => sum + (p.displacement - yMean) ** 2, 0);
    const ssResidual = data.reduce((sum, p) => {
      const predicted = slope * p.r + intercept;
      return sum + (p.displacement - predicted) ** 2;
    }, 0);
    const rSquared = 1 - ssResidual / ssTotal;

    return { slope, intercept, rSquared };
  }

  /**
   * Get stations showing anomalous behavior (for debugging/validation)
   */
  getAnomalousStations(threshold: number = 2.0): GPSStation[] {
    const pattern = this.analyzeDisplacementPattern();

    return this.stations.filter((station) => {
      const disp = Math.sqrt(
        station.displacement!.x ** 2 + station.displacement!.y ** 2
      );
      const expected = pattern.slope * station.initialPosition.r + pattern.intercept;
      const deviation = Math.abs(disp - expected);
      return deviation > threshold;
    });
  }

  /**
   * Get displacement statistics
   */
  getDisplacementStats(): {
    mean: number;
    max: number;
    min: number;
    stdDev: number;
  } {
    const displacements = this.stations.map((s) =>
      Math.sqrt(s.displacement!.x ** 2 + s.displacement!.y ** 2)
    );

    const mean = displacements.reduce((a, b) => a + b, 0) / displacements.length;
    const max = Math.max(...displacements);
    const min = Math.min(...displacements);

    const variance =
      displacements.reduce((sum, d) => sum + (d - mean) ** 2, 0) / displacements.length;
    const stdDev = Math.sqrt(variance);

    return { mean, max, min, stdDev };
  }

  /**
   * Generate mock real-world GPS data for validation
   * Based on actual displacement patterns observed (2018-2025)
   */
  generateRealisticStations(): void {
    this.stations = [];

    // Northern stations (uplift near center)
    this.addStation('SVALBARD', 1000, 0.5, 0.002, 0.001); // +2mm/yr vertical
    this.addStation('REYKJAVIK', 2000, 0.3, 0.001, 0.0005);

    // Mid-latitude northern
    this.addStation('LONDON', 6000, 0.15, 0.0005, 0);
    this.addStation('TOKYO', 6500, 2.5, 0.0004, 0);

    // Equatorial
    this.addStation('NAIROBI', 10000, 0.6, 0, -0.0005);

    // Southern stations (subsidence near rim)
    this.addStation('CAPE_TOWN', 13500, 0.35, -0.03, -0.001); // -1mm/yr vertical
    this.addStation('SYDNEY', 14000, 2.6, -0.002, -0.0015);
    this.addStation('SANTIAGO', 15000, -1.2, -0.004, -0.002);
    this.addStation('ANTARCTIC_BASE', 19000, 0, -0.005, -0.003); // -5mm/yr vertical

    // Calculate velocities for all
    this.stations.forEach((station) => {
      station.velocity = this.calculateVelocity(station.position);
    });
  }

  /**
   * Helper to add named station
   */
  private addStation(
    name: string,
    r: number,
    theta: number,
    radialDisp: number,
    verticalDisp: number
  ): void {
    const position: PolarCoord = { r, theta };

    // Convert displacement to Cartesian
    const displacement: Vector2 = {
      x: radialDisp * Math.cos(theta),
      y: radialDisp * Math.sin(theta),
    };

    this.stations.push({
      id: name,
      name: name.replace(/_/g, ' '),
      position: { ...position },
      initialPosition: { ...position },
      velocity: { x: 0, y: 0 }, // Will be calculated
      displacement,
    });
  }

  /**
   * Set expansion rate
   */
  setExpansionRate(rate: number): void {
    this.expansionRate = rate;

    // Recalculate velocities for all stations
    this.stations.forEach((station) => {
      station.velocity = this.calculateVelocity(station.position);
    });
  }

  /**
   * Reset all stations to initial positions
   */
  reset(): void {
    this.stations.forEach((station) => {
      station.position = { ...station.initialPosition };
      station.displacement = { x: 0, y: 0 };
      station.velocity = this.calculateVelocity(station.position);
    });
  }

  /**
   * Get station count
   */
  getStationCount(): number {
    return this.stations.length;
  }
}

/**
 * Validate GPS displacement against expansion model
 * Returns true if pattern matches radial expansion
 */
export function validateExpansionPattern(stations: GPSStation[]): {
  isValid: boolean;
  confidence: number;
  pattern: string;
} {
  // Calculate whether displacements are predominantly radial
  let radialCount = 0;

  for (const station of stations) {
    if (!station.displacement) continue;

    const stationCart = polarToCartesian(station.initialPosition);
    const dispMag = Math.sqrt(
      station.displacement.x ** 2 + station.displacement.y ** 2
    );

    if (dispMag === 0) continue;

    // Check if displacement is in radial direction
    const radialDir = {
      x: stationCart.x / Math.sqrt(stationCart.x ** 2 + stationCart.y ** 2),
      y: stationCart.y / Math.sqrt(stationCart.x ** 2 + stationCart.y ** 2),
    };

    const dispDir = {
      x: station.displacement.x / dispMag,
      y: station.displacement.y / dispMag,
    };

    const dotProduct = radialDir.x * dispDir.x + radialDir.y * dispDir.y;

    // If dot product > 0.8, displacement is mostly radial
    if (dotProduct > 0.8) {
      radialCount++;
    }
  }

  const radialRatio = radialCount / stations.length;

  return {
    isValid: radialRatio > 0.75, // 75% threshold
    confidence: radialRatio,
    pattern: radialRatio > 0.75 ? 'radial_expansion' : 'mixed',
  };
}
