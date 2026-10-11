"use client";

import { IconArrow } from "@/components/site/icons";
import { conditions } from "@/lib/content/conditions";
import { motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as THREE from "three";

interface Sea {
  height: number;
  chop: number;
  speed: number;
  foam: number;
}

const featured = [
  {
    slug: "neck-pain",
    note: "A common reason for a visit",
    sea: { height: 0.62, chop: 0.4, speed: 0.8, foam: 0.5 },
  },
  {
    slug: "low-back-pain",
    note: "Most episodes are not dangerous",
    sea: { height: 0.9, chop: 0.75, speed: 0.95, foam: 0.9 },
  },
  {
    slug: "sciatica",
    note: "Pain that travels into the leg",
    sea: { height: 1.05, chop: 0.55, speed: 0.72, foam: 0.7 },
  },
  {
    slug: "herniated-disc",
    note: "Pressure near a nerve",
    sea: { height: 1.2, chop: 0.95, speed: 0.68, foam: 1.15 },
  },
] as const;

const topics = featured.map((item) => {
  const document = conditions.find((condition) => condition.slug === item.slug);
  if (!document) throw new Error(`Missing condition: ${item.slug}`);
  return { ...item, name: document.title, detail: document.summary };
});

const TROUGH = "#5c7690";
const CREST = "#0a7d72";
const WAVES = 14;
const MAX_RIPPLES = 4;
const FOV = 50;
const CAMERA_HEIGHT = 1.35;
const FAR = 36;
const COLUMNS = 900;
const ROWS = 340;

interface Ocean {
  setSea: (sea: Sea) => void;
  destroy: () => void;
}

const surfaceChunk = `
#define WAVES ${WAVES}
#define MAX_RIPPLES ${MAX_RIPPLES}

uniform float uTime;
uniform float uNear;
uniform float uFar;
uniform float uSpread;
uniform float uSpreadBase;
uniform vec4 uWave[WAVES];
uniform vec4 uWaveMotion[WAVES];
uniform float uHeight;
uniform vec4 uCursor;
uniform float uCursorRadius;
uniform vec4 uRipple[MAX_RIPPLES];

float gridDepth(float v) {
  float inverse = 1.0 / uFar + (1.0 / uNear - 1.0 / uFar) * pow(clamp(1.0 - v, 0.0, 1.0), 1.8);
  return 1.0 / inverse;
}

vec3 surfacePoint(vec2 ground, out vec3 normal, out float fold, out float swell) {
  vec3 offset = vec3(0.0);
  normal = vec3(0.0, 1.0, 0.0);
  fold = 1.0;
  float calm = mix(0.3, 1.0, smoothstep(uNear * 0.9, uNear * 4.0, -ground.y));
  for (int i = 0; i < WAVES; i++) {
    vec4 wave = uWave[i];
    vec4 motion = uWaveMotion[i];
    float phase = wave.z * dot(wave.xy, ground) - motion.x * uTime + motion.y;
    float s = sin(phase);
    float c = cos(phase);
    float amplitude = wave.w * uHeight * calm;
    float steep = motion.z;
    offset.x += steep * amplitude * wave.x * c;
    offset.z += steep * amplitude * wave.y * c;
    offset.y += amplitude * s;
    float ka = wave.z * amplitude;
    normal.x -= wave.x * ka * c;
    normal.z -= wave.y * ka * c;
    normal.y -= steep * ka * s;
    fold -= steep * ka * s;
  }

  vec2 toCursor = ground - uCursor.xy;
  float radius2 = max(uCursorRadius * uCursorRadius, 1e-4);
  swell = uCursor.z * exp(-dot(toCursor, toCursor) / radius2);
  offset.y += swell;
  normal.x += swell * 2.0 * toCursor.x / radius2;
  normal.z += swell * 2.0 * toCursor.y / radius2;

  for (int k = 0; k < MAX_RIPPLES; k++) {
    vec4 ripple = uRipple[k];
    if (ripple.w <= 0.001) continue;
    vec2 away = ground - ripple.xy;
    float r = max(length(away), 1e-4);
    float band = r - ripple.z;
    float envelope = exp(-band * band * 3.0) * ripple.w * 0.26;
    offset.y += sin(band * 9.0) * envelope;
    float slope = (9.0 * cos(band * 9.0) - 6.0 * band * sin(band * 9.0)) * envelope;
    normal.x -= slope * away.x / r;
    normal.z -= slope * away.y / r;
  }

  return vec3(ground.x + offset.x, offset.y, ground.y + offset.z);
}
`;

const depthVertexShader = `
${surfaceChunk}

attribute vec2 aGrid;

void main() {
  float depth = gridDepth(aGrid.y);
  float halfWidth = uSpreadBase + depth * uSpread;
  vec2 ground = vec2(aGrid.x * halfWidth * 1.03, -depth);
  vec3 normal;
  float fold;
  float swell;
  vec3 world = surfacePoint(ground, normal, fold, swell);
  world.y -= 0.035 + depth * 0.004;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const depthFragmentShader = `
void main() {
  gl_FragColor = vec4(0.0);
}
`;

const vertexShader = `
${surfaceChunk}

attribute vec2 aGrid;
attribute vec2 aJitter;

uniform float uRows;
uniform float uColumns;
uniform vec3 uSun;
uniform float uFogDistance;
uniform float uFoam;
uniform float uSize;
uniform float uFocal;
uniform float uPixelRatio;
uniform float uGlow;

varying float vBright;
varying float vTone;

void main() {
  float depth = gridDepth(aGrid.y + aJitter.y / uRows);
  float halfWidth = uSpreadBase + depth * uSpread;
  vec2 ground = vec2((aGrid.x + aJitter.x / uColumns) * halfWidth, -depth);
  float side = 1.0 - smoothstep(0.9, 1.0, abs(aGrid.x));
  vec3 normal;
  float fold;
  float swell;
  vec3 world = surfacePoint(ground, normal, fold, swell);
  vec3 offset = vec3(world.x - ground.x, world.y, world.z - ground.y);
  vec4 view = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * view;

  vec3 n = normalize(normal);
  vec3 toEye = normalize(cameraPosition - world);
  float lit = max(dot(n, uSun), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(n, toEye), 0.0), 5.0);
  vec2 seed = aGrid * vec2(913.7, 377.1) + aJitter * 17.3;
  float h1 = fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
  float h2 = fract(sin(dot(seed, vec2(39.3468, 11.1351))) * 24634.6345);
  float turn = uTime * (0.8 + 2.4 * h1) + h2 * 6.2831853;
  vec3 facet = normalize(n + vec3(cos(turn), 0.0, sin(turn)) * (0.06 + 0.16 * h2));
  float soft = pow(max(dot(reflect(-uSun, n), toEye), 0.0), 40.0);
  float spark = pow(max(dot(reflect(-uSun, facet), toEye), 0.0), 260.0);
  float glint = (soft * 0.5 + spark * 3.0) * (0.4 + 3.6 * fresnel);
  float crest = smoothstep(0.25, 1.0, offset.y / max(uHeight * 0.5, 0.01));
  float froth = smoothstep(0.7, 0.2, fold) * uFoam;
  float near = smoothstep(uNear * 0.95, uNear * 1.2, depth) * side;
  float distant = smoothstep(uNear * 1.1, uNear * 5.0, depth);
  float far = exp(-depth / max(uFogDistance, 0.5)) * (1.0 - smoothstep(uFar * 0.4, uFar * 0.95, depth));

  float edgeOn = clamp(abs(dot(n, toEye)) / 0.35, 0.06, 1.0);
  float pileUp = mix(edgeOn, 1.0, smoothstep(uNear * 3.0, uNear * 14.0, depth));
  float brightness = (0.035 + 0.03 * lit + 0.55 * fresnel * distant + glint * 7.0 + (3.0 * crest * crest * crest + froth * 2.6) * mix(0.35, 1.0, distant)) * pileUp * near * far;
  vTone = clamp(glint * 0.9 + crest * 0.6 + froth, 0.0, 1.0);

  float pixels = uSize * uFocal / max(-view.z, 0.05) * (1.0 + crest * 0.35 + min(spark, 1.0) * 0.8) * uPixelRatio;
  float coverage = min(pixels, 1.0);
  vBright = brightness * coverage;
  gl_PointSize = clamp(pixels, 1.0, 6.0 * uPixelRatio) * (1.0 + uGlow * 1.6);
}
`;

const fragmentShader = `
precision highp float;

