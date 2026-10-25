import type { Atmosphere } from './sun';
/** Tiny pub/sub used to request a shadow-map refresh when static geometry changes. */
type Fn = () => void;
const subs = new Set<Fn>();
export function onSceneChanged() {
  subs.forEach((f) => f());
}
export function subscribeSceneChanged(f: Fn) {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}

/** Shared mutable runtime state that changes every frame (kept out of React). */
export const runtime = {
  atm: null as Atmosphere | null,
  explodeUpper: 0,
  explodeRoof: 0,
  lightsOn: 0,
  night: 0,
  fps: 60,
  calls: 0,
  tris: 0,
  cameraTarget: [0, 2, 0] as [number, number, number],
  walk: { moveX: 0, moveY: 0, lookX: 0, lookY: 0, run: false },
  playerLevel: 0 as 0 | 1,
  heading: 0, // camera yaw (radians, 0 = looking north)
  focusDist: 30,
};
