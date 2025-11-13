/**
 * Flat Earth Engine - Main Application (Enhanced Version)
 * Entry point with specialized renderers
 */

import { WebGLContext, FPSCounter, generateCircleVertices, createBuffer, createVertexArray } from './rendering/webgl-utils';
import { Camera } from './rendering/camera';
import { ShaderManager } from './rendering/shader-loader';
import { EarthRenderer } from './rendering/earth-renderer';
import { EMFieldRenderer } from './rendering/field-renderer';
import { SolarRenderer } from './rendering/solar-renderer';
import { GPSRenderer } from './rendering/gps-renderer';
import { ExpansionEngine } from './core/expansion';
import { EMFieldSolver } from './core/em-field';
import { SolarSimulator } from './core/solar';
import { ClimateModel } from './core/climate';
import { GPSSimulator } from './core/gps';
import { MODEL } from './constants';
import type { SimulationState, ViewMode } from './types';

class FlatEarthEngine {
  private canvas: HTMLCanvasElement;
  private webgl: WebGLContext;
  private gl: WebGL2RenderingContext;
  private camera: Camera;
  private shaders: ShaderManager;
  private fpsCounter: FPSCounter;

  // Specialized renderers
  private earthRenderer: EarthRenderer | null = null;
  private fieldRenderer: EMFieldRenderer | null = null;
  private solarRenderer: SolarRenderer | null = null;
  private gpsRenderer: GPSRenderer | null = null;

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

  // View mode and options
  private viewMode: ViewMode = ViewMode.EARTH;
  private showStreamlines: boolean = false;
  private showSunPath: boolean = false;
  private showGPSVectors: boolean = false;

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
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.webgl = new WebGLContext(this.canvas);
    this.gl = this.webgl.getContext();

    const aspect = this.canvas.width / this.canvas.height;
    this.camera = new Camera(aspect);
    this.camera.fitEarth(MODEL.geometry.ANTARCTIC_RIM_RADIUS);

    this.shaders = new ShaderManager(this.gl);
    this.fpsCounter = new FPSCounter();

    this.expansion = new ExpansionEngine(this.state.expansionRate);
    this.emField = new EMFieldSolver(MODEL.electromagnetic.VORTEX_STRENGTH_B0 * this.state.fieldStrength);
    this.solar = new SolarSimulator();
    this.climate = new ClimateModel();
    this.gps = new GPSSimulator(this.state.expansionRate);

    this.uiElements = {
      controls: document.getElementById('controls'),
      infoPanel: document.getElementById('infoPanel'),
      loading: document.getElementById('loading'),
    };

