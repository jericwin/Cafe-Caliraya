import * as THREE from 'three';

/**
 * Procedural texture library. Everything is generated at start-up on <canvas>,
 * so the project ships with zero external image assets and no broken references.
 */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Periodic (tileable) value noise field in 0..1 */
function vnoise(w: number, h: number, cx: number, cy: number, rand: () => number) {
  const g = new Float32Array(cx * cy);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  const out = new Float32Array(w * h);
  // per-column lattice indices / weights are the same for every row: compute them once
  const X0 = new Int32Array(w);
  const X1 = new Int32Array(w);
  const TX = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    const fx = (x / w) * cx;
    const ix = Math.floor(fx);
    const t = fx - ix;
    TX[x] = t * t * (3 - 2 * t);
    X0[x] = ix % cx;
    X1[x] = (ix + 1) % cx;
  }
  for (let y = 0; y < h; y++) {
    const fy = (y / h) * cy;
    const iy = Math.floor(fy);
    let ty = fy - iy;
    ty = ty * ty * (3 - 2 * ty);
    const r0 = (iy % cy) * cx;
    const r1 = ((iy + 1) % cy) * cx;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const tx = TX[x];
      const a = g[r0 + X0[x]];
      const b = g[r0 + X1[x]];
      const c = g[r1 + X0[x]];
      const d = g[r1 + X1[x]];
      out[row + x] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }
  }
  return out;
}

