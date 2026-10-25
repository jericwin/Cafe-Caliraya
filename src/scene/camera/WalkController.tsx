import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BALCONY, BLD, DECK, DECK_Y, FFL0, FFL1, OBSTACLES, STAIR, wallBlockers, type Rect } from '../../config/layout';
import { WALK_STARTS } from '../../config/viewpoints';
import { groundHeightAt, isWater } from '../../lib/terrain';
import { runtime } from '../../lib/sceneEvents';
import { useStore } from '../../store/useStore';

const EYE = 1.6;
const R = 0.26;
const RUN = (STAIR.risers - 1) * STAIR.going;

function inside(r: Rect, x: number, z: number, pad = 0) {
  return x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;
}

function resolve(x: number, z: number, rects: Rect[]): [number, number] {
  for (let iter = 0; iter < 3; iter++) {
    for (const r of rects) {
      if (!inside(r, x, z, R)) continue;
      const dl = x - (r.x0 - R);
      const dr = r.x1 + R - x;
      const du = z - (r.z0 - R);
      const dd = r.z1 + R - z;
      const m = Math.min(dl, dr, du, dd);
      if (m === dl) x = r.x0 - R;
      else if (m === dr) x = r.x1 + R;
      else if (m === du) z = r.z0 - R;
      else z = r.z1 + R;
    }
  }
  return [x, z];
}

