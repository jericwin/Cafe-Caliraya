import * as THREE from 'three';
import { useMemo } from 'react';
import { BALCONY, DECK, DECK_Y, EAVE, FFL0, FFL1, ROOF, SLAB_BOTTOM, CEIL1, STAIR, STAIR_VOID, ROOMS } from '../../config/layout';
import { B, BB, C, G, Merge } from '../../lib/primitives';
import { hipRoofGeo } from '../../lib/geometry';
import type { MatKey } from '../../lib/materials';
import { buildAllWalls } from './wallGen';
import { Doors } from './Doors';

type V3 = [number, number, number];

const FACADE_SIGN = new THREE.PlaneGeometry(4.2, 1.05);

function Pieces({ level }: { level: 0 | 1 }) {
  const { pieces } = useMemo(() => buildAllWalls(level), [level]);
  return (
    <>
      {pieces.map((p, i) => (
        <BB key={i} min={p.min} max={p.max} m={p.m} cast={p.cast} />
      ))}
    </>
  );
}

export function useDoors(level: 0 | 1) {
  return useMemo(() => buildAllWalls(level).doors, [level]);
}

/** Glass balustrade run between two points at a given floor level. */
export function GlassRail({ a, b, y, h = 1.05 }: { a: [number, number]; b: [number, number]; y: number; h?: number }) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(-dz, dx);
  const cx = (a[0] + b[0]) / 2;
  const cz = (a[1] + b[1]) / 2;
  return (
    <group position={[cx, y, cz]} rotation={[0, ang, 0]}>
      <B s={[len, 0.1, 0.08]} p={[0, 0.05, 0]} m="frame" />
      <B s={[len, h - 0.12, 0.015]} p={[0, 0.1 + (h - 0.12) / 2, 0]} m="glass" cast={false} />
      <C rt={0.025} h={len} r={[0, 0, Math.PI / 2]} p={[0, h, 0]} m="stainless" />
    </group>
  );
}

function Stair() {
  const treads = [];
  const { x0, z0, z1, risers, rise, going } = STAIR;
  for (let i = 0; i < risers - 1; i++) {
    const top = FFL0 + (i + 1) * rise;
    treads.push(<BB key={i} min={[x0 + i * going - 0.03, top - 0.05, z0]} max={[x0 + (i + 1) * going, top, z1]} m="stairWood" />);
  }
  const run = (risers - 1) * going;
  const total = risers * rise;
  const ang = Math.atan2(total - rise, run);
  const slen = Math.hypot(run, total);
  const cx = x0 + run / 2;
  const cy = FFL0 + total / 2 - 0.1;
  const balusters = [];
  for (let i = 0; i <= 6; i++) {
    const x = x0 + 0.15 + (i / 6) * (run - 0.3);
    const yb = FFL0 + ((x - x0) / going + 1) * rise;
    balusters.push(<B key={i} s={[0.03, 0.95, 0.03]} p={[x, yb + 0.475, z1 - 0.04]} m="blackSteel" />);
  }
  const hand = (z: number, h: number) => (
    <C rt={0.025} h={slen} r={[0, 0, ang - Math.PI / 2]} p={[cx, cy + h + 0.08, z]} m="walnut" />
  );
  return (
    <group>
      {treads}
      {[z0 + 0.012, z1 - 0.012].map((z) => (
        <B key={z} s={[slen + 0.2, 0.32, 0.024]} p={[cx, cy, z]} r={[0, 0, ang]} m="blackSteel" />
      ))}
      {balusters}
      {hand(z1 - 0.04, 0.95)}
      {hand(z0 + 0.06, 0.85)}
      {/* glass panels between balusters */}
      <B s={[slen - 0.3, 0.8, 0.012]} p={[cx, cy + 0.5, z1 - 0.07]} r={[0, 0, ang]} m="glass" cast={false} />
    </group>
  );
}

function floorFinishes(level: 0 | 1) {
  const out: { min: V3; max: V3; m: MatKey }[] = [];
  const top = level === 0 ? FFL0 : FFL1;
  for (const r of ROOMS) {
    if (r.level !== level || !r.floor) continue;
    const rect = r.rect;
    const parts =
      level === 1 && r.id === 'lounge2'
        ? [
            { ...rect, z0: STAIR_VOID.z1 },
            { ...rect, z1: STAIR_VOID.z1, x1: STAIR_VOID.x0 },
            { ...rect, z1: STAIR_VOID.z1, x0: STAIR_VOID.x1 },
          ]
        : [rect];
    for (const p of parts) out.push({ min: [p.x0, top - 0.012, p.z0], max: [p.x1, top, p.z1], m: r.floor as MatKey });
  }
  return out;
}

