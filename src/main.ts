/**
 * Flat Earth Engine - Main Application
 * Entry point for the visualization system
 */

import { WebGLContext, FPSCounter, generateCircleVertices, createBuffer, createVertexArray, UniformManager } from './rendering/webgl-utils';
import { Camera } from './rendering/camera';
import { ShaderManager } from './rendering/shader-loader';
import { ExpansionEngine } from './core/expansion';
import { EMFieldSolver } from './core/em-field';
import { SolarSimulator } from './core/solar';
import { ClimateModel } from './core/climate';
import { GPSSimulator } from './core/gps';
import { MODEL, COLORS } from './constants';
import type { SimulationState, ViewMode } from './types';

class FlatEarthEngine {
  private canvas: HTMLCanvasElement;
  private webgl: WebGLContext;
  private gl: WebGL2RenderingContext;
  private camera: Camera;
  private shaders: ShaderManager;
  private fpsCounter: FPSCounter;

  // Simulation modules
  private expansion: ExpansionEngine;
  private emField: EMFieldSolver;
  private solar: SolarSimulator;
  private climate: ClimateModel;
  private gps: GPSSimulator;

  // Simulation state
  private state: SimulationState = {
    time: 0,
    timeScale: 1.0,
    expansionRate: MODEL.expansion.RATE,
    fieldStrength: 1.0,
    isPaused: false,
  };

  // View mode
  private viewMode: ViewMode = ViewMode.EARTH;

  // Geometry buffers
  private earthVAO: WebGLVertexArrayObject | null = null;
  private earthIndexCount: number = 0;

  // Animation
  private lastTime: number = 0;
  private animationFrame: number = 0;

  // UI elements
  private uiElements: {
    controls: HTMLElement | null;
    infoPanel: HTMLElement | null;
    loading: HTMLElement | null;
  };

  constructor() {
    // Get canvas
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    // Initialize WebGL
    this.webgl = new WebGLContext(this.canvas);
    this.gl = this.webgl.getContext();

    // Initialize camera
    const aspect = this.canvas.width / this.canvas.height;
    this.camera = new Camera(aspect);
    this.camera.fitEarth(MODEL.geometry.ANTARCTIC_RIM_RADIUS);

    // Initialize shader manager
    this.shaders = new ShaderManager(this.gl);

    // Initialize FPS counter
    this.fpsCounter = new FPSCounter();

    // Initialize simulation modules
    this.expansion = new ExpansionEngine(this.state.expansionRate);
    this.emField = new EMFieldSolver(MODEL.electromagnetic.VORTEX_STRENGTH_B0 * this.state.fieldStrength);
    this.solar = new SolarSimulator();
    this.climate = new ClimateModel();
    this.gps = new GPSSimulator(this.state.expansionRate);

    // Get UI elements
    this.uiElements = {
      controls: document.getElementById('controls'),
      infoPanel: document.getElementById('infoPanel'),
      loading: document.getElementById('loading'),
    };

    // Initialize
    this.init();
  }

  private async init(): Promise<void> {
    console.log('Initializing Flat Earth Engine...');

    try {
      // Load shaders
      this.shaders.loadAll();

      // Setup geometry
      this.setupGeometry();

      // Setup GPS stations
      this.gps.generateStations(1000);
      console.log('✓ Generated 1000 GPS stations');

      // Setup UI
      this.setupUI();

      // Setup event listeners
      this.setupEventListeners();

      // Hide loading screen
      if (this.uiElements.loading) {
        this.uiElements.loading.classList.add('hidden');
      }

      // Show controls and info panel
      if (this.uiElements.controls) {
        this.uiElements.controls.classList.remove('hidden');
      }
      if (this.uiElements.infoPanel) {
        this.uiElements.infoPanel.classList.remove('hidden');
      }

      console.log('✓ Initialization complete');

      // Start animation loop
      this.lastTime = performance.now();
      this.animate();

    } catch (error) {
      console.error('Initialization failed:', error);
      if (this.uiElements.loading) {
        const loadingEl = this.uiElements.loading as HTMLElement;
        loadingEl.innerHTML = `
          <h2 style="color: #c62828;">Initialization Failed</h2>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        `;
      }
    }
  }

