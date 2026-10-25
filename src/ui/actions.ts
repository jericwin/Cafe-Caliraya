import { useStore, type CameraMode, type PlanView } from '../store/useStore';
import { VIEWPOINTS, WALK_STARTS, defaultViewFor, type Viewpoint } from '../config/viewpoints';
import { solarPosition, timeForElevation, TIME_PRESETS } from '../lib/sun';
import { capture } from '../scene/Scene';

const S = () => useStore.getState();

function leavePlan() {
  if (S().planView !== 'none') openPlan('none');
}

export function goToView(v: Viewpoint) {
  leavePlan();
  const s = S();
  s.set({ cameraMode: 'orbit', planView: 'none', fov: v.fov ?? s.fov });
  s.requestView(v.pos, v.target, 1.8);
}

export function resetView() {
  leavePlan();
  const s = S();
  s.set({ cameraMode: 'orbit', planView: 'none', projection: 'perspective', exploded: false, cut: 'none', floorMode: 'all' });
  const v = defaultViewFor(window.innerWidth / window.innerHeight);
  s.requestView(v.pos, v.target, 1.6);
  s.notify('View reset');
}

let sunsetStep = 0;
const SUNSET_VIEWS = ['cinematic', 'balcony-sunset', 'deck-sunset', 'jetty', 'lake-aerial'];

/** Sunset Mode: sunset light, clear sky, cinematic preset, camera towards the setting sun. Repeated presses cycle viewpoints. */
export function sunsetMode() {
  const s = S();
  const already = Math.abs(s.time - timeForElevation(2.2, s.doy)) < 0.05 && s.renderMode === 'cinematic' && s.weather === 'clear';
  if (!already) sunsetStep = 0;
  const id = SUNSET_VIEWS[sunsetStep % SUNSET_VIEWS.length];
  sunsetStep++;
  const v0 = VIEWPOINTS.find((x) => x.id === id)!;
  const v = id === 'cinematic' ? { ...v0, ...defaultViewFor(window.innerWidth / window.innerHeight), label: v0.label } : v0;
  planRestore = null;
  s.set({
    time: timeForElevation(2.2, s.doy),
    animate: false,
    weather: 'clear',
    renderMode: 'cinematic',
    cameraMode: 'orbit',
    planView: 'none',
    projection: 'perspective',
    floorMode: 'all',
    exploded: false,
    cut: 'none',
    xray: false,
    fov: 42,
  });
  s.requestView(v.pos, v.target, 2.2);
  s.notify(`Sunset Mode · ${v.label}`);
}

export function setTimePreset(id: string) {
  const s = S();
  const p = TIME_PRESETS.find((t) => t.id === id);
  if (p) s.set({ time: p.time(s.doy), animate: false });
}

export function setCameraMode(m: CameraMode) {
  const s = S();
  if (m !== 'top') leavePlan();
  if (m === 'walk') s.set({ cameraMode: 'walk', planView: 'none', measuring: false, exploded: false });
  else if (m === 'top') s.set({ cameraMode: 'top' });
  else s.set({ cameraMode: 'orbit', planView: 'none' });
}

export function walkTo(id: string) {
  const w = WALK_STARTS.find((x) => x.id === id);
  if (!w) return;
  leavePlan();
  S().set({
    cameraMode: 'walk',
    planView: 'none',
    measuring: false,
    exploded: false,
    walkRequest: { pos: [w.pos[0], 0, w.pos[1]], yaw: w.yaw, level: w.level, nonce: performance.now() },
  });
}

/** Plans are drawn in clear midday light; the previous time/style are restored when leaving the plan. */
let planRestore: { time: number; renderMode: ReturnType<typeof S>['renderMode'] } | null = null;

export function openPlan(view: PlanView) {
  const s = S();
  if (view === 'none') {
    s.set({ planView: 'none', cameraMode: 'orbit', ...(planRestore ?? {}) });
    planRestore = null;
    return;
  }
  if (!planRestore) {
    const elev = (solarPosition(s.time, s.doy).elevation * 180) / Math.PI;
    const dark = elev < 14;
    const cinematic = s.renderMode === 'cinematic';
    if (dark || cinematic) {
      planRestore = { time: s.time, renderMode: s.renderMode };
      s.set({ time: dark ? 11.5 : s.time, renderMode: cinematic ? 'architectural' : s.renderMode, animate: false });
      if (dark) s.notify('Plan view uses midday light for clarity — your time setting returns when you exit');
    }
  }
  s.set({ planView: view, cameraMode: 'top', exploded: false, cut: 'none' });
  const site = view === 'site';
  const t: [number, number, number] = site ? [8, 0, 0] : [-1.5, 0, 0];
  s.requestView([t[0], 160, t[2] + 0.01], t, 1.4, site ? 105 : 32);
}

export function takeScreenshot() {
  const url = capture.fn?.();
  if (!url) {
    S().notify('Screenshot unavailable');
    return;
  }
  const a = document.createElement('a');
  const d = new Date();
  a.download = `caliraya-coffee-house-${d.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
  a.href = url;
  a.click();
  S().notify('Screenshot saved');
}

export function toggleFullscreen() {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  const doc = document as Document & { webkitExitFullscreen?: () => void; webkitFullscreenElement?: Element };
  if (document.fullscreenElement || doc.webkitFullscreenElement) {
    (document.exitFullscreen ?? doc.webkitExitFullscreen)?.call(document);
  } else {
    const req = el.requestFullscreen ?? el.webkitRequestFullscreen;
    if (!req) S().notify('Fullscreen is not supported on this device');
    else Promise.resolve(req.call(el)).catch(() => S().notify('Fullscreen was blocked by the browser'));
  }
}
