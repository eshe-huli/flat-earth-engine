#version 300 es
precision highp float;

in vec2 v_worldPos;
in float v_distanceToSun;

uniform vec3 u_sunPosition;
uniform float u_illuminationAngle;
uniform vec4 u_dayColor;
uniform vec4 u_nightColor;
uniform float u_maxRadius;

out vec4 fragColor;

void main() {
  // Calculate illumination cone radius
  float sunHeight = u_sunPosition.z;
  float coneRadius = sunHeight * tan(u_illuminationAngle);

  // Distance from sun center
  float dist = v_distanceToSun;

  // Smooth falloff from day to night
  float innerRadius = coneRadius * 0.6;
  float outerRadius = coneRadius * 1.4;

  float intensity = 1.0 - smoothstep(innerRadius, outerRadius, dist);

  // Add ambient light
  intensity = max(intensity, 0.05);

  // Mix day and night colors
  vec3 color = mix(u_nightColor.rgb, u_dayColor.rgb, intensity);
  float alpha = mix(u_nightColor.a, u_dayColor.a, intensity);

  // Fade out beyond Earth rim
  float r = length(v_worldPos);
  if (r > u_maxRadius) {
    discard;
  }

  fragColor = vec4(color, alpha);
}
