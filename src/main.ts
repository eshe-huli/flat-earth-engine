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
import { ClimateRenderer } from './rendering/climate-renderer';
import { ExpansionEngine } from './core/expansion';
import { EMFieldSolver } from './core/em-field';
import { SolarSimulator } from './core/solar';
import { ClimateModel } from './core/climate';
import { GPSSimulator } from './core/gps';
import { MODEL } from './constants';
import type { SimulationState } from './types';
import { ViewMode } from './types';

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
  private climateRenderer: ClimateRenderer | null = null;

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
  private showClimateEvents: boolean = false;

  // Animation
  private lastTime: number = 0;
  private animationFrame: number = 0;

  // Recording state (reserved for future animation recording feature)
  // private isRecording: boolean = false;
  // private recordingFrames: string[] = [];

  // UI elements
  private uiElements: {
    controls: HTMLElement | null;
    infoPanel: HTMLElement | null;
    loading: HTMLElement | null;
  };

  // Configuration presets
  private presets: Map<string, Partial<SimulationState>> = new Map([
    ['default', {
      time: 0,
      timeScale: 1.0,
      expansionRate: MODEL.expansion.RATE,
      fieldStrength: 1.0,
      isPaused: false,
    }],
    ['rapid-expansion', {
      time: 0,
      timeScale: 1000,
      expansionRate: 10.0,
      fieldStrength: 1.0,
      isPaused: false,
    }],
    ['weak-field', {
      time: 0,
      timeScale: 1.0,
      expansionRate: MODEL.expansion.RATE,
      fieldStrength: 0.3,
      isPaused: false,
    }],
    ['future-2100', {
      time: 76,
      timeScale: 10,
      expansionRate: MODEL.expansion.RATE,
      fieldStrength: 1.0,
      isPaused: true,
    }],
    ['extreme-warming', {
      time: 200,
      timeScale: 100,
      expansionRate: 5.0,
      fieldStrength: 1.2,
      isPaused: false,
    }],
  ]);

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

      this.climateRenderer = new ClimateRenderer(
        gl,
        this.shaders.getProgram('climate'),
        this.shaders.getProgram('line'),
        earthVAO!,
        earthGeom.indices.length
      );
      console.log('✓ Climate renderer initialized');

      // Setup data
      this.gps.generateStations(1000);
      console.log('✓ Generated 1000 GPS stations');

      // Generate EM streamlines
      this.fieldRenderer.generateStreamlines(this.emField, 24);
      console.log('✓ Generated EM field streamlines');

      // Generate sun path
      this.solarRenderer.updateSunPath(this.solar, 0);
      console.log('✓ Generated sun path');

      // Generate climate event markers
      this.climateRenderer.generateEventMarkers(this.climate);
      console.log('✓ Generated climate event markers');

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

      // Load state from URL parameters or localStorage
      this.loadStateFromURL();
      this.loadStateFromStorage();

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
    const featureToggles = document.getElementById('featureToggles');
    const climateMode = document.getElementById('climateMode');
    const legendPanel = document.getElementById('legendPanel');

    viewTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        viewTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const view = tab.getAttribute('data-view') as ViewMode;
        if (view) {
          this.viewMode = view;

          // Update current view display
          const currentViewEl = document.getElementById('currentView');
          if (currentViewEl) {
            currentViewEl.textContent = view.charAt(0).toUpperCase() + view.slice(1);
          }

          // Show/hide feature toggles based on view
          if (featureToggles) {
            featureToggles.style.display = view !== ViewMode.EARTH ? 'block' : 'none';
          }

          // Show/hide climate mode selector
          if (climateMode) {
            climateMode.style.display = view === ViewMode.CLIMATE ? 'block' : 'none';
          }

          // Show/hide legend for climate view
          if (legendPanel) {
            if (view === ViewMode.CLIMATE) {
              legendPanel.classList.remove('hidden');
            } else {
              legendPanel.classList.add('hidden');
            }
          }

          // Set default toggles for each view
          const streamlinesCheckbox = document.getElementById('toggleStreamlines') as HTMLInputElement;
          const sunPathCheckbox = document.getElementById('toggleSunPath') as HTMLInputElement;
          const gpsVectorsCheckbox = document.getElementById('toggleGPSVectors') as HTMLInputElement;
          const climateEventsCheckbox = document.getElementById('toggleClimateEvents') as HTMLInputElement;

          if (streamlinesCheckbox) {
            streamlinesCheckbox.checked = view === ViewMode.EM_FIELD;
            streamlinesCheckbox.disabled = view !== ViewMode.EM_FIELD;
            this.showStreamlines = view === ViewMode.EM_FIELD;
          }
          if (sunPathCheckbox) {
            sunPathCheckbox.checked = view === ViewMode.SOLAR;
            sunPathCheckbox.disabled = view !== ViewMode.SOLAR;
            this.showSunPath = view === ViewMode.SOLAR;
          }
          if (gpsVectorsCheckbox) {
            gpsVectorsCheckbox.checked = view === ViewMode.GPS;
            gpsVectorsCheckbox.disabled = view !== ViewMode.GPS;
            this.showGPSVectors = view === ViewMode.GPS;
          }
          if (climateEventsCheckbox) {
            climateEventsCheckbox.checked = view === ViewMode.CLIMATE;
            climateEventsCheckbox.disabled = view !== ViewMode.CLIMATE;
            this.showClimateEvents = view === ViewMode.CLIMATE;
          }
        }
      });
    });

    // Feature toggles
    const toggleStreamlines = document.getElementById('toggleStreamlines') as HTMLInputElement;
    if (toggleStreamlines) {
      toggleStreamlines.addEventListener('change', () => {
        this.showStreamlines = toggleStreamlines.checked;
      });
    }

    const toggleSunPath = document.getElementById('toggleSunPath') as HTMLInputElement;
    if (toggleSunPath) {
      toggleSunPath.addEventListener('change', () => {
        this.showSunPath = toggleSunPath.checked;
      });
    }

    const toggleGPSVectors = document.getElementById('toggleGPSVectors') as HTMLInputElement;
    if (toggleGPSVectors) {
      toggleGPSVectors.addEventListener('change', () => {
        this.showGPSVectors = toggleGPSVectors.checked;
      });
    }

    const toggleClimateEvents = document.getElementById('toggleClimateEvents') as HTMLInputElement;
    if (toggleClimateEvents) {
      toggleClimateEvents.addEventListener('change', () => {
        this.showClimateEvents = toggleClimateEvents.checked;
      });
    }

    // Climate mode selector
    const climateModeSelect = document.getElementById('climateModeSelect') as HTMLSelectElement;
    if (climateModeSelect && this.climateRenderer) {
      climateModeSelect.addEventListener('change', () => {
        const mode = climateModeSelect.value === 'zones' ? 0 : 1;
        this.climateRenderer!.setVisualizationMode(mode);
      });
    }

    // Help overlay
    const helpButton = document.getElementById('helpButton');
    const helpOverlay = document.getElementById('helpOverlay');
    const closeHelp = document.getElementById('closeHelp');

    if (helpButton && helpOverlay) {
      helpButton.addEventListener('click', () => {
        helpOverlay.classList.remove('hidden');
      });
    }

    if (closeHelp && helpOverlay) {
      closeHelp.addEventListener('click', () => {
        helpOverlay.classList.add('hidden');
      });

      helpOverlay.addEventListener('click', (e) => {
        if (e.target === helpOverlay) {
          helpOverlay.classList.add('hidden');
        }
      });
    }

    // Export buttons
    const exportGPS = document.getElementById('exportGPS');
    if (exportGPS) {
      exportGPS.addEventListener('click', () => this.exportGPSData());
    }

    const exportClimate = document.getElementById('exportClimate');
    if (exportClimate) {
      exportClimate.addEventListener('click', () => this.exportClimateData());
    }

    // Enhanced screenshot
    const enhancedScreenshot = document.getElementById('enhancedScreenshot');
    if (enhancedScreenshot) {
      enhancedScreenshot.addEventListener('click', () => this.takeEnhancedScreenshot());
    }

    // Save/Load state
    const saveState = document.getElementById('saveState');
    if (saveState) {
      saveState.addEventListener('click', () => this.saveStateToStorage());
    }

    const loadState = document.getElementById('loadState');
    if (loadState) {
      loadState.addEventListener('click', () => {
        this.loadStateFromStorage();
        this.showNotification('State loaded from storage!');
      });
    }

    // Share URL
    const shareURL = document.getElementById('shareURL');
    if (shareURL) {
      shareURL.addEventListener('click', () => this.shareCurrentState());
    }

    // Presets
    const presetSelect = document.getElementById('presetSelect') as HTMLSelectElement;
    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        const preset = presetSelect.value;
        if (preset) {
          this.loadPreset(preset);
          presetSelect.value = ''; // Reset to placeholder
        }
      });
    }

    // Export statistics
    const exportStats = document.getElementById('exportStats');
    if (exportStats) {
      exportStats.addEventListener('click', () => this.exportStatistics());
    }

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

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case '1': // Earth view
          document.querySelector('[data-view="earth"]')?.dispatchEvent(new Event('click'));
          break;
        case '2': // EM Field view
          document.querySelector('[data-view="field"]')?.dispatchEvent(new Event('click'));
          break;
        case '3': // Solar view
          document.querySelector('[data-view="solar"]')?.dispatchEvent(new Event('click'));
          break;
        case '4': // Climate view
          document.querySelector('[data-view="climate"]')?.dispatchEvent(new Event('click'));
          break;
        case '5': // GPS view
          document.querySelector('[data-view="gps"]')?.dispatchEvent(new Event('click'));
          break;
        case ' ': // Space - Play/Pause
          e.preventDefault();
          this.state.isPaused = !this.state.isPaused;
          const playPauseBtn = document.getElementById('playPause');
          if (playPauseBtn) {
            playPauseBtn.textContent = this.state.isPaused ? '▶ Play' : '⏸ Pause';
          }
          break;
        case 'r': // Reset
          document.getElementById('reset')?.click();
          break;
        case 'h': // Help overlay
          const helpOverlay = document.getElementById('helpOverlay');
          if (helpOverlay) {
            helpOverlay.classList.toggle('hidden');
          }
          break;
        case 'l': // Legend panel
          const legendPanel = document.getElementById('legendPanel');
          if (legendPanel) {
            legendPanel.classList.toggle('hidden');
          }
          break;
        case 'g': // Toggle grid
          const toggleGrid = document.getElementById('toggleGrid') as HTMLInputElement;
          if (toggleGrid) {
            toggleGrid.checked = !toggleGrid.checked;
            toggleGrid.dispatchEvent(new Event('change'));
          }
          break;
        case '+':
        case '=': // Increase time scale
          e.preventDefault();
          const timeScaleSlider = document.getElementById('timeScale') as HTMLInputElement;
          if (timeScaleSlider) {
            const newValue = Math.min(6, parseFloat(timeScaleSlider.value) + 0.5);
            timeScaleSlider.value = newValue.toString();
            timeScaleSlider.dispatchEvent(new Event('input'));
          }
          break;
        case '-': // Decrease time scale
          e.preventDefault();
          const timeScaleSliderDec = document.getElementById('timeScale') as HTMLInputElement;
          if (timeScaleSliderDec) {
            const newValue = Math.max(0, parseFloat(timeScaleSliderDec.value) - 0.5);
            timeScaleSliderDec.value = newValue.toString();
            timeScaleSliderDec.dispatchEvent(new Event('input'));
          }
          break;
        case 'arrowleft': // Pan left
          e.preventDefault();
          this.camera.pan(-0.1, 0);
          break;
        case 'arrowright': // Pan right
          e.preventDefault();
          this.camera.pan(0.1, 0);
          break;
        case 'arrowup': // Pan up
          e.preventDefault();
          this.camera.pan(0, -0.1);
          break;
        case 'arrowdown': // Pan down
          e.preventDefault();
          this.camera.pan(0, 0.1);
          break;
        case '[': // Zoom in
          e.preventDefault();
          this.camera.zoomBy(1.1);
          break;
        case ']': // Zoom out
          e.preventDefault();
          this.camera.zoomBy(0.9);
          break;
        case 's': // Screenshot
          if (e.ctrlKey || e.metaKey) return; // Don't interfere with browser save
          e.preventDefault();
          this.takeScreenshot();
          break;
        case 'e': // Export
          e.preventDefault();
          if (this.viewMode === ViewMode.GPS) {
            this.exportGPSData();
          } else if (this.viewMode === ViewMode.CLIMATE) {
            this.exportClimateData();
          }
          break;
      }
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

      case ViewMode.CLIMATE:
        if (this.climateRenderer) {
          this.climateRenderer.renderOverlay(
            this.camera,
            this.state.time,
            this.state.expansionRate,
            this.climate
          );
          if (this.showClimateEvents) {
            this.climateRenderer.renderEvents(this.camera);
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

    // Memory monitoring (if available)
    const memoryEl = document.getElementById('memory');
    if (memoryEl && (performance as any).memory) {
      const memoryMB = (performance as any).memory.usedJSHeapSize / 1048576;
      memoryEl.textContent = `${memoryMB.toFixed(1)} MB`;
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

  private exportGPSData(): void {
    const stations = this.gps.getStations();
    if (!stations || stations.length === 0) {
      console.warn('No GPS data to export');
      return;
    }

    // Create CSV header
    let csv = 'ID,Name,Latitude_Approx,Longitude_Approx,Radius_km,Theta_rad,Displacement_X_m,Displacement_Y_m,Velocity_X_m_yr,Velocity_Y_m_yr\n';

    // Add data rows
    stations.forEach(station => {
      const lat = 90 - (station.position.r / MODEL.geometry.ANTARCTIC_RIM_RADIUS) * 90;
      const lon = (station.position.theta * 180 / Math.PI) % 360;
      const dispX = station.displacement?.x || 0;
      const dispY = station.displacement?.y || 0;
      const velX = station.velocity?.x || 0;
      const velY = station.velocity?.y || 0;

      csv += `${station.id},${station.name || 'GPS-' + station.id},${lat.toFixed(2)},${lon.toFixed(2)},${station.position.r.toFixed(2)},${station.position.theta.toFixed(4)},${dispX.toFixed(3)},${dispY.toFixed(3)},${velX.toFixed(3)},${velY.toFixed(3)}\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gps-data-${this.state.time.toFixed(0)}yr-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`✓ Exported ${stations.length} GPS stations to CSV`);
  }

  private exportClimateData(): void {
    // Generate climate data for export
    const climateData: any[] = [];
    const radialSteps = 100;

    for (let i = 0; i < radialSteps; i++) {
      const r = (i / radialSteps) * MODEL.geometry.ANTARCTIC_RIM_RADIUS;
      const zone = this.climate.getClimateZone(r);
      const anomaly = this.climate.getTemperatureAnomaly(r, this.state.time);
      const distToRim = this.climate.getDistanceToRim(r);

      climateData.push({
        radius_km: r,
        zone: ['Polar', 'Subarctic', 'Temperate', 'Subtropical', 'Tropical', 'Heating', 'Cooling', 'Stable'][zone] || 'Unknown',
        temperature_anomaly_C: anomaly,
        distance_to_rim_km: distToRim,
        latitude_approx: 90 - (r / MODEL.geometry.ANTARCTIC_RIM_RADIUS) * 90
      });
    }

    // Create CSV
    let csv = 'Radius_km,Zone,Temperature_Anomaly_C,Distance_To_Rim_km,Latitude_Approx\n';
    climateData.forEach(row => {
      csv += `${row.radius_km.toFixed(2)},${row.zone},${row.temperature_anomaly_C.toFixed(3)},${row.distance_to_rim_km.toFixed(2)},${row.latitude_approx.toFixed(2)}\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climate-data-${this.state.time.toFixed(0)}yr-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`✓ Exported climate data (${climateData.length} samples) to CSV`);
  }

  /**
   * Save current simulation state to localStorage
   */
  private saveStateToStorage(): void {
    try {
      const stateData = {
        state: this.state,
        viewMode: this.viewMode,
        cameraState: this.camera.getState(),
        timestamp: Date.now(),
      };
      localStorage.setItem('flat-earth-engine-state', JSON.stringify(stateData));
      console.log('✓ State saved to localStorage');

      // Show notification
      this.showNotification('Simulation state saved!');
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Load simulation state from localStorage
   */
  private loadStateFromStorage(): void {
    try {
      const saved = localStorage.getItem('flat-earth-engine-state');
      if (!saved) return;

      const stateData = JSON.parse(saved);

      // Check if saved state is not too old (7 days)
      const age = Date.now() - stateData.timestamp;
      if (age > 7 * 24 * 60 * 60 * 1000) {
        console.log('Saved state too old, ignoring');
        return;
      }

      // Apply saved state
      Object.assign(this.state, stateData.state);
      this.viewMode = stateData.viewMode || ViewMode.EARTH;

      if (stateData.cameraState) {
        this.camera.setState(stateData.cameraState);
      }

      this.updateUIFromState();
      console.log('✓ State loaded from localStorage');
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  /**
   * Load simulation state from URL parameters
   */
  private loadStateFromURL(): void {
    try {
      const params = new URLSearchParams(window.location.search);

      if (params.has('preset')) {
        const presetName = params.get('preset') as string;
        this.loadPreset(presetName);
        return;
      }

      // Load individual parameters
      if (params.has('time')) this.state.time = parseFloat(params.get('time')!);
      if (params.has('timeScale')) this.state.timeScale = parseFloat(params.get('timeScale')!);
      if (params.has('expansionRate')) this.state.expansionRate = parseFloat(params.get('expansionRate')!);
      if (params.has('fieldStrength')) this.state.fieldStrength = parseFloat(params.get('fieldStrength')!);
      if (params.has('view')) this.viewMode = params.get('view') as ViewMode;
      if (params.has('paused')) this.state.isPaused = params.get('paused') === 'true';

      this.updateUIFromState();
      console.log('✓ State loaded from URL parameters');
    } catch (error) {
      console.error('Failed to load state from URL:', error);
    }
  }

  /**
   * Generate shareable URL with current state
   */
  private generateShareableURL(): string {
    const params = new URLSearchParams();
    params.set('time', this.state.time.toFixed(2));
    params.set('timeScale', this.state.timeScale.toString());
    params.set('expansionRate', this.state.expansionRate.toString());
    params.set('fieldStrength', this.state.fieldStrength.toString());
    params.set('view', this.viewMode);
    params.set('paused', this.state.isPaused.toString());

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    return url;
  }

  /**
   * Copy shareable URL to clipboard
   */
  private async shareCurrentState(): Promise<void> {
    try {
      const url = this.generateShareableURL();
      await navigator.clipboard.writeText(url);
      console.log('✓ Shareable URL copied to clipboard:', url);
      this.showNotification('Shareable link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      this.showNotification('Failed to copy link', 'error');
    }
  }

  /**
   * Load a configuration preset
   */
  private loadPreset(presetName: string): void {
    const preset = this.presets.get(presetName);
    if (!preset) {
      console.warn(`Preset "${presetName}" not found`);
      return;
    }

    Object.assign(this.state, preset);

    // Update simulation engines
    this.expansion.setExpansionRate(this.state.expansionRate / 100);
    this.gps.setExpansionRate(this.state.expansionRate / 100);
    this.emField.setFieldStrength(MODEL.electromagnetic.VORTEX_STRENGTH_B0 * this.state.fieldStrength);

    // Regenerate data
    if (this.fieldRenderer) {
      this.fieldRenderer.generateStreamlines(this.emField, 24);
    }
    if (this.solarRenderer) {
      this.solarRenderer.updateSunPath(this.solar, this.state.time * 365.24);
    }

    this.updateUIFromState();
    console.log(`✓ Loaded preset: ${presetName}`);
    this.showNotification(`Preset loaded: ${presetName}`);
  }

  /**
   * Update UI controls from current state
   */
  private updateUIFromState(): void {
    const timeScaleSlider = document.getElementById('timeScale') as HTMLInputElement;
    const expansionRateSlider = document.getElementById('expansionRate') as HTMLInputElement;
    const fieldStrengthSlider = document.getElementById('fieldStrength') as HTMLInputElement;
    const simTimeSlider = document.getElementById('simTime') as HTMLInputElement;
    const playPauseBtn = document.getElementById('playPause');

    if (timeScaleSlider) {
      const logValue = Math.log10(this.state.timeScale);
      timeScaleSlider.value = logValue.toString();
      timeScaleSlider.dispatchEvent(new Event('input'));
    }

    if (expansionRateSlider) {
      expansionRateSlider.value = this.state.expansionRate.toString();
      expansionRateSlider.dispatchEvent(new Event('input'));
    }

    if (fieldStrengthSlider) {
      fieldStrengthSlider.value = this.state.fieldStrength.toString();
      fieldStrengthSlider.dispatchEvent(new Event('input'));
    }

    if (simTimeSlider) {
      simTimeSlider.value = this.state.time.toString();
      simTimeSlider.dispatchEvent(new Event('input'));
    }

    if (playPauseBtn) {
      playPauseBtn.textContent = this.state.isPaused ? '▶ Play' : '⏸ Pause';
    }

    // Switch to correct view mode
    const viewButton = document.querySelector(`[data-view="${this.viewMode}"]`);
    if (viewButton) {
      viewButton.dispatchEvent(new Event('click'));
    }
  }

  /**
   * Show notification to user
   */
  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      `;
      document.body.appendChild(notification);
    }

    // Set color based on type
    notification.style.backgroundColor = type === 'success' ? 'rgba(76, 175, 80, 0.95)' : 'rgba(244, 67, 54, 0.95)';
    notification.style.color = '#fff';
    notification.textContent = message;

    // Show notification
    notification.style.opacity = '1';

    // Hide after 3 seconds
    setTimeout(() => {
      notification!.style.opacity = '0';
    }, 3000);
  }

  /**
   * Take enhanced screenshot with metadata overlay
   */
  private takeEnhancedScreenshot(): void {
    // Create a temporary canvas to add metadata overlay
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const ctx = tempCanvas.getContext('2d')!;

    // Draw current canvas
    ctx.drawImage(this.canvas, 0, 0);

    // Add metadata overlay
    const padding = 20;
    const lineHeight = 24;
    const fontSize = 18;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(padding - 10, padding - 10, 400, 180);

    ctx.fillStyle = '#e8eaf6';
    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.fillText('Flat Earth Engine', padding, padding + lineHeight);

    ctx.font = `${fontSize - 2}px 'Segoe UI', sans-serif`;
    ctx.fillText(`View: ${this.viewMode.charAt(0).toUpperCase() + this.viewMode.slice(1)}`, padding, padding + lineHeight * 2);
    ctx.fillText(`Time: ${this.state.time.toFixed(2)} years`, padding, padding + lineHeight * 3);
    ctx.fillText(`Expansion Rate: ${this.state.expansionRate.toFixed(1)} cm/yr`, padding, padding + lineHeight * 4);
    ctx.fillText(`Field Strength: ${this.state.fieldStrength.toFixed(1)}x`, padding, padding + lineHeight * 5);

    const date = new Date().toISOString().split('T')[0];
    ctx.fillText(`Date: ${date}`, padding, padding + lineHeight * 6);

    // Download image
    tempCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flat-earth-${this.viewMode}-t${this.state.time.toFixed(0)}yr-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Screenshot saved with metadata!');
      }
    });
  }

  /**
   * Get detailed statistics
   */
  private getDetailedStatistics(): string {
    const stats = {
      fps: this.fpsCounter.getFPS(),
      time: this.state.time,
      expandedRadius: this.expansion.getExpandedRadius(MODEL.geometry.ANTARCTIC_RIM_RADIUS, this.state.time),
      dayLength: this.expansion.getDayLength(this.state.time),
      gpsStations: this.gps.getStations().length,
      viewMode: this.viewMode,
      memoryMB: (performance as any).memory ? ((performance as any).memory.usedJSHeapSize / 1048576).toFixed(1) : 'N/A',
      canvas: `${this.canvas.width}x${this.canvas.height}`,
    };

    return JSON.stringify(stats, null, 2);
  }

  /**
   * Export detailed statistics
   */
  private exportStatistics(): void {
    const stats = this.getDetailedStatistics();
    const blob = new Blob([stats], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flat-earth-stats-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✓ Statistics exported');
    this.showNotification('Statistics exported!');
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
    this.climateRenderer?.dispose();
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
