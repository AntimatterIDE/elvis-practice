"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const VALUES = [
  {
    word: "clear.",
    name: "Clear",
    line: "The problem is named in ordinary language before anyone talks about a procedure.",
  },
  {
    word: "careful.",
    name: "Careful",
    line: "A history and an examination come first. Imaging is ordered when it would change the plan.",
  },
  {
    word: "patient.",
    name: "Patient",
    line: "Many spine problems improve without an operation. Waiting can be the care, not a delay.",
  },
  {
    word: "shared.",
    name: "Shared",
    line: "Surgery is one path. The next step is decided with you after the findings are explained.",
  },
];

const FLASH_DARK = "#9fe3d8";
const FLASH_LIGHT = "#0e8f84";
const INTERVAL = 3.6;
const DURATION = 1.1;
const STAGGER = 0.25;
const TRAVEL = 0.5;
const GOO = 0.1;
const SWELL = 0.02;
const SOFTNESS = 0.8;
const ZOOM = 0.04;
const TINT = 0.45;
const MAX_GLYPHS = 64;

interface Settings {
  held: boolean;
  reduced: boolean;
  onChange: (index: number) => void;
}

interface Morph {
  goTo: (index: number) => void;
  sync: () => void;
  destroy: () => void;
}

interface Glyph {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  ax: number;
  ay: number;
  u: number;
  v: number;
  du: number;
  dv: number;
}

interface WordField {
  glyphs: Glyph[];
  texture: THREE.DataTexture | null;
  left: number;
  right: number;
  depth: number;
}

interface Part {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Cell {
  parts: Part[];
  left: number;
  top: number;
  right: number;
  bottom: number;
  ax: number;
  ay: number;
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const visit = (side: "A" | "B", row: number) => `
  for (int i = 0; i < ${MAX_GLYPHS}; i++) {
    if (i >= uCount${side}) break;
    vec4 r = uRect${side}[i];
    vec2 q = (p - r.xy) / r.zw;
    if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) continue;
    vec4 m = texelFetch(uGlyphs, ivec2(i, ${row}), 0);
    vec4 g = texelFetch(uGlyphs, ivec2(i, ${row + 1}), 0);
    vec2 f = textureLod(uAtlas${side}, m.xy + q * m.zw, 0.0).rg;
    float v = mix(f.r, f.g, g.y) * g.x + g.z;
    d${side} = min(d${side}, v);
    float k = exp(-max(v, 0.0) / uBand);
    w${side} += k;
    a${side} += k * g.w;
  }
`;

const fragmentShader = `
uniform sampler2D uAtlasA;
uniform sampler2D uAtlasB;
uniform sampler2D uGlyphs;
uniform vec4 uRectA[${MAX_GLYPHS}];
uniform vec4 uRectB[${MAX_GLYPHS}];
uniform int uCountA;
uniform int uCountB;
uniform float uCap;
uniform float uGoo;
uniform float uSwell;
uniform float uBand;
uniform vec2 uSize;
uniform vec3 uInk;
uniform float uInkAlpha;
uniform vec3 uTint;
uniform float uTintAmount;
varying vec2 vUv;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  float dA = uCap;
  float wA = 0.0;
  float aA = 0.0;
  float dB = uCap;
  float wB = 0.0;
  float aB = 0.0;
  ${visit("A", 0)}
  ${visit("B", 2)}
  aA = wA > 0.0 ? aA / wA : 0.0;
  aB = wB > 0.0 ? aB / wB : 0.0;
  float act = mix(aA, aB, smoothstep(-uBand, uBand, dA - dB));
  float d = smin(dA, dB, max(uGoo * act, 0.0001)) - uSwell * act;
  float aa = max(fwidth(d), 0.0001) * 0.7;
  float alpha = clamp(0.5 - d / (2.0 * aa), 0.0, 1.0);
  vec3 color = mix(uInk, uTint, clamp(uTintAmount * act * act, 0.0, 1.0));
  float coverage = alpha * uInkAlpha;
  gl_FragColor = vec4(color * coverage, coverage);
}
`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

const ramp = (from: number, to: number, value: number) => {
  const x = clamp((value - from) / (to - from), 0, 1);
  return x * x * (3 - 2 * x);
};

const splitGraphemes = (value: string) => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), (part) => part.segment);
  }
  return Array.from(value);
};