uniform vec3 uTrough;
uniform vec3 uCrest;
uniform float uGlow;
uniform float uInk;
uniform float uIntensity;

varying float vBright;
varying float vTone;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float edge = 1.0 / (1.0 + uGlow * 1.6);
  float core = 1.0 - smoothstep(edge * 0.45, edge, r);
  float halo = exp(-r * r * 7.0) * uGlow * 0.28;
  float amount = (core + halo) * vBright * uIntensity;
  if (amount < 0.002) discard;
  vec3 color = mix(uTrough, uCrest, vTone);
  if (uInk > 0.5) {
    float alpha = clamp(amount * 2.2, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    float alpha = clamp(amount, 0.0, 1.0);
    gl_FragColor = vec4(color * amount, alpha);
  }
}
`;

const random = (seed: number) => {
  let state = (Math.floor(seed * 9973) ^ 0x9e3779b9) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const buildGrid = () => {
  const count = COLUMNS * ROWS;
  const grid = new Float32Array(count * 2);
  const jitter = new Float32Array(count * 2);
  const next = random(0.5);
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLUMNS; i++) {
      const index = j * COLUMNS + i;
      grid[index * 2] = (i / (COLUMNS - 1)) * 2 - 1;
      grid[index * 2 + 1] = 1 - j / (ROWS - 1);
      jitter[index * 2] = (next() - 0.5) * 0.7;
      jitter[index * 2 + 1] = (next() - 0.5) * 0.7;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("aGrid", new THREE.BufferAttribute(grid, 2));
  geometry.setAttribute("aJitter", new THREE.BufferAttribute(jitter, 2));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return geometry;
};

const buildSurface = (columns: number, rows: number) => {
  const grid = new Float32Array(columns * rows * 2);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const index = j * columns + i;
      grid[index * 2] = (i / (columns - 1)) * 2 - 1;
      grid[index * 2 + 1] = j / (rows - 1);
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < columns - 1; i++) {
      const a = j * columns + i;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(columns * rows * 3), 3));
  geometry.setAttribute("aGrid", new THREE.BufferAttribute(grid, 2));
  geometry.setIndex(indices);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return geometry;
};

const readColor = (target: THREE.Vector3, hex: string) => {
  const color = new THREE.Color(hex);
  const rgb = { r: 0, g: 0, b: 0 };
  color.getRGB(rgb, THREE.SRGBColorSpace);
  target.set(rgb.r, rgb.g, rgb.b);
};

function createOcean(root: HTMLElement, stage: HTMLElement, anchor: HTMLElement, initial: Sea): Ocean | null {
  const doc = root.ownerDocument;
  const view = doc.defaultView ?? window;
  const canvas = doc.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  stage.appendChild(canvas);
  renderer.setClearColor(0x000000, 0);

  const motionQuery = view.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 200);
  camera.rotation.order = "YXZ";
  const uniforms = {
    uTime: { value: 30 },
    uNear: { value: 1.5 },
    uFar: { value: FAR },
    uSpread: { value: 0.85 },
    uSpreadBase: { value: 0.85 },
    uRows: { value: ROWS },
    uColumns: { value: COLUMNS },
    uWave: { value: Array.from({ length: WAVES }, () => new THREE.Vector4()) },
    uWaveMotion: { value: Array.from({ length: WAVES }, () => new THREE.Vector4()) },
    uHeight: { value: initial.height },
    uSun: { value: new THREE.Vector3(0.36, 0.42, -1).normalize() },
    uFogDistance: { value: 40 },
    uFoam: { value: initial.foam },
    uSize: { value: 0.0035 },
    uFocal: { value: 900 },
    uPixelRatio: { value: 1 },
    uGlow: { value: 0.5 },
    uCursor: { value: new THREE.Vector4(0, -8, 0, 0) },
    uCursorRadius: { value: 1 },
    uRipple: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4()) },
    uTrough: { value: new THREE.Vector3() },
    uCrest: { value: new THREE.Vector3() },
    uInk: { value: 0 },
    uIntensity: { value: 1.7 },
  };
  readColor(uniforms.uTrough.value, TROUGH);
  readColor(uniforms.uCrest.value, CREST);

  const next = random(1.7);
  const amplitudes: number[] = [];
  let total = 0;
  for (let i = 0; i < WAVES; i++) {
    const t = i / (WAVES - 1);
    const length = 11 * Math.pow(0.4 / 11, t) * (0.85 + next() * 0.3);
    const angle = (next() - 0.5) * toRadians(150) * (0.45 + t * 0.55);
    const k = (Math.PI * 2) / length;
    const amplitude = Math.pow(length, 1.2) * 0.012 * (0.7 + next() * 0.6);
    amplitudes.push(amplitude);
    total += amplitude;
    uniforms.uWave.value[i].set(Math.sin(angle), Math.cos(angle), k, amplitude);
    uniforms.uWaveMotion.value[i].set(Math.sqrt(9.8 * k) * 0.55, next() * Math.PI * 2, 0, 0);
  }
  const steepness = uniforms.uWave.value.map((wave, i) => {
    wave.w = (amplitudes[i] / Math.max(total, 1e-5)) * 0.8;
    return 0.9 / Math.max(wave.z * wave.w * WAVES, 1e-4);
  });

  const points = buildGrid();
  const surface = buildSurface(200, 150);
  const depthMaterial = new THREE.ShaderMaterial({
    vertexShader: depthVertexShader,
    fragmentShader: depthFragmentShader,
    uniforms,
    colorWrite: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  const pointMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const scene = new THREE.Scene();
  const surfaceMesh = new THREE.Mesh(surface, depthMaterial);
  surfaceMesh.frustumCulled = false;
  surfaceMesh.renderOrder = 0;
  const cloud = new THREE.Points(points, pointMaterial);
  cloud.frustumCulled = false;
  cloud.renderOrder = 1;
  scene.add(surfaceMesh, cloud);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const ripples = Array.from({ length: MAX_RIPPLES }, () => ({ x: 0, z: 0, age: 99 }));
  const probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const sea = { ...initial };
  let goal = { ...initial };
  let nextRipple = 0;
  let colorKey = "";
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let horizon = 0.3;
  let lookX = 0;
  let lookY = 0;
  let targetX = 0;
  let targetY = 0;
  let raf = 0;
  let last = 0;
  let visible = false;
  let destroyed = false;
  let lost = false;

  const syncColors = () => {
    if (!probe) return false;
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "#f3f7fb";
    probe.fillStyle = view.getComputedStyle(root).backgroundColor;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    const key = `${r},${g},${b}`;
    if (key === colorKey) return false;
    colorKey = key;
    const ink = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.35;
    uniforms.uInk.value = ink ? 1 : 0;
    pointMaterial.blendDst = ink ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor;
    pointMaterial.needsUpdate = true;
    return true;
  };

  const measure = () => {
    const box = root.getBoundingClientRect();
    const text = anchor.getBoundingClientRect();
    horizon = clamp((text.top + text.height * 0.62 - box.top) / Math.max(box.height, 1), 0.08, 0.45);
  };

  const resize = () => {
    const nextWidth = Math.round(root.clientWidth);
    const nextHeight = Math.round(root.clientHeight);
    if (nextWidth < 2 || nextHeight < 2) return false;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = Math.min(view.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    measure();
    return true;
  };

  const update = (dt: number) => {
    const ease = reduced ? 1 : 1 - Math.exp(-dt / 0.9);
    sea.height += (goal.height - sea.height) * ease;
    sea.chop += (goal.chop - sea.chop) * ease;
    sea.speed += (goal.speed - sea.speed) * ease;
    sea.foam += (goal.foam - sea.foam) * ease;
    if (!reduced) uniforms.uTime.value += dt * sea.speed;
    const time = uniforms.uTime.value;
    const follow = 1 - Math.exp(-dt * 2.2);
    lookX += ((reduced ? 0 : targetX) - lookX) * follow;
    lookY += ((reduced ? 0 : targetY) - lookY) * follow;
    const aspect = width / Math.max(height, 1);
    const tanHalf = Math.tan(toRadians(FOV) / 2);
    const pitch = Math.atan((1 - 2 * horizon) * tanHalf);
    camera.fov = FOV;
    camera.aspect = aspect;
    camera.position.set(lookX * 0.06, CAMERA_HEIGHT + Math.sin(time * 0.35) * 0.04, 0);
    camera.rotation.set(-pitch + lookY * 0.0125, -lookX * 0.022, Math.sin(time * 0.27) * 0.006);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    let rippling = false;
    ripples.forEach((ripple, index) => {
      if (ripple.age < 6) ripple.age += dt;
      const strength = ripple.age < 6 ? Math.exp(-ripple.age * 0.75) : 0;
      if (strength > 0.002) rippling = true;
      uniforms.uRipple.value[index].set(ripple.x, ripple.z, ripple.age * 2.2, strength);
    });
    const bottomAngle = pitch + toRadians(FOV) / 2 + 0.0125 + 0.03;
    const reach = aspect * tanHalf * 1.2;
    uniforms.uNear.value = (CAMERA_HEIGHT / Math.tan(bottomAngle)) * 0.8;
    uniforms.uSpread.value = Math.cos(pitch) * reach + Math.tan(0.03);
    uniforms.uSpreadBase.value = CAMERA_HEIGHT * Math.sin(pitch) * reach + 0.07 + 0.35;
    uniforms.uHeight.value = sea.height;
    uniforms.uFoam.value = sea.foam;
    uniforms.uWaveMotion.value.forEach((motion, index) => {
      motion.z = Math.min(sea.chop * steepness[index], 4);
    });
    uniforms.uFocal.value = height / 2 / tanHalf;
    uniforms.uPixelRatio.value = pixelRatio;
    const settling =
      Math.abs(goal.height - sea.height) + Math.abs(goal.chop - sea.chop) + Math.abs(goal.foam - sea.foam) > 0.002 ||
      Math.abs(lookX - (reduced ? 0 : targetX)) + Math.abs(lookY - (reduced ? 0 : targetY)) > 0.001;
    return rippling || settling;
  };

  const schedule = () => {
    if (destroyed || lost || !visible || raf) return;
    raf = view.requestAnimationFrame(frame);
  };

  function frame(now: number) {
    raf = 0;
    if (destroyed || lost) return;
    const dt = last && now - last < 100 ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    if (!width) resize();
    const busy = update(dt);
    renderer.render(scene, camera);
    if (!reduced || busy) schedule();
    else last = 0;
  }

  const isControl = (target: EventTarget | null) =>
    !!(target as Element | null)?.closest?.("a,button,input,select,textarea,label,[role=radio]");

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const box = root.getBoundingClientRect();
    targetX = ((event.clientX - box.left) / Math.max(box.width, 1) - 0.5) * 2;
    targetY = (0.5 - (event.clientY - box.top) / Math.max(box.height, 1)) * 2;
    schedule();
  };

  const onLeave = () => {
    targetX = 0;
    targetY = 0;
    schedule();
  };

  const onDown = (event: PointerEvent) => {
    if (reduced || !event.isPrimary || isControl(event.target)) return;
    const box = root.getBoundingClientRect();
    pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, 1 - ((event.clientY - box.top) / box.height) * 2);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(plane, hit) || hit.z > -0.5) return;
    const ripple = ripples[nextRipple];
    ripple.x = hit.x;
    ripple.z = hit.z;
    ripple.age = 0;
    nextRipple = (nextRipple + 1) % MAX_RIPPLES;
    schedule();
  };

  const refresh = () => {
    if (syncColors()) {
      if (!raf && visible) {
        update(0);
        renderer.render(scene, camera);
      }
      schedule();
    }
  };

  const onMotion = () => {
    reduced = motionQuery.matches;
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
    colorKey = "";
    syncColors();
    schedule();
  };

  const resizeObserver = new ResizeObserver(() => {
    if (resize()) {
      if (!raf && visible) {
        update(0);
        renderer.render(scene, camera);
      }
      schedule();
    }
  });
  const intersection = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      last = 0;
      schedule();
    },
    { rootMargin: "80px" },
  );
  const themes = new MutationObserver(refresh);
  const scheme = view.matchMedia("(prefers-color-scheme: dark)");
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("pointerdown", onDown);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  motionQuery.addEventListener("change", onMotion);
  scheme.addEventListener("change", refresh);
  themes.observe(doc.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  resizeObserver.observe(root);
  resizeObserver.observe(anchor);
  intersection.observe(root);
  syncColors();
  resize();

  return {
    setSea: (state: Sea) => {
      goal = { ...state };
      schedule();
    },
    destroy: () => {
      destroyed = true;
      view.cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      motionQuery.removeEventListener("change", onMotion);
      scheme.removeEventListener("change", refresh);
      themes.disconnect();
      resizeObserver.disconnect();
      intersection.disconnect();
      points.dispose();
      surface.dispose();
      depthMaterial.dispose();
      pointMaterial.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

const sequence: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
};

export function ConditionsHero() {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLHeadingElement>(null);
  const oceanRef = useRef<Ocean | null>(null);
  const optionsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const intentRef = useRef(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const anchor = anchorRef.current;
    if (!section || !stage || !anchor) return;
    const ocean = createOcean(section, stage, anchor, topics[0].sea);
    oceanRef.current = ocean;
    return () => {
      window.clearTimeout(intentRef.current);
      ocean?.destroy();
      oceanRef.current = null;
    };
  }, []);

  useEffect(() => {
    oceanRef.current?.setSea(topics[active].sea);
  }, [active]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next = -1;
    if (event.key in keys) next = (active + keys[event.key] + topics.length) % topics.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = topics.length - 1;
    if (next < 0) return;
    event.preventDefault();
    setActive(next);
    optionsRef.current[next]?.focus();
  };

  const current = topics[active];

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[calc(100svh-8rem)] w-full touch-pan-y flex-col overflow-hidden bg-paper px-5 pb-24 pt-6 text-ink md:px-8 md:pb-14 md:pt-16"
    >
      <div ref={stageRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" />
      <motion.div
        variants={sequence}
        initial={reduceMotion ? false : "hidden"}
        whileInView="show"
        viewport={{ once: true }}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-5 [text-shadow:0_0_24px_rgb(243_247_251)] md:gap-12"
      >
        <div className="max-w-3xl">
          <motion.p variants={rise} className="kicker text-oxide-deep">
            Conditions
          </motion.p>
          <motion.h1
            ref={anchorRef}
            variants={rise}
            className="mt-3 grid items-end font-display text-[clamp(2.6rem,5.8vw,5rem)] font-semibold leading-[1.05] md:mt-4"
          >
            {topics.map((item, index) => (
              <span
                key={item.slug}
                aria-hidden={index !== active}
                className={`col-start-1 row-start-1 transition-opacity duration-300 motion-reduce:transition-none ${
                  index === active ? "opacity-100" : "opacity-0"
                }`}
              >
                {item.name}
                <span className="text-oxide-deep">, explained.</span>
              </span>
            ))}
          </motion.h1>
          <motion.p
            variants={rise}
            aria-live="polite"
            className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-muted md:mt-5 md:text-lg"
          >
            {current.detail}
          </motion.p>
          <motion.p variants={rise} className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            These notes are general education. A visit is where the cause, and the next step, are decided.
          </motion.p>
          <motion.div variants={rise} className="mt-6 flex flex-row flex-wrap items-center gap-x-6 gap-y-3 md:mt-8">
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-full bg-oxide-deep px-7 text-sm font-semibold text-paper transition-colors duration-200 hover:bg-oxide-ink"
            >
              Contact the practice
            </Link>
            <Link
              href={`#${current.slug}`}
              className="group inline-flex h-12 items-center gap-2 rounded-full text-sm font-semibold text-ink"
            >
              Read about {current.name}
              <IconArrow className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
          </motion.div>
        </div>

        <motion.div
          variants={rise}
          role="radiogroup"
          aria-label="Conditions"
          className="grid w-full grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:max-w-3xl"
        >
          {topics.map((item, index) => {
            const selected = index === active;
            return (
              <button
                key={item.slug}
                ref={(element) => {
                  optionsRef.current[index] = element;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={onKeyDown}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse") return;
                  window.clearTimeout(intentRef.current);
                  intentRef.current = window.setTimeout(() => setActive(index), 160);
                }}
                onPointerLeave={() => window.clearTimeout(intentRef.current)}
                className="group flex cursor-pointer flex-col items-start rounded-md text-left outline-none"
              >
                <span
                  className={`font-display text-2xl font-medium leading-tight transition-colors duration-300 motion-reduce:transition-none sm:text-3xl ${
                    selected ? "text-oxide-deep" : "text-muted group-hover:text-ink"
                  }`}
                >
                  {item.name}
                </span>
                <span className={`mt-1 text-sm transition-colors duration-300 motion-reduce:transition-none ${selected ? "text-ink" : "text-muted"}`}>
                  {item.note}
                </span>
              </button>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
