import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fromArrays(pos: number[], uv: number[], index?: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (index) g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Hip roof surface over a rectangle; ridge runs along the longer (X) side. UVs in metres, V down-slope. */
export function hipRoofGeo(x0: number, x1: number, z0: number, z1: number, pitchDeg: number) {
  const d = (z1 - z0) / 2;
  const rise = d * Math.tan((pitchDeg * Math.PI) / 180);
  const zc = (z0 + z1) / 2;
  const xa = x0 + d;
  const xb = x1 - d;
  const slope = Math.hypot(d, rise);
  const pos: number[] = [];
  const uv: number[] = [];
  const tri = (a: number[], b: number[], c: number[], ua: number[], ub: number[], uc: number[]) => {
    pos.push(...a, ...b, ...c);
    uv.push(...ua, ...ub, ...uc);
  };
  // south (+z)
  tri([x0, 0, z1], [x1, 0, z1], [xb, rise, zc], [x0, 0], [x1, 0], [xb, slope]);
  tri([x0, 0, z1], [xb, rise, zc], [xa, rise, zc], [x0, 0], [xb, slope], [xa, slope]);
  // north (-z)
  tri([x1, 0, z0], [x0, 0, z0], [xa, rise, zc], [-x1, 0], [-x0, 0], [-xa, slope]);
  tri([x1, 0, z0], [xa, rise, zc], [xb, rise, zc], [-x1, 0], [-xa, slope], [-xb, slope]);
  // west (-x)
  tri([x0, 0, z0], [x0, 0, z1], [xa, rise, zc], [z0, 0], [z1, 0], [zc, slope]);
  // east (+x)
  tri([x1, 0, z1], [x1, 0, z0], [xb, rise, zc], [-z1, 0], [-z0, 0], [-zc, slope]);
  return { geo: fromArrays(pos, uv), rise };
}

/** Tube with radius tapering from r0 to r1, UVs in metres. */
export function taperedTube(path: THREE.Curve<THREE.Vector3>, r0: number, r1: number, tubular = 20, radial = 8) {
  const frames = path.computeFrenetFrames(tubular, false);
  const len = path.getLength();
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const P = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    path.getPointAt(t, P);
    const N = frames.normals[i];
    const Bn = frames.binormals[i];
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const nx = -Math.cos(v) * N.x + Math.sin(v) * Bn.x;
      const ny = -Math.cos(v) * N.y + Math.sin(v) * Bn.y;
      const nz = -Math.cos(v) * N.z + Math.sin(v) * Bn.z;
      pos.push(P.x + r * nx, P.y + r * ny, P.z + r * nz);
      uv.push((j / radial) * Math.PI * 2 * r0, t * len);
    }
  }
  for (let i = 0; i < tubular; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return fromArrays(pos, uv, idx);
}

/** A drooping leaf/frond strip, V-folded along the midrib. Length along +X. */
export function frondGeo(length: number, width: number, arch = 0.55, droop = 1.7, fold = 0.18, segs = 10) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * length;
    const y = (arch * t - droop * t * t) * length * 0.5;
    for (let s = 0; s < 3; s++) {
      const side = s - 1;
      pos.push(x, y - Math.abs(side) * fold * width, side * width * 0.5);
      uv.push(t, (side + 1) / 2);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let s = 0; s < 2; s++) {
      const a = i * 3 + s;
      const b = (i + 1) * 3 + s;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return fromArrays(pos, uv, idx);
}

function noise3(x: number, y: number, z: number) {
  return (
    Math.sin(x * 1.31 + 0.7) * Math.sin(y * 1.73 + 1.1) * Math.sin(z * 1.19 + 2.3) +
    0.5 * Math.sin(x * 2.9 + 3.1) * Math.sin(y * 3.3 + 0.4) * Math.sin(z * 2.7 + 1.7) +
    0.25 * Math.sin(x * 6.1 + 1.3) * Math.sin(y * 5.7 + 2.1) * Math.sin(z * 6.3 + 0.2)
  );
}

/** Lumpy sphere for shrubs and canopy volumes. */
export function blobGeo(r: number, detail = 2, seed = 1, amp = 0.22, squash = 1) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise3(v.x * 2 / r + seed, v.y * 2 / r + seed * 0.7, v.z * 2 / r - seed);
    v.multiplyScalar(1 + n * amp);
    v.y *= squash;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  const uv: number[] = [];
  for (let i = 0; i < p.count; i++) uv.push(p.getX(i), p.getY(i) + p.getZ(i));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** Two crossed quads — a classic foliage card. */
