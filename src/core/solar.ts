/**
 * Solar Motion Module
 * Simulates local sun moving in spiral path above the plane
 */

import type { Vector3, Vector2, PolarCoord3D } from '../types';
import { MODEL, PHYSICS } from '../constants';
import { smoothstep } from './geometry';

export class SolarSimulator {
  private altitude: number; // km
  private period: number; // days
  private dailyPeriod: number; // hours

  constructor() {
    this.altitude = MODEL.solar.ALTITUDE;
    this.period = MODEL.solar.ORBITAL_PERIOD;
    this.dailyPeriod = MODEL.solar.DAILY_PERIOD;
  }

  /**
   * Get sun position at time t (in days)
   * Formula: r_sun(t) = r₀ + A × sin(2πt/T)
   */
  getSunPosition(t: number): Vector3 {
    // Annual cycle (which tropic the sun is near)
    const yearProgress = (t % this.period) / this.period;
    const annualAngle = yearProgress * 2 * Math.PI;

    // Radial position oscillates between tropics
    const r_min = MODEL.solar.TROPIC_CANCER_RADIUS; // Summer solstice
    const r_max = MODEL.solar.TROPIC_CAPRICORN_RADIUS; // Winter solstice
    const r_mean = (r_min + r_max) / 2;
    const r_amplitude = (r_max - r_min) / 2;

    const r = r_mean + r_amplitude * Math.sin(annualAngle);

    // Daily rotation (sun moving in circle at radius r)
    const dayProgress = (t % 1); // Fractional day
    const dailyAngle = dayProgress * 2 * Math.PI;

    // Small vertical oscillation for analemma effect
    const verticalAmplitude = 100; // km
    const z = this.altitude + verticalAmplitude * Math.sin(annualAngle);

    return {
      x: r * Math.cos(dailyAngle),
      y: r * Math.sin(dailyAngle),
      z: z,
    };
  }

  /**
   * Get sun position in polar coordinates
   */
  getSunPositionPolar(t: number): PolarCoord3D {
    const pos = this.getSunPosition(t);
    const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    const theta = Math.atan2(pos.y, pos.x);

    return { r, theta, z: pos.z };
  }

  /**
   * Calculate illumination intensity at surface position
   * Returns value between 0 (night) and 1 (full daylight)
   */
  getIlluminationIntensity(surfacePos: Vector2, time: number): number {
    const sunPos = this.getSunPosition(time);

    // Planar distance from sun
    const dx = surfacePos.x - sunPos.x;
    const dy = surfacePos.y - sunPos.y;
    const horizontalDist = Math.sqrt(dx * dx + dy * dy);

    // Illumination cone radius at ground level
    const coneRadius = sunPos.z * Math.tan(MODEL.solar.ILLUMINATION_ANGLE);

    // Smooth falloff from center to edge of cone
    const innerRadius = coneRadius * 0.6; // Full daylight
    const outerRadius = coneRadius * 1.4; // Complete darkness

    const intensity = 1.0 - smoothstep(innerRadius, outerRadius, horizontalDist);

    // Atmospheric scattering adds some ambient light
    const ambientLight = 0.05;

    return Math.max(intensity, ambientLight);
  }

  /**
   * Check if position is in daylight
   */
  isDaylight(surfacePos: Vector2, time: number, threshold: number = 0.2): boolean {
    return this.getIlluminationIntensity(surfacePos, time) > threshold;
  }

  /**
   * Get sun path for entire year (for visualization)
   * Returns array of positions at regular intervals
   */
  getAnnualSunPath(samples: number = 365): Vector3[] {
    const path: Vector3[] = [];

    for (let i = 0; i < samples; i++) {
      const t = (i / samples) * this.period;
      path.push(this.getSunPosition(t));
    }

    return path;
  }

  /**
   * Get sun path for single day (circle at current radius)
   */
  getDailySunPath(time: number, samples: number = 100): Vector3[] {
    const path: Vector3[] = [];
    const dayStart = Math.floor(time);

    for (let i = 0; i < samples; i++) {
      const t = dayStart + (i / samples);
      path.push(this.getSunPosition(t));
    }

    return path;
  }

  /**
   * Calculate solar noon (when sun is closest to observer)
   */
  getSolarNoon(observerPos: Vector2, date: number): number {
    // Date is in days
    const dayStart = Math.floor(date);

    // Find time during day when sun is closest
    let minDist = Infinity;
    let noonTime = dayStart + 0.5;

    for (let i = 0; i < 144; i++) {
      // 10-minute intervals
      const t = dayStart + i / 144;
      const sunPos = this.getSunPosition(t);
      const dx = sunPos.x - observerPos.x;
      const dy = sunPos.y - observerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) {
        minDist = dist;
        noonTime = t;
      }
    }

    return noonTime;
  }

  /**
   * Calculate day length at observer position and date
   */
  getDayLengthHours(observerPos: Vector2, date: number): number {
    const dayStart = Math.floor(date);
    let sunriseTime = -1;
    let sunsetTime = -1;

    // Sample throughout the day
    for (let i = 0; i < 288; i++) {
      // 5-minute intervals
      const t = dayStart + i / 288;
      const intensity = this.getIlluminationIntensity(observerPos, t);

      if (sunriseTime === -1 && intensity > 0.2) {
        sunriseTime = t;
      }

      if (sunriseTime !== -1 && sunsetTime === -1 && intensity < 0.2) {
        sunsetTime = t;
      }
    }

    if (sunriseTime === -1 || sunsetTime === -1) {
      // Either 24-hour day or 24-hour night
      const middayIntensity = this.getIlluminationIntensity(observerPos, dayStart + 0.5);
      return middayIntensity > 0.2 ? 24 : 0;
    }

    return (sunsetTime - sunriseTime) * 24; // Convert to hours
  }

  /**
   * Get season name at given time
   */
  getSeason(time: number): string {
    const yearProgress = (time % this.period) / this.period;

    if (yearProgress < 0.25) return 'Spring Equinox → Summer Solstice';
    if (yearProgress < 0.5) return 'Summer Solstice → Autumn Equinox';
    if (yearProgress < 0.75) return 'Autumn Equinox → Winter Solstice';
    return 'Winter Solstice → Spring Equinox';
  }

  /**
   * Set sun altitude
   */
  setAltitude(altitude: number): void {
    this.altitude = altitude;
  }

  /**
   * Get current sun altitude
   */
  getAltitude(): number {
    return this.altitude;
  }
}

/**
 * Calculate analemma data points (figure-8 pattern)
 */
export function calculateAnalemma(
  observerPos: Vector2,
  samples: number = 52
): Array<{ azimuth: number; elevation: number; date: number }> {
  const solar = new SolarSimulator();
  const analemma = [];

  for (let week = 0; week < samples; week++) {
    const date = (week / samples) * MODEL.solar.ORBITAL_PERIOD;
    const noonTime = solar.getSolarNoon(observerPos, date);
    const sunPos = solar.getSunPosition(noonTime);

    // Calculate azimuth and elevation from observer
    const dx = sunPos.x - observerPos.x;
    const dy = sunPos.y - observerPos.y;
    const dz = sunPos.z;

    const horizontalDist = Math.sqrt(dx * dx + dy * dy);
    const azimuth = Math.atan2(dy, dx);
    const elevation = Math.atan2(dz, horizontalDist);

    analemma.push({
      azimuth: azimuth * (180 / Math.PI),
      elevation: elevation * (180 / Math.PI),
      date,
    });
  }

  return analemma;
}