    this.init();
  }

  private async init(): Promise<void> {
    console.log('🌍 Initializing Flat Earth Engine v2...');

    try {
      this.shaders.loadAll();

      // Initialize renderers with shared geometry
      const earthGeom = generateCircleVertices(128, MODEL.geometry.ANTARCTIC_RIM_RADIUS);
      const gl = this.gl;
      const posBuffer = createBuffer(gl, earthGeom.positions);
      const indexBuffer = createBuffer(gl, earthGeom.indices, gl.ELEMENT_ARRAY_BUFFER);

      const earthProgram = this.shaders.getProgram('earth');
      const earthVAO = createVertexArray(gl, earthProgram, [
        { name: 'a_position', buffer: posBuffer, size: 2 }
      ]);

      gl.bindVertexArray(earthVAO);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bindVertexArray(null);

      // Create renderers
      this.earthRenderer = new EarthRenderer(gl, earthProgram);
      console.log('✓ Earth renderer initialized');

      this.fieldRenderer = new EMFieldRenderer(
        gl,
        this.shaders.getProgram('field'),
        this.shaders.getProgram('line'),
        earthVAO!,
        earthGeom.indices.length
      );
      console.log('✓ EM Field renderer initialized');

      this.solarRenderer = new SolarRenderer(
        gl,
        this.shaders.getProgram('solar'),
        this.shaders.getProgram('line'),
        earthVAO!,
        earthGeom.indices.length
      );
      console.log('✓ Solar renderer initialized');

      this.gpsRenderer = new GPSRenderer(
        gl,
        this.shaders.getProgram('line')
      );
      console.log('✓ GPS renderer initialized');

      // Setup data
      this.gps.generateStations(1000);
      console.log('✓ Generated 1000 GPS stations');

      // Generate EM streamlines
      this.fieldRenderer.generateStreamlines(this.emField, 24);
      console.log('✓ Generated EM field streamlines');

      // Generate sun path
      this.solarRenderer.updateSunPath(this.solar, 0);
      console.log('✓ Generated sun path');

      this.setupUI();
      this.setupEventListeners();

      if (this.uiElements.loading) {
        this.uiElements.loading.classList.add('hidden');
      }
      if (this.uiElements.controls) {
        this.uiElements.controls.classList.remove('hidden');
      }
      if (this.uiElements.infoPanel) {
        this.uiElements.infoPanel.classList.remove('hidden');
      }

      console.log('✅ Initialization complete');

      this.lastTime = performance.now();
      this.animate();

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      if (this.uiElements.loading) {
        const loadingEl = this.uiElements.loading as HTMLElement;
        loadingEl.innerHTML = `
          <h2 style="color: #c62828;">Initialization Failed</h2>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        `;
      }
    }
  }

  private setupUI(): void {
    // Time scale
    const timeScaleSlider = document.getElementById('timeScale') as HTMLInputElement;
    const timeScaleValue = document.getElementById('timeScaleValue');
    if (timeScaleSlider && timeScaleValue) {
      timeScaleSlider.addEventListener('input', () => {
        this.state.timeScale = Math.pow(10, parseFloat(timeScaleSlider.value));
        timeScaleValue.textContent = this.state.timeScale >= 1000
          ? `${(this.state.timeScale / 1000).toFixed(0)}kx`
          : `${this.state.timeScale.toFixed(1)}x`;
      });
      timeScaleSlider.dispatchEvent(new Event('input'));
    }

    // Expansion rate
    const expansionRateSlider = document.getElementById('expansionRate') as HTMLInputElement;
    const expansionRateValue = document.getElementById('expansionRateValue');
    if (expansionRateSlider && expansionRateValue) {
      expansionRateSlider.addEventListener('input', () => {
        this.state.expansionRate = parseFloat(expansionRateSlider.value);
        this.expansion.setExpansionRate(this.state.expansionRate / 100);
        this.gps.setExpansionRate(this.state.expansionRate / 100);
        expansionRateValue.textContent = `${this.state.expansionRate.toFixed(1)} cm/yr`;
      });
    }

    // Field strength
    const fieldStrengthSlider = document.getElementById('fieldStrength') as HTMLInputElement;
    const fieldStrengthValue = document.getElementById('fieldStrengthValue');
    if (fieldStrengthSlider && fieldStrengthValue) {
      fieldStrengthSlider.addEventListener('input', () => {
        this.state.fieldStrength = parseFloat(fieldStrengthSlider.value);
        this.emField.setFieldStrength(MODEL.electromagnetic.VORTEX_STRENGTH_B0 * this.state.fieldStrength);

        // Regenerate streamlines with new field strength
        if (this.fieldRenderer) {
          this.fieldRenderer.generateStreamlines(this.emField, 24);
        }

        fieldStrengthValue.textContent = this.state.fieldStrength.toFixed(1);
      });
    }

    // Simulation time
    const simTimeSlider = document.getElementById('simTime') as HTMLInputElement;
    const simTimeValue = document.getElementById('simTimeValue');
    if (simTimeSlider && simTimeValue) {
      simTimeSlider.addEventListener('input', () => {
        this.state.time = parseFloat(simTimeSlider.value);
        simTimeValue.textContent = `${this.state.time.toFixed(0)} years`;

        // Update sun path when time changes significantly
        if (this.solarRenderer) {
          this.solarRenderer.updateSunPath(this.solar, this.state.time * 365.24);
        }
      });
    }

    // Play/Pause
    const playPauseBtn = document.getElementById('playPause');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        this.state.isPaused = !this.state.isPaused;
        playPauseBtn.textContent = this.state.isPaused ? '▶ Play' : '⏸ Pause';
      });
    }

    // Reset
    const resetBtn = document.getElementById('reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.state.time = 0;
        this.state.timeScale = 1.0;
        this.state.expansionRate = MODEL.expansion.RATE;
        this.state.fieldStrength = 1.0;
        this.gps.reset();
        this.camera.fitEarth(MODEL.geometry.ANTARCTIC_RIM_RADIUS);

        if (timeScaleSlider) timeScaleSlider.value = '0';
        if (expansionRateSlider) expansionRateSlider.value = '3.3';
        if (fieldStrengthSlider) fieldStrengthSlider.value = '1.0';
        if (simTimeSlider) simTimeSlider.value = '0';

        if (timeScaleSlider) timeScaleSlider.dispatchEvent(new Event('input'));
        if (expansionRateSlider) expansionRateSlider.dispatchEvent(new Event('input'));
        if (fieldStrengthSlider) fieldStrengthSlider.dispatchEvent(new Event('input'));
        if (simTimeSlider) simTimeSlider.dispatchEvent(new Event('input'));

        if (this.solarRenderer) {
          this.solarRenderer.updateSunPath(this.solar, 0);
        }
      });
    }

    // Screenshot
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
        if (view) {
          this.viewMode = view;
          // Update toggles based on view
          this.showStreamlines = view === ViewMode.EM_FIELD;
          this.showSunPath = view === ViewMode.SOLAR;
          this.showGPSVectors = view === ViewMode.GPS;
        }
      });
    });

    console.log('✓ UI setup complete');
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();

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
      const deltaYears = (deltaTime / 1000) * this.state.timeScale / (365.24 * 24 * 3600);
      this.state.time += deltaYears;

      this.gps.updatePositions(deltaYears);

      // Update GPS renderer every few frames
      if (Math.random() < 0.1 && this.gpsRenderer) {
        this.gpsRenderer.updateStations(this.gps);
      }
    }

    this.fpsCounter.update();
  }

  private render(): void {
    this.webgl.clear();

    // Always render Earth base
    if (this.earthRenderer) {
      this.earthRenderer.render(this.camera, this.state.time, this.state.expansionRate);
    }

    // Render view-specific overlays
    switch (this.viewMode) {
      case ViewMode.EM_FIELD:
        if (this.fieldRenderer) {
          this.fieldRenderer.renderOverlay(this.camera, this.emField.getFieldStrength());
          if (this.showStreamlines) {
            this.fieldRenderer.renderStreamlines(this.camera);
          }
        }
        break;

      case ViewMode.SOLAR:
        if (this.solarRenderer) {
          const timeInDays = this.state.time * 365.24;
          const sunPos = this.solar.getSunPosition(timeInDays);
          this.solarRenderer.renderIllumination(this.camera, sunPos);

          if (this.showSunPath) {
            this.solarRenderer.renderSunPath(this.camera);
          }

          // Always show sun marker
          this.solarRenderer.renderSunMarker(this.camera, sunPos);
        }
        break;

      case ViewMode.GPS:
        if (this.gpsRenderer) {
          this.gpsRenderer.renderStations(this.camera);
          if (this.showGPSVectors) {
            this.gpsRenderer.renderVectors(this.camera);
          }
        }
        break;
    }

    this.updateUI();
  }

  private updateUI(): void {
    const fpsEl = document.getElementById('fps');
    if (fpsEl) fpsEl.textContent = this.fpsCounter.getFPS().toString();

    const timeEl = document.getElementById('currentTime');
    if (timeEl) timeEl.textContent = `${this.state.time.toFixed(2)} yr`;

    const radiusEl = document.getElementById('earthRadius');
    if (radiusEl) {
      const expandedRadius = this.expansion.getExpandedRadius(MODEL.geometry.ANTARCTIC_RIM_RADIUS, this.state.time);
      radiusEl.textContent = `${expandedRadius.toFixed(0)} km`;
    }

    const dayLengthEl = document.getElementById('dayLength');
    if (dayLengthEl) {
      const dayLength = this.expansion.getDayLength(this.state.time);
      dayLengthEl.textContent = `${dayLength.toFixed(3)} hr`;
    }

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

    this.update(deltaTime);
    this.render();

    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  private takeScreenshot(): void {
    this.canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flat-earth-${this.viewMode}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  public dispose(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.shaders.dispose();
    this.earthRenderer?.dispose();
    this.fieldRenderer?.dispose();
    this.solarRenderer?.dispose();
    this.gpsRenderer?.dispose();
  }
}

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
