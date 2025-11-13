#version 300 es
precision highp float;

in vec2 v_position;
in float v_radius;

uniform float u_time; // Simulation time in years
uniform int u_visualizationMode; // 0=zones, 1=anomaly
uniform float u_heatingZoneMin;
uniform float u_heatingZoneMax;
uniform float u_coolingZoneMin;
uniform float u_coolingZoneMax;

out vec4 fragColor;

// Climate zone constants
const int ZONE_POLAR = 0;
const int ZONE_SUBARCTIC = 1;
const int ZONE_TEMPERATE = 2;
const int ZONE_SUBTROPICAL = 3;
const int ZONE_TROPICAL = 4;
const int ZONE_HEATING = 5;
const int ZONE_COOLING = 6;
const int ZONE_STABLE = 7;

// Determine climate zone based on radius
int getClimateZone(float r) {
  // Polar zone (near center)
  if (r < 1000.0) {
    return ZONE_POLAR;
  }

  // Heating zone (Northern regions: 20-35°N equivalent)
  if (r >= u_heatingZoneMin && r <= u_heatingZoneMax) {
    return ZONE_HEATING;
  }

  // Equatorial/stable zone
  if (r > u_heatingZoneMax && r < u_coolingZoneMin) {
    return ZONE_STABLE;
  }

  // Cooling zone (Southern regions: 30-50°S equivalent)
  if (r >= u_coolingZoneMin && r <= u_coolingZoneMax) {
    return ZONE_COOLING;
  }

  // Near Antarctic rim
  if (r > u_coolingZoneMax) {
    return ZONE_SUBARCTIC;
  }

  return ZONE_TEMPERATE;
}

// Get temperature anomaly for zone
float getTemperatureAnomaly(int zone, float time) {
  float yearsElapsed = time;

  if (zone == ZONE_HEATING) {
    // Arabia/North Africa: 3x global average warming (~3°C per century)
    return 3.0 * (yearsElapsed / 100.0);
  } else if (zone == ZONE_COOLING) {
    // South Africa/southern regions: cooling trend (~-1.5°C per century)
    return -1.5 * (yearsElapsed / 100.0);
  } else if (zone == ZONE_SUBARCTIC) {
    // Near Antarctic rim: strong cooling
    return -3.0 * (yearsElapsed / 100.0);
  } else if (zone == ZONE_STABLE) {
    // Equatorial regions: moderate warming
    return 1.0 * (yearsElapsed / 100.0);
  }

  return 0.0;
}

// Get zone color
vec4 getZoneColor(int zone) {
  if (zone == ZONE_HEATING) {
    return vec4(1.0, 0.3, 0.1, 0.65); // Red/orange - heating
  } else if (zone == ZONE_COOLING) {
    return vec4(0.1, 0.4, 1.0, 0.65); // Blue - cooling
  } else if (zone == ZONE_SUBARCTIC) {
    return vec4(0.7, 0.85, 1.0, 0.7); // Light blue - very cold
  } else if (zone == ZONE_POLAR) {
    return vec4(1.0, 1.0, 1.0, 0.8); // White - polar
  } else if (zone == ZONE_STABLE) {
    return vec4(0.5, 0.8, 0.5, 0.4); // Green - stable
  }

  return vec4(0.5, 0.5, 0.5, 0.3); // Gray - temperate
}

// Get anomaly color (heatmap)
vec4 getAnomalyColor(float anomaly) {
  // anomaly: -5°C to +5°C
  float normalized = (anomaly + 5.0) / 10.0; // Map to [0, 1]
  normalized = clamp(normalized, 0.0, 1.0);

  vec3 color;
  if (normalized < 0.5) {
    // Blue (cold) to white (neutral)
    float t = normalized * 2.0;
    color = vec3(t, t, 1.0);
  } else {
    // White (neutral) to red (hot)
    float t = (normalized - 0.5) * 2.0;
    color = vec3(1.0, 1.0 - t, 1.0 - t);
  }

  return vec4(color, 0.7);
}

void main() {
  int zone = getClimateZone(v_radius);

  if (u_visualizationMode == 0) {
    // Zone visualization
    fragColor = getZoneColor(zone);
  } else {
    // Temperature anomaly heatmap
    float anomaly = getTemperatureAnomaly(zone, u_time);
    fragColor = getAnomalyColor(anomaly);
  }

  // Add subtle radial gradient for depth
  float gradientFactor = 1.0 - (v_radius / 22000.0) * 0.2;
  fragColor.rgb *= gradientFactor;

  // Add zone boundary lines
  float zoneEdge = 0.0;
  if (abs(v_radius - u_heatingZoneMin) < 50.0 ||
      abs(v_radius - u_heatingZoneMax) < 50.0 ||
      abs(v_radius - u_coolingZoneMin) < 50.0 ||
      abs(v_radius - u_coolingZoneMax) < 50.0) {
    zoneEdge = 0.3;
  }

  fragColor.rgb = mix(fragColor.rgb, vec3(1.0), zoneEdge);
}
