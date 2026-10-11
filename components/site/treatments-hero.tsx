"use client";

import { IconArrow } from "@/components/site/icons";
import { motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const SEA_DEEP = "#0a6e66";
const SEA_SOFT = "#9fe3d8";

const FOV = 26;
const LIFT = 3;
const FAR = 18;
const MAX_VOXELS = 110000;
const GRID_W = 192;
const GRID_H = 128;
const STEP = 1 / 120;
const MAP_SCALE = 0.5;

type RGB = [number, number, number];

interface Sea {
  remap: () => void;
  destroy: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

const toGamma = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

const hexToRgb = (hex: string): RGB => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

const toOklab = ([r, g, b]: RGB) => {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const fromOklab = ([L, A, B]: number[]): RGB => {
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return [
    clamp(toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), 0, 1),
    clamp(toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), 0, 1),
    clamp(toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s), 0, 1),
  ];
};

const inkTone = (rgb: RGB, lightness: number) => {
  const [L, A, B] = toOklab(rgb);
  const scale = Math.max(1, 0.14 / Math.max(Math.hypot(A, B), 0.0001));
  return fromOklab([clamp(L, 0.32, lightness), A * scale, B * scale]);
};

const graphemes = (text: string) => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
};

const passVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const voxelVertex = `
attribute vec3 iVoxel;
uniform float uTime;
uniform float uCurveX;
uniform float uCurveZ;
uniform float uCell;
uniform float uFocusDepth;
uniform float uFocalPx;
uniform vec2 uViewport;
uniform float uNear;
uniform float uFar;
uniform float uSpread;
uniform float uIntro;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uInk;
uniform sampler2D uRipple;
uniform vec4 uRippleRect;
uniform vec2 uRippleTexel;
uniform float uRippleOn;
uniform sampler2D uMirror;
uniform float uMirrorOn;
uniform vec3 uArc;
uniform float uWave;
varying vec2 vQuad;
varying vec2 vHalf;
varying float vSigma;
varying vec3 vColor;
varying float vAlpha;

const float TAU = 6.28318530718;
const float AMP = 0.115;

vec3 component(vec2 p, vec2 dir, float wavelength, float amp, float rate, float phase) {
  float k = TAU / (wavelength * uWave);
  vec2 d = normalize(dir);
  float theta = k * dot(d, p) + rate * uTime + phase;
  return vec3(amp * uWave * sin(theta), amp * uWave * k * cos(theta) * d);
}

vec3 surface(vec2 p) {
  vec3 h = component(p, vec2(0.14, 1.0), 3.3, 0.55, 1.0, 0.0);
  h += component(p, vec2(-0.48, 1.0), 2.15, 0.32, 1.22, 1.9);
  h += component(p, vec2(0.82, 0.62), 1.45, 0.2, 1.5, 4.2);
  h += component(p, vec2(-0.86, 0.42), 0.95, 0.1, 1.95, 2.6);
  h += component(p, vec2(0.33, -0.9), 0.64, 0.036, 2.6, 5.3);
  h += component(p, vec2(-0.2, 0.95), 0.41, 0.02, 3.4, 0.7);
  return h * AMP;
}

float rippleTap(vec2 st) {
  return texture2D(uRipple, (st + 0.5) * uRippleTexel).r;
}

float rippleSample(vec2 uv) {
  vec2 st = uv / uRippleTexel - 0.5;
  vec2 i = floor(st);
  vec2 f = st - i;
  return mix(
    mix(rippleTap(i), rippleTap(i + vec2(1.0, 0.0)), f.x),
    mix(rippleTap(i + vec2(0.0, 1.0)), rippleTap(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

vec3 ripple(vec2 p) {
  if (uRippleOn < 0.5) return vec3(0.0);
  vec2 span = uRippleRect.zw - uRippleRect.xy;
  vec2 uv = (p - uRippleRect.xy) / span;
  if (uv.x <= 0.01 || uv.y <= 0.01 || uv.x >= 0.99 || uv.y >= 0.99) return vec3(0.0);
  float h0 = rippleSample(uv);
  float hx = rippleSample(uv + vec2(uRippleTexel.x, 0.0));
  float hz = rippleSample(uv + vec2(0.0, uRippleTexel.y));
  vec2 cell = span * uRippleTexel;
  return vec3(h0, (hx - h0) / cell.x, (hz - h0) / cell.y);
}

float mirror(vec2 screen, vec2 g) {
  float dx = screen.x - 0.5;
  float horizon = uArc.x - uArc.y * dx * dx;
  float below = max(horizon - screen.y, 0.0);
  vec2 m = vec2(screen.x - g.x * 0.016, 2.0 * horizon - screen.y + g.y * 0.034);
  float a = texture2D(uMirror, m).a * 0.4;
  a += texture2D(uMirror, m + vec2(0.0, 0.009)).a * 0.3;
  a += texture2D(uMirror, m - vec2(0.0, 0.009)).a * 0.3;
  return a * exp(-below * 4.2);
}

void main() {
  vec2 p = iVoxel.xy;
  vec3 w = surface(p);
  vec3 r = ripple(p);
  float h = w.x + r.x;
  vec2 g = w.yz + r.yz * 2.2;
  float drop = p.x * p.x * uCurveX + p.y * p.y * uCurveZ;
  vec3 world = vec3(p.x, h - drop, -p.y);
  vec4 viewPos = modelViewMatrix * vec4(world, 1.0);
  float depth = max(-viewPos.z, 0.05);
  vec4 clip = projectionMatrix * viewPos;
  vec2 screen = clip.xy / clip.w * 0.5 + 0.5;

  vec3 normal = normalize(vec3(-g.x + 2.0 * p.x * uCurveX, 1.0, g.y - 2.0 * p.y * uCurveZ));
  float facing = clamp(dot(normal, normalize(cameraPosition - world)), 0.06, 1.0);
  float size = uCell * 0.55 * uFocalPx / depth;
  vec2 core = vec2(size, size * facing);
  float coc = 0.056 * uWave * uWave * uFocalPx * abs(1.0 / depth - 1.0 / uFocusDepth);
  float sigma = max(coc * 0.42, 0.42);
  vec2 corner = position.xy * (core * 0.5 + 2.6 * sigma + 0.5);
  gl_Position = clip + vec4(corner / uViewport * 2.0 * clip.w, 0.0, 0.0);
  vQuad = corner;
  vHalf = core * 0.5;
  vSigma = sigma;

  float t = clamp((p.y - uNear) / max(uFar - uNear, 0.001), 0.0, 1.0);
  float side = abs(p.x) / max(p.y * uSpread, 0.001);
  float edge = (1.0 - smoothstep(0.94, 1.0, t)) * (1.0 - smoothstep(0.72, 1.0, side));
  float fade = smoothstep(0.02, 0.36, screen.y);
  float crest = smoothstep(-0.25, 1.05, h / (AMP * uWave * 0.62));
  float lateral = 1.0 - 0.6 * side * side;
  float limb = exp(-(1.0 - t) * 6.5) * lateral;
  float depthLight = mix(0.45, 1.0, smoothstep(0.0, 0.55, t));
  float front = uIntro * 1.3 - (1.0 - t);
  float reveal = smoothstep(0.0, 0.22, front);
  float sweep = exp(-front * front / 0.004) * step(uIntro, 0.999) * 0.9;
  float energy = (0.018 + 0.9 * pow(crest, 2.4)) * depthLight * lateral + limb * (0.25 + 0.95 * crest);
  float shine = uMirrorOn * mirror(screen, g) * pow(1.0 - facing, 1.4) * reveal;
  float light = (energy * reveal + sweep * (0.4 + crest)) * edge * fade;
  if (uInk > 0.5) {
    vColor = mix(mix(uColorB, uColorA, smoothstep(0.05, 0.7, energy)), uColorA, clamp(shine * 1.6, 0.0, 1.0));
    vAlpha = clamp(0.28 + energy * 2.0 + shine * 1.6, 0.0, 1.0) * edge * fade * max(reveal, sweep) * (0.55 + 0.45 * depthLight);
  } else {
    float glow = shine * 0.8 * edge * fade;
    vColor = mix(uColorA, uColorB, smoothstep(0.1, 0.95, light)) * light + vec3(max(light - 0.9, 0.0) * 0.45) + mix(uColorB, vec3(1.0), 0.55) * glow;
    vAlpha = 1.0;
  }
}
`;

