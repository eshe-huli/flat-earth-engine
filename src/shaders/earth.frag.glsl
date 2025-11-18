#version 300 es
precision highp float;

in vec2 v_position;
in vec2 v_worldPos;
in float v_radius;

uniform float u_maxRadius;
uniform vec4 u_diskColor;
uniform vec4 u_gridColor;
uniform vec4 u_rimColor;
uniform float u_gridSpacing;
uniform bool u_showGrid;

out vec4 fragColor;

// Pseudo-random function for procedural generation
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Smooth noise function
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // Smooth interpolation

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Multi-octave noise for terrain
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// Check if point is on land (simplified continent shapes)
bool isLand(float r, float theta) {
  float rNorm = r / u_maxRadius;

  // Arctic ice cap at center
  if (rNorm < 0.08) return true;

  // Antarctic ice rim
  if (rNorm > 0.95) return true;

  // Major landmasses based on angular position and radius
  // Simulates continents in a flat Earth model

  // North America-like region (theta ~ -2.5 to -1.0, r ~ 0.3-0.7)
  if (theta > -2.8 && theta < -0.8 && rNorm > 0.3 && rNorm < 0.75) {
    float distFromCenter = length(vec2(theta + 1.8, (rNorm - 0.5) * 3.0));
    if (distFromCenter < 1.2 + fbm(vec2(theta * 5.0, r * 0.01)) * 0.3) return true;
  }

  // Eurasia-like region (theta ~ 0.5 to 3.0, r ~ 0.35-0.75)
  if (theta > 0.3 && theta < 3.2 && rNorm > 0.35 && rNorm < 0.78) {
    float distFromCenter = length(vec2((theta - 1.7) * 0.6, (rNorm - 0.55) * 2.5));
    if (distFromCenter < 1.4 + fbm(vec2(theta * 4.0, r * 0.008)) * 0.4) return true;
  }

  // Africa-like region (theta ~ -0.5 to 1.0, r ~ 0.45-0.75)
  if (theta > -0.6 && theta < 1.2 && rNorm > 0.42 && rNorm < 0.78) {
    float distFromCenter = length(vec2((theta - 0.3) * 1.2, (rNorm - 0.6) * 2.0));
    if (distFromCenter < 0.9 + fbm(vec2(theta * 6.0, r * 0.012)) * 0.25) return true;
  }

  // South America-like region (theta ~ -2.0 to -0.5, r ~ 0.5-0.8)
  if (theta > -2.3 && theta < -0.4 && rNorm > 0.48 && rNorm < 0.82) {
    float distFromCenter = length(vec2((theta + 1.3) * 1.1, (rNorm - 0.65) * 2.2));
    if (distFromCenter < 0.85 + fbm(vec2(theta * 5.5, r * 0.01)) * 0.2) return true;
  }

  // Australia-like region (theta ~ 2.0 to 3.0, r ~ 0.6-0.75)
  if (theta > 1.8 && theta < 3.3 && rNorm > 0.58 && rNorm < 0.78) {
    float distFromCenter = length(vec2((theta - 2.5) * 1.5, (rNorm - 0.68) * 3.5));
    if (distFromCenter < 0.7 + fbm(vec2(theta * 7.0, r * 0.015)) * 0.2) return true;
  }

  // Random islands using noise
  float islandNoise = fbm(vec2(theta * 3.0, r * 0.005));
  if (islandNoise > 0.72 && rNorm > 0.2 && rNorm < 0.9) return true;

  return false;
}

void main() {
  float r = length(v_worldPos);
  float theta = atan(v_worldPos.y, v_worldPos.x);
  float rNorm = r / u_maxRadius;

  // Determine if this is land or ocean
  bool land = isLand(r, theta);

  // Base colors
  vec3 oceanColor = vec3(0.1, 0.3, 0.6); // Deep ocean blue
  vec3 shallowOceanColor = vec3(0.2, 0.5, 0.75); // Shallow water
  vec3 landColor = vec3(0.3, 0.5, 0.2); // Green land
  vec3 mountainColor = vec3(0.45, 0.4, 0.3); // Brown mountains
  vec3 desertColor = vec3(0.7, 0.6, 0.4); // Sandy desert
  vec3 iceColor = vec3(0.9, 0.95, 1.0); // White ice

  vec4 color;

  if (land) {
    // Arctic ice cap
    if (rNorm < 0.08) {
      color = vec4(iceColor, 1.0);
    }
    // Antarctic ice rim
    else if (rNorm > 0.95) {
      color = vec4(iceColor, 1.0);
    }
    // Regular land with variation
    else {
      float terrainVariation = fbm(vec2(theta * 8.0, r * 0.02));

      // Mix land colors based on noise
      vec3 baseColor = landColor;
      if (terrainVariation > 0.6) {
        baseColor = mix(landColor, mountainColor, (terrainVariation - 0.6) * 2.5);
      } else if (terrainVariation < 0.35 && rNorm > 0.5) {
        baseColor = mix(landColor, desertColor, (0.35 - terrainVariation) * 2.0);
      }

      // Add subtle elevation detail
      float detail = noise(vec2(theta * 20.0, r * 0.05)) * 0.1;
      color = vec4(baseColor + detail, 1.0);
    }
  } else {
    // Ocean with depth variation
    float depth = noise(vec2(theta * 4.0, r * 0.015));
    vec3 waterColor = mix(oceanColor, shallowOceanColor, depth * 0.5);

    // Lighter near coast (where land might be)
    float coastalNoise = fbm(vec2(theta * 3.0, r * 0.005));
    if (coastalNoise > 0.65 && coastalNoise < 0.72) {
      waterColor = mix(waterColor, shallowOceanColor, 0.6);
    }

    color = vec4(waterColor, 1.0);
  }

  // Grid lines (overlay on top)
  if (u_showGrid) {
    // Radial grid lines (latitude)
    float radialSpacing = u_maxRadius / u_gridSpacing;
    float radialLine = fract(r / radialSpacing);
    if (radialLine < 0.015 || radialLine > 0.985) {
      color = mix(color, u_gridColor, u_gridColor.a * 0.6);
    }

    // Angular grid lines (longitude - every 15 degrees)
    float angularSpacing = radians(15.0);
    float angularLine = fract((theta + 3.14159265) / angularSpacing);
    if (angularLine < 0.015 || angularLine > 0.985) {
      color = mix(color, u_gridColor, u_gridColor.a * 0.4);
    }
  }

  // Rim highlight for Antarctic ice wall
  float rimDist = abs(r - u_maxRadius);
  if (rimDist < 80.0) {
    float rimFactor = 1.0 - smoothstep(0.0, 80.0, rimDist);
    color = mix(color, vec4(iceColor, 1.0), rimFactor * 0.7);
  }

  // Fade out beyond rim
  if (r > u_maxRadius) {
    discard;
  }

  // Subtle shading based on radius for depth perception
  float shading = 1.0 - (rNorm * 0.15);
  color.rgb *= shading;

  fragColor = color;
}
