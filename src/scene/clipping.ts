import * as THREE from 'three';
import { FFL0, FFL1 } from '../config/layout';
import { useStore, type CutMode, type PlanView } from '../store/useStore';

/** Bounds of the region that a cut may remove (the building and its eaves — never the wider site). */
const BOX = { x0: -14.5, x1: 10, z0: -8, z1: 8, y0: 0.3, y1: 30 };

export interface CutState {
  cut: CutMode;
  cutPos: number;
  planView: PlanView;
}

/** Axis-aligned "removed" box, or null. Used with clipIntersection = true. */
export function cutBox(s: CutState) {
  if (s.planView === 'ground') return { ...BOX, y0: FFL0 + 1.35 };
  if (s.planView === 'upper') return { ...BOX, y0: FFL1 + 1.35 };
  switch (s.cut) {
    case 'section-ns':
      return { ...BOX, z0: s.cutPos };
    case 'section-ew':
      return { ...BOX, x1: s.cutPos };
    case 'horizontal':
      return { ...BOX, y0: s.cutPos };
    default:
      return null;
  }
}

export function planesFor(s: CutState): THREE.Plane[] {
  const b = cutBox(s);
  if (!b) return [];
  // a point is removed when it is on the negative side of every plane
  return [
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), b.x0),
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -b.x1),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), b.y0),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -b.y1),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), b.z0),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -b.z1),
  ];
}

export function isClipped(p: THREE.Vector3) {
  const s = useStore.getState();
  const b = cutBox(s);
  if (!b) return false;
  return p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1 && p.z > b.z0 && p.z < b.z1;
}

export const CUT_RANGES: Record<Exclude<CutMode, 'none'>, { min: number; max: number; label: string; def: number }> = {
  'section-ns': { min: -6.5, max: 6.5, label: 'Section plane (Z)', def: 0.4 },
  'section-ew': { min: -11, max: 8.5, label: 'Section plane (X)', def: -1.0 },
  horizontal: { min: 0.6, max: 9.5, label: 'Cut height (Y)', def: 1.5 },
};