const voxelFragment = `
uniform float uInk;
varying vec2 vQuad;
varying vec2 vHalf;
varying float vSigma;
varying vec3 vColor;
varying float vAlpha;

float erfApprox(float x) {
  float x2 = x * x;
  float t = 1.0 - exp(-x2 * (1.27323954 + 0.147 * x2) / (1.0 + 0.147 * x2));
  return sign(x) * sqrt(max(t, 0.0));
}

float blurred(float x, float halfSize, float sigma) {
  float k = 0.70710678 / sigma;
  return 0.5 * (erfApprox((x + halfSize) * k) - erfApprox((x - halfSize) * k));
}

void main() {
  float soft = blurred(vQuad.x, vHalf.x, vSigma) * blurred(vQuad.y, vHalf.y, vSigma);
  float radius = 0.2 * min(vHalf.x, vHalf.y);
  vec2 q = abs(vQuad) - vHalf + radius;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  float sharp = 1.0 - smoothstep(-0.6, 0.6, d);
  float k = max(smoothstep(0.55, 1.4, vSigma), 1.0 - smoothstep(1.6, 3.2, min(vHalf.x, vHalf.y) * 2.0));
  float coverage = mix(sharp, soft, k);
  if (coverage < 0.002) discard;
  if (uInk > 0.5) {
    float a = coverage * vAlpha;
    gl_FragColor = vec4(vColor * a, a);
  } else {
    gl_FragColor = vec4(vColor * coverage, 1.0);
  }
}
`;

