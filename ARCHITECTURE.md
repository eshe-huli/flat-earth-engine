# Flat Earth Engine - Technical Architecture

## Overview

The Flat Earth Engine is a web-based interactive visualization and simulation system for the Expanding Earth Electromagnetic Model. It provides real-time rendering of the planar Earth geometry, electromagnetic field dynamics, solar mechanics, climate predictions, and expansion phenomena.

## Core Model Parameters

### Geometric Constants
```javascript
const MODEL = {
  geometry: {
    NORTH_POLE_CENTER: { r: 0, theta: 0 },     // Center point
    ANTARCTIC_RIM_RADIUS: 20000,                 // km
    TROPIC_CANCER_RADIUS: 2600,                  // km from center
    EQUATOR_RADIUS: 10000,                       // km from center
    TROPIC_CAPRICORN_RADIUS: 4100,               // km from center
  },

  expansion: {
    RATE: 0.033,                                 // meters/year (3.3 cm/year)
    CONSTANT_K: 0.033,                           // expansion constant
  },

  electromagnetic: {
    VORTEX_STRENGTH_B0: 1000,                    // Arbitrary units
    FIELD_TYPE: 'toroidal',                      // B(r,θ) = (B₀/r²)[cos(θ)r̂ + sin(θ)θ̂]
  },

  solar: {
    ALTITUDE: 7500,                              // km (5,000-10,000 range)
    ORBITAL_PERIOD: 365.24,                      // days
    DAILY_PERIOD: 24,                            // hours
    TROPIC_CANCER_RADIUS: 2600,                  // Summer solstice
    TROPIC_CAPRICORN_RADIUS: 4100,               // Winter solstice
    ILLUMINATION_ANGLE: Math.PI / 6,             // 30° cone
  },

  climate: {
    HEATING_ZONE_MIN: 2000,                      // km (20-35°N)
    HEATING_ZONE_MAX: 3500,                      // km
    COOLING_ZONE_MIN: 12000,                     // km (30-50°S)
    COOLING_ZONE_MAX: 18000,                     // km
  }
};
```

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  UI Controls │  │ Info Panels  │  │ Export/Share     │  │
│  │  - Time      │  │ - Equations  │  │ - Screenshot     │  │
│  │  - Params    │  │ - Evidence   │  │ - Parameters     │  │
│  │  - Views     │  │ - Metrics    │  │ - Video Render   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    VISUALIZATION LAYER                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              WebGL Rendering Pipeline                 │  │
│  │  - Scene Graph                                        │  │
│  │  - Camera System (orbit/pan/zoom)                    │  │
│  │  - Shader Programs (vertex/fragment/compute)         │  │
│  │  - Texture Management                                 │  │
│  │  - Post-processing Effects                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────┐│
│  │  Earth    │ │  EM Field │ │  Solar   │ │  Climate    ││
│  │  Renderer │ │  Renderer │ │  Renderer│ │  Renderer   ││
│  └───────────┘ └───────────┘ └──────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SIMULATION LAYER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Simulation Engine (TypeScript)              │  │
│  │                                                        │  │
│  │  ┌─────────────────┐    ┌──────────────────┐        │  │
│  │  │ Expansion       │    │ EM Field Solver  │        │  │
│  │  │ Calculator      │    │ - Toroidal field │        │  │
│  │  │ - r'(t)=r₀(1+kt)│    │ - Streamlines    │        │  │
│  │  │ - v(r)=kr       │    │ - Field vectors  │        │  │
│  │  └─────────────────┘    └──────────────────┘        │  │
│  │                                                        │  │
│  │  ┌─────────────────┐    ┌──────────────────┐        │  │
│  │  │ Solar Motion    │    │ Climate Model    │        │  │
│  │  │ - Spiral path   │    │ - Zone shifts    │        │  │
│  │  │ - Illumination  │    │ - Temp gradients │        │  │
│  │  │ - Analemma      │    │ - Predictions    │        │  │
│  │  └─────────────────┘    └──────────────────┘        │  │
│  │                                                        │  │
│  │  ┌─────────────────┐    ┌──────────────────┐        │  │
│  │  │ GPS Simulator   │    │ Seismic Wave     │        │  │
│  │  │ - Radial vectors│    │ - 17s Mayotte    │        │  │
│  │  │ - Station data  │    │ - Propagation    │        │  │
│  │  └─────────────────┘    └──────────────────┘        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Mock Data Generators & Real Data Adapters           │  │
│  │  - GPS station positions                              │  │
│  │  - Climate event records (South Africa snow, etc)    │  │
│  │  - Temperature data (Arabia, southern regions)       │  │
│  │  - Seismic records                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Core Technologies
- **WebGL 2.0**: Hardware-accelerated 3D graphics
- **TypeScript**: Type-safe application code
- **GLSL**: Shader programming for GPU computations
- **Web Workers**: Background thread for heavy simulations
- **IndexedDB**: Client-side data caching

