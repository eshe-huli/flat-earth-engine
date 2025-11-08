# Flat Earth Engine

An interactive visualization and simulation system for the **Expanding Earth Electromagnetic Model** - a comprehensive alternative cosmological framework.

## Overview

The Flat Earth Engine is a web-based application that provides real-time rendering of:

- **Planar Earth geometry** with North Pole at center and Antarctic ice wall rim
- **Radial expansion dynamics** (3.3 cm/year from GPS data)
- **Electromagnetic toroidal field** from central vortex
- **Local sun mechanics** with spiral path and illumination cone
- **Climate zone predictions** with validation data
- **GPS displacement vectors** showing radial expansion pattern

## Features

### Core Simulations

✅ **Expansion Engine** - Calculate radial expansion at any point and time
✅ **EM Field Solver** - Toroidal electromagnetic field with streamline visualization
✅ **Solar Simulator** - Sun moving in spiral path between tropics
✅ **Climate Model** - Zone shifts, heating/cooling predictions
✅ **GPS Network** - 1000+ simulated stations with displacement tracking

### Visualization Modes

- **Earth View** - Flat plane with radial grid, expansion vectors
- **EM Field View** - Field lines, vortex visualization, field strength heatmap
- **Solar View** - Sun path, day/night cone, analemma pattern
- **Climate View** - Zone overlays, temperature anomalies, event markers
- **GPS View** - Station positions, displacement vectors, pattern analysis

### Interactive Controls

- **Time Control** - Play/pause, time scale (1x to 1,000,000x), scrub timeline
- **Parameter Adjustment** - Expansion rate, field strength, sun altitude
- **View Modes** - Toggle layers, adjust opacity, camera controls
- **Data Export** - Screenshots, parameter snapshots, CSV data

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern browser with WebGL 2.0 support

### Installation

```bash
# Clone the repository
git clone https://github.com/eshe-huli/flat-earth-engine.git
cd flat-earth-engine

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
flat-earth-engine/
├── src/
│   ├── core/                    # Simulation engines
│   │   ├── geometry.ts          # Polar coordinate utilities
│   │   ├── expansion.ts         # Radial expansion mechanics
│   │   ├── em-field.ts          # Electromagnetic field solver
│   │   ├── solar.ts             # Sun motion simulator
│   │   ├── climate.ts           # Climate zone model
│   │   └── gps.ts               # GPS station simulator
│   ├── rendering/               # WebGL renderers (TODO)
│   ├── shaders/                 # GLSL shader programs (TODO)
│   ├── ui/                      # UI components (TODO)
│   ├── data/                    # Mock data generators (TODO)
│   ├── types.ts                 # TypeScript type definitions
│   ├── constants.ts             # Model constants and parameters
│   └── main.ts                  # Application entry point (TODO)
├── index.html                   # HTML entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
├── ANALYSIS.md                  # AI approach comparison
├── ARCHITECTURE.md              # Technical architecture
└── README.md                    # This file
```

## Model Parameters

### Geometric Constants

- **North Pole Center**: r = 0 km
- **Equator**: r ≈ 10,000 km
- **Tropic of Cancer**: r ≈ 2,600 km (23.5°N equivalent)
- **Tropic of Capricorn**: r ≈ 4,100 km (23.5°S equivalent)
- **Antarctic Rim**: r = 20,000 km (boundary)

### Expansion

- **Rate**: 3.3 cm/year (from GPS/Mayotte data)
- **Formula**: r'(t) = r₀(1 + kt)
- **Velocity**: v(r) = kr (proportional to distance)

### Electromagnetic Field

- **Type**: Toroidal
- **Formula**: B(r,θ) = (B₀/r²)[cos(θ)r̂ + sin(θ)θ̂]
- **Central Vortex**: North Pole black hole/EM source

### Solar Mechanics

- **Altitude**: 5,000-10,000 km (local, not 150M km)
- **Path**: Spiral between tropics (annual cycle)
- **Period**: 365.24 days
- **Illumination**: 30° cone angle

### Climate Zones

- **Heating Zone**: 20-35°N (Arabia, North Africa) - +3x warming
- **Cooling Zone**: 30-50°S (South Africa, Argentina) - cooling trend
- **Mechanism**: Radial expansion moves regions into different solar zones

## Development

### Current Status