function fbm(w: number, h: number, seed: number, oct: [number, number, number][]) {
  const r = rng(seed);
  const out = new Float32Array(w * h);
  let total = 0;
  for (const [cx, cy, amp] of oct) {
    const n = vnoise(w, h, cx, cy, r);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function canvas(w: number, h: number) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  return { cv, ctx };
}

function fromPixels(w: number, h: number, fn: (i: number, x: number, y: number) => RGB | [number, number, number, number]) {
  const { cv, ctx } = canvas(w, h);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const c = fn(i, x, y);
      d[i * 4] = c[0];
      d[i * 4 + 1] = c[1];
      d[i * 4 + 2] = c[2];
      d[i * 4 + 3] = c.length === 4 ? c[3] : 255;
    }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function normalFromHeight(hf: Float32Array, w: number, h: number, strength: number) {
  const { cv, ctx } = canvas(w, h);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const up = ((y - 1 + h) % h) * w;
    const dnr = ((y + 1) % h) * w;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const nx = (hf[row + ((x - 1 + w) % w)] - hf[row + ((x + 1) % w)]) * strength;
      const ny = (hf[dnr + x] - hf[up + x]) * strength;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const i = (row + x) * 4;
      d[i] = (nx * inv * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      d[i + 2] = (inv * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function heightFromCanvas(cv: HTMLCanvasElement) {
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const hf = new Float32Array(cv.width * cv.height);
  for (let i = 0; i < hf.length; i++) hf[i] = d[i * 4] / 255;
  return hf;
}

export interface TexSet {
  map: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
}

let ANISO = 8;
export function setAnisotropy(a: number) {
  ANISO = a;
}

function tex(cv: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = ANISO;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------------ generators

function concrete(seed: number, dark: string, light: string, polish = false): TexSet {
  const S = 512;
  const hf = fbm(S, S, seed, [
    [4, 4, 0.45],
    [12, 12, 0.3],
    [48, 48, 0.17],
    [180, 180, 0.08],
  ]);
  const r = rng(seed + 7);
  const A = hex(dark);
  const B = hex(light);
  const pores = new Float32Array(S * S);
  for (let k = 0; k < (polish ? 900 : 2600); k++) pores[Math.floor(r() * S * S)] = 0.25 + r() * 0.5;
  const cv = fromPixels(S, S, (i, x, y) => {
    let t = hf[i];
    t = (t - 0.5) * (polish ? 1.4 : 2.0) + 0.5;
    let c = mix(A, B, Math.min(1, Math.max(0, t)));
    if (pores[i]) c = mix(c, [60, 58, 54], pores[i] * 0.6);
    if (polish && (x === 0 || y === 0 || x === 1 || y === 1)) c = mix(c, [70, 68, 64], 0.55); // saw-cut joints
    return c;
  });
  const hh = new Float32Array(hf);
  for (let i = 0; i < hh.length; i++) hh[i] = hf[i] - (pores[i] ? 0.25 : 0);
  const rough = fromPixels(S, S, (i) => {
    const v = (polish ? 70 : 200) + (hf[i] - 0.5) * 80;
    return [v, v, v];
  });
  return { map: tex(cv), normalMap: tex(normalFromHeight(hh, S, S, polish ? 1.2 : 3), false), roughnessMap: tex(rough, false) };
}

function stone(seed: number): TexSet {
  const S = 512;
  const r = rng(seed);
  const { cv: hcv, ctx: hctx } = canvas(S, S);
  const { cv, ctx } = canvas(S, S);
  ctx.fillStyle = '#5b544b';
  ctx.fillRect(0, 0, S, S);
  hctx.fillStyle = '#000';
  hctx.fillRect(0, 0, S, S);
  const palette = ['#a39684', '#8e8172', '#b3a691', '#7d7366', '#9b8b74', '#c0b29a', '#867a6a', '#6f665b'];
  // courses: heights scaled to fill exactly (tile = 2 m)
  const raw: number[] = [];
  let acc = 0;
  while (acc < S * 0.95) {
    const h = S * (0.07 + r() * 0.08);
    raw.push(h);
    acc += h;
  }
  const scale = S / acc;
  let y = 0;
  const mortar = 3;
  for (const h0 of raw) {
    const h = h0 * scale;
    let x = -r() * S * 0.3;
    const start = x;
    while (x < start + S) {
      let w = S * (0.16 + r() * 0.26);
      if (x + w > start + S) w = start + S - x;
      if (w < 15) break;
      const col = palette[Math.floor(r() * palette.length)];
      for (const off of [0, S, -S]) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(x + off + mortar / 2, y + mortar / 2, w - mortar, h - mortar, 3);
        ctx.fill();
        const grad = hctx.createLinearGradient(0, y, 0, y + h);
        const v = 160 + Math.floor(r() * 80);
        grad.addColorStop(0, `rgb(${v - 40},${v - 40},${v - 40})`);
        grad.addColorStop(0.5, `rgb(${v},${v},${v})`);
        grad.addColorStop(1, `rgb(${v - 60},${v - 60},${v - 60})`);
        hctx.fillStyle = grad;
        hctx.beginPath();
        hctx.roundRect(x + off + mortar / 2, y + mortar / 2, w - mortar, h - mortar, 4);
        hctx.fill();
      }
      x += w;
    }
    y += h;
  }
  // grain variation
  const n = fbm(S, S, seed + 3, [
    [32, 32, 0.6],
    [128, 128, 0.4],
  ]);
  const img = ctx.getImageData(0, 0, S, S);
  const himg = hctx.getImageData(0, 0, S, S);
  for (let i = 0; i < S * S; i++) {
    const k = 0.82 + n[i] * 0.36;
    img.data[i * 4] *= k;
    img.data[i * 4 + 1] *= k;
    img.data[i * 4 + 2] *= k;
    himg.data[i * 4] = Math.min(255, himg.data[i * 4] * (0.85 + n[i] * 0.3));
  }
  ctx.putImageData(img, 0, 0);
  hctx.putImageData(himg, 0, 0);
  return { map: tex(cv), normalMap: tex(normalFromHeight(heightFromCanvas(hcv), S, S, 6), false) };
}

function grainField(S: number, H: number, seed: number, freq: number, vertical = false) {
  const warp = fbm(S, H, seed, [
    [3, 12, 0.6],
    [6, 40, 0.4],
  ]);
  const fine = fbm(S, H, seed + 11, [
    [8, 160, 0.5],
    [4, 256, 0.5],
  ]);
  const out = new Float32Array(S * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const p = vertical ? x / S : y / H;
      const ring = Math.sin((p * freq + warp[i] * 3.2) * Math.PI * 2) * 0.5 + 0.5;
      out[i] = Math.pow(ring, 3) * 0.55 + fine[i] * 0.45;
    }
  return out;
}

function woodGrain(seed: number, dark: string, light: string): TexSet {
  const S = 512;
  const g = grainField(S, S, seed, 9);
  const A = hex(dark);
  const B = hex(light);
  const cv = fromPixels(S, S, (i) => mix(B, A, g[i]));
  return { map: tex(cv), normalMap: tex(normalFromHeight(g, S, S, 0.8), false) };
}

/** Floor planks / deck boards. Boards run along U. tile = 2 m */
function planks(seed: number, tones: string[], boardPx: number, gapPx: number, weather = 0): TexSet {
  const S = 512;
  const r = rng(seed);
  const g = grainField(S, S, seed + 5, 17);
  const out = new Float32Array(S * S);
  const colors = new Float32Array(S * S * 3);
  const rows = Math.round(S / boardPx);
  const bp = S / rows;
  const hf = new Float32Array(S * S);
  for (let row = 0; row < rows; row++) {
    let x = -r() * S;
    while (x < S) {
      const len = S * (0.45 + r() * 0.5);
      const tone = hex(tones[Math.floor(r() * tones.length)]);
      const shade = 0.86 + r() * 0.24;
      for (let yy = Math.floor(row * bp); yy < Math.floor((row + 1) * bp); yy++)
        for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(S, Math.floor(x + len)); xx++) {
          const i = yy * S + xx;
          const inGap = yy - row * bp < gapPx || xx - x < gapPx * 0.6;
          const gg = g[i];
          const c = mix(tone, [tone[0] * 0.55, tone[1] * 0.5, tone[2] * 0.45], gg * 0.75);
          const k = inGap ? 0.25 : shade;
          colors[i * 3] = c[0] * k;
          colors[i * 3 + 1] = c[1] * k;
          colors[i * 3 + 2] = c[2] * k;
          hf[i] = inGap ? 0 : 0.7 + gg * 0.15;
          out[i] = gg;
        }
      // wrap the board around the tile edge
      if (x < 0) {
        const tail = x + S;
        for (let yy = Math.floor(row * bp); yy < Math.floor((row + 1) * bp); yy++)
          for (let xx = Math.floor(tail); xx < S; xx++) {
            const i = yy * S + xx;
            if (colors[i * 3] === 0) {
              colors[i * 3] = tone[0] * shade * 0.9;
              colors[i * 3 + 1] = tone[1] * shade * 0.9;
              colors[i * 3 + 2] = tone[2] * shade * 0.9;
              hf[i] = 0.7;
            }
          }
      }
      x += len;
    }
  }
  const wn = weather ? fbm(S, S, seed + 9, [[16, 16, 1]]) : null;
  const cv = fromPixels(S, S, (i) => {
    let c: RGB = [colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]];
    if (wn) c = mix(c, [128, 122, 112], wn[i] * weather);
    return c;
  });
  return { map: tex(cv), normalMap: tex(normalFromHeight(hf, S, S, 4), false) };
}

/** Vertical timber battens. tile = 1 m */
function battens(seed: number): TexSet {
  const S = 512;
  const g = grainField(S, S, seed, 14, true);
  const r = rng(seed);
  const n = 10;
  const tones: RGB[] = [];
  for (let i = 0; i < n; i++) tones.push(mix(hex('#8a5a35'), hex('#a8744a'), r()));
  const hf = new Float32Array(S * S);
  const cv = fromPixels(S, S, (i, x) => {
    const k = Math.floor((x / S) * n);
    const local = (x / S) * n - k;
    const gap = local > 0.84;
    hf[i] = gap ? 0 : 0.8 - Math.abs(local - 0.42) * 0.3;
    if (gap) return [32, 22, 16];
    return mix(tones[k], [70, 42, 24], g[i] * 0.55);
  });
  return { map: tex(cv), normalMap: tex(normalFromHeight(hf, S, S, 5), false) };
}

function tiles(seed: number, cols: number, rows: number, base: string, alt: string, grout: string, groutPx: number, speckle = 0, offsetRows = false): TexSet {
  const S = 512;
  const r = rng(seed);
  const tw = S / cols;
  const th = S / rows;
  const tone: number[] = [];
  for (let i = 0; i < cols * rows * 2; i++) tone.push(r());
  const n = fbm(S, S, seed, [
    [8, 8, 0.5],
    [64, 64, 0.5],
  ]);
  const A = hex(base);
  const B = hex(alt);
  const G = hex(grout);
  const hf = new Float32Array(S * S);
  const cv = fromPixels(S, S, (i, x, y) => {
    const row = Math.floor(y / th);
    const xo = offsetRows && row % 2 ? x + tw / 2 : x;
    const col = Math.floor((xo % S) / tw);
    const lx = (xo % S) - col * tw;
    const ly = y - row * th;
    const isG = lx < groutPx || ly < groutPx;
    hf[i] = isG ? 0 : 1 - (Math.pow(Math.abs(lx / tw - 0.5) * 2, 8) + Math.pow(Math.abs(ly / th - 0.5) * 2, 8)) * 0.15;
    if (isG) return G;
    let c = mix(A, B, tone[row * cols + col] * 0.8 + n[i] * 0.2);
    if (speckle && r() < speckle) c = mix(c, r() > 0.5 ? [40, 40, 42] : [230, 228, 222], 0.7);
    return c;
  });
  return { map: tex(cv), normalMap: tex(normalFromHeight(hf, S, S, 3), false) };
}

function noiseSurface(seed: number, dark: string, light: string, contrast: number, speck: number, nstr = 2, oct?: [number, number, number][]): TexSet {
  const S = 512;
  const hf = fbm(
    S,
    S,
    seed,
    oct ?? [
      [6, 6, 0.4],
      [24, 24, 0.3],
      [96, 96, 0.2],
      [256, 256, 0.1],
    ],
  );
  const r = rng(seed + 1);
  const A = hex(dark);
  const B = hex(light);
  const cv = fromPixels(S, S, (i) => {
    let t = (hf[i] - 0.5) * contrast + 0.5;
    if (r() < speck) t += (r() - 0.5) * 1.2;
    return mix(A, B, Math.min(1, Math.max(0, t)));
  });
  return { map: tex(cv), normalMap: tex(normalFromHeight(hf, S, S, nstr), false) };
}

function grass(seed: number): TexSet {
  const S = 512;
  const base = fbm(S, S, seed, [
    [4, 4, 0.5],
    [16, 16, 0.3],
    [64, 64, 0.2],
  ]);
  const { cv, ctx } = canvas(S, S);
  const img = ctx.createImageData(S, S);
  const A = hex('#4b6d27');
  const B = hex('#86a647');
  const C = hex('#a0a052');
  for (let i = 0; i < S * S; i++) {
    let c = mix(A, B, base[i]);
    if (base[i] > 0.68) c = mix(c, C, (base[i] - 0.68) * 2);
    img.data[i * 4] = c[0];
    img.data[i * 4 + 1] = c[1];
    img.data[i * 4 + 2] = c[2];
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const r = rng(seed + 2);
  for (let k = 0; k < 9000; k++) {
    const x = r() * S;
    const y = r() * S;
    const l = 3 + r() * 7;
    const a = -Math.PI / 2 + (r() - 0.5) * 0.9;
    const g = 70 + r() * 90;
    ctx.strokeStyle = `rgba(${g * 0.55},${g},${g * 0.35},0.55)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  return { map: tex(cv), normalMap: tex(normalFromHeight(base, S, S, 1.5), false) };
}

function rattan(): TexSet {
  const S = 256;
  const n = 8;
  const hf = new Float32Array(S * S);
  const cv = fromPixels(S, S, (i, x, y) => {
    const cx = (x / S) * n;
    const cy = (y / S) * n;
    const ix = Math.floor(cx);
    const iy = Math.floor(cy);
    const over = (ix + iy) % 2 === 0;
    const lx = cx - ix;
    const ly = cy - iy;
    const v = over ? Math.sin(ly * Math.PI) : Math.sin(lx * Math.PI);
    const hole = Math.abs(lx - 0.5) > 0.46 && Math.abs(ly - 0.5) > 0.46;
    hf[i] = hole ? 0 : v;
    if (hole) return [40, 28, 18];
    return mix([150, 105, 60], [214, 170, 112], v);
  });
  return { map: tex(cv), normalMap: tex(normalFromHeight(hf, S, S, 3), false) };
}

function seam(): TexSet {
  const S = 256;
  const hf = new Float32Array(S * S);
  const n = fbm(S, S, 91, [[4, 32, 1]]);
  const cv = fromPixels(S, S, (i, x) => {
    const u = (x / S) * 2;
    const l = u - Math.floor(u);
    const rib = l < 0.04 ? 1 : l < 0.07 ? 0.6 : 0.3 + n[i] * 0.05;
    hf[i] = rib;
    const v = 58 + rib * 20 + n[i] * 8;
    return [v, v + 2, v + 4];
  });
  return { map: tex(cv), normalMap: tex(normalFromHeight(hf, S, S, 6), false) };
}

function fabric(seed: number, a: string, b: string): TexSet {
  const S = 256;
  const n = fbm(S, S, seed, [
    [16, 16, 0.5],
    [128, 128, 0.5],
  ]);
  const hf = new Float32Array(S * S);
  const cv = fromPixels(S, S, (i, x, y) => {
    const w = ((x % 4 < 2) !== (y % 4 < 2) ? 1 : 0) * 0.5 + n[i] * 0.5;
    hf[i] = w;
    return mix(hex(a), hex(b), w);
  });
  return { map: tex(cv), normalMap: tex(normalFromHeight(hf, S, S, 1.2), false) };
}

function bark(seed: number, a: string, b: string): TexSet {
  const S = 256;
  const g = fbm(S, S, seed, [
    [24, 3, 0.6],
    [64, 8, 0.4],
  ]);
  const cv = fromPixels(S, S, (i) => mix(hex(a), hex(b), g[i]));
  return { map: tex(cv), normalMap: tex(normalFromHeight(g, S, S, 6), false) };
}

/** Palm frond with leaflets on an alpha channel. U along the rachis. */
function frond(): TexSet {
  const W = 1024;
  const H = 256;
  const { cv, ctx } = canvas(W, H);
  ctx.clearRect(0, 0, W, H);
  const r = rng(5);
  for (let i = 0; i < 90; i++) {
    const t = i / 90;
    const x = 30 + t * (W - 60);
    const len = (H * 0.5 - 6) * Math.sin(Math.min(1, t * 1.15) * Math.PI) * (0.85 + r() * 0.15);
    for (const side of [-1, 1]) {
      const g = 90 + r() * 60;
      ctx.strokeStyle = `rgb(${g * 0.45},${g},${g * 0.25})`;
      ctx.lineWidth = 7 + r() * 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, H / 2);
      ctx.quadraticCurveTo(x + len * 0.45, H / 2 + side * len * 0.55, x + len * 0.75, H / 2 + side * len);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#7b7a3a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();
  const t = tex(cv);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { map: t };
}

/** Broadleaf foliage card with alpha. */
function leaves(seed: number, a: string, b: string): TexSet {
  const S = 512;
  const { cv, ctx } = canvas(S, S);
  const r = rng(seed);
  const A = hex(a);
  const B = hex(b);
  for (let k = 0; k < 520; k++) {
    const ang = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * S * 0.44;
    const x = S / 2 + Math.cos(ang) * rad;
    const y = S / 2 + Math.sin(ang) * rad * 0.9;
    const c = mix(A, B, r());
    const sh = 0.7 + (1 - rad / (S * 0.44)) * 0.3 + (y < S / 2 ? 0.1 : -0.1);
    ctx.fillStyle = `rgb(${c[0] * sh},${c[1] * sh},${c[2] * sh})`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * Math.PI * 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9 + r() * 7, 4 + r() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const t = tex(cv);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { map: t };
}

function capiz(): TexSet {
  const S = 256;
  const n = 8;
  const nf = fbm(S, S, 77, [[32, 32, 1]]);
  const cv = fromPixels(S, S, (i, x, y) => {
    const lx = ((x / S) * n) % 1;
    const ly = ((y / S) * n) % 1;
    const frame = lx < 0.08 || ly < 0.08;
    if (frame) return [92, 62, 38];
    const v = 215 + nf[i] * 35;
    return [v, v * 0.97, v * 0.9];
  });
  return { map: tex(cv) };
}

function textCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const { cv, ctx } = canvas(w, h);
  draw(ctx);
  const t = tex(cv);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function menuBoard() {
  return textCanvas(1024, 512, (ctx) => {
    ctx.fillStyle = '#1c1f1d';
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = '#efe6d2';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillText('Caliraya Coffee House', 40, 82);
    ctx.font = '26px Georgia, serif';
    ctx.fillStyle = '#e2b26f';
    ctx.fillText('LAKESIDE ROASTS · CAVINTI–LUMBAN', 42, 122);
    const items = [
      ['Barako Espresso', '120'],
      ['Spanish Latte', '165'],
      ['Ube Cold Brew', '180'],
      ['Calamansi Tonic', '150'],
      ['Muscovado Oat Latte', '175'],
      ['Tablea Mocha', '170'],
    ];
    const items2 = [
      ['Ensaymada', '95'],
      ['Buko Pie Slice', '110'],
      ['Pandesal Sandwich', '145'],
      ['Turon à la Mode', '130'],
      ['Bibingka Cheesecake', '160'],
      ['Silog Bowl', '220'],
    ];
    ctx.font = '30px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#efe6d2';
    items.forEach(([a, b], i) => {
      ctx.fillText(a, 50, 190 + i * 50);
      ctx.fillText(b, 420, 190 + i * 50);
    });
    items2.forEach(([a, b], i) => {
      ctx.fillText(a, 560, 190 + i * 50);
      ctx.fillText(b, 930, 190 + i * 50);
    });
    ctx.strokeStyle = '#e2b26f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(512, 160);
    ctx.lineTo(512, 470);
    ctx.stroke();
  });
}

function signTex() {
  return textCanvas(1024, 256, (ctx) => {
    ctx.clearRect(0, 0, 1024, 256);
    ctx.fillStyle = '#f4ead8';
    ctx.font = '600 92px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CALIRAYA', 512, 120);
    ctx.font = '500 46px Helvetica, Arial, sans-serif';
    ctx.fillText('C O F F E E   H O U S E', 512, 200);
  });
}

function umbrella() {
  const S = 256;
  const cv = fromPixels(S, S, (_i, x) => (Math.floor((x / S) * 8) % 2 ? [236, 226, 204] : [214, 196, 160]));
  return { map: tex(cv) };
}

function matcap(inner: string, outer: string) {
  const S = 256;
  const { cv, ctx } = canvas(S, S);
  const g = ctx.createRadialGradient(S * 0.38, S * 0.35, 10, S / 2, S / 2, S / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Tileable normal map for water — sum of integer-frequency waves (seamless). */
export function waterNormals() {
  const S = 256;
  const waves: [number, number, number, number][] = [];
  const r = rng(42);
  for (let i = 0; i < 16; i++) {
    const kx = Math.round((r() - 0.5) * 2 * (2 + i * 1.2));
    const ky = Math.round((r() - 0.5) * 2 * (2 + i * 1.2));
    waves.push([kx, ky, 1 / (1 + i * 0.35), r() * Math.PI * 2]);
  }
  const hf = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let h = 0;
      for (const [kx, ky, a, p] of waves) h += Math.sin(((kx * x + ky * y) / S) * Math.PI * 2 + p) * a;
      hf[y * S + x] = h * 0.08 + 0.5;
    }
  const t = tex(normalFromHeight(hf, S, S, 9), false);
  return t;
}

// ------------------------------------------------------------------ library
export type TexKey =
  | 'concrete'
  | 'polished'
  | 'stone'
  | 'oak'
  | 'walnut'
  | 'floorPlank'
  | 'deck'
  | 'battens'
  | 'subway'
  | 'floorTile'
  | 'paving'
  | 'asphalt'
  | 'grass'
  | 'gravel'
  | 'rattan'
  | 'seam'
  | 'fabricSand'
  | 'fabricOlive'
  | 'fabricRust'
  | 'leather'
  | 'bark'
  | 'palmBark'
  | 'frond'
  | 'leaves'
  | 'leavesDark'
  | 'capiz'
  | 'burlap'
  | 'soffit'
  | 'umbrella'
  | 'terrazzo'
  | 'plaster';

let LIB: Record<TexKey, TexSet> | null = null;
let EXTRA: { menu: THREE.Texture; sign: THREE.Texture; matcap: THREE.Texture; water: THREE.Texture } | null = null;

export function getTextures() {
  if (LIB) return LIB;
  LIB = {
    concrete: concrete(11, '#8f8a82', '#c4bfb6'),
    polished: concrete(23, '#7f7a72', '#b1aca3', true),
    stone: stone(5),
    oak: woodGrain(3, '#9b6e43', '#d2a674'),
    walnut: woodGrain(8, '#3f2618', '#7a4f33'),
    floorPlank: planks(4, ['#a77a50', '#b98a5c', '#9b6c45', '#c29466'], 38, 1),
    deck: planks(14, ['#7f5a3e', '#8d6446', '#6e4c34', '#94704f'], 35, 3, 0.25),
    battens: battens(17),
    subway: tiles(9, 5, 10, '#f2f0ea', '#e4e1d8', '#bdb8ad', 3, 0, true),
    floorTile: tiles(19, 2, 2, '#9b9a96', '#8a8985', '#5d5c58', 3, 0.02),
    paving: tiles(29, 4, 8, '#b6aa96', '#9d9282', '#6d665c', 3, 0.0, true),
    asphalt: noiseSurface(31, '#232426', '#46474a', 1.2, 0.08, 2.5),
    grass: grass(37),
    gravel: noiseSurface(41, '#7d7466', '#b9b0a0', 2.2, 0.35, 5, [
      [64, 64, 0.5],
      [200, 200, 0.5],
    ]),
    rattan: rattan(),
    seam: seam(),
    fabricSand: fabric(1, '#cdbb9d', '#b8a582'),
    fabricOlive: fabric(2, '#6b6d45', '#5a5c3a'),
    fabricRust: fabric(3, '#a75a3a', '#8e4b30'),
    leather: fabric(43, '#7a4528', '#94593a'),
    bark: bark(47, '#3d3125', '#6c5a47'),
    palmBark: bark(53, '#6a5c4b', '#9a8a72'),
    frond: frond(),
    leaves: leaves(59, '#2f5a1e', '#6c9a35'),
    leavesDark: leaves(61, '#1f3d17', '#4e7a2a'),
    capiz: capiz(),
    burlap: fabric(7, '#a68b5f', '#8a7149'),
    soffit: null as unknown as TexSet,
    umbrella: umbrella(),
    terrazzo: tiles(67, 1, 1, '#d8d3c8', '#cfc9bc', '#d8d3c8', 0, 0.06),
    plaster: noiseSurface(73, '#e9e5dd', '#ffffff', 0.5, 0.02, 1.2),
  };
  LIB.soffit = LIB.battens;
  return LIB;
}

export function getExtraTextures() {
  if (EXTRA) return EXTRA;
  EXTRA = { menu: menuBoard(), sign: signTex(), matcap: matcap('#7fb0ff', '#0d2a52'), water: waterNormals() };
  return EXTRA;
}