### Libraries
- **gl-matrix**: Fast matrix/vector math
- **dat.gui**: Runtime parameter controls (dev mode)
- **chart.js**: Data visualization (time series, graphs)

### Build System
- **Vite**: Fast dev server and bundler
- **TypeScript**: Compilation and type checking
- **ESLint**: Code quality
- **Prettier**: Code formatting

## Coordinate Systems

### Model Space (Polar)
```
r: [0, 20000] km (radial distance from North Pole)
θ: [0, 2π] radians (angle from prime meridian)
z: [0, ~120] km (altitude, for sun/atmosphere)
```

### Screen Space (Cartesian)
```
x: [-1, 1] normalized device coordinates
y: [-1, 1] normalized device coordinates

Transform: polar_to_screen(r, θ, camera)
```

### Conversion Functions
```typescript
function polarToCartesian(r: number, theta: number): Vector2 {
  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta)
  };
}

function cartesianToPolar(x: number, y: number): Polar {
  return {
    r: Math.sqrt(x * x + y * y),
    theta: Math.atan2(y, x)
  };
}

function screenToPolar(screenX: number, screenY: number, camera: Camera): Polar {
  // Account for camera transform (pan, zoom)
  const worldX = (screenX - camera.offsetX) / camera.zoom;
  const worldY = (screenY - camera.offsetY) / camera.zoom;
  return cartesianToPolar(worldX, worldY);
}
```

## Core Modules

### 1. Geometry Module (`geometry.ts`)
**Purpose**: Coordinate transforms, distance calculations, geometric utilities

**Key Functions**:
- `polarToCartesian(r, θ)`
- `getExpansionVector(r, t, k)` → returns velocity vector
- `calculateRadialDisplacement(r0, t, k)` → returns new r
- `isInsideAntarcticRim(r)` → boundary check
- `getLatitudeFromRadius(r)` → approximate latitude mapping

### 2. Expansion Engine (`expansion.ts`)
**Purpose**: Calculate radial expansion at any point and time

```typescript
class ExpansionEngine {
  private k: number = 0.033; // meters/year
  private t0: number = 0;     // reference time (years)

  getPosition(r0: number, t: number): number {
    // r'(t) = r₀(1 + kt)
    return r0 * (1 + this.k * (t - this.t0));
  }

  getVelocity(r: number): number {
    // v(r) = kr
    return this.k * r;
  }

  updateMomentOfInertia(t: number): number {
    // I ∝ r², affects day length
    const scale = 1 + this.k * t;
    return scale * scale;
  }
}
```

### 3. EM Field Module (`em-field.ts`)
**Purpose**: Calculate and render electromagnetic field

```typescript
class EMFieldSolver {
  private B0: number = 1000; // field strength

  // Toroidal field: B(r,θ) = (B₀/r²)[cos(θ)r̂ + sin(θ)θ̂]
  getFieldVector(r: number, theta: number): Vector2 {
    const magnitude = this.B0 / (r * r + 0.001); // avoid singularity
    return {
      r: magnitude * Math.cos(theta),
      theta: magnitude * Math.sin(theta)
    };
  }

  generateStreamlines(count: number): Streamline[] {
    // RK4 integration along field lines
    // Returns array of polylines for rendering
  }

  calculateFieldTexture(resolution: number): Float32Array {
    // Generate texture for GPU rendering
    // RGBA: R=B_r, G=B_theta, B=0, A=magnitude
  }
}
```

### 4. Solar Motion Module (`solar.ts`)
**Purpose**: Calculate sun position and illumination

```typescript
class SolarSimulator {
  private altitude: number = 7500; // km
  private period: number = 365.24; // days

  getSunPosition(t: number): Vector3 {
    // t in days
    const yearProgress = (t % this.period) / this.period;
    const angle = yearProgress * 2 * Math.PI;

    // Radial position (between tropics)
    const r_min = MODEL.geometry.TROPIC_CANCER_RADIUS;
    const r_max = MODEL.geometry.TROPIC_CAPRICORN_RADIUS;
    const r = r_min + (r_max - r_min) * (0.5 + 0.5 * Math.sin(angle));

    // Daily rotation
    const dailyAngle = ((t % 1) * 2 * Math.PI);

    return {
      x: r * Math.cos(dailyAngle),
      y: r * Math.sin(dailyAngle),
      z: this.altitude
    };
  }

  getIlluminationIntensity(pos: Vector2, sunPos: Vector3): number {
    // Calculate if point is in illumination cone
    const dist = Math.sqrt(
      Math.pow(pos.x - sunPos.x, 2) +
      Math.pow(pos.y - sunPos.y, 2)
    );

    const coneRadius = sunPos.z * Math.tan(MODEL.solar.ILLUMINATION_ANGLE);

    // Smooth falloff
    return smoothstep(coneRadius * 1.2, coneRadius * 0.8, dist);
  }
}
```

