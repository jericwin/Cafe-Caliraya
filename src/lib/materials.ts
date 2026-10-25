import * as THREE from 'three';
import { createContext, useContext } from 'react';
import { getExtraTextures, getTextures, type TexKey } from './textures';
import type { RenderMode } from '../store/useStore';

interface MatDef {
  color: string;
  rough: number;
  metal?: number;
  tex?: TexKey;
  tile?: number; // metres per texture repeat
  normalScale?: number;
  kind?: 'glass' | 'emissive' | 'alpha' | 'basic';
  emissive?: string;
  opacity?: number;
  side?: THREE.Side;
  shell?: boolean; // architectural envelope — fades in X-ray mode
  envBoost?: number;
}

export const MAT_DEFS = {
  // ---------- architecture
  slab: { color: '#bdb8b0', rough: 0.85, tex: 'concrete', tile: 3, shell: true },
  plaster: { color: '#f3efe7', rough: 0.92, tex: 'plaster', tile: 4, normalScale: 0.3, shell: true },
  plasterWarm: { color: '#f1e8da', rough: 0.9, tex: 'plaster', tile: 4, normalScale: 0.25, shell: true },
  stone: { color: '#ffffff', rough: 0.88, tex: 'stone', tile: 2, normalScale: 1, shell: true },
  woodClad: { color: '#ffffff', rough: 0.7, tex: 'battens', tile: 1, normalScale: 1, shell: true },
  roofMetal: { color: '#5a5f63', rough: 0.42, metal: 0.65, tex: 'seam', tile: 1, normalScale: 1, shell: true, side: THREE.DoubleSide },
  soffit: { color: '#e8c9a4', rough: 0.7, tex: 'soffit', tile: 1, shell: true },
  ceiling: { color: '#f3efe8', rough: 0.95, shell: true },
  floorConcrete: { color: '#f4ece2', rough: 0.42, tex: 'polished', tile: 3, normalScale: 0.4 },
  floorWood: { color: '#ffffff', rough: 0.45, tex: 'floorPlank', tile: 2, normalScale: 0.6 },
  floorTile: { color: '#ffffff', rough: 0.35, tex: 'floorTile', tile: 1.2, normalScale: 0.6 },
  tileWall: { color: '#ffffff', rough: 0.18, tex: 'subway', tile: 1, normalScale: 0.6, shell: true },
  glass: { color: '#0d1a1d', rough: 0.03, kind: 'glass', opacity: 0.26, envBoost: 1.6 },
  glassFrosted: { color: '#dfe6e6', rough: 0.4, kind: 'glass', opacity: 0.75 },
  capiz: { color: '#ffffff', rough: 0.4, tex: 'capiz', tile: 0.93, kind: 'emissive', emissive: '#ffe1b0' },
  frame: { color: '#2a2622', rough: 0.38, metal: 0.75 },
  deck: { color: '#ffffff', rough: 0.72, tex: 'deck', tile: 2, normalScale: 0.9 },
  stairWood: { color: '#ffffff', rough: 0.45, tex: 'oak', tile: 1.2 },
  // ---------- furniture & finishes
  oak: { color: '#ffffff', rough: 0.5, tex: 'oak', tile: 1 },
  walnut: { color: '#ffffff', rough: 0.45, tex: 'walnut', tile: 1 },
  rattan: { color: '#ffffff', rough: 0.75, tex: 'rattan', tile: 0.18, normalScale: 1 },
  fabricSand: { color: '#ffffff', rough: 0.95, tex: 'fabricSand', tile: 0.3 },
  fabricOlive: { color: '#ffffff', rough: 0.95, tex: 'fabricOlive', tile: 0.3 },
  fabricRust: { color: '#ffffff', rough: 0.95, tex: 'fabricRust', tile: 0.3 },
  cushion: { color: '#e9e1d2', rough: 0.95, tex: 'fabricSand', tile: 0.3 },
  leather: { color: '#ffffff', rough: 0.55, tex: 'leather', tile: 0.6 },
  rug: { color: '#c7b597', rough: 1, tex: 'burlap', tile: 0.4 },
  blackSteel: { color: '#1b1b1c', rough: 0.45, metal: 0.7 },
  brass: { color: '#b48a4a', rough: 0.3, metal: 1 },
  stainless: { color: '#cdd0d4', rough: 0.3, metal: 1 },
  chrome: { color: '#e8e8e8', rough: 0.08, metal: 1 },
  ceramic: { color: '#f5f4f0', rough: 0.12 },
  mirror: { color: '#ffffff', rough: 0.02, metal: 1, envBoost: 1.4 },
  applianceBlack: { color: '#141516', rough: 0.25, metal: 0.4 },
  appliance: { color: '#eceae5', rough: 0.35, metal: 0.1 },
  displayGlass: { color: '#c9dbe0', rough: 0.05, kind: 'glass', opacity: 0.2, envBoost: 1.4 },
  burlap: { color: '#ffffff', rough: 1, tex: 'burlap', tile: 0.3 },
  cardboard: { color: '#b08a5c', rough: 0.95 },
  plasticWhite: { color: '#f0f0ee', rough: 0.4 },
  plasticBlack: { color: '#222222', rough: 0.5 },
  rubber: { color: '#171717', rough: 0.9 },
  terrazzo: { color: '#ffffff', rough: 0.25, tex: 'terrazzo', tile: 0.6 },
  bookA: { color: '#7a3b2e', rough: 0.8 },
  bookB: { color: '#2f4f5a', rough: 0.8 },
  bookC: { color: '#c9a96e', rough: 0.8 },
  coffee: { color: '#2b1a10', rough: 0.4 },
  screen: { color: '#0b0c0e', rough: 0.15, metal: 0.2 },
  menu: { color: '#ffffff', rough: 0.85, kind: 'basic' },
  sign: { color: '#ffffff', rough: 0.6, kind: 'emissive', emissive: '#ffd7a0' },
  // ---------- lighting
  bulb: { color: '#fff3dc', rough: 0.3, kind: 'emissive', emissive: '#ffcf8a' },
  lampShade: { color: '#ffffff', rough: 0.8, tex: 'rattan', tile: 0.16, kind: 'emissive', emissive: '#ff9a4a' },
  lampLinen: { color: '#efe4cf', rough: 0.9, kind: 'emissive', emissive: '#ffc27a' },
  // ---------- plants
  leaf: { color: '#ffffff', rough: 0.65, tex: 'leaves', kind: 'alpha', side: THREE.DoubleSide },
  leafDark: { color: '#ffffff', rough: 0.7, tex: 'leavesDark', kind: 'alpha', side: THREE.DoubleSide },
  frond: { color: '#ffffff', rough: 0.6, tex: 'frond', kind: 'alpha', side: THREE.DoubleSide },
  foliage: { color: '#4f8a33', rough: 0.7 },
  foliageDark: { color: '#3a6a28', rough: 0.75 },
  bark: { color: '#ffffff', rough: 0.95, tex: 'bark', tile: 1 },
  palmBark: { color: '#ffffff', rough: 0.95, tex: 'palmBark', tile: 0.8 },
  flowerPink: { color: '#d63a86', rough: 0.6 },
  flowerYellow: { color: '#f0c13c', rough: 0.6 },
  soil: { color: '#3b2b1e', rough: 1 },
  potTerracotta: { color: '#a85b38', rough: 0.85 },
  potConcrete: { color: '#9d9890', rough: 0.85, tex: 'concrete', tile: 1 },
  // ---------- site
  lawn: { color: '#ffffff', rough: 0.95, tex: 'grass', tile: 3 },
  asphalt: { color: '#ffffff', rough: 0.88, tex: 'asphalt', tile: 4, normalScale: 0.8 },
  paintWhite: { color: '#e9e7e0', rough: 0.7 },
  paintYellow: { color: '#e2b42c', rough: 0.7 },
  paintBlue: { color: '#2161b0', rough: 0.7 },
  curb: { color: '#c2bdb3', rough: 0.85, tex: 'concrete', tile: 2 },
  paving: { color: '#ffffff', rough: 0.8, tex: 'paving', tile: 1.2, normalScale: 0.8 },
  gravel: { color: '#ffffff', rough: 1, tex: 'gravel', tile: 1.2 },
  steppingStone: { color: '#a59d90', rough: 0.9, tex: 'concrete', tile: 1 },
  grate: { color: '#3a3c3e', rough: 0.6, metal: 0.8 },
  // ---------- vehicles
  carRed: { color: '#8e1a1a', rough: 0.22, metal: 0.6 },
  carWhite: { color: '#e9e9e6', rough: 0.25, metal: 0.4 },
  carGrey: { color: '#5c6166', rough: 0.25, metal: 0.7 },
  carBlue: { color: '#1f3b63', rough: 0.25, metal: 0.6 },
  carGlass: { color: '#0b0f12', rough: 0.05, metal: 0.3, envBoost: 1.3 },
  headlight: { color: '#f5f5f0', rough: 0.1, kind: 'emissive', emissive: '#fff6dc' },
  umbrella: { color: '#ffffff', rough: 0.9, tex: 'umbrella', tile: 1, side: THREE.DoubleSide },
} satisfies Record<string, MatDef>;

