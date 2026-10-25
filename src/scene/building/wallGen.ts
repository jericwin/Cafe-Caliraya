import { FFL0, FFL1, SLAB_BOTTOM, EAVE, WALLS, type WallDef } from '../../config/layout';
import type { MatKey } from '../../lib/materials';

type V3 = [number, number, number];
export interface Piece {
  min: V3;
  max: V3;
  m: MatKey;
  cast?: boolean;
}
export interface DoorSpec {
  id: string;
  level: 0 | 1;
  hinge: V3;
  width: number;
  height: number;
  closedYaw: number;
  openSign: number; // multiplies the opening angle
  leaf: 'glass' | 'wood' | 'steel';
  center: V3;
}

const FRAME = 0.06;
const FRAME_D = 0.1;

export function wallBase(w: WallDef) {
  const y0 = w.level === 0 ? 0 : FFL1;
  const y1 = y0 + (w.height ?? (w.level === 0 ? SLAB_BOTTOM : EAVE - FFL1));
  const ffl = w.level === 0 ? FFL0 : FFL1;
  return { y0, y1, ffl };
}

/** Converts a wall definition into boxes (solid parts, frames, glazing) plus door leaf specs. */
export function buildWall(w: WallDef) {
  const pieces: Piece[] = [];
  const doors: DoorSpec[] = [];
  const alongX = Math.abs(w.b[0] - w.a[0]) > Math.abs(w.b[1] - w.a[1]);
  const L = alongX ? w.b[0] - w.a[0] : w.b[1] - w.a[1];
  const { y0, y1, ffl } = wallBase(w);
  const t = w.t;
  const fixed = alongX ? w.a[1] : w.a[0];
  const start = alongX ? w.a[0] : w.a[1];

  // s = along-wall, n = across thickness (relative to wall centre line)
  const box = (s0: number, s1: number, ya: number, yb: number, n0: number, n1: number, m: MatKey, cast = true) => {
    if (s1 - s0 < 1e-4 || yb - ya < 1e-4) return;
    if (alongX) pieces.push({ min: [start + s0, ya, fixed + n0], max: [start + s1, yb, fixed + n1], m, cast });
    else pieces.push({ min: [fixed + n0, ya, start + s0], max: [fixed + n1, yb, start + s1], m, cast });
  };
  const solid = (s0: number, s1: number, ya: number, yb: number) => {
    if (w.matNeg === w.matPos) box(s0, s1, ya, yb, -t / 2, t / 2, w.matNeg as MatKey);
    else {
      box(s0, s1, ya, yb, -t / 2, 0, w.matNeg as MatKey);
      box(s0, s1, ya, yb, 0, t / 2, w.matPos as MatKey);
    }
  };
  const glazing = (s0: number, s1: number, ya: number, yb: number, module: number, mat: MatKey, nOff = 0) => {
    const fd = FRAME_D / 2;
    box(s0, s1, ya, ya + FRAME, nOff - fd, nOff + fd, 'frame');
    box(s0, s1, yb - FRAME, yb, nOff - fd, nOff + fd, 'frame');
    box(s0, s0 + FRAME, ya, yb, nOff - fd, nOff + fd, 'frame');
    box(s1 - FRAME, s1, ya, yb, nOff - fd, nOff + fd, 'frame');
    const n = Math.max(1, Math.round((s1 - s0) / module));
    const step = (s1 - s0) / n;
    for (let i = 1; i < n; i++) {
      const s = s0 + i * step;
      box(s - FRAME / 2, s + FRAME / 2, ya, yb, nOff - fd, nOff + fd, 'frame');
    }
    // transom rail on tall glazing
    if (yb - ya > 2.9) box(s0, s1, ya + 2.45, ya + 2.45 + FRAME * 0.8, nOff - fd, nOff + fd, 'frame');
    box(s0 + FRAME, s1 - FRAME, ya + FRAME, yb - FRAME, nOff - 0.006, nOff + 0.006, mat, false);
  };

  const ops = [...(w.openings ?? [])].sort((p, q) => p.c - q.c);
  let cursor = 0;
  for (const o of ops) {
    const os = o.c - o.w / 2;
    const oe = o.c + o.w / 2;
    if (os > cursor) solid(cursor, os, y0, y1);
    const sillY = ffl + o.sill;
    const headY = Math.min(ffl + o.head, y1);
    if (sillY > y0 + 1e-3) solid(os, oe, y0, sillY);
    if (headY < y1 - 1e-3) solid(os, oe, headY, y1);
    cursor = oe;

    if (o.kind === 'glass' || o.kind === 'window') {
      const mat: MatKey = o.capiz ? 'capiz' : o.frosted ? 'glassFrosted' : 'glass';
      glazing(os, oe, sillY, headY, o.mullion ?? (o.kind === 'window' ? o.w / 2 : 1.2), mat);
      if (o.kind === 'window' && o.sill > 0.3) {
        box(os - 0.03, oe + 0.03, sillY - 0.04, sillY, -t / 2 - 0.04, t / 2 + 0.04, 'slab'); // sill
      }
    } else if (o.kind === 'slider') {
      // fixed panel + sliding panel parked behind it -> half the opening is clear
      const mid = o.c;
      glazing(os, mid + 0.04, sillY, headY, 9, 'glass', -0.03);
      glazing(os + 0.06, mid + 0.1, sillY, headY - 0.02, 9, 'glass', 0.04);
      box(os, oe, headY - FRAME, headY, -FRAME_D, FRAME_D, 'frame');
      box(os, oe, sillY - 0.01, sillY + 0.012, -FRAME_D, FRAME_D, 'frame');
    } else if (o.kind === 'void') {
      box(os - 0.05, oe + 0.05, sillY - 0.04, sillY, -t / 2 - 0.12, t / 2 + 0.12, 'stainless');
    } else if (o.kind === 'door') {
      const leafH = Math.min(headY - ffl, 2.4);
      const fd = FRAME_D / 2 + 0.01;
      box(os, os + FRAME, ffl, ffl + leafH, -fd, fd, 'frame');
      box(oe - FRAME, oe, ffl, ffl + leafH, -fd, fd, 'frame');
      box(os, oe, ffl + leafH, ffl + leafH + FRAME, -fd, fd, 'frame');
      if (headY - (ffl + leafH + FRAME) > 0.15) glazing(os, oe, ffl + leafH + FRAME, headY, o.w / 2, 'glass');
      const leaf = o.leaf === 'double-glass' ? 'glass' : o.leaf ?? 'wood';
      const sw = o.swing ?? 1;
      const lw = o.leaf === 'double-glass' ? (o.w - 2 * FRAME) / 2 : o.w - 2 * FRAME;
      const toWorld = (s: number): V3 => (alongX ? [start + s, ffl, fixed] : [fixed, ffl, start + s]);
      const centre = toWorld(o.c);
      const D = Math.PI / 2;
      doors.push({
        id: `${w.id}-${o.c}`,
        level: w.level,
        hinge: toWorld(os + FRAME),
        width: lw,
        height: leafH - 0.01,
        closedYaw: alongX ? 0 : -D,
        openSign: alongX ? -sw : sw,
        leaf,
        center: centre,
      });
      if (o.leaf === 'double-glass')
        doors.push({
          id: `${w.id}-${o.c}-b`,
          level: w.level,
          hinge: toWorld(oe - FRAME),
          width: lw,
          height: leafH - 0.01,
          closedYaw: alongX ? Math.PI : D,
          openSign: alongX ? sw : -sw,
          leaf,
          center: centre,
        });
    }
  }
  if (cursor < L) solid(cursor, L, y0, y1);
  return { pieces, doors };
}

export function buildAllWalls(level: 0 | 1) {
  const pieces: Piece[] = [];
  const doors: DoorSpec[] = [];
  for (const w of WALLS) {
    if (w.level !== level) continue;
    const r = buildWall(w);
    pieces.push(...r.pieces);
    doors.push(...r.doors);
  }
  return { pieces, doors };
}
