/**
 * EM Field Renderer - Renders electromagnetic field streamlines
 */

import { createBuffer, createVertexArray, UniformManager, generateLineVertices } from './webgl-utils';
import { Camera } from './camera';
import { EMFieldSolver } from '../core/em-field';
import { MODEL, COLORS } from '../constants';

export class EMFieldRenderer {
  private gl: WebGL2RenderingContext;
  private fieldProgram: WebGLProgram;
  private lineProgram: WebGLProgram;
  private streamlineVAOs: WebGLVertexArrayObject[] = [];
  private streamlineCounts: number[] = [];

  // Field overlay (uses same geometry as Earth)
  private fieldVAO: WebGLVertexArrayObject | null = null;
  private fieldIndexCount: number = 0;

  constructor(
    gl: WebGL2RenderingContext,
    fieldProgram: WebGLProgram,
    lineProgram: WebGLProgram,
    earthVAO: WebGLVertexArrayObject,
    earthIndexCount: number
  ) {
    this.gl = gl;
    this.fieldProgram = fieldProgram;
    this.lineProgram = lineProgram;
    this.fieldVAO = earthVAO; // Reuse Earth geometry for field overlay
    this.fieldIndexCount = earthIndexCount;
  }

  public generateStreamlines(solver: EMFieldSolver, count: number = 24): void {
    const gl = this.gl;

    // Clear existing streamlines
    this.streamlineVAOs.forEach(vao => gl.deleteVertexArray(vao));
    this.streamlineVAOs = [];
    this.streamlineCounts = [];

    // Generate streamlines from EM field solver
    const streamlines = solver.generateStreamlines(count, 100, 200, 10);

    for (const streamline of streamlines) {
      if (streamline.points.length < 2) continue;

      // Create vertex buffer for streamline
      const positions = generateLineVertices(streamline.points);
      const posBuffer = createBuffer(gl, positions);

      // Create color buffer (all same color for now)
      const colors = new Float32Array(streamline.points.length * 4);
      for (let i = 0; i < streamline.points.length; i++) {
        colors[i * 4 + 0] = COLORS.EM_FIELD.MED[0];
        colors[i * 4 + 1] = COLORS.EM_FIELD.MED[1];
        colors[i * 4 + 2] = COLORS.EM_FIELD.MED[2];
        colors[i * 4 + 3] = COLORS.EM_FIELD.MED[3];
      }
      const colorBuffer = createBuffer(gl, colors);

      const vao = createVertexArray(gl, this.lineProgram, [
        { name: 'a_position', buffer: posBuffer, size: 2 },
        { name: 'a_color', buffer: colorBuffer, size: 4 }
      ]);

      this.streamlineVAOs.push(vao!);
      this.streamlineCounts.push(streamline.points.length);
    }
  }

  public renderOverlay(camera: Camera, fieldStrength: number): void {
    const gl = this.gl;

    gl.useProgram(this.fieldProgram);

    const uniforms = new UniformManager(gl, this.fieldProgram);
    uniforms.setMat4('u_viewProjection', camera.getViewProjectionMatrix());
    uniforms.setFloat('u_fieldStrength', fieldStrength);
    uniforms.setFloat('u_time', performance.now());
    uniforms.setVec4('u_fieldColor', ...COLORS.EM_FIELD.MED);
    uniforms.setFloat('u_maxRadius', MODEL.geometry.ANTARCTIC_RIM_RADIUS);

    gl.bindVertexArray(this.fieldVAO);
    gl.drawElements(gl.TRIANGLES, this.fieldIndexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  public renderStreamlines(camera: Camera): void {
    if (this.streamlineVAOs.length === 0) return;

    const gl = this.gl;

    gl.useProgram(this.lineProgram);
    gl.lineWidth(2.0);

    const uniforms = new UniformManager(gl, this.lineProgram);
    uniforms.setMat4('u_viewProjection', camera.getViewProjectionMatrix());

    for (let i = 0; i < this.streamlineVAOs.length; i++) {
      gl.bindVertexArray(this.streamlineVAOs[i]);
      gl.drawArrays(gl.LINE_STRIP, 0, this.streamlineCounts[i]);
    }

    gl.bindVertexArray(null);
  }

  public dispose(): void {
    const gl = this.gl;
    this.streamlineVAOs.forEach(vao => gl.deleteVertexArray(vao));
    this.streamlineVAOs = [];
  }
}