export type MatKey = keyof typeof MAT_DEFS;
export type MatSet = Record<MatKey, THREE.Material>;

/** Materials whose emissive intensity follows the "lights on" factor. */
export const EMISSIVE_KEYS: MatKey[] = ['bulb', 'lampShade', 'lampLinen', 'capiz', 'sign', 'headlight'];

// 1x1 neutral textures: untextured materials still bind a map + normal map so that (almost) every
// opaque material shares ONE shader program — far fewer driver compiles at start-up.
let NEUTRAL: { map: THREE.Texture; normal: THREE.Texture } | null = null;
export function neutral() {
  if (NEUTRAL) return NEUTRAL;
  const map = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  const normal = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
  normal.needsUpdate = true;
  NEUTRAL = { map, normal };
  return NEUTRAL;
}

function applyTex(m: THREE.MeshStandardMaterial, d: MatDef) {
  if (!d.tex) {
    m.map = neutral().map;
    m.normalMap = neutral().normal;
    return;
  }
  const t = getTextures()[d.tex];
  const rep = 1 / (d.tile ?? 1);
  const clone = (x: THREE.Texture) => {
    if (d.tex === 'frond' || d.tex === 'leaves' || d.tex === 'leavesDark') return x;
    const c = x.clone();
    c.repeat.set(rep, rep);
    c.needsUpdate = true;
    return c;
  };
  m.map = clone(t.map);
  if (t.normalMap) {
    m.normalMap = clone(t.normalMap);
    const s = d.normalScale ?? 0.6;
    m.normalScale.set(s, s);
  } else if (d.kind !== 'alpha') m.normalMap = neutral().normal;
}