### 5. Climate Module (`climate.ts`)
**Purpose**: Model climate zones and predictions

```typescript
class ClimateModel {
  private zones = {
    heating: { min: 2000, max: 3500 },     // Northern (20-35°N)
    cooling: { min: 12000, max: 18000 }    // Southern (30-50°S)
  };

  getClimateZone(r: number): ClimateZone {
    if (r >= this.zones.heating.min && r <= this.zones.heating.max) {
      return ClimateZone.HEATING;
    } else if (r >= this.zones.cooling.min && r <= this.zones.cooling.max) {
      return ClimateZone.COOLING;
    }
    return ClimateZone.STABLE;
  }

  getTemperatureAnomaly(r: number, t: number): number {
    // Simulate temperature change based on zone
    const zone = this.getClimateZone(r);

    switch(zone) {
      case ClimateZone.HEATING:
        return 3.0 * (t / 100); // 3x warming per century
      case ClimateZone.COOLING:
        return -1.5 * (t / 100); // Cooling trend
      default:
        return 0;
    }
  }
}
```

### 6. GPS Simulator (`gps.ts`)
**Purpose**: Generate and visualize GPS displacement vectors

```typescript
class GPSSimulator {
  private stations: GPSStation[] = [];

  generateStations(count: number): void {
    // Create stations in concentric circles
    for (let i = 0; i < count; i++) {
      const r = Math.random() * MODEL.geometry.ANTARCTIC_RIM_RADIUS;
      const theta = Math.random() * 2 * Math.PI;

      this.stations.push({
        id: `GPS_${i}`,
        position: { r, theta },
        initialPosition: { r, theta },
        velocity: this.calculateExpansionVelocity(r)
      });
    }
  }

  calculateExpansionVelocity(r: number): Vector2 {
    // v(r) = kr (radial)
    const speed = MODEL.expansion.CONSTANT_K * r;
    // Convert to cartesian for rendering
    return { x: speed, y: 0 }; // simplified
  }

  updatePositions(dt: number): void {
    for (const station of this.stations) {
      // Update based on expansion
      station.position.r *= (1 + MODEL.expansion.CONSTANT_K * dt);
    }
  }
}
```

## Rendering Pipeline

### WebGL Rendering Flow

```
Frame Start
    ↓
Clear Framebuffer
    ↓
Update Simulation State (CPU)
    ↓
Upload Uniforms (time, camera, params)
    ↓
┌───────────────────────────┐
│  Render Pass 1: Earth     │
│  - Base disk geometry     │
│  - Radial grid lines      │
│  - Geographic features    │
└───────────────────────────┘
    ↓
┌───────────────────────────┐
│  Render Pass 2: EM Field  │
│  - Field texture overlay  │
│  - Streamlines (instanced)│
│  - Central vortex effect  │
└───────────────────────────┘
    ↓
┌───────────────────────────┐
│  Render Pass 3: Solar     │
│  - Day/night overlay      │
│  - Sun glow effect        │
│  - Sun path trace         │
└───────────────────────────┘
    ↓
┌───────────────────────────┐
│  Render Pass 4: Climate   │
│  - Zone color overlay     │
│  - Temperature heatmap    │
│  - Event markers (snow)   │
└───────────────────────────┘
    ↓
┌───────────────────────────┐
│  Render Pass 5: Data      │
│  - GPS vectors (arrows)   │
│  - Seismic wavefronts     │
│  - Labels and text        │
└───────────────────────────┘
    ↓
Post-Processing (bloom, etc)
    ↓
Present to Screen
    ↓
Request Next Frame
```

### Key Shader Programs

#### Earth Vertex Shader
```glsl
#version 300 es
precision highp float;

in vec2 a_position;  // Polar coordinates (r, theta)
in vec2 a_uv;

uniform mat4 u_viewProjection;
uniform float u_time;
uniform float u_expansionRate;

out vec2 v_uv;
out vec2 v_worldPos;

void main() {
  // Apply expansion
  float r = a_position.x * (1.0 + u_expansionRate * u_time);
  float theta = a_position.y;

  // Convert to cartesian
  vec2 worldPos = vec2(
    r * cos(theta),
    r * sin(theta)
  );

  v_worldPos = worldPos;
  v_uv = a_uv;

  gl_Position = u_viewProjection * vec4(worldPos, 0.0, 1.0);
}
```

