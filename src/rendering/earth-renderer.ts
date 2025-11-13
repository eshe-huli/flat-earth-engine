/**
 * Earth Renderer - Renders the flat Earth disk with grid and expansion
 */

import { WebGLContext, createBuffer, createVertexArray, UniformManager, generateCircleVertices } from './webgl-utils';
import { Camera } from './camera';
import { MODEL, COLORS } from '../constants';

export class EarthRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject | null = null;
  private indexCount: number = 0;
  private indexBuffer: WebGLBuffer | null = null;

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
    this.gl = gl;
    this.program = program;
    this.setupGeometry();
  }

  private setupGeometry(): void {
    const gl = this.gl;

    // Generate Earth disk
    const geom = generateCircleVertices(128, MODEL.geometry.ANTARCTIC_RIM_RADIUS);

    const posBuffer = createBuffer(gl, geom.positions);
    this.indexBuffer = createBuffer(gl, geom.indices, gl.ELEMENT_ARRAY_BUFFER);

    this.vao = createVertexArray(gl, this.program, [
      { name: 'a_position', buffer: posBuffer, size: 2 }
    ]);

    this.indexCount = geom.indices.length;

    // Bind index buffer to VAO
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bindVertexArray(null);
  }

  public render(camera: Camera, time: number, expansionRate: number, showGrid: boolean = true): void {
    const gl = this.gl;

    gl.useProgram(this.program);

    const uniforms = new UniformManager(gl, this.program);
    uniforms.setMat4('u_viewProjection', camera.getViewProjectionMatrix());
    uniforms.setFloat('u_time', time);
    uniforms.setFloat('u_expansionRate', expansionRate / 100); // cm/yr to m/yr
    uniforms.setFloat('u_maxRadius', MODEL.geometry.ANTARCTIC_RIM_RADIUS);
    uniforms.setVec4('u_diskColor', ...COLORS.EARTH.DISK);
    uniforms.setVec4('u_gridColor', ...COLORS.EARTH.GRID);
    uniforms.setVec4('u_rimColor', ...COLORS.EARTH.RIM);
    uniforms.setFloat('u_gridSpacing', 20);
    uniforms.setInt('u_showGrid', showGrid ? 1 : 0);

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  public dispose(): void {
    const gl = this.gl;
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
  }
}
