import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { isClipped } from '../clipping';

type V3 = [number, number, number];

function visibleChain(o: THREE.Object3D | null): boolean {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tmp = new THREE.Vector3();

/** Raycasts the model + site and returns the closest visible surface point (optionally snapped to a vertex). */
function pick(e: PointerEvent, el: HTMLElement, camera: THREE.Camera, scene: THREE.Scene, snap: boolean): V3 | null {
  const r = el.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const roots = ['model', 'site'].map((n) => scene.getObjectByName(n)).filter(Boolean) as THREE.Object3D[];
  const hits = ray.intersectObjects(roots, true);
  for (const h of hits) {
    if (h.object.userData.noMeasure || !visibleChain(h.object)) continue;
    if ((h.object as THREE.Line).isLine || (h.object as THREE.Points).isPoints) continue;
    if (isClipped(h.point)) continue;
    const p = h.point.clone();
    if (snap && h.face) {
      const mesh = h.object as THREE.Mesh;
      const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
      let best = 0.18;
      for (const idx of [h.face.a, h.face.b, h.face.c]) {
        tmp.fromBufferAttribute(pos, idx).applyMatrix4(mesh.matrixWorld);
        const d = tmp.distanceTo(h.point);
        if (d < best) {
          best = d;
          p.copy(tmp);
        }
      }
    }
    return [p.x, p.y, p.z];
  }
  return null;
}

export function fmt(m: number) {
  return `${m.toFixed(2)} m`;
}

export function MeasureTool() {
  const measuring = useStore((s) => s.measuring);
  const measurements = useStore((s) => s.measurements);
  const { gl, camera, scene } = useThree();
  const [pending, setPending] = useState<V3 | null>(null);
  const [hover, setHover] = useState<V3 | null>(null);
  const downAt = useRef<[number, number] | null>(null);
  const lastMove = useRef(0);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(() => {
    if (!measuring) {
      setPending(null);
      setHover(null);
      return;
    }
    const el = gl.domElement;
    const down = (e: PointerEvent) => (downAt.current = [e.clientX, e.clientY]);
    const up = (e: PointerEvent) => {
      const d = downAt.current;
      downAt.current = null;
      if (!d || Math.hypot(e.clientX - d[0], e.clientY - d[1]) > 6) return;
      const p = pick(e, el, camera, scene, useStore.getState().snap);
      if (!p) return;
      if (!pendingRef.current) setPending(p);
      else {
        useStore.getState().addMeasurement(pendingRef.current, p);
        setPending(null);
      }
    };
    const move = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMove.current < 45 || e.pointerType === 'touch') return;
      lastMove.current = now;
      setHover(pick(e, el, camera, scene, useStore.getState().snap));
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPending(null);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointermove', move);
    window.addEventListener('keydown', key);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointermove', move);
      window.removeEventListener('keydown', key);
    };
  }, [measuring, gl, camera, scene]);

  return (
    <group name="measurements">
      {measurements.map((m) => (
        <Dimension key={m.id} a={m.a} b={m.b} />
      ))}
      {measuring && pending && <Marker p={pending} />}
      {measuring && pending && hover && <Dimension a={pending} b={hover} live />}
      {measuring && hover && <Marker p={hover} small />}
    </group>
  );
}

function Marker({ p, small }: { p: V3; small?: boolean }) {
  return (
    <mesh position={p} renderOrder={999}>
      <sphereGeometry args={[small ? 0.06 : 0.09, 12, 8]} />
      <meshBasicMaterial color={small ? '#ffffff' : '#f2b45e'} depthTest={false} transparent opacity={0.9} toneMapped={false} />
    </mesh>
  );
}

function Dimension({ a, b, live }: { a: V3; b: V3; live?: boolean }) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const d = va.distanceTo(vb);
  const mid = va.clone().lerp(vb, 0.5);
  const dx = Math.abs(b[0] - a[0]);
  const dy = Math.abs(b[1] - a[1]);
  const dz = Math.abs(b[2] - a[2]);
  return (
    <group>
      <Line points={[a, b]} color={live ? '#ffffff' : '#f2b45e'} lineWidth={2} depthTest={false} dashed={live} dashSize={0.15} gapSize={0.1} renderOrder={998} />
      {!live && (
        <>
          <Marker p={a} />
          <Marker p={b} />
        </>
      )}
      <Html position={mid} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
        <div className="measure-label">
          <b>{fmt(d)}</b>
          <span>
            Δx {dx.toFixed(2)} · Δy {dy.toFixed(2)} · Δz {dz.toFixed(2)}
          </span>
        </div>
      </Html>
    </group>
  );
}