function realMaterial(key: MatKey): THREE.Material {
  const d = MAT_DEFS[key] as MatDef;
  if (d.kind === 'glass') {
    const g = new THREE.MeshPhysicalMaterial({
      color: d.color,
      roughness: d.rough,
      metalness: 0,
      transparent: true,
      opacity: d.opacity ?? 0.25,
      envMapIntensity: d.envBoost ?? 1,
      side: THREE.DoubleSide,
      depthWrite: false,
      specularIntensity: 1,
      ior: 1.52,
    });
    // reflections are not attenuated by opacity (physically closer to real glazing)
    g.blending = THREE.CustomBlending;
    g.blendSrc = THREE.OneFactor;
    g.blendDst = THREE.OneMinusSrcAlphaFactor;
    g.userData.glass = true;
    return g;
  }
  if (d.kind === 'basic') {
    const m = new THREE.MeshBasicMaterial({ map: getExtraTextures().menu, toneMapped: true });
    m.color.set('#cfc7b8');
    return m;
  }
  const m = new THREE.MeshStandardMaterial({
    color: d.color,
    roughness: d.rough,
    metalness: d.metal ?? 0,
    side: d.side ?? THREE.FrontSide,
    envMapIntensity: d.envBoost ?? 1,
  });
  applyTex(m, d);
  if (d.kind === 'alpha') {
    m.alphaTest = 0.45;
    m.transparent = false;
  }
  if (d.kind === 'emissive') {
    m.emissive.set(d.emissive ?? '#ffffff');
    m.emissiveIntensity = 0;
    if (key === 'sign') {
      m.map = getExtraTextures().sign;
      m.emissiveMap = m.map;
      m.transparent = true;
      m.alphaTest = 0.2;
    }
    if (key === 'capiz' && m.map) m.emissiveMap = m.map;
  }
  m.userData.key = key;
  return m;
}

