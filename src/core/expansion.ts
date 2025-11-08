/**
 * Expansion Engine - Calculates radial expansion mechanics
 * Based on: r'(t) = r₀(1 + kt)
 */

import type { PolarCoord, Vector2 } from '../types';
import { MODEL, PHYSICS } from '../constants';

export class ExpansionEngine {
  private k: number; // Expansion constant (meters/year)
  private t0: number = 0; // Reference time (years)

  constructor(expansionRate: number = MODEL.expansion.RATE) {
    this.k = expansionRate;
  }

  /**
   * Get expanded radius at time t
   * Formula: r'(t) = r₀(1 + kt)
   */
  getExpandedRadius(r0: number, t: number): number {
    return r0 * (1 + this.k * (t - this.t0) * PHYSICS.KM_TO_METERS / 1000);
  }

  /**
   * Get expansion velocity at radius r
   * Formula: v(r) = kr
   */
  getExpansionVelocity(r: number): number {
    return this.k * r; // meters/year
  }

  /**
   * Get expansion vector at polar position
   * Returns radial velocity vector in Cartesian coordinates
   */
  getExpansionVector(pos: PolarCoord): Vector2 {
    const speed = this.getExpansionVelocity(pos.r);

    // Velocity is purely radial (outward from center)
    return {
      x: speed * Math.cos(pos.theta),
      y: speed * Math.sin(pos.theta),
    };
  }

  /**
   * Update position based on expansion over time delta
   */
  updatePosition(pos: PolarCoord, dt: number): PolarCoord {
    const newR = this.getExpandedRadius(pos.r, dt);
    return {
      r: newR,
      theta: pos.theta, // Angular position unchanged
    };
  }

  /**
   * Calculate moment of inertia scaling factor
   * I ∝ r², so I(t) = I₀(1 + kt)²
   */
  getMomentOfInertiaScale(t: number): number {
    const scale = 1 + this.k * t * PHYSICS.KM_TO_METERS / 1000;
    return scale * scale;
  }

  /**
   * Calculate day length increase due to moment of inertia growth
   * Angular momentum L = Iω is conserved, so ω decreases as I increases
   */
  getDayLength(t: number): number {
    const I_scale = this.getMomentOfInertiaScale(t);
    // ω(t) = ω₀ / I_scale
    // Day length scales with I_scale
    return PHYSICS.DAY_LENGTH_BASE * I_scale;
  }

  /**
   * Calculate total displacement from reference time
   */
  getTotalDisplacement(r0: number, t: number): number {
    const r_final = this.getExpandedRadius(r0, t);
    return r_final - r0;
  }

  /**
   * Set expansion rate
   */
  setExpansionRate(rate: number): void {
    this.k = rate;
  }

  /**
   * Get current expansion rate
   */
  getExpansionRate(): number {
    return this.k;
  }

  /**
   * Reset reference time
   */
  resetTime(): void {
    this.t0 = 0;
  }

  /**
   * Extrapolate continental separation
   * Useful for visualizing Pangaea breakup scenario
   */
  getHistoricalRadius(currentRadius: number, yearsAgo: number): number {
    // Go backwards in time
    return currentRadius / (1 + this.k * yearsAgo * PHYSICS.KM_TO_METERS / 1000);
  }
}

/**
 * Calculate GPS station displacement over time period
 */
export function calculateGPSDisplacement(
  initialPos: PolarCoord,
  timespan: number,
  expansionRate: number
): Vector2 {
  const engine = new ExpansionEngine(expansionRate);

  // Calculate displacement in polar coords
  const finalR = engine.getExpandedRadius(initialPos.r, timespan);
  const dr = finalR - initialPos.r;

  // Convert to Cartesian displacement vector
  return {
    x: dr * Math.cos(initialPos.theta),
    y: dr * Math.sin(initialPos.theta),
  };
}

/**
 * Predict future radius based on expansion model
 */
export function predictFutureRadius(
  currentRadius: number,
  years: number,
  expansionRate: number = MODEL.expansion.RATE
): number {
  const engine = new ExpansionEngine(expansionRate);
  return engine.getExpandedRadius(currentRadius, years);
}

/**
 * Calculate when a region will reach a target radius
 */
export function timeToReachRadius(
  currentRadius: number,
  targetRadius: number,
  expansionRate: number = MODEL.expansion.RATE
): number {
  // r' = r₀(1 + kt)
  // t = (r'/r₀ - 1) / k
  const ratio = targetRadius / currentRadius;
  return ((ratio - 1) / expansionRate) * 1000 / PHYSICS.KM_TO_METERS;
}