const downFragment = `
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
vec3 tap(vec2 d) {
  vec3 c = texture2D(uSource, vUv + d * uTexel).rgb;
  float peak = max(c.r, max(c.g, c.b));
  return c * (max(peak - uThreshold, 0.0) / max(peak, 0.0001));
}
void main() {
  vec3 color = tap(vec2(0.0)) * 0.125
    + (tap(vec2(-2.0, 2.0)) + tap(vec2(2.0, 2.0)) + tap(vec2(-2.0, -2.0)) + tap(vec2(2.0, -2.0))) * 0.03125
    + (tap(vec2(0.0, 2.0)) + tap(vec2(-2.0, 0.0)) + tap(vec2(2.0, 0.0)) + tap(vec2(0.0, -2.0))) * 0.0625
    + (tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0)) + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0))) * 0.125;
  gl_FragColor = vec4(color, 1.0);
}
`;

const upFragment = `
uniform sampler2D uSource;
uniform vec2 uTexel;
varying vec2 vUv;
vec3 tap(vec2 d) { return texture2D(uSource, vUv + d * uTexel).rgb; }
void main() {
  vec3 color = tap(vec2(0.0)) * 4.0
    + (tap(vec2(-1.0, 0.0)) + tap(vec2(1.0, 0.0)) + tap(vec2(0.0, -1.0)) + tap(vec2(0.0, 1.0))) * 2.0
    + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
  gl_FragColor = vec4(color / 16.0, 1.0);
}
`;

