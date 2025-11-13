/**
 * Solar Renderer - Renders sun position and day/night illumination
 */

import { createBuffer, createVertexArray, UniformManager, generateCircleVertices } from './webgl-utils';
import { Camera } from './camera';
import { SolarSimulator } from '../core/solar';
import { MODEL, COLORS } from '../constants';
import type { Vector3 } from '../types';

export class SolarRenderer {
  private gl: WebGL2RenderingContext;
  private solarProgram: WebGLProgram;
  private lineProgram: WebGLProgram;

  // Sun illumination overlay (reuses Earth geometry)
  private illuminationVAO: WebGLVertexArrayObject | null = null;
  private illuminationIndexCount: number = 0;

  // Sun marker
  private sunVAO: WebGLVertexArrayObject | null = null;
  private sunIndexCount: number = 0;

  // Sun path line
  private sunPathVAO: WebGLVertexArrayObject | null = null;
  private sunPathCount: number = 0;

  constructor(
    gl: WebGL2RenderingContext,
    solarProgram: WebGLProgram,
    lineProgram: WebGLProgram,
    earthVAO: WebGLVertexArrayObject,
    earthIndexCount: number
  ) {
    this.gl = gl;
    this.solarProgram = solarProgram;
    this.lineProgram = lineProgram;
    this.illuminationVAO = earthVAO;
    this.illuminationIndexCount = earthIndexCount;

    this.setupSunMarker();
  }

  private setupSunMarker(): void {
    const gl = this.gl;

    // Create small circle for sun
    const geom = generateCircleVertices(16, 150); // 150 km radius sun marker

    const posBuffer = createBuffer(gl, geom.positions);
    const indexBuffer = createBuffer(gl, geom.indices, gl.ELEMENT_ARRAY_BUFFER);

    this.sunVAO = createVertexArray(gl, this.lineProgram, [
      { name: 'a_position', buffer: posBuffer, size: 2 }
    ]);

    this.sunIndexCount = geom.indices.length;

    gl.bindVertexArray(this.sunVAO);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bindVertexArray(null);
  }

  public updateSunPath(solar: SolarSimulator, time: number): void {
    const gl = this.gl;

    // Get daily sun path
    const path = solar.getDailySunPath(time, 100);

    // Convert to 2D positions
    const positions = new Float32Array(path.length * 2);
    for (let i = 0; i < path.length; i++) {
      positions[i * 2] = path[i].x;
      positions[i * 2 + 1] = path[i].y;
    }

    const posBuffer = createBuffer(gl, positions);

    // Create color buffer (yellow path)
    const colors = new Float32Array(path.length * 4);
    for (let i = 0; i < path.length; i++) {
      colors[i * 4 + 0] = COLORS.SOLAR.SUN[0];
      colors[i * 4 + 1] = COLORS.SOLAR.SUN[1];
      colors[i * 4 + 2] = COLORS.SOLAR.SUN[2];
      colors[i * 4 + 3] = 0.3; // Semi-transparent
    }
    const colorBuffer = createBuffer(gl, colors);

    if (this.sunPathVAO) {
      gl.deleteVertexArray(this.sunPathVAO);
    }

    this.sunPathVAO = createVertexArray(gl, this.lineProgram, [
      { name: 'a_position', buffer: posBuffer, size: 2 },
      { name: 'a_color', buffer: colorBuffer, size: 4 }
    ]);

    this.sunPathCount = path.length;
  }

  public renderIllumination(camera: Camera, sunPos: Vector3): void {
    const gl = this.gl;

    gl.useProgram(this.solarProgram);

    const uniforms = new UniformManager(gl, this.solarProgram);
    uniforms.setMat4('u_viewProjection', camera.getViewProjectionMatrix());
    uniforms.setVec3('u_sunPosition', sunPos.x, sunPos.y, sunPos.z);
    uniforms.setFloat('u_illuminationAngle', MODEL.solar.ILLUMINATION_ANGLE);
    uniforms.setVec4('u_dayColor', ...COLORS.SOLAR.DAY);
    uniforms.setVec4('u_nightColor', ...COLORS.SOLAR.NIGHT);
    uniforms.setFloat('u_maxRadius', MODEL.geometry.ANTARCTIC_RIM_RADIUS);

    gl.bindVertexArray(this.illuminationVAO);
    gl.drawElements(gl.TRIANGLES, this.illuminationIndexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  public renderSunMarker(camera: Camera, sunPos: Vector3): void {
    const gl = this.gl;

    gl.useProgram(this.lineProgram);

    // Create transform matrix for sun position
    const vpMatrix = camera.getViewProjectionMatrix();
    const sunMatrix = new Float32Array(16);

    // Copy view-projection matrix
    sunMatrix.set(vpMatrix);

    // Add translation for sun position
    sunMatrix[12] += sunPos.x * vpMatrix[0];
    sunMatrix[13] += sunPos.y * vpMatrix[5];

    const uniforms = new UniformManager(gl, this.lineProgram);
    uniforms.setMat4('u_viewProjection', sunMatrix);

    // Set sun color (bright yellow)
    const colorLocation = gl.getUniformLocation(this.lineProgram, 'u_color');
    if (colorLocation) {
      gl.uniform4fv(colorLocation, COLORS.SOLAR.SUN);
    }

    gl.bindVertexArray(this.sunVAO);
    gl.drawElements(gl.TRIANGLES, this.sunIndexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  public renderSunPath(camera: Camera): void {
    if (!this.sunPathVAO) return;

    const gl = this.gl;

    gl.useProgram(this.lineProgram);
    gl.lineWidth(2.0);

    const uniforms = new UniformManager(gl, this.lineProgram);
    uniforms.setMat4('u_viewProjection', camera.getViewProjectionMatrix());

    gl.bindVertexArray(this.sunPathVAO);
    gl.drawArrays(gl.LINE_LOOP, 0, this.sunPathCount);
    gl.bindVertexArray(null);
  }

  public dispose(): void {
    const gl = this.gl;
    if (this.sunVAO) gl.deleteVertexArray(this.sunVAO);
    if (this.sunPathVAO) gl.deleteVertexArray(this.sunPathVAO);
  }
}