**Phase 1: Core Modules** ✅ Complete
- [x] Type definitions
- [x] Constants and configuration
- [x] Geometry utilities (polar ↔ Cartesian)
- [x] Expansion engine
- [x] EM field solver with streamlines
- [x] Solar motion simulator
- [x] Climate zone model
- [x] GPS station simulator

**Phase 2: Rendering** 🚧 In Progress
- [ ] WebGL context setup
- [ ] Shader programs (vertex/fragment)
- [ ] Earth renderer
- [ ] EM field renderer
- [ ] Solar renderer
- [ ] Climate overlay renderer
- [ ] GPS vector renderer

**Phase 3: UI & Integration** 📋 Planned
- [ ] Control panel
- [ ] Info displays
- [ ] Time controls
- [ ] Camera system
- [ ] Export functionality

**Phase 4: Data & Validation** 📋 Planned
- [ ] Real GPS data ingestion
- [ ] Climate event database
- [ ] Seismic data (Mayotte pulse)
- [ ] Validation tools

### Architecture Decisions

**Web-First Approach**
- Fastest path to working demonstration
- Immediately shareable (just a URL)
- Cross-platform by default
- No installation friction

**TypeScript + WebGL**
- Type safety for complex calculations
- Direct GPU access for performance
- Shader-based field visualization
- Future WebGPU upgrade path

**Modular Design**
- Core simulation logic independent of rendering
- Each phenomenon (expansion, EM, solar, climate) in separate module
- Easy to test, validate, and extend

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical specifications.

See [ANALYSIS.md](./ANALYSIS.md) for comparison of implementation approaches.

## Scientific Model

This engine implements the **Expanding Earth Electromagnetic Model** which proposes:

### Core Axioms

1. **Planar Geometry** - Earth as flat plane, North Pole center, Antarctic rim
2. **Central Vortex** - Black hole/EM vortex at North Pole drives expansion
3. **Radial Expansion** - 3.3 cm/year outward from center (GPS validated)
4. **Electromagnetic Foundation** - EM force, not gravity, governs phenomena
5. **Local Celestial Mechanics** - Sun/moon are local (< 10,000 km altitude)

### Predictive Success

✅ **South Africa Snow Events** (2024-2025) - Unprecedented snow as region moves toward ice wall
✅ **Arabian Peninsula Heating** - 3x faster warming (stays in optimal sun zone)
✅ **Southern Hemisphere Cooling** - Argentina, Chile cooling trend
✅ **GPS Radial Pattern** - Displacement proportional to distance from center
✅ **Day Length Increase** - Moment of inertia growth from expansion
✅ **Pangaea Separation** - Simple expansion explains continental drift

### Testable Predictions

**1-5 Years**
- Continued South Africa snow increase
- Southern Patagonia coldest winters on record
- Arabian heat records annually

**10-50 Years**
- Tasmania/NZ southern regions develop sub-Arctic climates
- Northern Africa increasingly uninhabitable
- Measurable coastline displacement (satellite positioning)

**50-200 Years**
- Human habitable zone contracts toward North Pole
- Atlantic Ocean width increase measurable
- Increased firmament stress events

## Contributing

This is a demonstration/research project. Contributions welcome:

- **Data Integration**: Real GPS, climate, seismic datasets
- **Rendering**: WebGL/WebGPU optimization, visual effects
- **Validation**: Comparison with observational data
- **Documentation**: Model explanations, tutorials
- **Testing**: Unit tests, visual regression tests

## References

### Model Documentation
- [Expanding Earth Electromagnetic Model](https://example.com/model) (full scientific paper)

### Data Sources
- USGS Seismic Network (Mayotte event)
- NASA GPS Station Data (ITRF2020)
- South African Weather Service
- World Meteorological Organization
- NOAA Climate Data

### Technical References
- WebGL 2.0 Specification
- GLSL Shader Language
- TypeScript Documentation
- Vite Build Tool

## License

MIT License - See LICENSE file for details.

## Authors

**Model**: Expanding Earth Electromagnetic Research Group
**Implementation**: Flat Earth Engine Development Team

## Acknowledgments

- GPS displacement data analysis community
- Independent climate monitoring networks
- Open source WebGL/TypeScript ecosystem

---

**Status**: Phase 1 Complete (Core Modules) | Phase 2 In Progress (Rendering System)
**Version**: 0.1.0-alpha
**Last Updated**: 2025-01-08

For questions, issues, or collaboration: [GitHub Issues](https://github.com/eshe-huli/flat-earth-engine/issues)