/** First-person walkthrough: WASD / arrows + mouse-look (pointer lock), touch joystick + drag-look. */
export function WalkController() {
  const { camera, gl } = useThree();
  const walkRequest = useStore((s) => s.walkRequest);
  const blockers = useMemo(() => ({ 0: [...wallBlockers(0), ...OBSTACLES[0]], 1: [...wallBlockers(1), ...OBSTACLES[1]] }), []);
  const st = useRef({ x: -1, z: 9.4, y: FFL0 + EYE, yaw: 0, pitch: 0, level: 0 as 0 | 1, onStair: false, intro: 0, bob: 0 });
  const intro = useRef<{ from: THREE.Vector3; fromQ: THREE.Quaternion; t: number } | null>(null);
  const keys = useRef<Record<string, boolean>>({});

  const place = (x: number, z: number, yaw: number, level: 0 | 1) => {
    const s = st.current;
    s.x = x;
    s.z = z;
    s.yaw = yaw;
    s.pitch = -0.04;
    s.level = level;
    s.onStair = false;
    s.y = floorY(x, z, level) + EYE;
    intro.current = { from: camera.position.clone(), fromQ: camera.quaternion.clone(), t: 0 };
  };

  // choose a starting point
  useEffect(() => {
    const p = camera.position;
    if (walkRequest && performance.now() - walkRequest.nonce < 800) {
      place(walkRequest.pos[0], walkRequest.pos[2], walkRequest.yaw, walkRequest.level);
    } else if (inside(BLD, p.x, p.z) && p.y < 9) {
      const level = p.y > FFL1 + 0.5 ? 1 : 0;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      place(p.x, p.z, Math.atan2(-dir.x, -dir.z), level);
    } else {
      const e = WALK_STARTS[0];
      place(e.pos[0], e.pos[1], e.yaw, e.level);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (walkRequest && performance.now() - walkRequest.nonce < 800) place(walkRequest.pos[0], walkRequest.pos[2], walkRequest.yaw, walkRequest.level);
  }, [walkRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  // input
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    let dragging = false;
    let lx = 0;
    let ly = 0;
    const isLocked = () => document.pointerLockElement === el;
    const pdown = (e: PointerEvent) => {
      if (useStore.getState().measuring) return;
      if (e.pointerType === 'mouse' && !isLocked()) {
        try {
          const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
          r?.catch?.(() => undefined);
        } catch {
          /* pointer lock unavailable: fall back to drag-look */
        }
      }
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
    };
    const pmove = (e: PointerEvent) => {
      const s = st.current;
      if (isLocked()) {
        s.yaw -= e.movementX * 0.0022;
        s.pitch -= e.movementY * 0.0022;
      } else if (dragging) {
        const k = e.pointerType === 'touch' ? 0.005 : 0.004;
        s.yaw += (e.clientX - lx) * k;
        s.pitch += (e.clientY - ly) * k;
        lx = e.clientX;
        ly = e.clientY;
      }
      s.pitch = THREE.MathUtils.clamp(s.pitch, -1.35, 1.35);
    };
    const pup = () => (dragging = false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    el.addEventListener('pointerdown', pdown);
    window.addEventListener('pointermove', pmove);
    window.addEventListener('pointerup', pup);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      el.removeEventListener('pointerdown', pdown);
      window.removeEventListener('pointermove', pmove);
      window.removeEventListener('pointerup', pup);
      if (document.pointerLockElement === el) document.exitPointerLock();
    };
  }, [gl]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = st.current;
    const k = keys.current;
    const w = runtime.walk;
    // virtual joystick look
    s.yaw -= w.lookX * dt * 2.2;
    s.pitch = THREE.MathUtils.clamp(s.pitch - w.lookY * dt * 1.6, -1.35, 1.35);

    let fx = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + w.moveY;
    let sx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + w.moveX;
    const len = Math.hypot(fx, sx);
    if (len > 1) {
      fx /= len;
      sx /= len;
    }
    const run = k.ShiftLeft || k.ShiftRight || w.run ? 2.2 : 1;
    const speed = useStore.getState().walkSpeed * run;
    const fwd = new THREE.Vector2(-Math.sin(s.yaw), -Math.cos(s.yaw));
    const right = new THREE.Vector2(Math.cos(s.yaw), -Math.sin(s.yaw));
    const dx = (fwd.x * fx + right.x * sx) * speed * dt;
    const dz = (fwd.y * fx + right.y * sx) * speed * dt;
    const moving = Math.abs(dx) + Math.abs(dz) > 1e-5;

    if (moving && !intro.current) {
      let nx = s.x + dx;
      let nz = s.z + dz;
      const inBand = nz > STAIR.z0 - 0.05 && nz < STAIR.z1 + 0.05;
      if (!s.onStair && inBand) {
        if (s.level === 0 && nx > STAIR.x0 - 0.35 && nx < STAIR.x0 + 0.6 && s.x <= STAIR.x0 + 0.2) s.onStair = true;
        if (s.level === 1 && nx < STAIR.x1 + 0.1 && nx > STAIR.x1 - 0.8 && s.x >= STAIR.x1 - 0.1) s.onStair = true;
      }
      if (s.onStair) {
        nz = THREE.MathUtils.clamp(nz, STAIR.z0 + R, STAIR.z1 - R);
        if (nx < STAIR.x0 - 0.4) {
          s.onStair = false;
          s.level = 0;
        } else if (nx > STAIR.x1 + 0.12) {
          s.onStair = false;
          s.level = 1;
        }
        s.x = nx;
        s.z = nz;
      } else {
        [nx, nz] = resolve(nx, nz, blockers[s.level]);
        if (s.level === 0) {
          nx = THREE.MathUtils.clamp(nx, -48, 60);
          nz = THREE.MathUtils.clamp(nz, -70, 70);
          if (isWater(nx, nz)) {
            nx = s.x;
            nz = s.z;
          }
        } else if (!inside(BLD, nx, nz, -0.05) && !inside(BALCONY, nx, nz, -0.05)) {
          nx = s.x;
          nz = s.z;
        }
        s.x = nx;
        s.z = nz;
      }
      s.bob += dt * speed * 5.5;
    }
    const fy = s.onStair ? stairY(s.x) : floorY(s.x, s.z, s.level);
    const targetY = fy + EYE + (moving ? Math.sin(s.bob) * 0.025 : 0);
    s.y = THREE.MathUtils.damp(s.y, targetY, s.onStair ? 14 : 10, dt);
    runtime.playerLevel = s.level;

    const eye = new THREE.Vector3(s.x, s.y, s.z);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(s.pitch, s.yaw, 0, 'YXZ'));
    const it = intro.current;
    if (it) {
      it.t = Math.min(1, it.t + dt / 1.1);
      const e = it.t < 0.5 ? 2 * it.t * it.t : 1 - Math.pow(-2 * it.t + 2, 2) / 2;
      camera.position.lerpVectors(it.from, eye, e);
      camera.quaternion.copy(it.fromQ).slerp(q, e);
      if (it.t >= 1) intro.current = null;
    } else {
      camera.position.copy(eye);
      camera.quaternion.copy(q);
    }
  });

  return null;
}

function stairY(x: number) {
  const t = THREE.MathUtils.clamp((x - STAIR.x0 + STAIR.going * 0.5) / (RUN + STAIR.going), 0, 1);
  return FFL0 + t * (FFL1 - FFL0);
}

function floorY(x: number, z: number, level: 0 | 1) {
  if (level === 1) return inside(BALCONY, x, z) ? FFL1 - 0.02 : FFL1;
  if (inside(BLD, x, z)) return FFL0;
  if (inside(DECK, x, z)) return DECK_Y;
  return groundHeightAt(x, z);
}
