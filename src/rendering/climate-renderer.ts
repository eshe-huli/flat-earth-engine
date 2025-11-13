/**
 * Climate Renderer
 * Renders climate zones and temperature anomaly visualization
 */

import type { Camera } from './camera';
import type { ClimateModel } from '../core/climate';
import type { ClimateEvent } from '../types';
import { UniformManager, createBuffer, createVertexArray } from './webgl-utils';
import { MODEL } from '../constants';

export class ClimateRenderer {
  private gl: WebGL2RenderingContext;
  private climateProgram: WebGLProgram;
  private lineProgram: WebGLProgram;
  private earthVAO: WebGLVertexArrayObject;
  private indexCount: number;

  // Climate event markers
  private eventVAOs: WebGLVertexArrayObject[] = [];
  private eventCounts: number[] = [];
  private events: ClimateEvent[] = [];

  // Visualization mode
  private visualizationMode: number = 0; // 0=zones, 1=anomaly

  constructor(
    gl: WebGL2RenderingContext,
    climateProgram: WebGLProgram,
    lineProgram: WebGLProgram,
    earthVAO: WebGLVertexArrayObject,
    indexCount: number
  ) {
    this.gl = gl;
    this.climateProgram = climateProgram;
    this.lineProgram = lineProgram;
    this.earthVAO = earthVAO;
    this.indexCount = indexCount;
  }

  /**
   * Render climate zone overlay
   */
  public renderOverlay(
    camera: Camera,
    time: number,
    expansionRate: number,
    climate: ClimateModel
  ): void {
    const gl = this.gl;
    gl.useProgram(this.climateProgram);

    const uniforms = new UniformManager(gl, this.climateProgram);
    uniforms.setMat4('u_viewProjection', camera.getViewProjectionMatrix());
    uniforms.setFloat('u_time', time);
    uniforms.setFloat('u_expansionRate', expansionRate / 100);
    uniforms.setInt('u_visualizationMode', this.visualizationMode);

    // Set climate zone boundaries
    uniforms.setFloat('u_heatingZoneMin', MODEL.climate.HEATING_ZONE_MIN);
    uniforms.setFloat('u_heatingZoneMax', MODEL.climate.HEATING_ZONE_MAX);
    uniforms.setFloat('u_coolingZoneMin', MODEL.climate.COOLING_ZONE_MIN);
    uniforms.setFloat('u_coolingZoneMax', MODEL.climate.COOLING_ZONE_MAX);

    // Enable blending for semi-transparent overlay
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindVertexArray(this.earthVAO);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
  }

  /**
   * Render climate event markers (snow, heat, cold events)
   */
  public renderEvents(camera: Camera): void {
    if (this.events.length === 0) {
      return;
    }

    const gl = this.gl;
    gl.useProgram(this.lineProgram);

    const uniforms = new UniformManager(gl, this.lineProgram);
    uniforms.setMat4('u_viewProjection', camera.getViewProjectionMatrix());

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Render each event marker
    for (let i = 0; i < this.eventVAOs.length; i++) {
      // Set color based on event type
      const event = this.events[i];
      let color: [number, number, number, number];

      switch (event.type) {
        case 'snow':
          color = [0.9, 0.9, 1.0, 0.9]; // Light blue/white
          break;
        case 'heat':
          color = [1.0, 0.5, 0.0, 0.9]; // Orange
          break;
        case 'cold':
          color = [0.2, 0.5, 1.0, 0.9]; // Blue
          break;
        case 'drought':
          color = [0.8, 0.6, 0.2, 0.9]; // Brown
          break;
        default:
          color = [1.0, 1.0, 1.0, 0.9];
      }

      uniforms.setVec4('u_color', color[0], color[1], color[2], color[3]);

      gl.bindVertexArray(this.eventVAOs[i]);
      gl.drawArrays(gl.LINE_LOOP, 0, this.eventCounts[i]);
    }

    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  /**
   * Generate climate event markers
   */
  public generateEventMarkers(climate: ClimateModel): void {
    const gl = this.gl;
    this.events = climate.generateClimateEvents();

    // Clear existing VAOs
    for (const vao of this.eventVAOs) {
      gl.deleteVertexArray(vao);
    }
    this.eventVAOs = [];
    this.eventCounts = [];

    // Create marker for each event
    for (const event of this.events) {
      // Convert polar to Cartesian
      const x = event.location.r * Math.cos(event.location.theta);
      const y = event.location.r * Math.sin(event.location.theta);

      // Create a marker: circle with radiating lines (asterisk pattern)
      const positions: number[] = [];

      // Outer circle
      const radius = 200 * event.severity; // Scale by severity
      const segments = 16;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        positions.push(
          x + radius * Math.cos(angle),
          y + radius * Math.sin(angle)
        );
      }

      const posBuffer = createBuffer(gl, new Float32Array(positions));
      const vao = createVertexArray(gl, this.lineProgram, [
        { name: 'a_position', buffer: posBuffer, size: 2 }
      ]);

      if (vao) {
        this.eventVAOs.push(vao);
        this.eventCounts.push(positions.length / 2);
      }
    }

    console.log(`✓ Generated ${this.events.length} climate event markers`);
  }

  /**
   * Set visualization mode
   * @param mode 0=zones, 1=anomaly
   */
  public setVisualizationMode(mode: number): void {
    this.visualizationMode = mode;
  }

  /**
   * Toggle between zone and anomaly visualization
   */
  public toggleVisualizationMode(): void {
    this.visualizationMode = (this.visualizationMode + 1) % 2;
  }

  /**
   * Get current visualization mode
   */
  public getVisualizationMode(): string {
    return this.visualizationMode === 0 ? 'zones' : 'anomaly';
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    const gl = this.gl;

    for (const vao of this.eventVAOs) {
      gl.deleteVertexArray(vao);
    }

    this.eventVAOs = [];
    this.eventCounts = [];
    this.events = [];
  }
}