function crossCard(size: number) {
  const a = new THREE.PlaneGeometry(size, size);
  const b = new THREE.PlaneGeometry(size, size);
  b.rotateY(Math.PI / 2);
  return mergeGeometries([a, b])!;
}

function place(g: THREE.BufferGeometry, pos: THREE.Vector3, rot: THREE.Euler, scale = 1) {
  const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(rot), new THREE.Vector3(scale, scale, scale));
  const c = g.clone();
  c.applyMatrix4(m);
  return c;
}

export interface TreeParts {
  trunk: THREE.BufferGeometry;
  leaves: THREE.BufferGeometry;
  core?: THREE.BufferGeometry;
}

const CACHE = new Map<string, TreeParts>();

/** Coconut palm (Cocos nucifera) with a curved trunk and drooping fronds. */
export function palmGeo(variant: number): TreeParts {
  const k = `palm${variant}`;
  const hit = CACHE.get(k);
  if (hit) return hit;
  const r = seeded(100 + variant);
  const H = 7 + r() * 3;
  const lean = 0.6 + r() * 1.4;
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.2, H * 0.35, 0),
    new THREE.Vector3(lean * 0.8, H * 0.7, 0),
    new THREE.Vector3(lean, H, 0),
  );
  const trunk = taperedTube(curve, 0.2, 0.13, 22, 9);
  const top = curve.getPoint(1);
  const fronds: THREE.BufferGeometry[] = [];
  const n = 14 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const L = 3.2 + r() * 1.2;
    const f = frondGeo(L, 1.25, 0.7 + r() * 0.4, 1.5 + r() * 0.8, 0.22, 10);
    const yaw = (i / n) * Math.PI * 2 + r() * 0.3;
    const pitch = -0.25 + r() * 0.75;
    f.rotateZ(pitch);
    f.rotateY(yaw);
    f.translate(top.x, top.y, top.z);
    fronds.push(f);
  }
  // coconuts
  const nut = new THREE.SphereGeometry(0.12, 8, 6);
  const nuts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2;
    nuts.push(place(nut, new THREE.Vector3(top.x + Math.cos(a) * 0.22, top.y - 0.25, top.z + Math.sin(a) * 0.22), new THREE.Euler()));
  }
  const parts: TreeParts = {
    trunk: mergeGeometries([trunk, ...nuts.map((g) => normaliseUV(g))])!,
    leaves: mergeGeometries(fronds)!,
  };
  CACHE.set(k, parts);
  return parts;
}

function normaliseUV(g: THREE.BufferGeometry) {
  const n = g.index ? g : g;
  for (const name of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(name)) n.deleteAttribute(name);
  return n;
}

/** Broadleaf shade tree (narra / mango character): branching trunk + foliage card canopy. */
export function broadleafGeo(variant: number): TreeParts {
  const k = `broad${variant}`;
  const hit = CACHE.get(k);
  if (hit) return hit;
  const r = seeded(300 + variant);
  const H = 4 + r() * 2.5;
  const cw = 3 + r() * 2;
  const trunks: THREE.BufferGeometry[] = [];
  const main = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, H * 0.5, 0.05), new THREE.Vector3(-0.05, H, 0)]);
  trunks.push(taperedTube(main, 0.28, 0.12, 10, 8));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + r();
    const s = new THREE.Vector3(0, H * (0.55 + r() * 0.25), 0);
    const e = new THREE.Vector3(Math.cos(a) * cw * 0.6, s.y + 1.2 + r(), Math.sin(a) * cw * 0.6);
    const mid = s.clone().lerp(e, 0.5).add(new THREE.Vector3(0, 0.3, 0));
    trunks.push(taperedTube(new THREE.CatmullRomCurve3([s, mid, e]), 0.12, 0.05, 6, 6));
  }
  const cards: THREE.BufferGeometry[] = [];
  const card = crossCard(2.1);
  const cy = H + 1.4;
  const count = 56;
  for (let i = 0; i < count; i++) {
    const u = r() * Math.PI * 2;
    const v = Math.acos(2 * r() - 1);
    const rad = Math.cbrt(r());
    const p = new THREE.Vector3(Math.sin(v) * Math.cos(u) * cw * rad, Math.cos(v) * cw * 0.55 * rad, Math.sin(v) * Math.sin(u) * cw * rad);
    p.y += cy;
    cards.push(place(card, p, new THREE.Euler(r() * 0.8 - 0.4, r() * Math.PI, r() * 0.8 - 0.4), 0.8 + r() * 0.6));
  }
  const core = blobGeo(cw * 0.6, 2, variant + 3, 0.3, 0.6);
  core.translate(0, cy, 0);
  const parts: TreeParts = { trunk: mergeGeometries(trunks)!, leaves: mergeGeometries(cards)!, core };
  CACHE.set(k, parts);
  return parts;
}

