precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @time */
uniform float u_time;

/** @label Slide 1 */
uniform sampler2D u_slide1;

/** @label Slide 2 */
uniform sampler2D u_slide2;

/** @label Slide 3 */
uniform sampler2D u_slide3;

/**
 * @label Segundos por slide
 * @default 5
 * @range 2, 12
 */
uniform float u_duration;

vec2 coverTop(vec2 uv, vec2 ts) {
  float sr = u_resolution.x / u_resolution.y;
  float ir = ts.x / ts.y;
  vec2 s = vec2(1.0);
  if (sr > ir) { s.y = ir / sr; } else { s.x = sr / ir; }
  return vec2((uv.x - 0.5) * s.x + 0.5, 1.0 - (1.0 - uv.y) * s.y);
}

vec4 slide(float i, vec2 uv) {
  if (i < 0.5) return texture2D(u_slide1, coverTop(uv, vec2(textureSize(u_slide1, 0))));
  if (i < 1.5) return texture2D(u_slide2, coverTop(uv, vec2(textureSize(u_slide2, 0))));
  return texture2D(u_slide3, coverTop(uv, vec2(textureSize(u_slide3, 0))));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float n = 3.0;
  float d = max(u_duration, 1.0);
  float tr = min(0.9, d * 0.3);
  float t = mod(u_time + 0.8, n * d);
  float idx = floor(t / d);
  float local = t - idx * d;
  float p = smoothstep(d - tr, d, local);
  p = p * p * (3.0 - 2.0 * p);
  float nxt = mod(idx + 1.0, n);
  float x = uv.x + p;
  vec4 col;
  if (x < 1.0) {
    col = slide(idx, vec2(x, uv.y));
    col.rgb *= 1.0 - 0.35 * p;
  } else {
    col = slide(nxt, vec2(x - 1.0, uv.y));
  }
  float moving = step(0.001, p) * step(p, 0.999);
  float seam = 1.0 - smoothstep(0.0, 0.01, abs(x - 1.0));
  col.rgb += vec3(0.08, 0.86, 0.77) * seam * 0.7 * moving;
  gl_FragColor = vec4(col.rgb, 1.0);
}