/** Ground floor envelope, slab, finishes, stair and lakeside deck. */
export function GroundStructure() {
  const fin = useMemo(() => floorFinishes(0), []);
  const doors = useDoors(0);
  return (
    <group name="ground-structure">
      <Merge name="gf-merged">
        <BB min={[-8.1, -0.3, -6.1]} max={[8.1, FFL0 - 0.012, 6.1]} m="slab" />
        {fin.map((f, i) => (
          <BB key={i} {...f} />
        ))}
        <Pieces level={0} />
        <Stair />
        {/* deck + steps */}
        <BB min={[DECK.x0, -0.2, DECK.z0]} max={[DECK.x1 - 0.1, DECK_Y, DECK.z1]} m="deck" />
        <BB min={[DECK.x0 - 0.4, -0.2, DECK.z0 + 4]} max={[DECK.x0, DECK_Y - 0.08, DECK.z1 - 4]} m="deck" />
        {/* balcony support columns */}
        {[-5.8, 0, 5.8].map((z) => (
          <B key={z} s={[0.16, SLAB_BOTTOM - DECK_Y, 0.16]} p={[-10.55, DECK_Y + (SLAB_BOTTOM - DECK_Y) / 2, z]} m="frame" />
        ))}
        {/* plinth band */}
        <BB min={[-8.14, -0.05, 6.1]} max={[8.14, 0.16, 6.16]} m="stone" />
        {/* entrance canopy */}
        <BB min={[-3.4, 3.12, 6.1]} max={[1.4, 3.26, 8.2]} m="soffit" />
        <BB min={[-3.42, 3.26, 6.1]} max={[1.42, 3.3, 8.22]} m="roofMetal" />
        {/* storefront signage on the stone wall */}
        <G geometry={FACADE_SIGN} p={[5.5, 2.95, 6.112]} m="sign" cast={false} />
        {/* kitchen hood vent stack on north */}
        <BB min={[6.2, 2.5, -6.45]} max={[6.8, 3.4, -6.1]} m="stainless" />
      </Merge>
      <Doors doors={doors} />
    </group>
  );
}

/** Second floor slab, envelope, balcony and void balustrade. */
export function UpperStructure() {
  const fin = useMemo(() => floorFinishes(1), []);
  const doors = useDoors(1);
  const v = STAIR_VOID;
  return (
    <group name="upper-structure">
      <Merge name="uf-merged">
        {/* slab around the stair void */}
        <BB min={[-8.1, SLAB_BOTTOM, v.z1]} max={[8.1, FFL1 - 0.012, 6.1]} m="slab" />
        <BB min={[-8.1, SLAB_BOTTOM, -6.1]} max={[v.x0, FFL1 - 0.012, v.z1]} m="slab" />
        <BB min={[v.x1, SLAB_BOTTOM, -6.1]} max={[8.1, FFL1 - 0.012, v.z1]} m="slab" />
        {fin.map((f, i) => (
          <BB key={i} {...f} />
        ))}
        {/* GF ceilings (underside of slab) */}
        <BB min={[-7.9, SLAB_BOTTOM - 0.03, v.z1]} max={[2.93, SLAB_BOTTOM, 5.9]} m="soffit" cast={false} />
        <BB min={[-7.9, SLAB_BOTTOM - 0.03, -5.9]} max={[v.x0, SLAB_BOTTOM, v.z1]} m="soffit" cast={false} />
        <BB min={[3.07, SLAB_BOTTOM - 0.03, -5.9]} max={[7.9, SLAB_BOTTOM, 5.9]} m="ceiling" cast={false} />
        {/* balcony */}
        <BB min={[BALCONY.x0 - 0.05, SLAB_BOTTOM + 0.02, BALCONY.z0 - 0.05]} max={[-8.1, FFL1 - 0.035, BALCONY.z1 + 0.05]} m="slab" />
        <BB min={[BALCONY.x0, FFL1 - 0.035, BALCONY.z0]} max={[-8.1, FFL1 - 0.02, BALCONY.z1]} m="deck" />
        <BB min={[BALCONY.x0 - 0.05, SLAB_BOTTOM, BALCONY.z0 - 0.05]} max={[-8.1, SLAB_BOTTOM + 0.02, BALCONY.z1 + 0.05]} m="soffit" cast={false} />
        <GlassRail a={[BALCONY.x0 + 0.06, -5.95]} b={[BALCONY.x0 + 0.06, 5.95]} y={FFL1 - 0.02} />
        <GlassRail a={[BALCONY.x0 + 0.06, -5.95]} b={[-8.12, -5.95]} y={FFL1 - 0.02} />
        <GlassRail a={[BALCONY.x0 + 0.06, 5.95]} b={[-8.12, 5.95]} y={FFL1 - 0.02} />
        {[-5.8, 0, 5.8].map((z) => (
          <B key={z} s={[0.16, EAVE - FFL1, 0.16]} p={[-10.55, FFL1 + (EAVE - FFL1) / 2, z]} m="frame" />
        ))}
        {/* stair void balustrade */}
        <GlassRail a={[v.x0, v.z1 + 0.04]} b={[v.x1, v.z1 + 0.04]} y={FFL1} />
        <GlassRail a={[v.x0 + 0.04, -5.9]} b={[v.x0 + 0.04, v.z1]} y={FFL1} />
        <Pieces level={1} />
        {/* timber sun-shading fins on the east façade */}
        {Array.from({ length: 30 }, (_, i) => -5.8 + i * 0.4).map((z) => (
          <B key={z} s={[0.24, EAVE - FFL1 - 0.1, 0.05]} p={[8.24, FFL1 + (EAVE - FFL1) / 2, z]} m="walnut" />
        ))}
        <BB min={[8.1, EAVE - 0.12, -5.95]} max={[8.4, EAVE - 0.04, 5.95]} m="walnut" />
      </Merge>
      <Doors doors={doors} />
    </group>
  );
}

