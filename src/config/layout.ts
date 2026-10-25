/**
 * PRELIMINARY CONCEPTUAL LAYOUT — Caliraya Coffee House
 *
 * Every dimension in this file is a coherent *preliminary* design value in metres.
 * None of them are verified site measurements. Edit them here: the building shell,
 * walk-through collision, plan labels and dimension annotations are all derived
 * from these numbers.
 *
 * Coordinate system: +X = East, -X = West (lake side), +Z = South, -Z = North, +Y = up.
 */

export type Vec2 = [number, number];
export type Rect = { x0: number; x1: number; z0: number; z1: number };

// ---------- vertical datums ----------
export const FFL0 = 0.15; // ground floor finished level
export const SLAB_BOTTOM = 3.5; // underside of second-floor slab (GF ceiling)
export const FFL1 = 3.75; // second floor finished level
export const CEIL1 = 6.95; // second floor ceiling
export const EAVE = 7.15; // top of second-floor walls / eave line
export const FLOOR_TO_FLOOR = FFL1 - FFL0; // 3.60

// ---------- plan footprints ----------
export const BLD: Rect = { x0: -8, x1: 8, z0: -6, z1: 6 }; // 16.0 x 12.0 m enclosed footprint
export const BALCONY: Rect = { x0: -10.8, x1: -8, z0: -6, z1: 6 };
export const DECK: Rect = { x0: -14, x1: -8, z0: -7.5, z1: 7.5 };
export const DECK_Y = 0.15;
export const ROOF = { x0: -11.6, x1: 9.4, z0: -7.4, z1: 7.4, pitchDeg: 17 };
export const PLAZA: Rect = { x0: -8, x1: 12, z0: 6.1, z1: 10.5 };

export const WALL_T = 0.2;
export const PART_T = 0.14;

// Straight feature stair along the north wall, rising West -> East.
export const STAIR = {
  x0: -2.5,
  z0: -5.88,
  z1: -4.78,
  risers: 20,
  rise: FLOOR_TO_FLOOR / 20, // 0.18
  going: 0.28,
  get x1() {
    return this.x0 + (this.risers - 1) * this.going; // 2.82
  },
};
export const STAIR_VOID: Rect = { x0: -2.6, x1: 2.9, z0: -6, z1: -4.72 };

// ---------- site ----------
export const SHORE_X = -32; // approximate lake edge (varies with z, see terrain)
export const WATER_Y = -1.0;
export const ROAD: Rect = { x0: 38, x1: 45, z0: -400, z1: 400 };
export const PARKING: Rect = { x0: 9.5, x1: 38, z0: -9.4, z1: 7.4 };
export const AISLE: Rect = { x0: 9.5, x1: 38, z0: -4, z1: 2 };
export const JETTY: Rect = { x0: -47, x1: -29, z0: -1, z1: 1 };
export const JETTY_Y = -0.45;

// ---------- walls ----------
export type OpeningKind = 'door' | 'window' | 'glass' | 'slider' | 'void';
export interface Opening {
  c: number; // centre, measured along the wall from point a
  w: number;
  sill: number; // above finished floor
  head: number; // above finished floor
  kind: OpeningKind;
  leaf?: 'glass' | 'wood' | 'steel' | 'double-glass';
  mullion?: number; // module spacing for curtain glazing
  frosted?: boolean;
  capiz?: boolean;
  swing?: 1 | -1; // which side door leaves open towards (+normal or -normal)
}
export interface WallDef {
  id: string;
  level: 0 | 1;
  a: Vec2;
  b: Vec2;
  t: number;
  /** material on the face pointing to +X (walls along Z) or +Z (walls along X) */
  matPos: string;
  /** material on the opposite face */
  matNeg: string;
  openings?: Opening[];
  height?: number; // overrides default level height
}


const UF_H = EAVE - FFL1; // 3.40 exterior walls on 2F
const UF_PART_H = CEIL1 - FFL1;

