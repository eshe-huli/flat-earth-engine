#version 300 es
precision highp float;

in vec2 v_worldPos;

uniform float u_fieldStrength;
uniform float u_time;
uniform vec4 u_fieldColor;
uniform float u_maxRadius;

out vec4 fragColor;

// Toroidal field: B(r,θ) = (B₀/r²)[cos(θ)r̂ + sin(θ)θ̂]
vec2 getFieldVector(vec2 pos) {
  float r = length(pos);
  float theta = atan(pos.y, pos.x);

  // Avoid singularity at center
  r = max(r, 0.1);

  float magnitude = u_fieldStrength / (r * r + 0.001);

  // Field in polar coordinates
  float B_r = magnitude * cos(theta);
  float B_theta = magnitude * sin(theta);

  // Convert to Cartesian
  float cosT = cos(theta);
  float sinT = sin(theta);

  return vec2(
    B_r * cosT - B_theta * sinT,
    B_r * sinT + B_theta * cosT
  );
}

void main() {
  vec2 field = getFieldVector(v_worldPos);
  float intensity = length(field) * 0.01; // Scale for visibility
  intensity = clamp(intensity, 0.0, 1.0);

  // Pulsing effect
  float pulse = 0.5 + 0.5 * sin(u_time * 0.001);
  intensity *= (0.7 + 0.3 * pulse);

  // Color based on intensity
  vec3 color = u_fieldColor.rgb * intensity;
  float alpha = u_fieldColor.a * intensity;

  // Central vortex glow
  float r = length(v_worldPos);
  if (r < 100.0) {
    float vortexGlow = 1.0 - smoothstep(0.0, 100.0, r);
    color = mix(color, vec3(0.6, 0.2, 0.7), vortexGlow * 0.8);
    alpha = max(alpha, vortexGlow * 0.9);
  }

  // Fade out beyond Earth rim
  if (r > u_maxRadius) {
    discard;
  }

  fragColor = vec4(color, alpha);
}
