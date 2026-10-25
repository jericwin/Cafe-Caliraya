import * as THREE from 'three';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useMats, type MatKey } from './materials';
import { onSceneChanged } from './sceneEvents';

type V3 = [number, number, number];

const BOX_CACHE = new Map<string, THREE.BufferGeometry>();

/** Box whose UVs are in metres on every face, so tiled materials keep real-world scale. */
export function boxGeo(w: number, h: number, d: number) {
  const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  let g = BOX_CACHE.get(k);
  if (g) return g;
  g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++)
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
  uv.needsUpdate = true;
  BOX_CACHE.set(k, g);
  return g;
}

const CYL_CACHE = new Map<string, THREE.BufferGeometry>();
export function cylGeo(rt: number, rb: number, h: number, seg = 16, open = false) {
  const k = `${rt}|${rb}|${h}|${seg}|${open}`;
  let g = CYL_CACHE.get(k);
  if (!g) {
    g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const circ = Math.PI * 2 * Math.max(rt, rb);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h);
    CYL_CACHE.set(k, g);
  }
  return g;
}

const SPH_CACHE = new Map<string, THREE.BufferGeometry>();
export function sphGeo(r: number, ws = 16, hs = 12) {
  const k = `${r}|${ws}|${hs}`;
  let g = SPH_CACHE.get(k);
  if (!g) {
    g = new THREE.SphereGeometry(r, ws, hs);
    SPH_CACHE.set(k, g);
  }
  return g;
}

interface PrimProps {
  p?: V3;
  r?: V3;
  m: MatKey;
  cast?: boolean;
  receive?: boolean;
  scale?: V3 | number;
}

/** Box primitive: size, position (centre), rotation, material key */
export function B({ s, p = [0, 0, 0], r, m, cast = true, receive = true, scale }: PrimProps & { s: V3 }) {
  const mats = useMats();
  return (
    <mesh geometry={boxGeo(s[0], s[1], s[2])} material={mats[m]} position={p} rotation={r} scale={scale} castShadow={cast} receiveShadow={receive} userData={{ m }} />
  );
}

/** Box defined by min/max corners — handy for architecture. */
export function BB({ min, max, m, cast, receive }: { min: V3; max: V3; m: MatKey; cast?: boolean; receive?: boolean }) {
  const s: V3 = [Math.abs(max[0] - min[0]), Math.abs(max[1] - min[1]), Math.abs(max[2] - min[2])];
  const p: V3 = [(max[0] + min[0]) / 2, (max[1] + min[1]) / 2, (max[2] + min[2]) / 2];
  return <B s={s} p={p} m={m} cast={cast} receive={receive} />;
}

export function C({ rt, rb, h, seg = 16, p = [0, 0, 0], r, m, cast = true, receive = true, scale, open }: PrimProps & { rt: number; rb?: number; h: number; seg?: number; open?: boolean }) {
  const mats = useMats();
  return (
    <mesh geometry={cylGeo(rt, rb ?? rt, h, seg, open)} material={mats[m]} position={p} rotation={r} scale={scale} castShadow={cast} receiveShadow={receive} userData={{ m }} />
  );
}

export function S({ rad, p = [0, 0, 0], r, m, cast = true, receive = true, scale, ws = 16, hs = 12 }: PrimProps & { rad: number; ws?: number; hs?: number }) {
  const mats = useMats();
  return <mesh geometry={sphGeo(rad, ws, hs)} material={mats[m]} position={p} rotation={r} scale={scale} castShadow={cast} receiveShadow={receive} userData={{ m }} />;
}

export function G({ geometry, p = [0, 0, 0], r, m, cast = true, receive = true, scale }: PrimProps & { geometry: THREE.BufferGeometry }) {
  const mats = useMats();
  return <mesh geometry={geometry} material={mats[m]} position={p} rotation={r} scale={scale} castShadow={cast} receiveShadow={receive} userData={{ m }} />;
}

// ------------------------------------------------------------------ static merging

function normalise(g: THREE.BufferGeometry) {
  let n = g.index ? g.toNonIndexed() : g.clone();
  for (const name of Object.keys(n.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') n.deleteAttribute(name);
  if (!n.attributes.normal) n.computeVertexNormals();
  if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  n.clearGroups();
  n.morphAttributes = {};
  return n;
}

interface Bucket {
  key: string;
  m: MatKey;
  cast: boolean;
  geo: THREE.BufferGeometry;
}

const NO_MEASURE: MatKey[] = ['glass', 'glassFrosted', 'displayGlass'];

/**
 * Renders its children once, bakes them into one mesh per material, then unmounts them.
 * Turns thousands of furniture/architecture parts into a handful of draw calls.
 */
export function Merge({ children, version = 0, name }: { children: ReactNode; version?: unknown; name?: string }) {
  const mats = useMats();
  const src = useRef<THREE.Group>(null);
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);
  const [ver, setVer] = useState(version);

  if (ver !== version) {
    setVer(version);
    setBuckets(null);
  }

  useLayoutEffect(() => {
    if (buckets || !src.current) return;
    const root = src.current;
    root.updateWorldMatrix(true, true);
    const inv = root.matrixWorld.clone().invert();
    const lists = new Map<string, { m: MatKey; cast: boolean; geos: THREE.BufferGeometry[] }>();
    const tmp = new THREE.Matrix4();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.userData.m) return;
      const m = mesh.userData.m as MatKey;
      const cast = mesh.castShadow && !NO_MEASURE.includes(m);
      const key = `${m}|${cast}`;
      const g = normalise(mesh.geometry);
      g.applyMatrix4(tmp.multiplyMatrices(inv, mesh.matrixWorld));
      let l = lists.get(key);
      if (!l) lists.set(key, (l = { m, cast, geos: [] }));
      l.geos.push(g);
    });
    const out: Bucket[] = [];
    lists.forEach((l, key) => {
      const geo = mergeGeometries(l.geos, false);
      l.geos.forEach((g) => g.dispose());
      if (!geo) return;
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
      out.push({ key, m: l.m, cast: l.cast, geo });
    });
    setBuckets(out);
    onSceneChanged();
  }, [buckets]);

  useLayoutEffect(() => () => buckets?.forEach((b) => b.geo.dispose()), [buckets]);

  if (!buckets)
    return (
      <group ref={src} name={name}>
        {children}
      </group>
    );
  return (
    <group name={name}>
      {buckets.map((b) => (
        <mesh
          key={b.key}
          geometry={b.geo}
          material={mats[b.m]}
          castShadow={b.cast}
          receiveShadow
          userData={{ m: b.m, merged: true, noMeasure: NO_MEASURE.includes(b.m) }}
        />
      ))}
    </group>
  );
}
