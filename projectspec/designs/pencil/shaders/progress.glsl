precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @time */
uniform float u_time;

/**
 * @label Índice del slide
 * @default 0
 * @range 0, 2
 */
uniform float u_index;

/**
 * @label Segundos por slide
 * @default 5
 * @range 2, 12
 */
uniform float u_duration;

/**
 * @label Color de progreso
 * @color
 * @default #14DBC4
 */
uniform vec3 u_fill;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float d = max(u_duration, 1.0);
  float t = mod(u_time + 0.8, 3.0 * d);
  float idx = floor(t / d);
  float local = t - idx * d;
  float f = abs(idx - u_index) < 0.5 ? local / d : 0.0;
  float track = 0.14;
  if (uv.x < f) {
    float head = smoothstep(f - 0.08, f, uv.x);
    vec3 c = mix(u_fill, vec3(0.6, 1.0, 0.95), head * 0.5);
    gl_FragColor = vec4(c, 1.0);
  } else {
    gl_FragColor = vec4(vec3(track), track);
  }
}
