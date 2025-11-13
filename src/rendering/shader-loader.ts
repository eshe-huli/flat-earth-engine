/**
 * Shader Loader Module
 * Loads and compiles GLSL shaders
 */

import { createShaderProgram } from './webgl-utils';

// Import shaders as raw strings
import earthVertSource from '../shaders/earth.vert.glsl?raw';
import earthFragSource from '../shaders/earth.frag.glsl?raw';
import fieldVertSource from '../shaders/field.vert.glsl?raw';
import fieldFragSource from '../shaders/field.frag.glsl?raw';
import lineVertSource from '../shaders/line.vert.glsl?raw';
import lineFragSource from '../shaders/line.frag.glsl?raw';
import solarVertSource from '../shaders/solar.vert.glsl?raw';
import solarFragSource from '../shaders/solar.frag.glsl?raw';

export class ShaderManager {
  private gl: WebGL2RenderingContext;
  private programs: Map<string, WebGLProgram> = new Map();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Load and compile all shaders
   */
  public loadAll(): void {
    console.log('Loading shaders...');

    try {
      this.programs.set('earth', createShaderProgram(this.gl, earthVertSource, earthFragSource));
      console.log('✓ Earth shader loaded');

      this.programs.set('field', createShaderProgram(this.gl, fieldVertSource, fieldFragSource));
      console.log('✓ EM Field shader loaded');

      this.programs.set('line', createShaderProgram(this.gl, lineVertSource, lineFragSource));
      console.log('✓ Line shader loaded');

      this.programs.set('solar', createShaderProgram(this.gl, solarVertSource, solarFragSource));
      console.log('✓ Solar shader loaded');

      console.log('All shaders loaded successfully');
    } catch (error) {
      console.error('Shader loading failed:', error);
      throw error;
    }
  }

  /**
   * Get shader program by name
   */
  public getProgram(name: string): WebGLProgram {
    const program = this.programs.get(name);
    if (!program) {
      throw new Error(`Shader program "${name}" not found`);
    }
    return program;
  }

  /**
   * Check if program exists
   */
  public hasProgram(name: string): boolean {
    return this.programs.has(name);
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    for (const program of this.programs.values()) {
      this.gl.deleteProgram(program);
    }
    this.programs.clear();
  }
}