#### EM Field Fragment Shader
```glsl
#version 300 es
precision highp float;

in vec2 v_worldPos;
uniform float u_fieldStrength;
uniform float u_time;

out vec4 fragColor;

vec2 getFieldVector(vec2 pos) {
  float r = length(pos);
  float theta = atan(pos.y, pos.x);

  // B(r,θ) = (B₀/r²)[cos(θ)r̂ + sin(θ)θ̂]
  float magnitude = u_fieldStrength / (r * r + 0.001);

  return vec2(
    magnitude * cos(theta),
    magnitude * sin(theta)
  );
}

void main() {
  vec2 field = getFieldVector(v_worldPos);
  float intensity = length(field) * 0.1;

  // Color based on field direction and strength
  vec3 color = vec3(0.3, 0.5, 0.9) * intensity;

  fragColor = vec4(color, intensity);
}
```

## Performance Optimizations

### 1. Level of Detail (LOD)
- Close to center: High tessellation
- Near rim: Lower tessellation
- Dynamic adjustment based on zoom level

### 2. Instanced Rendering
- GPS station markers
- Field line segments
- Climate event markers

### 3. Texture Atlasing
- Pack multiple textures into single atlas
- Reduce draw calls

### 4. Frustum Culling
- Only render visible portions
- Especially important near rim

### 5. Compute Shaders (WebGPU future)
- EM field calculation on GPU
- Particle advection
- Wave propagation

## Data Formats

### GPS Station Format (JSON)
```json
{
  "stations": [
    {
      "id": "HARB",
      "name": "Hartebeesthoek, South Africa",
      "position": { "r": 13500, "theta": 0.35 },
      "displacement": { "dr": 0.06, "dtheta": 0.001 },
      "timespan": { "start": "2018-01-01", "end": "2025-01-01" },
      "velocity": { "r": 0.033, "theta": 0 }
    }
  ]
}
```

### Climate Event Format
```json
{
  "events": [
    {
      "id": "SA_SNOW_2024_09",
      "type": "snow",
      "location": { "r": 13500, "theta": 0.35 },
      "date": "2024-09-20",
      "severity": 2.0,
      "description": "2 meters snow, highway closures",
      "rarity": 0.98
    }
  ]
}
```

## Export Formats

### Screenshot
- PNG with metadata (parameters, timestamp)
- Resolution: up to 4K

### Video
- WebM/MP4 via MediaRecorder API
- Frame-by-frame capture for high quality
- Embedded timecode and parameters

### Data Export
- CSV: Time series data (temperature, displacement)
- JSON: Complete state snapshot
- GeoJSON: Vector data (for mapping tools)

## Development Workflow

### Local Development
```bash
npm install
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run tests
```

### Project Structure
```
src/
  ├── core/
  │   ├── geometry.ts
  │   ├── expansion.ts
  │   ├── em-field.ts
  │   ├── solar.ts
  │   ├── climate.ts
  │   └── gps.ts
  ├── rendering/
  │   ├── webgl-context.ts
  │   ├── earth-renderer.ts
  │   ├── field-renderer.ts
  │   ├── solar-renderer.ts
  │   └── data-renderer.ts
  ├── shaders/
  │   ├── earth.vert
  │   ├── earth.frag
  │   ├── field.vert
  │   ├── field.frag
  │   └── ...
  ├── ui/
  │   ├── controls.ts
  │   ├── timeline.ts
  │   └── info-panel.ts
  ├── data/
  │   ├── mock-gps.ts
  │   ├── mock-climate.ts
  │   └── data-loader.ts
  └── main.ts
```

## Testing Strategy

### Unit Tests
- Coordinate transformations
- Expansion calculations
- Field vector computations
- Solar position accuracy

### Integration Tests
- Rendering pipeline
- Data loading and parsing
- UI interactions

### Visual Regression Tests
- Golden frame comparison
- Deterministic rendering

## Future Enhancements (Phase 2+)

### Rust Backend
- High-performance simulation server
- Real data processing pipeline
- API for web frontend

### Advanced Rendering
- WebGPU compute shaders
- Volumetric lighting
- Particle effects for vortex

### Data Integration
- Real GPS data ingestion
- Live weather data
- Historical climate records

### Collaboration Features
- Scenario sharing
- Parameter presets
- Community datasets

---

**Next Steps**: Begin implementation of core modules, starting with geometry and rendering foundation.
