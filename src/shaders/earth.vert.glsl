#version 300 es
precision highp float;

in vec2 a_position;

uniform mat4 u_viewProjection;
uniform float u_time;
uniform float u_expansionRate;

out vec2 v_position;
out vec2 v_worldPos;
out float v_radius;

void main() {
  // Apply expansion: r' = r * (1 + k*t)
  float r = length(a_position);
  float theta = atan(a_position.y, a_position.x);

  float expansionFactor = 1.0 + u_expansionRate * u_time * 0.001; // Convert to km scale
  float expandedR = r * expansionFactor;

  vec2 expandedPos = vec2(
    expandedR * cos(theta),
    expandedR * sin(theta)
  );

  v_worldPos = expandedPos;
  v_position = a_position;
  v_radius = r;

  gl_Position = u_viewProjection * vec4(expandedPos, 0.0, 1.0);
}
