#version 300 es
precision highp float;

in vec2 a_position;

uniform mat4 u_viewProjection;

out vec2 v_worldPos;

void main() {
  v_worldPos = a_position;
  gl_Position = u_viewProjection * vec4(a_position, 0.0, 1.0);
}
