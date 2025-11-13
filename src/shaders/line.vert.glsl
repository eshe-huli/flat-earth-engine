#version 300 es
precision highp float;

in vec2 a_position;
in vec4 a_color;

uniform mat4 u_viewProjection;

out vec4 v_color;

void main() {
  v_color = a_color;
  gl_Position = u_viewProjection * vec4(a_position, 0.0, 1.0);
}