  private setupGeometry(): void {
    const gl = this.gl;

    // Create Earth disk geometry
    const earthGeom = generateCircleVertices(128, MODEL.geometry.ANTARCTIC_RIM_RADIUS);

    const posBuffer = createBuffer(gl, earthGeom.positions);
    const indexBuffer = createBuffer(gl, earthGeom.indices, gl.ELEMENT_ARRAY_BUFFER);

    const program = this.shaders.getProgram('earth');
    this.earthVAO = createVertexArray(gl, program, [
      { name: 'a_position', buffer: posBuffer, size: 2 }
    ]);

    this.earthIndexCount = earthGeom.indices.length;

    // Store index buffer (needed for drawing)
    gl.bindVertexArray(this.earthVAO);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bindVertexArray(null);

    console.log('✓ Geometry setup complete');
  }

  private setupUI(): void {
    // Time scale control
    const timeScaleSlider = document.getElementById('timeScale') as HTMLInputElement;
    const timeScaleValue = document.getElementById('timeScaleValue');
    if (timeScaleSlider && timeScaleValue) {
      timeScaleSlider.addEventListener('input', () => {
        this.state.timeScale = Math.pow(10, parseFloat(timeScaleSlider.value));
        timeScaleValue.textContent = this.state.timeScale >= 1000
          ? `${(this.state.timeScale / 1000).toFixed(0)}kx`
          : `${this.state.timeScale.toFixed(1)}x`;
      });
      // Trigger initial update
      timeScaleSlider.dispatchEvent(new Event('input'));
    }

    // Expansion rate control
    const expansionRateSlider = document.getElementById('expansionRate') as HTMLInputElement;
    const expansionRateValue = document.getElementById('expansionRateValue');
    if (expansionRateSlider && expansionRateValue) {
      expansionRateSlider.addEventListener('input', () => {
        this.state.expansionRate = parseFloat(expansionRateSlider.value);
        this.expansion.setExpansionRate(this.state.expansionRate / 100); // Convert cm to m
        this.gps.setExpansionRate(this.state.expansionRate / 100);
        expansionRateValue.textContent = `${this.state.expansionRate.toFixed(1)} cm/yr`;
      });
    }

    // Field strength control
    const fieldStrengthSlider = document.getElementById('fieldStrength') as HTMLInputElement;
    const fieldStrengthValue = document.getElementById('fieldStrengthValue');
    if (fieldStrengthSlider && fieldStrengthValue) {
      fieldStrengthSlider.addEventListener('input', () => {
        this.state.fieldStrength = parseFloat(fieldStrengthSlider.value);
        this.emField.setFieldStrength(MODEL.electromagnetic.VORTEX_STRENGTH_B0 * this.state.fieldStrength);
        fieldStrengthValue.textContent = this.state.fieldStrength.toFixed(1);
      });
    }

    // Simulation time control
    const simTimeSlider = document.getElementById('simTime') as HTMLInputElement;
    const simTimeValue = document.getElementById('simTimeValue');
    if (simTimeSlider && simTimeValue) {
      simTimeSlider.addEventListener('input', () => {
        this.state.time = parseFloat(simTimeSlider.value);
        simTimeValue.textContent = `${this.state.time.toFixed(0)} years`;
      });
    }

    // Play/Pause button
    const playPauseBtn = document.getElementById('playPause');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        this.state.isPaused = !this.state.isPaused;
        playPauseBtn.textContent = this.state.isPaused ? '▶ Play' : '⏸ Pause';
      });
    }

    // Reset button
    const resetBtn = document.getElementById('reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.state.time = 0;
        this.state.timeScale = 1.0;
        this.state.expansionRate = MODEL.expansion.RATE;
        this.state.fieldStrength = 1.0;
        this.gps.reset();
        this.camera.fitEarth(MODEL.geometry.ANTARCTIC_RIM_RADIUS);

        // Reset UI controls
        if (timeScaleSlider) timeScaleSlider.value = '0';
        if (expansionRateSlider) expansionRateSlider.value = '3.3';
        if (fieldStrengthSlider) fieldStrengthSlider.value = '1.0';
        if (simTimeSlider) simTimeSlider.value = '0';

        // Trigger updates
        if (timeScaleSlider) timeScaleSlider.dispatchEvent(new Event('input'));
        if (expansionRateSlider) expansionRateSlider.dispatchEvent(new Event('input'));
        if (fieldStrengthSlider) fieldStrengthSlider.dispatchEvent(new Event('input'));
        if (simTimeSlider) simTimeSlider.dispatchEvent(new Event('input'));
      });
    }

    // Screenshot button
    const screenshotBtn = document.getElementById('screenshot');
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', () => {
        this.takeScreenshot();
      });
    }

    // View mode tabs
    const viewTabs = document.querySelectorAll('.view-tabs button');
    viewTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        viewTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const view = tab.getAttribute('data-view') as ViewMode;
        if (view) this.viewMode = view;
      });
    });

    console.log('✓ UI setup complete');
  }

  private setupEventListeners(): void {
    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize(); // Initial resize

    // Mouse controls for camera
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;

      this.camera.pan(
        -(dx / this.canvas.width) * 2,
        (dy / this.canvas.height) * 2
      );

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Mouse wheel for zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera.zoomBy(zoomFactor);
    });

    console.log('✓ Event listeners setup complete');
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width;
    this.canvas.height = height;

    this.webgl.resize(width, height);
    this.camera.setAspect(width / height);
  }

  private update(deltaTime: number): void {
    if (!this.state.isPaused) {
      // Update simulation time (deltaTime is in seconds)
      const deltaYears = (deltaTime / 1000) * this.state.timeScale / (365.24 * 24 * 3600);
      this.state.time += deltaYears;

      // Update GPS stations
      this.gps.updatePositions(deltaYears);
    }

    // Update FPS counter
    this.fpsCounter.update();
  }

  private render(): void {
    const gl = this.gl;

    // Clear
    this.webgl.clear();

    // Get view-projection matrix
    const vpMatrix = this.camera.getViewProjectionMatrix();

    // Render Earth disk
    this.renderEarth(vpMatrix);

    // Render overlays based on view mode
    switch (this.viewMode) {
      case ViewMode.EM_FIELD:
        this.renderEMField(vpMatrix);
        break;
      case ViewMode.SOLAR:
        this.renderSolar(vpMatrix);
        break;
      case ViewMode.CLIMATE:
        this.renderClimate(vpMatrix);
        break;
      case ViewMode.GPS:
        this.renderGPS(vpMatrix);
        break;
    }

    // Update UI
    this.updateUI();
  }

  private renderEarth(vpMatrix: Float32Array): void {
    const gl = this.gl;
    const program = this.shaders.getProgram('earth');

    gl.useProgram(program);

    const uniforms = new UniformManager(gl, program);
    uniforms.setMat4('u_viewProjection', vpMatrix);
    uniforms.setFloat('u_time', this.state.time);
    uniforms.setFloat('u_expansionRate', this.state.expansionRate / 100);
    uniforms.setFloat('u_maxRadius', MODEL.geometry.ANTARCTIC_RIM_RADIUS);
    uniforms.setVec4('u_diskColor', ...COLORS.EARTH.DISK);
    uniforms.setVec4('u_gridColor', ...COLORS.EARTH.GRID);
    uniforms.setVec4('u_rimColor', ...COLORS.EARTH.RIM);
    uniforms.setFloat('u_gridSpacing', 20);
    uniforms.setInt('u_showGrid', 1);

    gl.bindVertexArray(this.earthVAO);
    gl.drawElements(gl.TRIANGLES, this.earthIndexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private renderEMField(vpMatrix: Float32Array): void {
    const gl = this.gl;
    const program = this.shaders.getProgram('field');

    gl.useProgram(program);

    // For now, render field as overlay using earth geometry
    // TODO: Implement proper field line rendering
    const uniforms = new UniformManager(gl, program);
    uniforms.setMat4('u_viewProjection', vpMatrix);
    uniforms.setFloat('u_fieldStrength', this.emField.getFieldStrength());
    uniforms.setFloat('u_time', performance.now());
    uniforms.setVec4('u_fieldColor', ...COLORS.EM_FIELD.MED);
    uniforms.setFloat('u_maxRadius', MODEL.geometry.ANTARCTIC_RIM_RADIUS);

    gl.bindVertexArray(this.earthVAO);
    gl.drawElements(gl.TRIANGLES, this.earthIndexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private renderSolar(vpMatrix: Float32Array): void {
    const gl = this.gl;
    const program = this.shaders.getProgram('solar');

    // Get sun position (convert simulation time in years to days)
    const timeInDays = this.state.time * 365.24;
    const sunPos = this.solar.getSunPosition(timeInDays);

    gl.useProgram(program);

    const uniforms = new UniformManager(gl, program);
    uniforms.setMat4('u_viewProjection', vpMatrix);
    uniforms.setVec3('u_sunPosition', sunPos.x, sunPos.y, sunPos.z);
    uniforms.setFloat('u_illuminationAngle', MODEL.solar.ILLUMINATION_ANGLE);
    uniforms.setVec4('u_dayColor', ...COLORS.SOLAR.DAY);
    uniforms.setVec4('u_nightColor', ...COLORS.SOLAR.NIGHT);
    uniforms.setFloat('u_maxRadius', MODEL.geometry.ANTARCTIC_RIM_RADIUS);

    gl.bindVertexArray(this.earthVAO);
    gl.drawElements(gl.TRIANGLES, this.earthIndexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private renderClimate(vpMatrix: Float32Array): void {
    // TODO: Implement climate zone rendering
    // For now, render Earth disk
    this.renderEarth(vpMatrix);
  }

  private renderGPS(vpMatrix: Float32Array): void {
    // TODO: Implement GPS station rendering
    // For now, render Earth disk
    this.renderEarth(vpMatrix);
  }

  private updateUI(): void {
    // Update FPS
    const fpsEl = document.getElementById('fps');
    if (fpsEl) fpsEl.textContent = this.fpsCounter.getFPS().toString();

    // Update current time
    const timeEl = document.getElementById('currentTime');
    if (timeEl) timeEl.textContent = `${this.state.time.toFixed(2)} yr`;

    // Update Earth radius (accounting for expansion)
    const radiusEl = document.getElementById('earthRadius');
    if (radiusEl) {
      const expandedRadius = this.expansion.getExpandedRadius(MODEL.geometry.ANTARCTIC_RIM_RADIUS, this.state.time);
      radiusEl.textContent = `${expandedRadius.toFixed(0)} km`;
    }

    // Update day length
    const dayLengthEl = document.getElementById('dayLength');
    if (dayLengthEl) {
      const dayLength = this.expansion.getDayLength(this.state.time);
      dayLengthEl.textContent = `${dayLength.toFixed(3)} hr`;
    }

    // Update sun position
    const sunPosEl = document.getElementById('sunPos');
    if (sunPosEl) {
      const timeInDays = this.state.time * 365.24;
      const sunPolar = this.solar.getSunPositionPolar(timeInDays);
      sunPosEl.textContent = `r=${sunPolar.r.toFixed(0)} km`;
    }
  }

  private animate(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update simulation
    this.update(deltaTime);

    // Render frame
    this.render();

    // Continue animation loop
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  private takeScreenshot(): void {
    this.canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flat-earth-engine-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  public dispose(): void {
    // Cancel animation
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    // Cleanup shaders
    this.shaders.dispose();

    // TODO: Cleanup buffers and VAOs
  }
}

// Initialize application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  try {
    new FlatEarthEngine();
  } catch (error) {
    console.error('Failed to start Flat Earth Engine:', error);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.innerHTML = `
        <h2 style="color: #c62828;">Failed to Start</h2>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p style="margin-top: 20px; font-size: 0.9rem;">
          Make sure your browser supports WebGL 2.0
        </p>
      `;
    }
  }
});
