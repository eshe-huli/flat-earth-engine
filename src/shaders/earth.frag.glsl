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

void main() {
  float r = length(v_worldPos);
  float theta = atan(v_worldPos.y, v_worldPos.x);

  // Base disk color
  vec4 color = u_diskColor;

  // Grid lines
  if (u_showGrid) {
    // Radial grid lines
    float radialSpacing = u_maxRadius / u_gridSpacing;
    float radialLine = fract(r / radialSpacing);
    if (radialLine < 0.02 || radialLine > 0.98) {
      color = mix(color, u_gridColor, u_gridColor.a);
    }

    // Angular grid lines (every 15 degrees)
    float angularSpacing = radians(15.0);
    float angularLine = fract((theta + 3.14159265) / angularSpacing);
    if (angularLine < 0.02 || angularLine > 0.98) {
      color = mix(color, u_gridColor, u_gridColor.a * 0.5);
    }
  }

  // Rim highlight
  float rimDist = abs(r - u_maxRadius);
  if (rimDist < 50.0) {
    float rimFactor = 1.0 - smoothstep(0.0, 50.0, rimDist);
    color = mix(color, u_rimColor, rimFactor * u_rimColor.a);
  }

  // Fade out beyond rim
  if (r > u_maxRadius) {
    discard;
  }

  fragColor = color;
}