const edt = (grid: Float64Array, width: number, height: number) => {
  const n = Math.max(width, height);
  const f = new Float64Array(n);
  const z = new Float64Array(n + 1);
  const v = new Uint16Array(n);
  const pass = (offset: number, stride: number, length: number) => {
    for (let q = 0; q < length; q++) f[q] = grid[offset + q * stride];
    v[0] = 0;
    z[0] = -1e20;
    z[1] = 1e20;
    let k = 0;
    for (let q = 1; q < length; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = 1e20;
    }
    k = 0;
    for (let q = 0; q < length; q++) {
      while (z[k + 1] < q) k++;
      const r = q - v[k];
      grid[offset + q * stride] = f[v[k]] + r * r;
    }
  };
  for (let x = 0; x < width; x++) pass(x, width, height);
  for (let y = 0; y < height; y++) pass(y * width, 1, width);
};

const boxBlur = (src: Float32Array, width: number, height: number, radius: number) => {
  const r = Math.max(1, Math.round(radius));
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const norm = 1 / (2 * r + 1);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[row + clamp(k, 0, width - 1)];
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum * norm;
      sum += src[row + Math.min(width - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += tmp[clamp(k, 0, height - 1) * width + x];
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum * norm;
      sum += tmp[Math.min(height - 1, y + r + 1) * width + x] - tmp[Math.max(0, y - r) * width + x];
    }
  }
  return out;
};

const signedField = (alpha: Uint8ClampedArray, width: number, height: number, scale: number) => {
  const size = width * height;
  const outer = new Float64Array(size);
  const inner = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    const a = alpha[i * 4 + 3] / 255;
    if (a >= 1) {
      outer[i] = 0;
      inner[i] = 1e20;
    } else if (a <= 0) {
      outer[i] = 1e20;
      inner[i] = 0;
    } else {
      const d = 0.5 - a;
      outer[i] = d > 0 ? d * d : 0;
      inner[i] = d < 0 ? d * d : 0;
    }
  }
  edt(outer, width, height);
  edt(inner, width, height);
  const out = new Float32Array(size);
  for (let i = 0; i < size; i++) out[i] = (Math.sqrt(outer[i]) - Math.sqrt(inner[i])) / scale;
  return out;
};

const pairUp = (a: Glyph[], b: Glyph[], reach: number) => {
  const n = a.length;
  const m = b.length;
  const stride = m + 1;
  const length = new Int16Array((n + 1) * stride);
  const cost = new Float32Array((n + 1) * stride);
  const choice = new Uint8Array((n + 1) * stride);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const at = i * stride + j;
      let bestLength = length[at + stride];
      let bestCost = cost[at + stride];
      let best = 0;
      if (length[at + 1] > bestLength || (length[at + 1] === bestLength && cost[at + 1] < bestCost)) {
        bestLength = length[at + 1];
        bestCost = cost[at + 1];
        best = 1;
      }
      if (a[i].text === b[j].text && Math.abs(a[i].ax - b[j].ax) <= reach) {
        const nextLength = length[at + stride + 1] + 1;
        const nextCost = cost[at + stride + 1] + Math.abs(a[i].ax - b[j].ax);
        if (nextLength > bestLength || (nextLength === bestLength && nextCost < bestCost)) {
          bestLength = nextLength;
          bestCost = nextCost;
          best = 2;
        }
      }
      length[at] = bestLength;
      cost[at] = bestCost;
      choice[at] = best;
    }
  }
  const pairs = new Int16Array(n).fill(-1);
  const taken = new Uint8Array(m);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const pick = choice[i * stride + j];
    if (pick === 2) {
      pairs[i] = j;
      taken[j] = 1;
      i++;
      j++;
    } else if (pick === 0) i++;
    else j++;
  }
  return { pairs, taken };
};

