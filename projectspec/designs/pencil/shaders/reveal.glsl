precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @time */
uniform float u_time;

/** @label Contenido */
uniform sampler2D u_content;

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
 * @label Modo (0 aparecer, 1 atenuar)
 * @default 0
 * @range 0, 1
 */
uniform float u_mode;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float d = max(u_duration, 1.0);
  float t = mod(u_time + 0.8, 3.0 * d);
  float idx = floor(t / d);
  float local = t - idx * d;
  float active = abs(idx - u_index) < 0.5 ? 1.0 : 0.0;
  float vis = active * smoothstep(0.1, 0.7, local) * (1.0 - smoothstep(d - 0.7, d - 0.1, local));
  if (u_mode < 0.5) {
    vec2 suv = vec2(uv.x, uv.y + (1.0 - vis) * 0.06);
    gl_FragColor = texture2D(u_content, suv) * vis;
  } else {
    float k = mix(0.42, 1.0, active);
    gl_FragColor = texture2D(u_content, uv) * k;
  }
}
