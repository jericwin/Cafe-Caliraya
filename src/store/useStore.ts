import { create } from 'zustand';
import { dayOfYear, timeForElevation, type Weather } from '../lib/sun';

export type CameraMode = 'orbit' | 'walk' | 'top';
export type Projection = 'perspective' | 'orthographic';
export type FloorMode = 'all' | 'ground' | 'upper' | 'roof';
export type RenderMode = 'photo' | 'cinematic' | 'architectural' | 'clay' | 'blueprint' | 'wireframe';
export type Quality = 'low' | 'medium' | 'high';
export type CutMode = 'none' | 'section-ns' | 'section-ew' | 'horizontal';
export type PlanView = 'none' | 'ground' | 'upper' | 'site';
export type ShadowQuality = 'low' | 'medium' | 'high';

export type LayerKey =
  | 'groundFloor'
  | 'secondFloor'
  | 'roof'
  | 'furniture'
  | 'kitchen'
  | 'fixtures'
  | 'lighting'
  | 'landscape'
  | 'parking'
  | 'vehicles'
  | 'terrain';

export const LAYER_LABELS: Record<LayerKey, string> = {
  groundFloor: 'Ground Floor',
  secondFloor: 'Second Floor',
  roof: 'Roof',
  furniture: 'Furniture',
  kitchen: 'Kitchen Equipment',
  fixtures: 'CR & Plumbing Fixtures',
  lighting: 'Light Fixtures',
  landscape: 'Landscaping',
  parking: 'Parking Area',
  vehicles: 'Vehicles',
  terrain: 'Lake & Terrain',
};

export interface Measurement {
  id: number;
  a: [number, number, number];
  b: [number, number, number];
}

export interface ViewRequest {
  pos: [number, number, number];
  target: [number, number, number];
  nonce: number;
  duration?: number;
  frame?: number; // orthographic: metres to fit vertically
}

const DEFAULT_DOY = dayOfYear(9, 25); // 25 October — dry-season onset, clear sunsets
const isMobile = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768);

export function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  } catch {
    return '';
  }
}

/** Picks a starting quality tier from the device class and GPU (adjusted at runtime by the performance monitor). */
export function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'medium';
  if (isMobile) return 'low';
  const gpu = gpuName().toLowerCase();
  const discrete = /nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|apple m[1-9] (pro|max|ultra)/.test(gpu);
  const weak = /intel|uhd|hd graphics|iris|mali|adreno|powervr|swiftshader|llvmpipe|basic render/.test(gpu);
  if (discrete && (navigator.hardwareConcurrency ?? 4) >= 6) return 'high';
  if (weak) return 'medium';
  return 'medium';
}

interface State {
  // environment
  time: number;
  doy: number;
  animate: boolean;
  timeSpeed: number; // simulated hours per real second
  sunMul: number;
  weather: Weather;
  shadows: boolean;
  shadowQuality: ShadowQuality;
  // rendering
  renderMode: RenderMode;
  quality: Quality;
  autoQuality: boolean;
  bloom: boolean;
  ao: boolean;
  // camera
  cameraMode: CameraMode;
  projection: Projection;
  fov: number;
  walkSpeed: number;
  viewRequest: ViewRequest | null;
  walkRequest: { pos: [number, number, number]; yaw: number; level: 0 | 1; nonce: number } | null;
  autoRotate: boolean;
  // building
  floorMode: FloorMode;
  layers: Record<LayerKey, boolean>;
  exploded: boolean;
  xray: boolean;
  cut: CutMode;
  cutPos: number;
  // inspection
  planView: PlanView;
  showLabels: boolean;
  showDims: boolean;
  showGrid: boolean;
  showAxes: boolean;
  measuring: boolean;
  measurements: Measurement[];
  snap: boolean;
  // ui
  leftOpen: boolean;
  rightOpen: boolean;
  drawer: null | 'scene' | 'env' | 'views';
  ready: boolean;
  warm: boolean; // shaders precompiled -> render loop may start
  showHelp: boolean;
  toast: string | null;
  isMobile: boolean;
  set: (p: Partial<State>) => void;
  setLayer: (k: LayerKey, v: boolean) => void;
  requestView: (pos: [number, number, number], target: [number, number, number], duration?: number, frame?: number) => void;
  addMeasurement: (a: Measurement['a'], b: Measurement['b']) => void;
  notify: (msg: string) => void;
}

let toastTimer: number | undefined;

export const useStore = create<State>((set, get) => ({
  time: timeForElevation(2.2, DEFAULT_DOY),
  doy: DEFAULT_DOY,
  animate: false,
  timeSpeed: 0.2,
  sunMul: 1,
  weather: 'clear',
  shadows: true,
  shadowQuality: (() => {
    const q = detectQuality();
    return q === 'high' ? 'high' : q === 'medium' ? 'medium' : 'low';
  })(),
  renderMode: 'cinematic',
  quality: detectQuality(),
  autoQuality: true,
  bloom: true,
  ao: !isMobile,
  cameraMode: 'orbit',
  projection: 'perspective',
  fov: 42,
  walkSpeed: 1.6,
  viewRequest: null,
  walkRequest: null,
  autoRotate: false,
  floorMode: 'all',
  layers: {
    groundFloor: true,
    secondFloor: true,
    roof: true,
    furniture: true,
    kitchen: true,
    fixtures: true,
    lighting: true,
    landscape: true,
    parking: true,
    vehicles: true,
    terrain: true,
  },
  exploded: false,
  xray: false,
  cut: 'none',
  cutPos: 0,
  planView: 'none',
  showLabels: false,
  showDims: false,
  showGrid: false,
  showAxes: false,
  measuring: false,
  measurements: [],
  snap: true,
  leftOpen: !isMobile && typeof window !== 'undefined' && window.innerWidth >= 1280,
  rightOpen: !isMobile && typeof window !== 'undefined' && window.innerWidth >= 1280,
  drawer: null,
  ready: false,
  warm: false,
  showHelp: false,
  toast: null,
  isMobile,
  set: (p) => set(p),
  setLayer: (k, v) => set({ layers: { ...get().layers, [k]: v } }),
  requestView: (pos, target, duration, frame) => set({ viewRequest: { pos, target, duration, frame, nonce: Math.random() } }),
  addMeasurement: (a, b) => set({ measurements: [...get().measurements, { id: Date.now() + Math.random(), a, b }] }),
  notify: (msg) => {
    window.clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = window.setTimeout(() => set({ toast: null }), 2600);
  },
}));

/** Derived visibility of each building level after floor isolation + layer toggles. */
export function useLevelVisibility() {
  const floorMode = useStore((s) => s.floorMode);
  const layers = useStore((s) => s.layers);
  const planView = useStore((s) => s.planView);
  let ground = layers.groundFloor && (floorMode === 'all' || floorMode === 'ground');
  let upper = layers.secondFloor && (floorMode === 'all' || floorMode === 'upper');
  let roof = layers.roof && (floorMode === 'all' || floorMode === 'roof');
  if (planView === 'ground') {
    ground = layers.groundFloor;
    upper = false;
    roof = false;
  } else if (planView === 'upper') {
    ground = false;
    upper = layers.secondFloor;
    roof = false;
  } else if (planView === 'site') {
    ground = layers.groundFloor;
    upper = layers.secondFloor;
    roof = layers.roof;
  }
  return { ground, upper, roof, layers };
}
