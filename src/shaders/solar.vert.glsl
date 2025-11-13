#version 300 es
precision highp float;

in vec2 a_position;

uniform mat4 u_viewProjection;
uniform vec3 u_sunPosition; // x, y, z (altitude)
uniform float u_illuminationAngle;

out vec2 v_worldPos;
out float v_distanceToSun;

void main() {
  v_worldPos = a_position;

  // Calculate distance to sun (planar)
  vec2 sunPosXY = u_sunPosition.xy;
  v_distanceToSun = length(a_position - sunPosXY);

  gl_Position = u_viewProjection * vec4(a_position, 0.0, 1.0);
}
