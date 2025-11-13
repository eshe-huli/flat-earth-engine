/**
 * Geometric utilities for polar coordinate system
 */

import type { Vector2, Vector3, PolarCoord, PolarCoord3D } from '../types';

/**
 * Convert polar coordinates to Cartesian (2D)
 */
export function polarToCartesian(polar: PolarCoord): Vector2 {
  return {
    x: polar.r * Math.cos(polar.theta),
    y: polar.r * Math.sin(polar.theta),
  };
}

/**
 * Convert Cartesian coordinates to polar (2D)
 */
export function cartesianToPolar(vec: Vector2): PolarCoord {
  return {
    r: Math.sqrt(vec.x * vec.x + vec.y * vec.y),
    theta: Math.atan2(vec.y, vec.x),
  };
}

/**
 * Convert polar coordinates to Cartesian (3D)
 */
export function polarToCartesian3D(polar: PolarCoord3D): Vector3 {
  return {
    x: polar.r * Math.cos(polar.theta),
    y: polar.r * Math.sin(polar.theta),
    z: polar.z,
  };
}

/**
 * Normalize angle to [0, 2π]
 */
export function normalizeAngle(theta: number): number {
  const TWO_PI = 2 * Math.PI;
  return ((theta % TWO_PI) + TWO_PI) % TWO_PI;
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smooth step function
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Calculate distance between two polar points
 */
export function polarDistance(p1: PolarCoord, p2: PolarCoord): number {
  // Convert to Cartesian and calculate Euclidean distance
  const c1 = polarToCartesian(p1);
  const c2 = polarToCartesian(p2);
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angular difference (shortest arc)
 */
export function angularDifference(theta1: number, theta2: number): number {
  let diff = theta2 - theta1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

/**
 * Vector magnitude
 */
export function magnitude(vec: Vector2): number {
  return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

/**
 * Vector normalization
 */
export function normalize(vec: Vector2): Vector2 {
  const mag = magnitude(vec);
  if (mag === 0) return { x: 0, y: 0 };
  return {
    x: vec.x / mag,
    y: vec.y / mag,
  };
}

/**
 * Vector dot product
 */
export function dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * Vector addition
 */
export function add(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
}

/**
 * Vector subtraction
 */
export function subtract(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

/**
 * Vector scaling
 */
export function scale(vec: Vector2, scalar: number): Vector2 {
  return {
    x: vec.x * scalar,
    y: vec.y * scalar,
  };
}

/**
 * Approximate latitude from radius (for display purposes)
 * Note: This is a rough mapping for the flat Earth model
 */
export function radiusToLatitude(r: number, maxRadius: number): number {
  // Map radius to latitude-like values
  // 0 km → 90°N (North Pole)
  // maxRadius → -90°S (Antarctic rim)
  return 90 - (r / maxRadius) * 180;
}

/**
 * Check if point is within Antarctic boundary
 */
export function isInsideAntarcticRim(r: number, rimRadius: number): boolean {
  return r <= rimRadius;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
