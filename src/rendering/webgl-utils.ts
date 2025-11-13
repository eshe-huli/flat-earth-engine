/**
 * WebGL Utilities Module
 * Context creation, shader compilation, buffer management
 */

export class WebGLContext {
  public gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      throw new Error('WebGL 2.0 not supported');
    }

    this.gl = gl;
    this.initialize();
  }

  private initialize(): void {
    const gl = this.gl;

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Set clear color
    gl.clearColor(0.05, 0.08, 0.2, 1.0);
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  public clear(): void {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getContext(): WebGL2RenderingContext {
    return this.gl;
  }
}

/**
 * Shader compilation utilities
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: number
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to create shader');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${info}`);
  }

  return shader;
}

export function linkProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Failed to create program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program linking failed: ${info}`);
  }

  return program;
}

export function createShaderProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
  const program = linkProgram(gl, vertexShader, fragmentShader);

  // Clean up shaders (they're now in the program)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

/**
 * Buffer creation utilities
 */
export function createBuffer(
  gl: WebGL2RenderingContext,
  data: Float32Array | Uint16Array,
  target: number = WebGL2RenderingContext.ARRAY_BUFFER,
  usage: number = WebGL2RenderingContext.STATIC_DRAW
): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error('Failed to create buffer');
  }

  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data, usage);
  gl.bindBuffer(target, null);

  return buffer;
}

export function createVertexArray(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  buffers: Array<{
    name: string;
    buffer: WebGLBuffer;
    size: number;
    type?: number;
    normalized?: boolean;
    stride?: number;
    offset?: number;
  }>
): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  if (!vao) {
    throw new Error('Failed to create VAO');
  }

  gl.bindVertexArray(vao);

  for (const bufferInfo of buffers) {
    const location = gl.getAttribLocation(program, bufferInfo.name);
    if (location === -1) {
      console.warn(`Attribute ${bufferInfo.name} not found in shader`);
      continue;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(
      location,
      bufferInfo.size,
      bufferInfo.type || gl.FLOAT,
      bufferInfo.normalized || false,
      bufferInfo.stride || 0,
      bufferInfo.offset || 0
    );
  }

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return vao;
}

/**
 * Texture creation utilities
 */
export function createTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  data: Float32Array | Uint8Array | null = null,
  internalFormat: number = gl.RGBA32F,
  format: number = gl.RGBA,
  type: number = gl.FLOAT
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error('Failed to create texture');
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Upload data
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data);

  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}

/**
 * Uniform setters
 */
export class UniformManager {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uniformLocations: Map<string, WebGLUniformLocation> = new Map();

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
    this.gl = gl;
    this.program = program;
  }

  private getLocation(name: string): WebGLUniformLocation | null {
    if (!this.uniformLocations.has(name)) {
      const location = this.gl.getUniformLocation(this.program, name);
      if (location) {
        this.uniformLocations.set(name, location);
      }
      return location;
    }
    return this.uniformLocations.get(name) || null;
  }

  public setFloat(name: string, value: number): void {
    const location = this.getLocation(name);
    if (location) this.gl.uniform1f(location, value);
  }

  public setInt(name: string, value: number): void {
    const location = this.getLocation(name);
    if (location) this.gl.uniform1i(location, value);
  }

  public setVec2(name: string, x: number, y: number): void {
    const location = this.getLocation(name);
    if (location) this.gl.uniform2f(location, x, y);
  }

  public setVec3(name: string, x: number, y: number, z: number): void {
    const location = this.getLocation(name);
    if (location) this.gl.uniform3f(location, x, y, z);
  }

  public setVec4(name: string, x: number, y: number, z: number, w: number): void {
    const location = this.getLocation(name);
    if (location) this.gl.uniform4f(location, x, y, z, w);
  }

  public setMat4(name: string, matrix: Float32Array): void {
    const location = this.getLocation(name);
    if (location) this.gl.uniformMatrix4fv(location, false, matrix);
  }
}

/**
 * Frame rate counter
 */
export class FPSCounter {
  private frames: number = 0;
  private lastTime: number = performance.now();
  private fps: number = 60;

  public update(): void {
    this.frames++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frames * 1000) / elapsed);
      this.frames = 0;
      this.lastTime = currentTime;
    }
  }

  public getFPS(): number {
    return this.fps;
  }
}

/**
 * Geometry generation utilities
 */
export function generateCircleVertices(
  segments: number,
  radius: number
): { positions: Float32Array; indices: Uint16Array } {
  const positions = new Float32Array((segments + 1) * 2);
  const indices = new Uint16Array(segments * 3);

  // Center point
  positions[0] = 0;
  positions[1] = 0;

  // Circle points
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    positions[(i + 1) * 2] = Math.cos(angle) * radius;
    positions[(i + 1) * 2 + 1] = Math.sin(angle) * radius;
  }

  // Indices (triangles from center to edge)
  for (let i = 0; i < segments; i++) {
    indices[i * 3] = 0; // Center
    indices[i * 3 + 1] = i + 1;
    indices[i * 3 + 2] = i + 2;
  }

  return { positions, indices };
}

export function generateRingVertices(
  segments: number,
  innerRadius: number,
  outerRadius: number
): { positions: Float32Array; indices: Uint16Array } {
  const positions = new Float32Array(segments * 4 * 2);
  const indices = new Uint16Array(segments * 6);

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const nextAngle = ((i + 1) / segments) * Math.PI * 2;

    const cos1 = Math.cos(angle);
    const sin1 = Math.sin(angle);
    const cos2 = Math.cos(nextAngle);
    const sin2 = Math.sin(nextAngle);

    // Inner points
    positions[i * 8] = cos1 * innerRadius;
    positions[i * 8 + 1] = sin1 * innerRadius;
    positions[i * 8 + 2] = cos2 * innerRadius;
    positions[i * 8 + 3] = sin2 * innerRadius;

    // Outer points
    positions[i * 8 + 4] = cos1 * outerRadius;
    positions[i * 8 + 5] = sin1 * outerRadius;
    positions[i * 8 + 6] = cos2 * outerRadius;
    positions[i * 8 + 7] = sin2 * outerRadius;

    // Two triangles per segment
    const base = i * 4;
    indices[i * 6] = base;
    indices[i * 6 + 1] = base + 1;
    indices[i * 6 + 2] = base + 2;
    indices[i * 6 + 3] = base;
    indices[i * 6 + 4] = base + 2;
    indices[i * 6 + 5] = base + 3;
  }

  return { positions, indices };
}

export function generateLineVertices(
  points: Array<{ x: number; y: number }>
): Float32Array {
  const positions = new Float32Array(points.length * 2);

  for (let i = 0; i < points.length; i++) {
    positions[i * 2] = points[i].x;
    positions[i * 2 + 1] = points[i].y;
  }

  return positions;
}