export const WALLS: WallDef[] = [
  // ======== GROUND FLOOR — exterior ========
  {
    id: 'gf-west', level: 0, a: [-8, -5.9], b: [-8, 5.9], t: WALL_T, matNeg: 'stone', matPos: 'plasterWarm',
    openings: [
      { c: 2.4, w: 4.6, sill: 0, head: 3.15, kind: 'glass', mullion: 1.15 },
      { c: 5.9, w: 2.3, sill: 0, head: 3.15, kind: 'slider' },
      { c: 9.4, w: 4.6, sill: 0, head: 3.15, kind: 'glass', mullion: 1.15 },
    ],
  },
  {
    id: 'gf-south', level: 0, a: [-8.1, 6], b: [8.1, 6], t: WALL_T, matPos: 'stone', matNeg: 'plasterWarm',
    openings: [
      { c: 3.0, w: 5.5, sill: 0, head: 3.15, kind: 'glass', mullion: 1.375 },
      { c: 7.1, w: 2.3, sill: 0, head: 3.15, kind: 'door', leaf: 'double-glass', swing: 1 },
      { c: 9.7, w: 2.6, sill: 0, head: 3.15, kind: 'glass', mullion: 1.3 },
      { c: 12.4, w: 1.0, sill: 1.8, head: 2.4, kind: 'window', frosted: true },
      { c: 14.9, w: 1.0, sill: 1.2, head: 2.2, kind: 'window' },
    ],
  },
  {
    id: 'gf-east', level: 0, a: [8, -5.9], b: [8, 5.9], t: WALL_T, matPos: 'plaster', matNeg: 'tileWall',
    openings: [
      { c: 1.6, w: 1.2, sill: 1.2, head: 2.3, kind: 'window' },
      { c: 3.4, w: 1.0, sill: 0, head: 2.25, kind: 'door', leaf: 'steel', swing: 1 },
      { c: 7.4, w: 1.0, sill: 1.4, head: 2.2, kind: 'window' },
      { c: 10.4, w: 1.0, sill: 0, head: 2.25, kind: 'door', leaf: 'steel', swing: 1 },
    ],
  },
  {
    id: 'gf-north', level: 0, a: [-8.1, -6], b: [8.1, -6], t: WALL_T, matNeg: 'plaster', matPos: 'plasterWarm',
    openings: [
      { c: 2.7, w: 4.4, sill: 0.95, head: 3.15, kind: 'glass', mullion: 1.1 },
      { c: 8.1, w: 3.0, sill: 1.2, head: 3.15, kind: 'glass', mullion: 1.0 },
      { c: 12.7, w: 2.0, sill: 1.3, head: 2.3, kind: 'window' },
    ],
  },
  // ======== GROUND FLOOR — interior ========
  {
    id: 'gf-kitchen-w', level: 0, a: [3, -5.9], b: [3, 0.07], t: PART_T, matNeg: 'tileWall', matPos: 'tileWall',
    openings: [
      { c: 1.7, w: 0.95, sill: 0, head: 2.2, kind: 'door', leaf: 'steel', swing: 1 },
      { c: 4.2, w: 1.4, sill: 1.05, head: 1.75, kind: 'void' },
    ],
  },
  {
    id: 'gf-kitchen-s', level: 0, a: [3.07, 0], b: [8, 0], t: PART_T, matNeg: 'tileWall', matPos: 'plasterWarm',
    openings: [{ c: 1.0, w: 0.9, sill: 0, head: 2.2, kind: 'door', leaf: 'wood', swing: 1 }],
  },
  {
    id: 'gf-storage-w', level: 0, a: [3, 0.07], b: [3, 2.4], t: PART_T, matNeg: 'plasterWarm', matPos: 'plasterWarm',
    openings: [{ c: 0.9, w: 0.9, sill: 0, head: 2.2, kind: 'door', leaf: 'wood', swing: 1 }],
  },
  {
    id: 'gf-cr-w', level: 0, a: [3, 2.4], b: [3, 5.9], t: PART_T, matNeg: 'plasterWarm', matPos: 'tileWall',
    openings: [{ c: 1.6, w: 1.0, sill: 0, head: 2.2, kind: 'door', leaf: 'wood', swing: 1 }],
  },
  {
    id: 'gf-storage-s', level: 0, a: [3.07, 2.4], b: [5.43, 2.4], t: PART_T, matNeg: 'plasterWarm', matPos: 'tileWall',
  },
  {
    id: 'gf-utility-w', level: 0, a: [5.5, 0.07], b: [5.5, 5.9], t: PART_T, matNeg: 'plasterWarm', matPos: 'plasterWarm',
    openings: [{ c: 1.1, w: 0.9, sill: 0, head: 2.2, kind: 'door', leaf: 'wood', swing: 1 }],
  },

  // ======== SECOND FLOOR — exterior ========
  {
    id: 'uf-west', level: 1, a: [-8, -5.9], b: [-8, 5.9], t: WALL_T, matNeg: 'woodClad', matPos: 'plasterWarm', height: UF_H,
    openings: [
      { c: 1.35, w: 2.5, sill: 0, head: 3.0, kind: 'glass', mullion: 1.25 },
      { c: 3.85, w: 2.3, sill: 0, head: 3.0, kind: 'slider' },
      { c: 5.9, w: 1.6, sill: 0, head: 3.0, kind: 'glass', mullion: 1.6 },
      { c: 7.95, w: 2.3, sill: 0, head: 3.0, kind: 'slider' },
      { c: 10.45, w: 2.5, sill: 0, head: 3.0, kind: 'glass', mullion: 1.25 },
    ],
  },
  {
    id: 'uf-south', level: 1, a: [-8.1, 6], b: [8.1, 6], t: WALL_T, matPos: 'woodClad', matNeg: 'plasterWarm', height: UF_H,
    openings: [
      { c: 2.875, w: 5.25, sill: 0, head: 3.0, kind: 'glass', mullion: 1.3125 },
      { c: 8.25, w: 5.3, sill: 0, head: 3.0, kind: 'glass', mullion: 1.325 },
      { c: 13.55, w: 4.3, sill: 0.6, head: 2.7, kind: 'glass', mullion: 1.075 },
    ],
  },
  {
    id: 'uf-east', level: 1, a: [8, -5.9], b: [8, 5.9], t: WALL_T, matPos: 'woodClad', matNeg: 'plasterWarm', height: UF_H,
    openings: [
      { c: 2.9, w: 4.0, sill: 0.8, head: 2.7, kind: 'glass', mullion: 1.0 },
      { c: 9.9, w: 2.0, sill: 0.6, head: 2.7, kind: 'glass', mullion: 1.0 },
    ],
  },
  {
    id: 'uf-north', level: 1, a: [-8.1, -6], b: [8.1, -6], t: WALL_T, matNeg: 'woodClad', matPos: 'plasterWarm', height: UF_H,
    openings: [
      { c: 2.8, w: 4.6, sill: 0.7, head: 3.0, kind: 'glass', mullion: 1.15 },
      { c: 8.1, w: 3.0, sill: 0, head: 3.0, kind: 'glass', mullion: 1.0 },
      { c: 14.2, w: 2.8, sill: 0.8, head: 2.7, kind: 'window' },
    ],
  },
  // ======== SECOND FLOOR — interior ========
  {
    id: 'uf-group-w', level: 1, a: [4.6, -5.9], b: [4.6, 0.07], t: PART_T, matNeg: 'plasterWarm', matPos: 'plasterWarm', height: UF_PART_H,
    openings: [
      { c: 2.25, w: 3.7, sill: 0.9, head: 2.45, kind: 'glass', capiz: true, mullion: 0.925 },
      { c: 5.0, w: 1.0, sill: 0, head: 2.2, kind: 'door', leaf: 'wood', swing: -1 },
    ],
  },
  {
    id: 'uf-group-s', level: 1, a: [4.67, 0], b: [7.9, 0], t: PART_T, matNeg: 'plasterWarm', matPos: 'woodClad', height: UF_PART_H,
  },
];

