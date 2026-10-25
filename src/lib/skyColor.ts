import * as THREE from 'three';

/**
 * CPU port of the Preetham sky shader used by three/examples Sky.js.
 * Used to derive a fog colour that matches the rendered horizon, so distant hills melt into the sky.
 */
const E = 2.718281828459045;
const EE = 1000;
const CUTOFF = 1.6110731556870734;
const STEEP = 1.5;
const TOTAL_R = [5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5];
const MIE_CONST = [1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14];

export interface SkyParams {
  turbidity: number;
  rayleigh: number;
  mie: number;
  mieG: number;
  gain?: number;
  sat?: number;
  belt?: THREE.Color;
  warm?: THREE.Color;
}

export function skyRadiance(dir: THREE.Vector3, sun: THREE.Vector3, p: SkyParams, out = new THREE.Color()) {
  const zc = THREE.MathUtils.clamp(sun.y, -1, 1);
  const sunE = EE * Math.max(0, 1 - Math.pow(E, -((CUTOFF - Math.acos(zc)) / STEEP)));
  const betaR = TOTAL_R.map((v) => v * p.rayleigh);
  const c = 0.2 * p.turbidity * 10e-18;
  const betaM = MIE_CONST.map((v) => 0.434 * c * v * p.mie);
  const zen = Math.acos(Math.max(0, dir.y));
  const inv = 1 / (Math.cos(zen) + 0.15 * Math.pow(93.885 - (zen * 180) / Math.PI, -1.253));
  const sR = 8.4e3 * inv;
  const sM = 1.25e3 * inv;
  const cosT = dir.dot(sun);
  const rPhase = 0.05968310365946075 * (1 + Math.pow(cosT * 0.5 + 0.5, 2));
  const g2 = p.mieG * p.mieG;
  const mPhase = 0.07957747154594767 * ((1 - g2) / Math.pow(1 - 2 * p.mieG * cosT + g2, 1.5));
  const res = [0, 0, 0];
  const horizonMix = THREE.MathUtils.clamp(Math.pow(1 - sun.y, 5), 0, 1);
  for (let i = 0; i < 3; i++) {
    const fex = Math.exp(-(betaR[i] * sR + betaM[i] * sM));
    const ratio = (betaR[i] * rPhase + betaM[i] * mPhase) / (betaR[i] + betaM[i]);
    let lin = Math.pow(sunE * ratio * (1 - fex), 1.5);
    lin *= 1 + (Math.pow(sunE * ratio * fex, 0.5) - 1) * horizonMix;
    const L0 = 0.1 * fex;
    const tex = (lin + L0) * 0.04 + [0, 0.0003, 0.00075][i];
    res[i] = Math.pow(tex, 1 / 2.4);
  }
  // same grade as the patched sky shader
  const lum = 0.2126 * res[0] + 0.7152 * res[1] + 0.0722 * res[2];
  const sat = p.sat ?? 1;
  for (let i = 0; i < 3; i++) res[i] = Math.max(0, lum + (res[i] - lum) * sat);
  const away = 1 - (cosT * 0.5 + 0.5);
  const low = Math.pow(1 - THREE.MathUtils.clamp(dir.y, 0, 1), 6);
  const toward = Math.pow(Math.max(cosT, 0), 3) * low;
  if (p.belt) {
    const k = Math.pow(away, 1.5) * low;
    res[0] += p.belt.r * k;
    res[1] += p.belt.g * k;
    res[2] += p.belt.b * k;
  }
  if (p.warm) {
    res[0] += p.warm.r * toward;
    res[1] += p.warm.g * toward;
    res[2] += p.warm.b * toward;
  }
  const g = p.gain ?? 1;
  return out.setRGB(res[0] * g, res[1] * g, res[2] * g);
}

const tmpDir = new THREE.Vector3();
const tmpC = new THREE.Color();

/** Average radiance of a ring of directions just above the horizon. */
export function horizonColor(sun: THREE.Vector3, p: SkyParams, elevation = 0.03, samples = 12) {
  const acc = new THREE.Color(0, 0, 0);
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    tmpDir.set(Math.cos(a), elevation, Math.sin(a)).normalize();
    skyRadiance(tmpDir, sun, p, tmpC);
    acc.r += tmpC.r;
    acc.g += tmpC.g;
    acc.b += tmpC.b;
  }
  return acc.multiplyScalar(1 / samples);
}
