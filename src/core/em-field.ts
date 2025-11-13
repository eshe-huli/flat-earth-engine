/**
 * Electromagnetic Field Module
 * Implements toroidal field: B(r,θ) = (B₀/r²)[cos(θ)r̂ + sin(θ)θ̂]
 */

import type { Vector2, PolarCoord, Streamline } from '../types';
import { MODEL } from '../constants';
import { polarToCartesian, normalize, magnitude } from './geometry';

export class EMFieldSolver {
  private B0: number; // Field strength at source

  constructor(fieldStrength: number = MODEL.electromagnetic.VORTEX_STRENGTH_B0) {
    this.B0 = fieldStrength;
  }

  /**
   * Calculate electromagnetic field vector at polar position
   * Returns field in polar basis (B_r, B_theta)
   */
  getFieldVectorPolar(pos: PolarCoord): { B_r: number; B_theta: number } {
    // Avoid singularity at center
    const r = Math.max(pos.r, 0.1);

    // Toroidal field: B(r,θ) = (B₀/r²)[cos(θ)r̂ + sin(θ)θ̂]
    const magnitude = this.B0 / (r * r);

    return {
      B_r: magnitude * Math.cos(pos.theta),
      B_theta: magnitude * Math.sin(pos.theta),
    };
  }

  /**
   * Calculate electromagnetic field vector in Cartesian coordinates
   */
  getFieldVectorCartesian(pos: Vector2): Vector2 {
    // Convert to polar
    const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    const theta = Math.atan2(pos.y, pos.x);

    // Get field in polar basis
    const field = this.getFieldVectorPolar({ r, theta });

    // Convert field from polar to Cartesian
    // B_x = B_r * cos(θ) - B_θ * sin(θ)
    // B_y = B_r * sin(θ) + B_θ * cos(θ)
    return {
      x: field.B_r * Math.cos(theta) - field.B_theta * Math.sin(theta),
      y: field.B_r * Math.sin(theta) + field.B_theta * Math.cos(theta),
    };
  }

  /**
   * Get field magnitude at position
   */
  getFieldMagnitude(pos: PolarCoord): number {
    const field = this.getFieldVectorPolar(pos);
    return Math.sqrt(field.B_r * field.B_r + field.B_theta * field.B_theta);
  }

  /**
   * Generate streamlines by integrating along field lines
   * Uses RK4 (Runge-Kutta 4th order) integration
   */
  generateStreamlines(
    count: number,
    startRadius: number = 100,
    maxSteps: number = 200,
    stepSize: number = 10
  ): Streamline[] {
    const streamlines: Streamline[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const startPos: Vector2 = {
        x: startRadius * Math.cos(angle),
        y: startRadius * Math.sin(angle),
      };

      const points = this.integrateStreamline(startPos, maxSteps, stepSize);
      streamlines.push({
        points,
        color: `rgba(92, 107, 192, ${0.3 + (i % 3) * 0.2})`,
        thickness: 1,
      });
    }

    return streamlines;
  }

  /**
   * Integrate single streamline using RK4
   */
  private integrateStreamline(
    start: Vector2,
    maxSteps: number,
    stepSize: number
  ): Vector2[] {
    const points: Vector2[] = [{ ...start }];
    let current = { ...start };

    for (let step = 0; step < maxSteps; step++) {
      // RK4 integration
      const k1 = this.getFieldVectorCartesian(current);
      const k1_norm = normalize(k1);

      const mid1 = {
        x: current.x + (stepSize / 2) * k1_norm.x,
        y: current.y + (stepSize / 2) * k1_norm.y,
      };
      const k2 = this.getFieldVectorCartesian(mid1);
      const k2_norm = normalize(k2);

      const mid2 = {
        x: current.x + (stepSize / 2) * k2_norm.x,
        y: current.y + (stepSize / 2) * k2_norm.y,
      };
      const k3 = this.getFieldVectorCartesian(mid2);
      const k3_norm = normalize(k3);

      const end = {
        x: current.x + stepSize * k3_norm.x,
        y: current.y + stepSize * k3_norm.y,
      };
      const k4 = this.getFieldVectorCartesian(end);
      const k4_norm = normalize(k4);

      // Weighted average
      current = {
        x: current.x + (stepSize / 6) * (k1_norm.x + 2 * k2_norm.x + 2 * k3_norm.x + k4_norm.x),
        y: current.y + (stepSize / 6) * (k1_norm.y + 2 * k2_norm.y + 2 * k3_norm.y + k4_norm.y),
      };

      points.push({ ...current });

      // Stop if too far from origin or reached rim
      const r = Math.sqrt(current.x * current.x + current.y * current.y);
      if (r > MODEL.geometry.ANTARCTIC_RIM_RADIUS || r < 1) {
        break;
      }
    }

    return points;
  }

  /**
   * Generate field texture for GPU rendering
   * Returns RGBA array where RGB = normalized field direction, A = magnitude
   */
  generateFieldTexture(resolution: number): Float32Array {
    const data = new Float32Array(resolution * resolution * 4);
    const maxRadius = MODEL.geometry.ANTARCTIC_RIM_RADIUS;

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Map to world coordinates
        const worldX = ((x / resolution) - 0.5) * maxRadius * 2;
        const worldY = ((y / resolution) - 0.5) * maxRadius * 2;

        const field = this.getFieldVectorCartesian({ x: worldX, y: worldY });
        const mag = magnitude(field);
        const normalized = mag > 0 ? normalize(field) : { x: 0, y: 0 };

        const index = (y * resolution + x) * 4;
        data[index + 0] = normalized.x * 0.5 + 0.5; // Remap to [0,1]
        data[index + 1] = normalized.y * 0.5 + 0.5; // Remap to [0,1]
        data[index + 2] = 0; // Unused
        data[index + 3] = Math.min(mag / 100, 1.0); // Magnitude
      }
    }

    return data;
  }

  /**
   * Set field strength
   */
  setFieldStrength(strength: number): void {
    this.B0 = strength;
  }

  /**
   * Get current field strength
   */
  getFieldStrength(): number {
    return this.B0;
  }
}

/**
 * Calculate electromagnetic "gravity" force
 * F_em = q × E(z)
 */
export function calculateEMGravity(
  charge: number,
  height: number,
  surfaceFieldStrength: number = 9.81
): number {
  // Simple linear model for vertical field
  // E(z) decreases with height
  const E_z = surfaceFieldStrength * Math.exp(-height / 10000); // 10km scale height
  return charge * E_z;
}
