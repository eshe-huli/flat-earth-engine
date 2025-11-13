/**
 * Camera System
 * Handles view transformation, pan, zoom, rotation
 */

import type { CameraState } from '../types';

export class Camera {
  private x: number = 0;
  private y: number = 0;
  private zoom: number = 1.0;
  private rotation: number = 0;
  private aspect: number = 1.0;

  // Zoom limits
  private minZoom: number = 0.1;
  private maxZoom: number = 10.0;

  // View matrix (4x4)
  private viewMatrix: Float32Array = new Float32Array(16);
  private projectionMatrix: Float32Array = new Float32Array(16);
  private viewProjectionMatrix: Float32Array = new Float32Array(16);

  private dirty: boolean = true;

  constructor(aspect: number = 1.0) {
    this.aspect = aspect;
    this.updateMatrices();
  }

  /**
   * Set camera position
   */
  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.dirty = true;
  }

  /**
   * Move camera by offset
   */
  public pan(dx: number, dy: number): void {
    // Adjust pan speed based on zoom (more zoomed in = slower pan)
    const speed = 1.0 / this.zoom;
    this.x += dx * speed;
    this.y += dy * speed;
    this.dirty = true;
  }

  /**
   * Set zoom level
   */
  public setZoom(zoom: number): void {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    this.dirty = true;
  }

  /**
   * Zoom by factor (multiplicative)
   */
  public zoomBy(factor: number): void {
    this.setZoom(this.zoom * factor);
  }

  /**
   * Zoom to specific point (world coordinates)
   */
  public zoomToPoint(worldX: number, worldY: number, factor: number): void {
    // Calculate point in screen space before zoom
    const screenBefore = this.worldToScreen(worldX, worldY);

    // Apply zoom
    this.zoomBy(factor);

    // Calculate point in screen space after zoom
    const screenAfter = this.worldToScreen(worldX, worldY);

    // Pan to keep point in same screen position
    const dx = screenAfter.x - screenBefore.x;
    const dy = screenAfter.y - screenBefore.y;
    this.pan(-dx / this.zoom, -dy / this.zoom);
  }

  /**
   * Set rotation (radians)
   */
  public setRotation(rotation: number): void {
    this.rotation = rotation;
    this.dirty = true;
  }

  /**
   * Rotate by angle (radians)
   */
  public rotate(angle: number): void {
    this.rotation += angle;
    this.dirty = true;
  }

  /**
   * Set aspect ratio
   */
  public setAspect(aspect: number): void {
    this.aspect = aspect;
    this.dirty = true;
  }

  /**
   * Get current state
   */
  public getState(): CameraState {
    return {
      x: this.x,
      y: this.y,
      zoom: this.zoom,
      rotation: this.rotation,
    };
  }

  /**
   * Set state
   */
  public setState(state: CameraState): void {
    this.x = state.x;
    this.y = state.y;
    this.zoom = state.zoom;
    this.rotation = state.rotation;
    this.dirty = true;
  }

  /**
   * Fit view to show entire Earth disk
   */
  public fitEarth(earthRadius: number, padding: number = 1.1): void {
    this.x = 0;
    this.y = 0;
    this.rotation = 0;

    // Calculate zoom to fit Earth with padding
    const viewSize = Math.max(earthRadius * 2 * padding, 1);
    this.zoom = Math.min(this.aspect, 1.0) / viewSize;
    this.dirty = true;
  }

  /**
   * Update matrices if camera changed
   */
  public updateMatrices(): void {
    if (!this.dirty) return;

    // Build orthographic projection matrix
    // Maps world coordinates to NDC [-1, 1]
    const halfWidth = this.aspect / this.zoom;
    const halfHeight = 1.0 / this.zoom;

    this.ortho(
      this.projectionMatrix,
      -halfWidth,
      halfWidth,
      -halfHeight,
      halfHeight,
      -1,
      1
    );

    // Build view matrix (inverse of camera transform)
    this.identity(this.viewMatrix);
    this.translate(this.viewMatrix, -this.x, -this.y, 0);
    this.rotateZ(this.viewMatrix, -this.rotation);

    // Combined view-projection matrix
    this.multiply(this.viewProjectionMatrix, this.projectionMatrix, this.viewMatrix);

    this.dirty = false;
  }

  /**
   * Get view-projection matrix
   */
  public getViewProjectionMatrix(): Float32Array {
    this.updateMatrices();
    return this.viewProjectionMatrix;
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    // Screen is in pixels, convert to NDC [-1, 1]
    // Then apply inverse camera transform

    const ndcX = screenX;
    const ndcY = screenY;

    // Apply inverse projection
    const worldX = (ndcX * this.aspect) / this.zoom;
    const worldY = ndcY / this.zoom;

    // Apply camera transform
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    return {
      x: worldX * cos - worldY * sin + this.x,
      y: worldX * sin + worldY * cos + this.y,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    // Apply inverse camera transform
    const dx = worldX - this.x;
    const dy = worldY - this.y;

    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);

    const rotX = dx * cos - dy * sin;
    const rotY = dx * sin + dy * cos;

    // Apply projection
    return {
      x: (rotX * this.zoom) / this.aspect,
      y: rotY * this.zoom,
    };
  }

  // Matrix utilities

  private identity(out: Float32Array): void {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
  }

  private ortho(
    out: Float32Array,
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): void {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
  }

  private translate(out: Float32Array, x: number, y: number, z: number): void {
    out[12] = out[0] * x + out[4] * y + out[8] * z + out[12];
    out[13] = out[1] * x + out[5] * y + out[9] * z + out[13];
    out[14] = out[2] * x + out[6] * y + out[10] * z + out[14];
    out[15] = out[3] * x + out[7] * y + out[11] * z + out[15];
  }

  private rotateZ(out: Float32Array, angle: number): void {
    const s = Math.sin(angle);
    const c = Math.cos(angle);

    const a00 = out[0];
    const a01 = out[1];
    const a02 = out[2];
    const a03 = out[3];
    const a10 = out[4];
    const a11 = out[5];
    const a12 = out[6];
    const a13 = out[7];

    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
  }

  private multiply(out: Float32Array, a: Float32Array, b: Float32Array): void {
    const a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
    const a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
    const a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
    const a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];

    let b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  }

  public getZoom(): number {
    return this.zoom;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