export function RoofStructure() {
  const roof = useMemo(() => hipRoofGeo(ROOF.x0, ROOF.x1, ROOF.z0, ROOF.z1, ROOF.pitchDeg), []);
  const ridgeX0 = ROOF.x0 + (ROOF.z1 - ROOF.z0) / 2;
  const ridgeX1 = ROOF.x1 - (ROOF.z1 - ROOF.z0) / 2;
  const yb = EAVE + 0.16;
  const fasc = 0.32;
  return (
    <group name="roof">
      <Merge name="roof-merged">
        <G geometry={roof.geo} p={[0, yb, 0]} m="roofMetal" />
        {/* fascia */}
        <BB min={[ROOF.x0 - 0.04, yb - fasc + 0.06, ROOF.z1 - 0.01]} max={[ROOF.x1 + 0.04, yb + 0.06, ROOF.z1 + 0.04]} m="walnut" />
        <BB min={[ROOF.x0 - 0.04, yb - fasc + 0.06, ROOF.z0 - 0.04]} max={[ROOF.x1 + 0.04, yb + 0.06, ROOF.z0 + 0.01]} m="walnut" />
        <BB min={[ROOF.x0 - 0.04, yb - fasc + 0.06, ROOF.z0]} max={[ROOF.x0 + 0.01, yb + 0.06, ROOF.z1]} m="walnut" />
        <BB min={[ROOF.x1 - 0.01, yb - fasc + 0.06, ROOF.z0]} max={[ROOF.x1 + 0.04, yb + 0.06, ROOF.z1]} m="walnut" />
        {/* eave soffit */}
        <BB min={[ROOF.x0, yb - fasc + 0.06, ROOF.z0]} max={[ROOF.x1, yb - fasc + 0.1, ROOF.z1]} m="soffit" />
        {/* ridge cap */}
        <B s={[ridgeX1 - ridgeX0 + 0.3, 0.1, 0.36]} p={[(ridgeX0 + ridgeX1) / 2, yb + roof.rise + 0.03, (ROOF.z0 + ROOF.z1) / 2]} m="roofMetal" />
        {/* gutters + downpipes */}
        <BB min={[ROOF.x0, yb - 0.2, ROOF.z1 + 0.04]} max={[ROOF.x1, yb - 0.04, ROOF.z1 + 0.18]} m="roofMetal" />
        <BB min={[ROOF.x0, yb - 0.2, ROOF.z0 - 0.18]} max={[ROOF.x1, yb - 0.04, ROOF.z0 - 0.04]} m="roofMetal" />
        {[
          [8.15, 6.15],
          [8.15, -6.15],
        ].map(([x, z]) => (
          <C key={`${x}${z}`} rt={0.05} h={EAVE} p={[x, EAVE / 2, z]} m="roofMetal" seg={10} />
        ))}
        {/* 2F ceiling */}
        <BB min={[-7.9, CEIL1, -5.9]} max={[7.9, CEIL1 + 0.03, 5.9]} m="soffit" cast={false} />
        <BB min={[BALCONY.x0, EAVE - 0.03, BALCONY.z0]} max={[-8.1, EAVE, BALCONY.z1]} m="soffit" cast={false} />
        {/* exposed timber beams on the 2F ceiling */}
        {[-6, -3, 0, 3, 6].map((x) => (
          <BB key={x} min={[x - 0.08, CEIL1 - 0.22, -5.9]} max={[x + 0.08, CEIL1, 5.9]} m="walnut" />
        ))}
      </Merge>
    </group>
  );
}