// ---------- rooms (labels, areas, floor finishes) ----------
export interface Room {
  id: string;
  name: string;
  level: 0 | 1 | -1; // -1 = site / outdoor
  rect: Rect;
  floor?: string;
  label?: [number, number];
}

export const ROOMS: Room[] = [
  { id: 'dining', name: 'Café Dining & Lounge', level: 0, rect: { x0: -8, x1: 0.5, z0: -6, z1: 6 }, floor: 'floorConcrete', label: [-4.5, 0] },
  { id: 'bar', name: 'Coffee Bar & Service Counter', level: 0, rect: { x0: 0.5, x1: 3, z0: -6, z1: 2.3 }, floor: 'floorConcrete', label: [1.8, -1.2] },
  { id: 'hall', name: 'CR Lobby', level: 0, rect: { x0: 0.5, x1: 3, z0: 2.3, z1: 6 }, floor: 'floorConcrete', label: [1.75, 4.6] },
  { id: 'kitchen', name: 'Commercial Kitchen', level: 0, rect: { x0: 3, x1: 8, z0: -6, z1: 0 }, floor: 'floorTile', label: [5.5, -3] },
  { id: 'storage', name: 'Dry Storage', level: 0, rect: { x0: 3, x1: 5.5, z0: 0, z1: 2.4 }, floor: 'floorTile', label: [4.25, 1.2] },
  { id: 'cr', name: 'Accessible CR', level: 0, rect: { x0: 3, x1: 5.5, z0: 2.4, z1: 6 }, floor: 'floorTile', label: [4.25, 4.2] },
  { id: 'utility', name: 'Staff, Utility & Electrical', level: 0, rect: { x0: 5.5, x1: 8, z0: 0, z1: 6 }, floor: 'floorTile', label: [6.75, 3] },
  { id: 'lounge2', name: 'Upper Café Lounge', level: 1, rect: { x0: -8, x1: 4.6, z0: -6, z1: 6 }, floor: 'floorWood', label: [-2.5, 1] },
  { id: 'group', name: 'Function / Group Room', level: 1, rect: { x0: 4.6, x1: 8, z0: -6, z1: 0 }, floor: 'floorWood', label: [6.3, -3] },
  { id: 'station', name: 'Self-Service Station', level: 1, rect: { x0: 4.6, x1: 8, z0: 0, z1: 2.4 }, floor: 'floorWood', label: [6.3, 1.2] },
  { id: 'nook', name: 'Reading Nook', level: 1, rect: { x0: 4.6, x1: 8, z0: 2.4, z1: 6 }, floor: 'floorWood', label: [6.3, 4.2] },
  { id: 'balcony', name: 'Sunset Balcony', level: 1, rect: BALCONY, label: [-9.4, 0] },
  { id: 'deck', name: 'Lakeside Deck', level: -1, rect: DECK, label: [-11.5, 0] },
  { id: 'plaza', name: 'Entrance Plaza', level: -1, rect: PLAZA, label: [2, 8.4] },
  { id: 'parking', name: 'Parking (12 cars + PWD + 6 motorcycles)', level: -1, rect: PARKING, label: [24, -1] },
];

