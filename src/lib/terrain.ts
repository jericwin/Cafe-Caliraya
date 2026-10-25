import { SHORE_X, WATER_Y, JETTY, JETTY_Y } from '../config/layout';

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm2(x: number, y: number, oct = 4) {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += vnoise(x * f, y * f) * a;
    f *= 2.03;
    a *= 0.5;
  }
  return v / (1 - Math.pow(0.5, oct));
}

const ss = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Near shoreline (site side). The site sits on a gentle promontory into Caliraya Lake. */
export function shoreX(z: number) {
  const az = Math.abs(z);
  return Math.min(SHORE_X + 3 * Math.sin(z * 0.045) + 2 * Math.sin(z * 0.11 + 1.3) + 0.0032 * Math.max(0, az - 70) ** 2, 18);
}
/** Far (western) shore across the lake. */
export function farShoreX(z: number) {
  return -980 + 90 * Math.sin(z * 0.0024 + 0.6) + 45 * Math.sin(z * 0.0071 + 2.0);
}

const SHELF = WATER_Y - 0.45;

/** Terrain elevation in metres (lake water surface at WATER_Y). */
export function terrainHeight(x: number, z: number) {
  const sx = shoreX(z);
  const s = x - sx;
  if (s >= 0) {
    const lawn = SHELF + (0 - SHELF) * ss(0, 14, s);
    const d = Math.hypot((x - 10) * 0.9, z);
    const hillMask = ss(65, 260, d);
    const hills = (fbm2(x * 0.005 + 3.1, z * 0.005 - 1.7) - 0.35) * 70 + fbm2(x * 0.03, z * 0.03) * 5;
    const undulate = (fbm2(x * 0.04, z * 0.04) - 0.5) * 1.6 * ss(48, 85, d);
    const siteFlat = 1 - ss(40, 60, Math.max(Math.abs(x - 12) - 26, Math.abs(z) - 20, 0) + 40);
    let h = lawn + Math.max(0, hills) * hillMask + undulate;
    h = h * (1 - siteFlat) + (lawn < -0.02 ? lawn : -0.02) * siteFlat;
    return h;
  }
  const fx = farShoreX(z);
  if (x > fx) {
    const depth = Math.min(-s, x - fx);
    return SHELF - Math.min(depth * 0.12, 7.5);
  }
  const s2 = fx - x;
  const lawn = SHELF + 2.4 * ss(0, 30, s2);
  const hills = (fbm2(x * 0.004 - 5.3, z * 0.004 + 2.2) * 1.0 - 0.25) * 70 * ss(20, 380, s2);
  return lawn + Math.max(0, hills);
}

/** Walkable surface height used by the first-person controller. */
export function groundHeightAt(x: number, z: number) {
  if (x > JETTY.x0 && x < JETTY.x1 && z > JETTY.z0 && z < JETTY.z1) return Math.max(JETTY_Y + 0.1, terrainHeight(x, z));
  return Math.max(terrainHeight(x, z), -0.02);
}

export function isWater(x: number, z: number) {
  if (x > JETTY.x0 && x < JETTY.x1 && z > JETTY.z0 - 0.1 && z < JETTY.z1 + 0.1) return false;
  return terrainHeight(x, z) < WATER_Y - 0.05;
}