function derived(key: MatKey, mode: RenderMode): THREE.Material {
  const d = MAT_DEFS[key] as MatDef;
  const alphaMap = d.kind === 'alpha' && d.tex ? getTextures()[d.tex].map : null;
  const isGlass = d.kind === 'glass';
  if (mode === 'clay') {
    if (isGlass) return new THREE.MeshStandardMaterial({ color: '#dfe7ea', roughness: 0.2, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
    const tone = key === 'lawn' || key === 'asphalt' ? '#d9d5cc' : key.startsWith('leaf') || key === 'frond' || key.startsWith('foliage') ? '#e6e2da' : '#ece8e0';
    const m = new THREE.MeshStandardMaterial({ color: tone, roughness: 0.88, metalness: 0, side: d.side ?? THREE.FrontSide });
    if (alphaMap) {
      m.alphaMap = alphaMap;
      m.alphaTest = 0.2;
    }
    return m;
  }
  if (mode === 'blueprint') {
    const mc = getExtraTextures().matcap;
    if (isGlass) return new THREE.MeshMatcapMaterial({ matcap: mc, color: '#9cc4ff', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.MeshMatcapMaterial({ matcap: mc, color: d.shell ? '#6f9de0' : '#89b4f0', side: d.side ?? THREE.FrontSide });
    if (alphaMap) {
      m.alphaMap = alphaMap;
      m.alphaTest = 0.2;
    }
    return m;
  }
  // wireframe
  const base = new THREE.Color(d.color === '#ffffff' ? '#bfc6cf' : d.color).lerp(new THREE.Color('#9fd0ff'), 0.45);
  return new THREE.MeshBasicMaterial({ color: base, wireframe: true, transparent: true, opacity: isGlass ? 0.25 : 0.75, depthWrite: !isGlass });
}

const CACHE = new Map<string, MatSet>();

export function getMaterialSet(mode: RenderMode, xray: boolean): MatSet {
  const family = mode === 'clay' || mode === 'blueprint' || mode === 'wireframe' ? mode : 'real';
  const id = `${family}|${xray}`;
  const hit = CACHE.get(id);
  if (hit) return hit;
  const set = {} as MatSet;
  for (const key of Object.keys(MAT_DEFS) as MatKey[]) {
    let m = family === 'real' ? realMaterial(key) : derived(key, mode);
    const d = MAT_DEFS[key] as MatDef;
    if (xray && d.shell) {
      m = m.clone();
      m.transparent = true;
      m.opacity = family === 'wireframe' ? 0.12 : 0.13;
      m.depthWrite = false;
      (m as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    }
    set[key] = m;
  }
  CACHE.set(id, set);
  return set;
}

export const MaterialContext = createContext<MatSet | null>(null);

export function useMats(): MatSet {
  const m = useContext(MaterialContext);
  if (!m) throw new Error('MaterialContext missing');
  return m;
}