function createMorph(root: HTMLElement, settingsRef: { current: Settings }): Morph | null {
  const doc = root.ownerDocument;
  const view = doc.defaultView ?? window;
  const canvas = doc.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;pointer-events:none;display:block";
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false });
  } catch {
    return null;
  }
  if (!renderer.capabilities.isWebGL2) {
    renderer.dispose();
    return null;
  }
  root.appendChild(canvas);
  renderer.setClearColor(0x000000, 0);
  const S = () => settingsRef.current;
  const now = () => view.performance.now() / 1000;
  const mask = doc.createElement("canvas");
  const mctx = mask.getContext("2d", { willReadFrequently: true });
  const probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const limit = Math.max(512, Math.min(4096, renderer.capabilities.maxTextureSize));

  const far = THREE.DataUtils.toHalfFloat(4000);
  const empty = new THREE.DataTexture(new Uint16Array([far, far]), 1, 1, THREE.RGFormat, THREE.HalfFloatType);
  empty.needsUpdate = true;
  const glyphData = new Float32Array(MAX_GLYPHS * 4 * 4);
  const glyphTexture = new THREE.DataTexture(glyphData, MAX_GLYPHS, 4, THREE.RGBAFormat, THREE.FloatType);
  glyphTexture.magFilter = THREE.NearestFilter;
  glyphTexture.minFilter = THREE.NearestFilter;
  glyphTexture.generateMipmaps = false;
  glyphTexture.needsUpdate = true;
  const slots = () => Array.from({ length: MAX_GLYPHS }, () => new THREE.Vector4(0, 0, 1, 1));
  const uniforms = {
    uAtlasA: { value: empty as THREE.Texture },
    uAtlasB: { value: empty as THREE.Texture },
    uGlyphs: { value: glyphTexture },
    uRectA: { value: slots() },
    uRectB: { value: slots() },
    uCountA: { value: 0 },
    uCountB: { value: 0 },
    uCap: { value: 8 },
    uGoo: { value: 8 },
    uSwell: { value: 2 },
    uBand: { value: 4 },
    uSize: { value: new THREE.Vector2(1, 1) },
    uInk: { value: new THREE.Color(1, 1, 1) },
    uInkAlpha: { value: 1 },
    uTint: { value: new THREE.Color(1, 0.4, 0.2) },
    uTintAmount: { value: TINT },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  material.blending = THREE.CustomBlending;
  material.blendSrc = THREE.OneFactor;
  material.blendDst = THREE.OneMinusSrcAlphaFactor;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let words: WordField[] = [];
  let fieldKey = "";
  let generation = 0;
  let planKey = "";
  let plan: { pairs: Int16Array; taken: Uint8Array } | null = null;
  let width = 1;
  let height = 1;
  let padX = 0;
  let padY = 0;
  let ratio = 1;
  let fontPx = 16;
  let cap = 8;
  let rtl = false;
  let current = 0;
  let target = 0;
  let from = -1;
  let morphAt = -1;
  let lastSwitch = 0;
  let raf = 0;
  let timer = 0;
  let visible = false;
  let started = false;
  let wasHeld = false;
  let destroyed = false;
  let lost = false;

  const readColor = (value: string): [number, number, number, number] | null => {
    if (!probe || !value) return null;
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "#000";
    probe.fillStyle = value;
    probe.fillRect(0, 0, 1, 1);
    const data = probe.getImageData(0, 0, 1, 1).data;
    return [data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255];
  };

  const measure = (sizer: HTMLElement, origin: DOMRect, range: Range) => {
    const parts: Part[] = [];
    const node = sizer.firstChild;
    if (!node || node.nodeType !== 3) return parts;
    const text = (node as Text).data;
    let offset = 0;
    for (const part of splitGraphemes(text)) {
      const length = part.length;
      if (/\S/.test(part)) {
        range.setStart(node, offset);
        range.setEnd(node, offset + length);
        const box = range.getClientRects()[0];
        if (box && box.width > 0) {
          parts.push({
            text: part,
            left: box.left - origin.left + padX,
            top: box.top - origin.top + padY,
            right: box.right - origin.left + padX,
            bottom: box.bottom - origin.top + padY,
          });
        }
      }
      offset += length;
    }
    return parts;
  };

  const rasterize = (parts: Part[], font: string, ascent: number): WordField => {
    const field: WordField = { glyphs: [], texture: null, left: width / 2, right: width / 2, depth: 1 };
    if (!mctx || parts.length === 0) return field;
    const margin = Math.ceil(fontPx * 0.25);
    const size = Math.ceil(parts.length / MAX_GLYPHS);
    const cells: Cell[] = [];
    for (let i = 0; i < parts.length; i += size) {
      const group = parts.slice(i, i + size);
      cells.push({
        parts: group,
        left: Math.min(...group.map((part) => part.left)),
        top: Math.min(...group.map((part) => part.top)),
        right: Math.max(...group.map((part) => part.right)),
        bottom: Math.max(...group.map((part) => part.bottom)),
        ax: 0,
        ay: 0,
      });
    }
    const row = limit / ratio;
    let x = 0;
    let y = 0;
    let line = 0;
    let atlasWidth = 0;
    for (const cell of cells) {
      const w = cell.right - cell.left + margin * 2;
      const h = cell.bottom - cell.top + margin * 2;
      if (x > 0 && x + w > row) {
        x = 0;
        y += line;
        line = 0;
      }
      cell.ax = x;
      cell.ay = y;
      x += w;
      line = Math.max(line, h);
      atlasWidth = Math.max(atlasWidth, x);
    }
    const atlasHeight = y + line;
    const r = ratio * Math.min(1, limit / Math.max(1, atlasWidth * ratio), limit / Math.max(1, atlasHeight * ratio));
    const cw = Math.max(1, Math.ceil(atlasWidth * r));
    const ch = Math.max(1, Math.ceil(atlasHeight * r));
    mask.width = cw;
    mask.height = ch;
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, cw, ch);
    mctx.setTransform(r, 0, 0, r, 0, 0);
    mctx.font = font;
    mctx.fillStyle = "#fff";
    mctx.textBaseline = "alphabetic";
    for (const cell of cells) {
      for (const part of cell.parts) {
        mctx.fillText(part.text, cell.ax + margin + part.left - cell.left, cell.ay + margin + part.top - cell.top + ascent);
      }
    }
    const sharp = signedField(mctx.getImageData(0, 0, cw, ch).data, cw, ch, r);
    const ceiling = margin * 0.92;
    let depth = 1;
    for (let i = 0; i < sharp.length; i++) {
      if (-sharp[i] > depth) depth = -sharp[i];
      if (sharp[i] > ceiling) sharp[i] = ceiling;
    }
    const radius = Math.max(1, fontPx * r * 0.05);
    const soft = boxBlur(boxBlur(boxBlur(sharp, cw, ch, radius), cw, ch, radius), cw, ch, radius);
    const data = new Uint16Array(cw * ch * 2);
    for (let i = 0; i < cw * ch; i++) {
      data[i * 2] = THREE.DataUtils.toHalfFloat(sharp[i]);
      data[i * 2 + 1] = THREE.DataUtils.toHalfFloat(soft[i]);
    }
    const texture = new THREE.DataTexture(data, cw, ch, THREE.RGFormat, THREE.HalfFloatType);
    texture.flipY = false;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    field.texture = texture;
    field.depth = depth;
    field.left = Math.min(...cells.map((cell) => cell.left));
    field.right = Math.max(...cells.map((cell) => cell.right));
    field.glyphs = cells.map((cell) => {
      const w = cell.right - cell.left + margin * 2;
      const h = cell.bottom - cell.top + margin * 2;
      return {
        text: cell.parts.map((part) => part.text).join(""),
        x: cell.left - margin,
        y: cell.top - margin,
        w,
        h,
        cx: (cell.left + cell.right) / 2,
        ax: rtl ? cell.right : cell.left,
        ay: cell.top,
        u: (cell.ax * r) / cw,
        v: (cell.ay * r) / ch,
        du: (w * r) / cw,
        dv: (h * r) / ch,
      };
    });
    return field;
  };

  const build = (force: boolean) => {
    const rect = root.getBoundingClientRect();
    const style = view.getComputedStyle(root);
    fontPx = parseFloat(style.fontSize) || 16;
    const nextRatio = Math.min(view.devicePixelRatio || 1, 2);
    padX = Math.ceil(fontPx * 0.25);
    padY = Math.ceil(fontPx * 0.3);
    const nextWidth = Math.max(1, rect.width + padX * 2);
    const nextHeight = Math.max(1, rect.height + padY * 2);
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const key = [nextWidth.toFixed(1), nextHeight.toFixed(1), nextRatio, font, style.letterSpacing, style.direction].join("|");
    if (!force && key === fieldKey) return;
    fieldKey = key;
    generation++;
    width = nextWidth;
    height = nextHeight;
    ratio = nextRatio;
    rtl = style.direction === "rtl";
    cap = Math.ceil(fontPx * 0.25) * 0.92;
    canvas.style.left = `${-padX}px`;
    canvas.style.top = `${-padY}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    renderer.setPixelRatio(1);
    renderer.setSize(Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio)), false);
    uniforms.uSize.value.set(width, height);
    for (const word of words) word.texture?.dispose();
    words = [];
    if (!mctx) return;
    mctx.font = font;
    const ascent = mctx.measureText("Hxg").fontBoundingBoxAscent || fontPx * 0.92;
    const range = doc.createRange();
    const sizers = Array.from(root.querySelectorAll<HTMLElement>("[data-morph-word]"));
    const measured = sizers.map((sizer) => measure(sizer, rect, range));
    range.detach();
    words = measured.map((parts) => rasterize(parts, font, ascent));
  };

  const surfaceIsDark = () => {
    let node: HTMLElement | null = root;
    while (node) {
      const fill = readColor(view.getComputedStyle(node).backgroundColor);
      if (fill && fill[3] > 0.01) return 0.2126 * fill[0] + 0.7152 * fill[1] + 0.0722 * fill[2] < 0.5;
      node = node.parentElement;
    }
    return false;
  };

  const colours = () => {
    const ink = readColor(view.getComputedStyle(root).color) ?? [1, 1, 1, 1];
    uniforms.uInk.value.setRGB(ink[0], ink[1], ink[2], THREE.LinearSRGBColorSpace);
    uniforms.uInkAlpha.value = ink[3];
    const tint = readColor(surfaceIsDark() ? FLASH_DARK : FLASH_LIGHT) ?? [1, 0.7, 0.2, 1];
    uniforms.uTint.value.setRGB(tint[0], tint[1], tint[2], THREE.LinearSRGBColorSpace);
  };

  const wordAt = (index: number) => (words.length ? words[((index % words.length) + words.length) % words.length] : null);

  const carry = (value: number, low: number, high: number, toLow: number, toHigh: number) => {
    const span = high - low;
    return span > 0.001 ? toLow + ((value - low) / span) * (toHigh - toLow) : (toLow + toHigh) / 2;
  };

  const along = (word: WordField, x: number) => {
    const span = word.right - word.left;
    const u = span > 0.001 ? clamp((x - word.left) / span, 0, 1) : 0.5;
    return rtl ? 1 - u : u;
  };

  const progress = (u: number, t: number) => smooth((t - u * STAGGER) / (1 - STAGGER));

  const write = (row: number, index: number, glyph: Glyph, scale: number, a: number, b: number, act: number) => {
    const uv = (row * MAX_GLYPHS + index) * 4;
    glyphData[uv] = glyph.u;
    glyphData[uv + 1] = glyph.v;
    glyphData[uv + 2] = glyph.du;
    glyphData[uv + 3] = glyph.dv;
    const state = uv + MAX_GLYPHS * 4;
    glyphData[state] = scale;
    glyphData[state + 1] = a;
    glyphData[state + 2] = b;
    glyphData[state + 3] = act;
  };

  const put = (slot: THREE.Vector4, glyph: Glyph, dx: number, dy: number, scale: number) => {
    const mx = width / 2;
    const my = height / 2;
    slot.set(mx + (glyph.x + dx - mx) * scale, my + (glyph.y + dy - my) * scale, glyph.w * scale, glyph.h * scale);
  };

  const layout = (a: WordField | null, b: WordField | null, t: number) => {
    if (a && b) {
      const key = `${generation}:${from}:${target}`;
      if (key !== planKey) {
        planKey = key;
        plan = pairUp(a.glyphs, b.glyphs, fontPx * 2.5);
      }
    } else plan = null;
    let countA = 0;
    if (a) {
      const reach = a.depth * 1.12 + 0.5;
      for (let i = 0; i < a.glyphs.length && countA < MAX_GLYPHS; i++) {
        const glyph = a.glyphs[i];
        const j = plan && b ? plan.pairs[i] : -1;
        const partner = j >= 0 && b ? b.glyphs[j] : null;
        if (partner && b) {
          const p = progress((along(a, glyph.cx) + along(b, partner.cx)) / 2, t);
          put(uniforms.uRectA.value[countA], glyph, (partner.ax - glyph.ax) * p, (partner.ay - glyph.ay) * p, 1);
          write(0, countA, glyph, 1, 0, 0, Math.sin(Math.PI * p) * 0.35);
        } else {
          const e = ramp(0, 0.62, progress(along(a, glyph.cx), t));
          const dx = b ? (carry(glyph.cx, a.left, a.right, b.left, b.right) - glyph.cx) * TRAVEL * e : 0;
          const scale = 1 + ZOOM * e;
          put(uniforms.uRectA.value[countA], glyph, dx, 0, scale);
          write(0, countA, glyph, scale, ramp(0, 0.6, e) * SOFTNESS, reach * Math.pow(e, 1.25), Math.sin(Math.PI * e));
        }
        countA++;
      }
    }
    let countB = 0;
    if (b) {
      const reach = b.depth * 1.12 + 0.5;
      for (let j = 0; j < b.glyphs.length && countB < MAX_GLYPHS; j++) {
        if (plan && plan.taken[j]) continue;
        const glyph = b.glyphs[j];
        const p = progress(along(b, glyph.cx), t);
        const e = a ? ramp(0.38, 1, p) : p;
        const rest = 1 - e;
        const dx = a ? (carry(glyph.cx, b.left, b.right, a.left, a.right) - glyph.cx) * TRAVEL * rest : 0;
        const scale = 1 - ZOOM * rest;
        put(uniforms.uRectB.value[countB], glyph, dx, 0, scale);
        write(2, countB, glyph, scale, rest * SOFTNESS, reach * Math.pow(rest, 0.85), Math.sin(Math.PI * e));
        countB++;
      }
    }
    uniforms.uCountA.value = countA;
    uniforms.uCountB.value = countB;
    glyphTexture.needsUpdate = true;
  };

  const render = (time: number) => {
    if (lost) return;
    let t = 1;
    if (morphAt >= 0) {
      t = clamp((time - morphAt) / DURATION, 0, 1);
      if (t >= 1) {
        morphAt = -1;
        current = target;
        from = -1;
      }
    }
    const active = morphAt >= 0;
    const a = active && from >= 0 ? wordAt(from) : null;
    const b = started ? wordAt(active ? target : current) : null;
    layout(a, b, active ? t : 1);
    uniforms.uTintAmount.value = a ? TINT : 0;
    uniforms.uAtlasA.value = a?.texture ?? empty;
    uniforms.uAtlasB.value = b?.texture ?? empty;
    uniforms.uGoo.value = GOO * fontPx;
    uniforms.uSwell.value = SWELL * fontPx;
    uniforms.uBand.value = Math.max(0.5, fontPx * 0.05);
    uniforms.uCap.value = cap;
    renderer.render(scene, camera);
  };

  const schedule = () => {
    if (destroyed || raf) return;
    raf = view.requestAnimationFrame(frame);
  };

  const begin = (next: number, fromIndex: number) => {
    if (words.length === 0) return;
    const index = ((next % words.length) + words.length) % words.length;
    S().onChange(index);
    if (S().reduced) {
      current = index;
      target = index;
      from = -1;
      morphAt = -1;
      lastSwitch = now();
      render(now());
      return;
    }
    from = fromIndex;
    target = index;
    morphAt = now();
    lastSwitch = morphAt;
    schedule();
  };

  const advance = () => {
    if (words.length < 2) return;
    const base = morphAt >= 0 ? target : current;
    if (morphAt >= 0) current = target;
    begin(base + 1, base);
  };

  function frame() {
    raf = 0;
    if (destroyed) return;
    const time = now();
    const waiting = started && !S().reduced && morphAt < 0 && words.length > 1;
    if (waiting && !S().held && visible && time - lastSwitch >= INTERVAL) advance();
    render(time);
    if (morphAt >= 0) schedule();
    else if (waiting && visible && !S().held) {
      if (timer) view.clearTimeout(timer);
      timer = view.setTimeout(() => {
        timer = 0;
        schedule();
      }, Math.max(16, (INTERVAL - (time - lastSwitch)) * 1000));
    }
  }

  const start = () => {
    if (started) return;
    started = true;
    if (!S().reduced) begin(0, -1);
    else {
      current = 0;
      lastSwitch = now();
      render(now());
    }
  };

  const resizer = new ResizeObserver(() => {
    build(false);
    render(now());
  });
  resizer.observe(root);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !started) start();
    if (visible) schedule();
  });
  observer.observe(root);
  const themes = new MutationObserver(() => {
    colours();
    render(now());
  });
  themes.observe(doc.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  const scheme = view.matchMedia("(prefers-color-scheme: dark)");
  const onScheme = () => {
    colours();
    render(now());
  };
  scheme.addEventListener("change", onScheme);

  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };

  const onRestored = () => {
    lost = false;
    build(true);
    colours();
    render(now());
  };

  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  colours();
  build(true);
  render(now());
  if (doc.fonts && doc.fonts.ready) {
    void doc.fonts.ready.then(() => {
      if (destroyed) return;
      build(true);
      render(now());
    });
  }

  return {
    goTo: (index: number) => {
      if (words.length === 0) return;
      const next = clamp(Math.round(index), 0, words.length - 1);
      const base = morphAt >= 0 ? target : current;
      if (next === base) return;
      if (morphAt >= 0) current = target;
      begin(next, base);
    },
    sync: () => {
      const held = S().held;
      if (wasHeld && !held) lastSwitch = now();
      wasHeld = held;
      schedule();
    },
    destroy: () => {
      destroyed = true;
      if (raf) view.cancelAnimationFrame(raf);
      if (timer) view.clearTimeout(timer);
      resizer.disconnect();
      observer.disconnect();
      themes.disconnect();
      scheme.removeEventListener("change", onScheme);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      for (const word of words) word.texture?.dispose();
      empty.dispose();
      glyphTexture.dispose();
      material.dispose();
      quad.geometry.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

const sequence: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

export function AboutValues() {
  const reduceMotion = useReducedMotion();
  const wordRef = useRef<HTMLSpanElement>(null);
  const morphRef = useRef<Morph | null>(null);
  const settingsRef = useRef<Settings>({ held: true, reduced: false, onChange: () => {} });
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(true);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    settingsRef.current.held = held;
    settingsRef.current.reduced = Boolean(reduceMotion);
    settingsRef.current.onChange = setActive;
    morphRef.current?.sync();
  }, [held, reduceMotion]);

  useEffect(() => {
    const root = wordRef.current;
    if (!root) return;
    const morph = createMorph(root, settingsRef);
    morphRef.current = morph;
    setDrawn(Boolean(morph));
    return () => {
      morph?.destroy();
      morphRef.current = null;
    };
  }, []);

  const choose = (index: number) => {
    setHeld(true);
    setActive(index);
    morphRef.current?.goTo(index);
  };

  return (
    <section className="relative w-full overflow-hidden px-4 py-12 text-ink sm:px-6 lg:px-8 lg:py-24">
      <motion.div
        variants={sequence}
        initial="show"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="mx-auto w-full max-w-6xl"
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:items-end md:gap-10 lg:gap-16">
          <h1 className="font-display font-medium">
            <motion.span variants={rise} className="block text-[clamp(2rem,5vw,3.5rem)] leading-none">
              Care stays
            </motion.span>
            <span
              ref={wordRef}
              aria-hidden="true"
              className="relative -ml-[0.04em] mt-1 inline-grid align-baseline text-[clamp(3.1rem,14vw,8.5rem)] leading-[0.9] text-oxide-deep"
            >
              {VALUES.map((value, index) => (
                <span
                  key={value.word}
                  data-morph-word=""
                  className={`whitespace-pre [grid-area:1/1] ${drawn || index !== active ? "invisible" : ""}`}
                >
                  {value.word}
                </span>
              ))}
            </span>
            <span className="sr-only">{VALUES[active].word}</span>
          </h1>
          <motion.div variants={rise} className="max-w-md lg:pb-3">
            <p aria-live="polite" className="text-pretty text-lg leading-relaxed text-ink">
              {VALUES[active].line}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Four ways a visit at this practice is handled. General education, not a diagnosis.
            </p>
          </motion.div>
        </div>

        <motion.div variants={rise} className="mt-10 border-t border-line pt-4 lg:mt-16">
          <p id="visit-values" className="text-sm text-muted">
            Choose a way the visit is handled
          </p>
          <ul aria-labelledby="visit-values" className="mt-3 flex flex-wrap gap-2">
            {VALUES.map((value, index) => {
              const on = index === active;
              return (
                <li key={value.name}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => choose(index)}
                    className={`min-h-11 cursor-pointer rounded-full border px-4 font-display text-lg outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-oxide focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none ${
                      on ? "border-oxide/40 bg-card text-oxide-deep" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {value.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </motion.div>
    </section>
  );
}