export const rectArea = (r: Rect) => Math.abs((r.x1 - r.x0) * (r.z1 - r.z0));

// ---------- walk-through collision ----------
/** 2D blocking rectangles derived from the walls: solid wall parts and glazing block, doors do not. */
export function wallBlockers(level: 0 | 1): Rect[] {
  const out: Rect[] = [];
  for (const w of WALLS) {
    if (w.level !== level) continue;
    const alongX = Math.abs(w.b[0] - w.a[0]) > Math.abs(w.b[1] - w.a[1]);
    const len = alongX ? w.b[0] - w.a[0] : w.b[1] - w.a[1];
    const gaps: [number, number][] = [];
    for (const o of w.openings ?? []) {
      if (o.kind === 'door') gaps.push([o.c - o.w / 2 + 0.05, o.c + o.w / 2 - 0.05]);
      if (o.kind === 'slider') gaps.push([o.c + 0.02, o.c + o.w / 2 - 0.08]);
    }
    gaps.sort((p, q) => p[0] - q[0]);
    let s = 0;
    const segs: [number, number][] = [];
    for (const g of gaps) {
      if (g[0] > s) segs.push([s, g[0]]);
      s = g[1];
    }
    if (s < len) segs.push([s, len]);
    for (const [s0, s1] of segs) {
      if (alongX) out.push({ x0: w.a[0] + s0, x1: w.a[0] + s1, z0: w.a[1] - w.t / 2, z1: w.a[1] + w.t / 2 });
      else out.push({ x0: w.a[0] - w.t / 2, x1: w.a[0] + w.t / 2, z0: w.a[1] + s0, z1: w.a[1] + s1 });
    }
  }
  return out;
}

/** Large fixed items you cannot walk through (counters, kitchen runs, railings). */
export const OBSTACLES: Record<0 | 1, Rect[]> = {
  0: [
    { x0: 0.45, x1: 1.2, z0: -3.9, z1: 1.65 }, // service counter
    { x0: 0.45, x1: 2.25, z0: 1.6, z1: 2.3 }, // counter return
    { x0: 2.3, x1: 2.93, z0: -3.6, z1: -0.1 }, // back bar
    { x0: 3.07, x1: 3.9, z0: -5.9, z1: -5.0 }, // upright freezer
    { x0: 3.07, x1: 3.8, z0: -3.4, z1: -0.2 }, // kitchen pass / prep run
    { x0: 4.7, x1: 6.3, z0: -3.6, z1: -2.4 }, // prep island
    { x0: 7.2, x1: 7.93, z0: -5.2, z1: -3.4 }, // east prep under window
    { x0: 4.0, x1: 7.93, z0: -5.93, z1: -5.15 }, // north sinks / dishwasher / cooking line
    { x0: 5.0, x1: 7.3, z0: -0.9, z1: -0.07 }, // refrigerator + freezer on south wall
    { x0: -1.8, x1: 2.9, z0: -5.95, z1: -4.72 }, // stair (blocked from the side)
  ],
  1: [
    { x0: STAIR_VOID.x0, x1: STAIR_VOID.x1, z0: STAIR_VOID.z0, z1: STAIR_VOID.z1 }, // void (stairs handled separately)
    { x0: 4.75, x1: 7.9, z0: 0.07, z1: 0.75 }, // service station counter
    { x0: -10.85, x1: -10.65, z0: -6, z1: 6 }, // balcony railing W
    { x0: -10.85, x1: -8, z0: -6.05, z1: -5.85 }, // balcony railing N
    { x0: -10.85, x1: -8, z0: 5.85, z1: 6.05 }, // balcony railing S
  ],
};