/** Banana / heliconia clump with broad drooping leaves. */
export function bananaGeo(variant: number): TreeParts {
  const k = `banana${variant}`;
  const hit = CACHE.get(k);
  if (hit) return hit;
  const r = seeded(500 + variant);
  const stems: THREE.BufferGeometry[] = [];
  const leaves: THREE.BufferGeometry[] = [];
  for (let s = 0; s < 3; s++) {
    const ox = (r() - 0.5) * 0.8;
    const oz = (r() - 0.5) * 0.8;
    const h = 2 + r() * 1.2;
    const c = new THREE.LineCurve3(new THREE.Vector3(ox, 0, oz), new THREE.Vector3(ox, h, oz));
    stems.push(taperedTube(c, 0.11, 0.07, 3, 7));
    for (let i = 0; i < 6; i++) {
      const f = frondGeo(1.8 + r() * 0.5, 0.5, 0.9, 1.6, 0.05, 8);
      f.rotateZ(0.2 + r() * 0.6);
      f.rotateY((i / 6) * Math.PI * 2 + r());
      f.translate(ox, h, oz);
      leaves.push(f);
    }
  }
  const parts = { trunk: mergeGeometries(stems)!, leaves: mergeGeometries(leaves)! };
  CACHE.set(k, parts);
  return parts;
}

/** Car body via an extruded side profile. Length along X, centred. */
export function carGeo(type: 'sedan' | 'suv') {
  const k = `car-${type}`;
  const hit = CACHE.get(k);
  if (hit) return hit;
  const L = type === 'suv' ? 4.6 : 4.5;
  const body = new THREE.Shape();
  const hb = type === 'suv' ? 0.95 : 0.78;
  body.moveTo(-L / 2, 0.3);
  body.lineTo(-L / 2, hb - 0.1);
  body.quadraticCurveTo(-L / 2 + 0.05, hb, -L / 2 + 0.4, hb);
  body.lineTo(L / 2 - 0.25, hb - 0.05);
  body.quadraticCurveTo(L / 2, hb - 0.12, L / 2, hb - 0.3);
  body.lineTo(L / 2, 0.3);
  body.lineTo(-L / 2, 0.3);
  const cab = new THREE.Shape();
  const hc = type === 'suv' ? 1.72 : 1.42;
  if (type === 'suv') {
    cab.moveTo(-L / 2 + 0.25, hb - 0.02);
    cab.lineTo(-L / 2 + 0.35, hc);
    cab.lineTo(L / 2 - 1.5, hc);
    cab.lineTo(L / 2 - 0.85, hb - 0.02);
  } else {
    cab.moveTo(-L / 2 + 0.55, hb - 0.02);
    cab.quadraticCurveTo(-L / 2 + 0.9, hc, -L / 2 + 1.6, hc);
    cab.lineTo(L / 2 - 1.75, hc);
    cab.quadraticCurveTo(L / 2 - 1.3, hc - 0.05, L / 2 - 1.0, hb - 0.02);
  }
  const ex = (s: THREE.Shape, w: number) => {
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 8 });
    g.translate(0, 0, -w / 2);
    return g;
  };
  const parts = { trunk: ex(body, 1.68), leaves: ex(cab, 1.52) };
  CACHE.set(k, parts);
  return parts;
}

/** Terrain-like gentle mound used for planting beds. */
export function moundGeo(w: number, d: number, h: number) {
  const g = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(w / 2, h, d / 2);
  return g;
}