const compositeFragment = `
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform vec3 uHazeColor;
uniform vec3 uArc;
uniform float uBloomStrength;
uniform float uTime;
uniform float uInk;
uniform float uIntro;
varying vec2 vUv;

vec3 neutral(vec3 color) {
  const float start = 0.76;
  const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < start) return color;
  const float d = 1.0 - start;
  float next = 1.0 - d * d / (peak + d - start);
  color *= next / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - next) + 1.0);
  return mix(color, vec3(next), g);
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  float dx = vUv.x - 0.5;
  float offset = vUv.y - (uArc.x - uArc.y * dx * dx);
  float spread = 1.0 - clamp(dx * dx * uArc.z, 0.0, 0.85);
  float profile = offset > 0.0
    ? exp(-offset / 0.045) + exp(-offset / 0.15) * 0.2
    : 1.2 * exp(offset / 0.03);
  float haze = profile * spread * 0.7 * uIntro;
  vec4 scene = texture2D(uScene, vUv);
  float n = hash(gl_FragCoord.xy + fract(uTime * 13.0) * 911.0) - 0.5;
  if (uInk > 0.5) {
    float cover = clamp(scene.a, 0.0, 1.0);
    vec3 ink = scene.rgb / max(scene.a, 0.0001);
    vec3 color = mix(uBackground, ink, cover * 0.94);
    color = mix(color, uHazeColor, clamp(haze * 0.16, 0.0, 0.4));
    color += n * 0.015 * smoothstep(0.0, 0.05, cover + haze * 0.2);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    return;
  }
  vec3 emission = scene.rgb + texture2D(uBloom, vUv).rgb * uBloomStrength + uHazeColor * haze;
  vec3 light = pow(neutral(max(emission, 0.0)), vec3(1.0 / 2.2));
  vec3 color = 1.0 - (1.0 - uBackground) * (1.0 - light);
  float mask = smoothstep(0.0, 0.04, max(light.r, max(light.g, light.b)));
  color += n * 0.025 * mask + (hash(gl_FragCoord.xy * 1.7) - 0.5) / 255.0 * mask;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

function createSea(root: HTMLElement, stage: HTMLElement, phrase: HTMLElement): Sea | null {
  const doc = root.ownerDocument;
  const view = doc.defaultView ?? window;
  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = doc.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  stage.appendChild(canvas);
  renderer.autoClear = false;

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  camera.position.set(0, LIFT, 0);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(quadGeometry);
  quad.frustumCulled = false;
  quadScene.add(quad);

  const voxelGeometry = new THREE.InstancedBufferGeometry();
  voxelGeometry.index = quadGeometry.index;
  voxelGeometry.setAttribute("position", quadGeometry.getAttribute("position"));
  let voxelData = new Float32Array(3);
  let voxelAttribute = new THREE.InstancedBufferAttribute(voxelData, 3);
  voxelGeometry.setAttribute("iVoxel", voxelAttribute);
  voxelGeometry.instanceCount = 0;

  let current = new Float32Array(GRID_W * GRID_H);
  let previous = new Float32Array(GRID_W * GRID_H);
  let next = new Float32Array(GRID_W * GRID_H);
  const rippleTexture = new THREE.DataTexture(current, GRID_W, GRID_H, THREE.RedFormat, THREE.FloatType);
  rippleTexture.minFilter = THREE.NearestFilter;
  rippleTexture.magFilter = THREE.NearestFilter;
  rippleTexture.needsUpdate = true;

  const mapCanvas = doc.createElement("canvas");
  mapCanvas.width = 2;
  mapCanvas.height = 2;
  const mapContext = mapCanvas.getContext("2d");
  const mirrorTexture = new THREE.CanvasTexture(mapCanvas);
  mirrorTexture.minFilter = THREE.LinearFilter;
  mirrorTexture.magFilter = THREE.LinearFilter;
  mirrorTexture.generateMipmaps = false;

  const colorA = new THREE.Vector3();
  const colorB = new THREE.Vector3();
  const background = new THREE.Vector3(0.95, 0.97, 0.98);
  const hazeColor = new THREE.Vector3();
  const rippleRect = new THREE.Vector4(-8, 5, 8, FAR);
  const arc = new THREE.Vector3(0.44, 0.1, 1.4);

  const voxelMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 7.3 },
      uCurveX: { value: 0.006 },
      uCurveZ: { value: 0.0006 },
      uCell: { value: 0.06 },
      uFocusDepth: { value: 8 },
      uFocalPx: { value: 1000 },
      uViewport: { value: new THREE.Vector2(1, 1) },
      uNear: { value: 5 },
      uFar: { value: FAR },
      uSpread: { value: 0.5 },
      uIntro: { value: reduced ? 1 : 0 },
      uColorA: { value: colorA },
      uColorB: { value: colorB },
      uInk: { value: 0 },
      uRipple: { value: rippleTexture },
      uRippleRect: { value: rippleRect },
      uRippleTexel: { value: new THREE.Vector2(1 / GRID_W, 1 / GRID_H) },
      uRippleOn: { value: 0 },
      uMirror: { value: mirrorTexture },
      uMirrorOn: { value: reduced ? 1 : 0 },
      uArc: { value: arc },
      uWave: { value: 1 },
    },
    vertexShader: voxelVertex,
    fragmentShader: voxelFragment,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  const voxelMesh = new THREE.Mesh(voxelGeometry, voxelMaterial);
  voxelMesh.frustumCulled = false;
  const voxelScene = new THREE.Scene();
  voxelScene.add(voxelMesh);

  const target = () =>
    new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
  const sceneTarget = target();
  const bloomTargets = Array.from({ length: 5 }, target);
  const downMaterial = new THREE.ShaderMaterial({
    uniforms: { uSource: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 0 } },
    vertexShader: passVertex,
    fragmentShader: downFragment,
    depthTest: false,
    depthWrite: false,
  });
  const upMaterial = new THREE.ShaderMaterial({
    uniforms: { uSource: { value: null }, uTexel: { value: new THREE.Vector2() } },
    vertexShader: passVertex,
    fragmentShader: upFragment,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const compositeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uScene: { value: sceneTarget.texture },
      uBloom: { value: bloomTargets[0].texture },
      uBackground: { value: background },
      uHazeColor: { value: hazeColor },
      uArc: { value: arc },
      uBloomStrength: { value: 0.5 },
      uTime: { value: 0 },
      uInk: { value: 0 },
      uIntro: { value: reduced ? 1 : 0 },
    },
    vertexShader: passVertex,
    fragmentShader: compositeFragment,
    depthTest: false,
    depthWrite: false,
  });

  const probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
  let width = 0;
  let height = 0;
  let dpr = 1;
  let sized = false;
  let layoutKey = "";
  let colorKey = "";
  let ink = false;
  let horizon = 0.5;
  let near = 5;
  let time = 7.3;
  let introStart = -1;
  let introDone = reduced;
  let mirrorAt = reduced ? 0 : -1;
  let simActive = false;
  let calmFor = 0;
  let simClock = 0;
  let raf = 0;
  let last = 0;
  let visible = false;
  let destroyed = false;
  let lost = false;
  let pointerHit: { x: number; z: number; t: number } | null = null;
  const pending: Array<{ x: number; z: number; amount: number; radius: number }> = [];

  const readPage = (): RGB => {
    if (!probe) return [0.95, 0.97, 0.98];
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "#f3f7fb";
    probe.fillStyle = view.getComputedStyle(root).backgroundColor;
    probe.fillRect(0, 0, 1, 1);
    const pixel = probe.getImageData(0, 0, 1, 1).data;
    return [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255];
  };

  const syncColors = () => {
    const page = readPage();
    const key = page.join(",");
    if (key === colorKey) return false;
    colorKey = key;
    ink = 0.2126 * page[0] + 0.7152 * page[1] + 0.0722 * page[2] > 0.55;
    background.set(page[0], page[1], page[2]);
    if (ink) {
      const a = inkTone(hexToRgb(SEA_DEEP), 0.5);
      const b = inkTone(hexToRgb(SEA_SOFT), 0.6);
      colorA.set(a[0], a[1], a[2]);
      colorB.set(b[0], b[1], b[2]);
      hazeColor.set(b[0], b[1], b[2]);
      voxelMaterial.blending = THREE.CustomBlending;
      voxelMaterial.blendEquation = THREE.AddEquation;
      voxelMaterial.blendSrc = THREE.OneFactor;
      voxelMaterial.blendDst = THREE.OneFactor;
    } else {
      const a = hexToRgb(SEA_DEEP).map(toLinear);
      const b = hexToRgb(SEA_SOFT).map(toLinear);
      colorA.set(a[0], a[1], a[2]);
      colorB.set(b[0], b[1], b[2]);
      hazeColor.set((a[0] * 0.55 + b[0] * 0.45) * 0.16, (a[1] * 0.55 + b[1] * 0.45) * 0.16, (a[2] * 0.55 + b[2] * 0.45) * 0.16);
      voxelMaterial.blending = THREE.AdditiveBlending;
    }
    voxelMaterial.uniforms.uInk.value = ink ? 1 : 0;
    compositeMaterial.uniforms.uInk.value = ink ? 1 : 0;
    compositeMaterial.uniforms.uBloomStrength.value = ink ? 0 : 0.5;
    return true;
  };

  const drawMirror = () => {
    const box = root.getBoundingClientRect();
    const style = view.getComputedStyle(phrase);
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const size = Number.parseFloat(style.fontSize) || 64;
    const node = phrase.firstChild;
    const nextWidth = Math.max(2, Math.round(box.width * MAP_SCALE));
    const nextHeight = Math.max(2, Math.round(box.height * MAP_SCALE));
    if (mapCanvas.width !== nextWidth || mapCanvas.height !== nextHeight) {
      mapCanvas.width = nextWidth;
      mapCanvas.height = nextHeight;
      mirrorTexture.dispose();
    }
    if (!mapContext || !node || node.nodeType !== 3) return box.top + box.height * 0.5;
    mapContext.setTransform(1, 0, 0, 1, 0, 0);
    mapContext.clearRect(0, 0, nextWidth, nextHeight);
    mapContext.setTransform(MAP_SCALE, 0, 0, MAP_SCALE, 0, 0);
    mapContext.font = font;
    mapContext.fillStyle = "#fff";
    mapContext.textBaseline = "alphabetic";
    const ascent = mapContext.measureText("Hxg").fontBoundingBoxAscent || size * 0.92;
    const range = doc.createRange();
    const text = (node as Text).data;
    let offset = 0;
    let baseline = -Infinity;
    for (const part of graphemes(text)) {
      if (/\S/.test(part)) {
        range.setStart(node, offset);
        range.setEnd(node, offset + part.length);
        const rect = range.getClientRects()[0];
        if (rect && rect.width > 0) {
          mapContext.fillText(part, rect.left - box.left, rect.top - box.top + ascent);
          baseline = Math.max(baseline, rect.top + ascent);
        }
      }
      offset += part.length;
    }
    range.detach();
    mirrorTexture.needsUpdate = true;
    return Number.isFinite(baseline) ? baseline + Math.max(size * 0.5, 36) : box.top + box.height * 0.5;
  };

  const readSize = () => {
    const nextWidth = Math.round(root.clientWidth);
    const nextHeight = Math.round(root.clientHeight);
    if (nextWidth < 2 || nextHeight < 2) {
      sized = false;
      return false;
    }
    const box = root.getBoundingClientRect();
    const line = drawMirror();
    const nextHorizon = clamp((line - box.top) / box.height, 0.25, 0.8);
    const nextDpr = Math.min(view.devicePixelRatio || 1, 2);
    const changed = !sized || nextWidth !== width || nextHeight !== height || nextDpr !== dpr || Math.abs(nextHorizon - horizon) > 0.0005;
    sized = true;
    if (!changed) return true;
    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    horizon = nextHorizon;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    sceneTarget.setSize(Math.round(width * dpr), Math.round(height * dpr));
    let w = Math.round(width * dpr);
    let h = Math.round(height * dpr);
    for (const bloomTarget of bloomTargets) {
      w = Math.max(1, Math.round(w / 2));
      h = Math.max(1, Math.round(h / 2));
      bloomTarget.setSize(w, h);
    }
    layoutKey = "";
    return true;
  };

  const layout = () => {
    const key = [width, height, dpr, horizon].join("|");
    if (key === layoutKey) return;
    layoutKey = key;
    const aspect = width / height;
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const curveX = 0.017 * Math.pow(1.8 / clamp(aspect, 1.05, 3), 2);
    const curveZ = 0.0006;
    const depression = Math.atan((LIFT + FAR * FAR * curveZ) / FAR);
    const pitch = clamp(depression + Math.atan((1 - 2 * horizon) * tanV), 0.02, 1.2);
    camera.aspect = aspect;
    camera.rotation.set(-pitch, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const bottom = pitch + THREE.MathUtils.degToRad(FOV / 2);
    near = clamp(bottom < Math.PI / 2 - 0.02 ? (LIFT / Math.tan(bottom)) * 0.86 : 0.5, 0.4, FAR - 2);
    const spread = tanV * aspect * 1.12;
    const viewDistance = (d: number) => d * Math.cos(pitch) + LIFT * Math.sin(pitch);
    const halfWidth = (d: number) => viewDistance(d) * spread;
    const pxPerUnit = (height * 0.5) / tanV / viewDistance(near);
    let cell = clamp(Math.min(height, width * 0.9) * 0.0165, 5, 13) / pxPerUnit;
    const countFor = (spacing: number) => {
      let total = 0;
      for (let d = near; d <= FAR; d += spacing) total += 2 * Math.floor(halfWidth(d) / spacing) + 1;
      return total;
    };
    let total = countFor(cell);
    if (total > MAX_VOXELS) {
      cell *= Math.sqrt(total / MAX_VOXELS) * 1.02;
      total = countFor(cell);
    }
    if (voxelData.length < total * 3) {
      voxelData = new Float32Array(Math.ceil(total * 1.1) * 3);
      voxelAttribute = new THREE.InstancedBufferAttribute(voxelData, 3);
      voxelGeometry.setAttribute("iVoxel", voxelAttribute);
    }
    let index = 0;
    let row = 0;
    for (let d = near; d <= FAR && index < total; d += cell, row++) {
      const columns = Math.floor(halfWidth(d) / cell);
      for (let c = -columns; c <= columns && index < total; c++) {
        voxelData[index * 3] = c * cell;
        voxelData[index * 3 + 1] = d;
        voxelData[index * 3 + 2] = (row * 7919 + c * 104729) % 997;
        index++;
      }
    }
    voxelAttribute.needsUpdate = true;
    voxelGeometry.instanceCount = index;
    const u = voxelMaterial.uniforms;
    u.uWave.value = clamp(width / 1200, 0.5, 1);
    u.uCell.value = cell;
    u.uCurveX.value = curveX;
    u.uCurveZ.value = curveZ;
    u.uFocalPx.value = (height * dpr * 0.5) / tanV;
    u.uViewport.value.set(width * dpr, height * dpr);
    u.uNear.value = near;
    u.uSpread.value = spread;
    u.uFocusDepth.value = viewDistance(near + (FAR - near) * 0.25);
    const farHalf = halfWidth(FAR);
    rippleRect.set(-farHalf, near, farHalf, FAR);
    const project = (x: number, d: number) => {
      const point = new THREE.Vector3(x, -(x * x * curveX + d * d * curveZ), -d).project(camera);
      return { x: point.x * 0.5 + 0.5, y: point.y * 0.5 + 0.5 };
    };
    const middle = project(0, FAR);
    const side = project(farHalf * 0.8, FAR);
    const dx = side.x - 0.5;
    arc.set(middle.y, dx !== 0 ? Math.max(0, (middle.y - side.y) / (dx * dx)) : 0, 1.4);
  };

  const pick = (clientX: number, clientY: number) => {
    const box = root.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    const point = new THREE.Vector3(
      ((clientX - box.left) / box.width) * 2 - 1,
      -(((clientY - box.top) / box.height) * 2 - 1),
      0.5,
    ).unproject(camera);
    const direction = point.sub(camera.position).normalize();
    if (direction.y >= -0.0001) return null;
    const distance = -camera.position.y / direction.y;
    const z = -(camera.position.z + direction.z * distance);
    if (z < near || z > FAR) return null;
    return { x: camera.position.x + direction.x * distance, z };
  };

  const inject = (x: number, z: number, amount: number, radius: number) => {
    const gx = ((x - rippleRect.x) / (rippleRect.z - rippleRect.x)) * GRID_W;
    const gz = ((z - rippleRect.y) / (rippleRect.w - rippleRect.y)) * GRID_H;
    const span = Math.ceil(radius * 2.5);
    const cx = Math.round(gx);
    const cz = Math.round(gz);
    for (let j = Math.max(1, cz - span); j <= Math.min(GRID_H - 2, cz + span); j++) {
      for (let i = Math.max(1, cx - span); i <= Math.min(GRID_W - 2, cx + span); i++) {
        const value = -amount * Math.exp(-((i - gx) * (i - gx) + (j - gz) * (j - gz)) / (radius * radius));
        current[j * GRID_W + i] += value;
        previous[j * GRID_W + i] += value * 0.6;
      }
    }
    simActive = true;
    calmFor = 0;
    voxelMaterial.uniforms.uRippleOn.value = 1;
  };

  const stepRipples = () => {
    let peak = 0;
    for (let j = 1; j < GRID_H - 1; j++) {
      const row = j * GRID_W;
      for (let i = 1; i < GRID_W - 1; i++) {
        const k = row + i;
        const lap = current[k - 1] + current[k + 1] + current[k - GRID_W] + current[k + GRID_W] - 4 * current[k];
        const value = (2 * current[k] - previous[k] + 0.1 * lap) * 0.9962;
        next[k] = value;
        if (Math.abs(value) > peak) peak = Math.abs(value);
      }
    }
    const spare = previous;
    previous = current;
    current = next;
    next = spare;
    return peak;
  };

  const schedule = () => {
    if (destroyed || lost || !visible || raf) return;
    raf = view.requestAnimationFrame(frame);
  };

  const render = () => {
    if (!sized) return;
    layout();
    renderer.setRenderTarget(sceneTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(voxelScene, camera);
    if (!ink) {
      let source: THREE.WebGLRenderTarget = sceneTarget;
      quad.material = downMaterial;
      for (const bloomTarget of bloomTargets) {
        downMaterial.uniforms.uThreshold.value = source === sceneTarget ? 0.32 : 0;
        downMaterial.uniforms.uSource.value = source.texture;
        downMaterial.uniforms.uTexel.value.set(1 / source.width, 1 / source.height);
        renderer.setRenderTarget(bloomTarget);
        renderer.render(quadScene, quadCamera);
        source = bloomTarget;
      }
      quad.material = upMaterial;
      for (let i = bloomTargets.length - 1; i > 0; i--) {
        upMaterial.uniforms.uSource.value = bloomTargets[i].texture;
        upMaterial.uniforms.uTexel.value.set(1 / bloomTargets[i].width, 1 / bloomTargets[i].height);
        renderer.setRenderTarget(bloomTargets[i - 1]);
        renderer.render(quadScene, quadCamera);
      }
    }
    compositeMaterial.uniforms.uTime.value = time;
    quad.material = compositeMaterial;
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCamera);
  };

  const frame = (now: number) => {
    raf = 0;
    if (destroyed || lost) return;
    const dt = last && now - last < 100 ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    if (!reduced) time += dt * 0.45;
    voxelMaterial.uniforms.uTime.value = time;
    if (!introDone) {
      if (introStart < 0) introStart = now;
      const progress = clamp((now - introStart) / 2600, 0, 1);
      voxelMaterial.uniforms.uIntro.value = progress;
      compositeMaterial.uniforms.uIntro.value = clamp(progress * 1.25, 0, 1);
      introDone = progress >= 1;
    }
    if (mirrorAt < 0) mirrorAt = now + 900;
    voxelMaterial.uniforms.uMirrorOn.value = reduced ? 1 : clamp((now - mirrorAt) / 1600, 0, 1);
    for (const drop of pending.splice(0)) inject(drop.x, drop.z, drop.amount, drop.radius);
    if (simActive) {
      simClock += dt;
      let peak = 1;
      let steps = 0;
      while (simClock >= STEP && steps < 4) {
        peak = stepRipples();
        simClock -= STEP;
        steps++;
      }
      if (steps >= 4) simClock = 0;
      if (steps > 0) {
        rippleTexture.image.data = current;
        rippleTexture.needsUpdate = true;
      }
      if (peak < 0.0004) {
        calmFor += dt;
        if (calmFor > 0.6) {
          simActive = false;
          current.fill(0);
          previous.fill(0);
          next.fill(0);
          rippleTexture.image.data = current;
          rippleTexture.needsUpdate = true;
          voxelMaterial.uniforms.uRippleOn.value = 0;
        }
      } else calmFor = 0;
    }
    render();
    if (!reduced && !doc.hidden) schedule();
    else last = 0;
  };

  const isControl = (target: EventTarget | null) => {
    const element = target as Element | null;
    return !!element?.closest?.("a,button,input,textarea,select,label,[role=button]");
  };

  const onPointerMove = (event: PointerEvent) => {
    if (reduced) return;
    const hit = pick(event.clientX, event.clientY);
    const now = performance.now();
    if (!hit) {
      pointerHit = null;
      return;
    }
    if (pointerHit) {
      const dx = hit.x - pointerHit.x;
      const dz = hit.z - pointerHit.z;
      const distance = Math.hypot(dx, dz);
      const speed = distance / Math.max(0.008, (now - pointerHit.t) / 1000);
      const amount = clamp(speed * 0.009, 0, 0.07) * 0.55;
      if (amount > 0.0005) {
        const steps = Math.min(12, Math.max(1, Math.ceil(distance / (((rippleRect.z - rippleRect.x) / GRID_W) * 2))));
        for (let i = 1; i <= steps; i++) {
          pending.push({
            x: pointerHit.x + (dx * i) / steps,
            z: pointerHit.z + (dz * i) / steps,
            amount: amount / Math.sqrt(steps),
            radius: 2.2,
          });
        }
        schedule();
      }
    }
    pointerHit = { x: hit.x, z: hit.z, t: now };
  };

  const onPointerLeave = () => {
    pointerHit = null;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (reduced || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0) || isControl(event.target)) return;
    const hit = pick(event.clientX, event.clientY);
    if (!hit) return;
    pending.push({ x: hit.x, z: hit.z, amount: 0.26, radius: 3.6 });
    schedule();
  };

  const refresh = () => {
    if (syncColors() && !raf) render();
  };

  const onVisibility = () => {
    last = 0;
    schedule();
  };

  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    view.cancelAnimationFrame(raf);
    raf = 0;
  };

  const onRestored = () => {
    lost = false;
    layoutKey = "";
    colorKey = "";
    syncColors();
    rippleTexture.needsUpdate = true;
    mirrorTexture.needsUpdate = true;
    render();
    schedule();
  };

  const remap = () => {
    if (readSize()) {
      render();
      schedule();
    }
  };

  const resizeObserver = new ResizeObserver(remap);
  const intersection = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      last = 0;
      schedule();
    },
    { rootMargin: "120px" },
  );
  const themes = new MutationObserver(refresh);
  const scheme = view.matchMedia("(prefers-color-scheme: dark)");

  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointerleave", onPointerLeave);
  root.addEventListener("pointercancel", onPointerLeave);
  doc.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  themes.observe(doc.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  scheme.addEventListener("change", refresh);
  resizeObserver.observe(root);
  resizeObserver.observe(phrase);
  intersection.observe(root);
  syncColors();
  remap();
  void doc.fonts?.ready.then(() => {
    if (!destroyed) remap();
  });

  return {
    remap,
    destroy: () => {
      destroyed = true;
      view.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      themes.disconnect();
      scheme.removeEventListener("change", refresh);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("pointercancel", onPointerLeave);
      doc.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      voxelGeometry.dispose();
      quadGeometry.dispose();
      voxelMaterial.dispose();
      downMaterial.dispose();
      upMaterial.dispose();
      compositeMaterial.dispose();
      rippleTexture.dispose();
      mirrorTexture.dispose();
      sceneTarget.dispose();
      for (const bloomTarget of bloomTargets) bloomTarget.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

const sequence: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
};

const surface: Variants = {
  hidden: { opacity: 0, filter: "blur(18px)" },
  show: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export function TreatmentsHero() {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phraseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const phrase = phraseRef.current;
    if (!section || !stage || !phrase) return;
    const sea = createSea(section, stage, phrase);
    return () => sea?.destroy();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex w-full touch-pan-y flex-col overflow-hidden bg-paper px-4 pb-8 pt-8 md:min-h-[calc(100svh-8rem)] md:px-8 md:pb-12 md:pt-16"
    >
      <div ref={stageRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />

      <motion.div
        variants={sequence}
        initial={reduceMotion ? false : "hidden"}
        whileInView="show"
        viewport={{ once: true }}
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col"
      >
        <div className="flex flex-col items-center text-center">
          <motion.div variants={rise}>
            <Link
              href="#operations"
              className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-mint py-1.5 pl-3.5 pr-3 text-[13px] font-medium text-oxide-ink transition-colors duration-200 hover:bg-foam"
            >
              Treatments
              <IconArrow className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
          </motion.div>

          <h1 className="mt-8 flex flex-col items-center sm:mt-10">
            <motion.span
              variants={rise}
              className="max-w-xl text-balance text-[1.0625rem] leading-snug text-muted sm:text-xl"
            >
              Operations a visit may discuss
            </motion.span>
            <motion.span
              ref={phraseRef}
              variants={surface}
              className="mt-2 max-w-[12ch] text-balance font-display text-[clamp(2.7rem,12vw,8.5rem)] font-medium leading-[0.92] text-ink sm:mt-3 sm:max-w-none"
            >
              in plain language.
            </motion.span>
          </h1>
        </div>

        <div className="min-h-48 flex-1 sm:min-h-72" />

        <motion.div
          variants={rise}
          className="flex flex-col gap-5 rounded-3xl border border-line/80 bg-paper/92 p-5 shadow-[0_20px_50px_-36px_rgb(7_30_54_/_0.7)] backdrop-blur-md sm:gap-8 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none lg:flex-row lg:items-end lg:justify-between"
        >
          <p className="max-w-md text-pretty text-[15px] leading-relaxed text-muted">
            Dr. Francois’s published clinical interests are minimally invasive spine surgery, cervical and lumbar disc
            disease, spinal deformity, and motion-preserving techniques. Whether any operation belongs in your plan is
            decided after an examination.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/contact"
              className="group inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-oxide-deep px-5 text-sm font-semibold text-paper transition-colors duration-200 hover:bg-oxide-ink"
            >
              Contact the practice
              <IconArrow className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            <Link
              href="/visit"
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-white/80 px-5 text-sm font-semibold text-ink backdrop-blur-sm transition-colors duration-200 hover:bg-white"
            >
              How a visit works
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
