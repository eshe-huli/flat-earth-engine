/**
 * GPS Renderer - Renders GPS stations and displacement vectors
 */

import { createBuffer, createVertexArray, UniformManager } from './webgl-utils';
import { Camera } from './camera';
import { GPSSimulator } from '../core/gps';
import { polarToCartesian } from '../core/geometry';
import { COLORS } from '../constants';

export class GPSRenderer {
  private gl: WebGL2RenderingContext;
  private lineProgram: WebGLProgram;

  private stationVAO: WebGLVertexArrayObject | null = null;
  private stationCount: number = 0;

  private vectorVAO: WebGLVertexArrayObject | null = null;
  private vectorCount: number = 0;

  constructor(gl: WebGL2RenderingContext, lineProgram: WebGLProgram) {
    this.gl = gl;
    this.lineProgram = lineProgram;
  }

  public updateStations(gps: GPSSimulator): void {
    const gl = this.gl;
    const stations = gps.getStations();

    if (stations.length === 0) return;

    // Station positions (as points)
    const stationPositions = new Float32Array(stations.length * 2);
    const stationColors = new Float32Array(stations.length * 4);

    for (let i = 0; i < stations.length; i++) {
      const cart = polarToCartesian(stations[i].position);
      stationPositions[i * 2] = cart.x;
      stationPositions[i * 2 + 1] = cart.y;

      // Color based on displacement magnitude
      const dispMag = Math.sqrt(
        (stations[i].displacement?.x || 0) ** 2 +
        (stations[i].displacement?.y || 0) ** 2
      );
      const intensity = Math.min(dispMag / 100, 1.0); // Scale for visibility

      stationColors[i * 4 + 0] = COLORS.GPS.STATION[0];
      stationColors[i * 4 + 1] = COLORS.GPS.STATION[1];
      stationColors[i * 4 + 2] = COLORS.GPS.STATION[2];
      stationColors[i * 4 + 3] = 0.5 + intensity * 0.5;
    }

    const posBuffer = createBuffer(gl, stationPositions);
    const colorBuffer = createBuffer(gl, stationColors);

    if (this.stationVAO) {
      gl.deleteVertexArray(this.stationVAO);
    }

    this.stationVAO = createVertexArray(gl, this.lineProgram, [
      { name: 'a_position', buffer: posBuffer, size: 2 },
      { name: 'a_color', buffer: colorBuffer, size: 4 }
    ]);

    this.stationCount = stations.length;

    // Build displacement vectors (arrows)
    this.updateVectors(stations);
  }

  private updateVectors(stations: any[]): void {
    const gl = this.gl;

    // Each vector is 3 lines: shaft + 2 arrowhead lines
    const vectorPositions: number[] = [];
    const vectorColors: number[] = [];

    const arrowScale = 500; // Scale factor for visibility

    for (const station of stations) {
      if (!station.displacement) continue;

      const start = polarToCartesian(station.position);
      const disp = station.displacement;

      // Skip if displacement is tiny
      if (Math.abs(disp.x) < 0.001 && Math.abs(disp.y) < 0.001) continue;

      const endX = start.x + disp.x * arrowScale;
      const endY = start.y + disp.y * arrowScale;

      // Shaft line
      vectorPositions.push(start.x, start.y, endX, endY);

      // Arrowhead (two lines at 30° angles)
      const angle = Math.atan2(disp.y, disp.x);
      const arrowLength = 50;
      const arrowAngle = Math.PI / 6; // 30 degrees

      // Left arrowhead line
      const leftX = endX - arrowLength * Math.cos(angle - arrowAngle);
      const leftY = endY - arrowLength * Math.sin(angle - arrowAngle);
      vectorPositions.push(endX, endY, leftX, leftY);

      // Right arrowhead line
      const rightX = endX - arrowLength * Math.cos(angle + arrowAngle);
      const rightY = endY - arrowLength * Math.sin(angle + arrowAngle);
      vectorPositions.push(endX, endY, rightX, rightY);

      // Colors (orange for displacement vectors)
      for (let i = 0; i < 6; i++) {
        vectorColors.push(...COLORS.GPS.VECTOR);
      }
    }

    if (vectorPositions.length === 0) return;

    const posBuffer = createBuffer(gl, new Float32Array(vectorPositions));
    const colorBuffer = createBuffer(gl, new Float32Array(vectorColors));

    if (this.vectorVAO) {
      gl.deleteVertexArray(this.vectorVAO);
    }

    this.vectorVAO = createVertexArray(gl, this.lineProgram, [
      { name: 'a_position', buffer: posBuffer, size: 2 },
      { name: 'a_color', buffer: colorBuffer, size: 4 }
    ]);

    this.vectorCount = vectorPositions.length / 2;
  }

  public renderStations(camera: Camera): void {
    if (!this.stationVAO || this.stationCount === 0) return;

    const gl = this.gl;

    gl.useProgram(this.lineProgram);

    const uniforms = new UniformManager(gl, this.lineProgram);
    uniforms.setMat4('u_viewProjection', camera.getViewProjectionMatrix());

    gl.bindVertexArray(this.stationVAO);
    gl.drawArrays(gl.POINTS, 0, this.stationCount);
    gl.bindVertexArray(null);
  }

  public renderVectors(camera: Camera): void {
    if (!this.vectorVAO || this.vectorCount === 0) return;

    const gl = this.gl;

    gl.useProgram(this.lineProgram);
    gl.lineWidth(2.0);

    const uniforms = new UniformManager(gl, this.lineProgram);
    uniforms.setMat4('u_viewProjection', camera.getViewProjectionMatrix());

    gl.bindVertexArray(this.vectorVAO);
    gl.drawArrays(gl.LINES, 0, this.vectorCount);
    gl.bindVertexArray(null);
  }

  public dispose(): void {
    const gl = this.gl;
    if (this.stationVAO) gl.deleteVertexArray(this.stationVAO);
    if (this.vectorVAO) gl.deleteVertexArray(this.vectorVAO);
  }
}
