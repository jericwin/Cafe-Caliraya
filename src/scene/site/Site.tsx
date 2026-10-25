import * as THREE from 'three';
import { useMemo } from 'react';
import { AISLE, JETTY, JETTY_Y, PARKING, PLAZA, ROAD, DECK } from '../../config/layout';
import { B, BB, C, G, Merge, S } from '../../lib/primitives';
import { bananaGeo, blobGeo, broadleafGeo, carGeo, palmGeo, seeded } from '../../lib/geometry';
import { terrainHeight } from '../../lib/terrain';
import type { MatKey } from '../../lib/materials';
import { useStore } from '../../store/useStore';

type V3 = [number, number, number];
const PY = 0.03; // pavement top

// ------------------------------------------------------------------ parking

export const STALLS = {
  north: Array.from({ length: 8 }, (_, i) => 14 + i * 2.5), // x of stall left edge, z -9.0..-4
  southCars: Array.from({ length: 4 }, (_, i) => 23.6 + i * 2.5),
  moto: Array.from({ length: 6 }, (_, i) => 17.6 + i * 1.0),
  pwd: 14,
};

function StallLine({ x, z0, z1, m = 'paintWhite' }: { x: number; z0: number; z1: number; m?: MatKey }) {
  return <BB min={[x - 0.05, PY, z0]} max={[x + 0.05, PY + 0.006, z1]} m={m} cast={false} />;
}

export function Parking() {
  const P = PARKING;
  return (
    <Merge name="parking">
      {/* asphalt lot */}
      <BB min={[P.x0, -0.1, P.z0]} max={[P.x1, PY, P.z1]} m="asphalt" cast={false} />
      {/* north row */}
      {Array.from({ length: 9 }, (_, i) => (
        <StallLine key={`n${i}`} x={14 + i * 2.5} z0={-9.0} z1={-4.2} />
      ))}
      {STALLS.north.map((x) => (
        <BB key={`ws${x}`} min={[x + 0.5, PY, -8.75]} max={[x + 2.0, PY + 0.1, -8.6]} m="paintYellow" />
      ))}
      {/* south row: PWD + access aisle, motorcycles, cars */}
      <BB min={[14, PY, 2.2]} max={[16.4, PY + 0.005, 7.2]} m="paintBlue" cast={false} />
      {Array.from({ length: 6 }, (_, i) => (
        <BB key={`h${i}`} min={[16.45, PY, 2.6 + i * 0.75]} max={[17.55, PY + 0.006, 2.7 + i * 0.75]} m="paintWhite" cast={false} />
      ))}
      <BB min={[14.8, PY + 0.005, 4.2]} max={[15.6, PY + 0.008, 5.0]} m="paintWhite" cast={false} />
      {[14, 16.4, 17.6].map((x) => (
        <StallLine key={`p${x}`} x={x} z0={2.2} z1={7.2} />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <StallLine key={`m${i}`} x={17.6 + i} z0={4.9} z1={7.2} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <StallLine key={`s${i}`} x={23.6 + i * 2.5} z0={2.2} z1={7.0} />
      ))}
      {STALLS.southCars.map((x) => (
        <BB key={`ws2${x}`} min={[x + 0.5, PY, 6.6]} max={[x + 2.0, PY + 0.1, 6.75]} m="paintYellow" />
      ))}
      {/* aisle arrows + drop-off hatching */}
      {[20, 28, 34].map((x) => (
        <group key={x}>
          <BB min={[x, PY, -1.05]} max={[x + 1.6, PY + 0.006, -0.95]} m="paintWhite" cast={false} />
          <B s={[0.5, 0.006, 0.5]} p={[x + 1.6, PY + 0.003, -1]} r={[0, Math.PI / 4, 0]} m="paintWhite" cast={false} />
        </group>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <B key={`d${i}`} s={[3.6, 0.006, 0.12]} p={[11.7, PY + 0.003, -6.5 + i * 0.9]} r={[0, 0.6, 0]} m="paintYellow" cast={false} />
      ))}
      <BB min={[9.6, PY, AISLE.z1 + 0.6]} max={[9.75, PY + 0.006, 6.0]} m="paintYellow" cast={false} />
      {/* curbs */}
      <BB min={[P.x0, 0, P.z0 - 0.15]} max={[P.x1, 0.15, P.z0]} m="curb" />
      <BB min={[17.6, 0, P.z1]} max={[P.x1, 0.15, P.z1 + 0.15]} m="curb" />
      <BB min={[P.x0 - 0.15, 0, P.z0 - 0.15]} max={[P.x0, 0.15, AISLE.z0 - 3]} m="curb" />
      <BB min={[P.x0 - 0.15, 0, AISLE.z1 + 1.5]} max={[P.x0, 0.15, P.z1]} m="curb" />
      {/* trench drain + catch basins */}
      <BB min={[10.1, PY - 0.01, -8.8]} max={[10.35, PY + 0.004, 6.8]} m="grate" cast={false} />
      {[
        [21, -9.0],
        [31, -9.0],
        [26, 7.0],
      ].map(([x, z]) => (
        <BB key={`cb${x}`} min={[x - 0.3, PY, z - 0.3]} max={[x + 0.3, PY + 0.008, z + 0.3]} m="grate" cast={false} />
      ))}
      {/* walkway to plaza + plaza paving */}
      <BB min={[12, -0.1, 7.55]} max={[17.6, 0.06, 9.9]} m="paving" cast={false} />
      <BB min={[PLAZA.x0, -0.1, PLAZA.z0]} max={[PLAZA.x1, 0.06, PLAZA.z1]} m="paving" cast={false} />
      <BB min={[8.3, -0.1, AISLE.z1 + 0.4]} max={[9.5, 0.06, PLAZA.z0]} m="paving" cast={false} />
      <BB min={[8.1, -0.1, -6.2]} max={[9.5, 0.06, AISLE.z1 + 0.4]} m="paving" cast={false} />
      <BB min={[PLAZA.x0 - 0.12, 0, PLAZA.z1]} max={[PLAZA.x1, 0.12, PLAZA.z1 + 0.12]} m="curb" />
      {/* path along the south of the deck to the lawn */}
      <BB min={[DECK.x0 - 0.2, -0.1, DECK.z1]} max={[PLAZA.x0, 0.06, DECK.z1 + 1.6]} m="paving" cast={false} />
      {/* parking light poles */}
      {[17, 29].map((x) => (
        <group key={`lp${x}`}>
          <C rt={0.07} rb={0.1} h={7.6} p={[x, 3.8, -9.9]} m="blackSteel" seg={10} />
          <B s={[0.12, 0.1, 1.3]} p={[x, 7.55, -9.3]} m="blackSteel" />
          <B s={[0.5, 0.08, 0.3]} p={[x, 7.48, -8.75]} m="blackSteel" />
          <B s={[0.44, 0.02, 0.24]} p={[x, 7.435, -8.75]} m="headlight" cast={false} />
        </group>
      ))}
      {/* entrance pylon sign */}
      <BB min={[36.2, 0, 1.7]} max={[36.8, 0.7, 4.3]} m="stone" />
      <BB min={[36.4, 0.7, 1.8]} max={[36.6, 1.75, 4.2]} m="walnut" />
    </Merge>
  );
}

const SIGN_GEO = new THREE.PlaneGeometry(2.2, 0.55);
SIGN_GEO.rotateY(Math.PI / 2);

export function SiteSign() {
  return (
    <Merge name="site-sign">
      <G geometry={SIGN_GEO} p={[36.605, 1.22, 3.0]} m="sign" cast={false} />
    </Merge>
  );
}

// ------------------------------------------------------------------ road (follows the terrain)

export function Road() {
  const geos = useMemo(() => {
    const mk = (x0: number, x1: number, lift: number, seg = 200) => {
      const pos: number[] = [];
      const uv: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= seg; i++) {
        const z = ROAD.z0 + ((ROAD.z1 - ROAD.z0) * i) / seg;
        for (const x of [x0, x1]) {
          const y = Math.max(terrainHeight(x, z), terrainHeight((x0 + x1) / 2, z)) + lift;
          pos.push(x, Math.max(y, 0.0 + lift - 0.02), z);
          uv.push(x, z);
        }
        if (i < seg) {
          const a = i * 2;
          idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    const dashes: THREE.BufferGeometry[] = [];
    return {
      road: mk(ROAD.x0, ROAD.x1, 0.04),
      shoulderW: mk(ROAD.x0 - 1.2, ROAD.x0, 0.02, 120),
      shoulderE: mk(ROAD.x1, ROAD.x1 + 1.2, 0.02, 120),
      edgeW: mk(ROAD.x0 + 0.2, ROAD.x0 + 0.32, 0.05),
      edgeE: mk(ROAD.x1 - 0.32, ROAD.x1 - 0.2, 0.05),
      centre: mk((ROAD.x0 + ROAD.x1) / 2 - 0.06, (ROAD.x0 + ROAD.x1) / 2 + 0.06, 0.05),
      dashes,
    };
  }, []);
  return (
    <Merge name="road">
      <G geometry={geos.road} m="asphalt" cast={false} />
      <G geometry={geos.shoulderW} m="gravel" cast={false} />
      <G geometry={geos.shoulderE} m="gravel" cast={false} />
      <G geometry={geos.edgeW} m="paintWhite" cast={false} />
      <G geometry={geos.edgeE} m="paintWhite" cast={false} />
      <G geometry={geos.centre} m="paintYellow" cast={false} />
    </Merge>
  );
}

// ------------------------------------------------------------------ vehicles

function Car({ p, rot, paint, type = 'sedan' }: { p: V3; rot: number; paint: MatKey; type?: 'sedan' | 'suv' }) {
  const g = carGeo(type);
  const L = type === 'suv' ? 4.6 : 4.5;
  const wx = L / 2 - 0.85;
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <G geometry={g.trunk} m={paint} />
      <G geometry={g.leaves} m="carGlass" />
      {[
        [-wx, -0.78],
        [wx, -0.78],
        [-wx, 0.78],
        [wx, 0.78],
      ].map(([x, z], i) => (
        <group key={i}>
          <C rt={0.33} h={0.22} p={[x, 0.33, z]} r={[Math.PI / 2, 0, 0]} m="rubber" seg={18} />
          <C rt={0.2} h={0.23} p={[x, 0.33, z]} r={[Math.PI / 2, 0, 0]} m="chrome" seg={12} />
        </group>
      ))}
      <B s={[0.05, 0.12, 0.35]} p={[L / 2 + 0.03, 0.62, -0.55]} m="headlight" cast={false} />
      <B s={[0.05, 0.12, 0.35]} p={[L / 2 + 0.03, 0.62, 0.55]} m="headlight" cast={false} />
      <B s={[0.04, 0.1, 0.4]} p={[-L / 2 - 0.03, 0.68, -0.55]} m="carRed" cast={false} />
      <B s={[0.04, 0.1, 0.4]} p={[-L / 2 - 0.03, 0.68, 0.55]} m="carRed" cast={false} />
      <B s={[L - 0.3, 0.02, 1.5]} p={[0, 0.2, 0]} m="rubber" cast={false} />
    </group>
  );
}

function Motorcycle({ p, rot, paint }: { p: V3; rot: number; paint: MatKey }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      {[-0.65, 0.65].map((x) => (
        <C key={x} rt={0.3} h={0.1} p={[x, 0.3, 0]} r={[Math.PI / 2, 0, 0]} m="rubber" seg={16} />
      ))}
      <B s={[0.9, 0.3, 0.28]} p={[0, 0.55, 0]} m={paint} />
      <B s={[0.6, 0.1, 0.26]} p={[-0.2, 0.78, 0]} m="leather" />
      <B s={[0.05, 0.5, 0.05]} p={[0.55, 0.75, 0]} r={[0, 0, -0.35]} m="chrome" />
      <B s={[0.04, 0.04, 0.6]} p={[0.65, 1.0, 0]} m="blackSteel" />
      <B s={[0.12, 0.12, 0.16]} p={[0.75, 0.85, 0]} m="headlight" cast={false} />
    </group>
  );
}

export function Vehicles() {
  return (
    <Merge name="vehicles">
      <Car p={[15.25, 0.03, -6.6]} rot={Math.PI / 2} paint="carWhite" />
      <Car p={[20.25, 0.03, -6.6]} rot={Math.PI / 2} paint="carGrey" type="suv" />
      <Car p={[22.75, 0.03, -6.6]} rot={Math.PI / 2} paint="carRed" />
      <Car p={[30.25, 0.03, -6.6]} rot={Math.PI / 2} paint="carBlue" />
      <Car p={[24.85, 0.03, 4.6]} rot={-Math.PI / 2} paint="carWhite" type="suv" />
      <Car p={[29.85, 0.03, 4.6]} rot={-Math.PI / 2} paint="carGrey" />
      <Car p={[11.6, 0.03, -2.0]} rot={Math.PI * 0.62} paint="carBlue" />
      <Motorcycle p={[18.1, 0.03, 6.0]} rot={Math.PI / 2} paint="carRed" />
      <Motorcycle p={[19.1, 0.03, 6.0]} rot={Math.PI / 2} paint="applianceBlack" />
      <Motorcycle p={[21.1, 0.03, 6.0]} rot={Math.PI / 2} paint="carBlue" />
    </Merge>
  );
}

// ------------------------------------------------------------------ landscape

const PALMS: [number, number, number][] = [
  [-18.5, -11, 0],
  [-21.5, -8.4, 1],
  [-25, -13.5, 2],
  [-17.5, 12.4, 3],
  [-22, 10.5, 1],
  [-26.5, 15.5, 0],
  [-29.5, -6.5, 2],
  [-30, 7.5, 3],
  [-10, 12.2, 1],
  [12.8, 11.5, 2],
  [18.5, 10.8, 0],
  [25, 10.8, 3],
  [31, 10.6, 1],
  [22.6, -11.2, 2],
  [24.6, -11.6, 0],
  [34.5, -11.2, 3],
  [-14.8, -9.4, 1],
  [-15.2, 9.6, 2],
];
const BROADLEAF: [number, number, number][] = [
  [-4, -13, 0],
  [4.5, -13.5, 1],
  [12, -15, 2],
  [-12, -16, 3],
  [-3, 25, 1],
  [12, 24, 2],
  [-19, 24, 0],
  [-34, 26, 3],
  [-36, -24, 2],
  [48, -14, 1],
  [50, 12, 0],
  [26, -17.5, 3],
  [16, -18, 1],
  [36, 16, 2],
  [-24, -26, 0],
  [2, -24, 3],
];
const BANANAS: [number, number][] = [
  [9.0, -9.0],
  [11.5, -10.5],
  [-9.2, -7.4],
  [-9.4, 9.6],
  [14, -10.8],
];

function ShrubBed({ p, n = 6, spread = 2.2, flowers, seed = 1 }: { p: V3; n?: number; spread?: number; flowers?: MatKey; seed?: number }) {
  const r = seeded(seed * 31);
  const blobs = useMemo(() => [0, 1, 2].map((i) => blobGeo(0.55, 2, seed + i, 0.3, 0.8)), [seed]);
  const items = [];
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * spread;
    const z = (r() - 0.5) * spread * 0.6;
    const s = 0.6 + r() * 0.6;
    items.push(<G key={i} geometry={blobs[i % 3]} p={[x, s * 0.35, z]} scale={[s, s, s]} m={r() > 0.5 ? 'foliage' : 'foliageDark'} />);
    if (flowers)
      for (let k = 0; k < 6; k++)
        items.push(<S key={`${i}f${k}`} rad={0.07} p={[x + (r() - 0.5) * s, s * 0.55 + r() * s * 0.25, z + (r() - 0.5) * s]} m={flowers} cast={false} ws={6} hs={4} />);
  }
  return <group position={p}>{items}</group>;
}

export function Landscape() {
  const quality = useStore((s) => s.quality);
  const extra = quality !== 'low';
  const stepping = useMemo(() => {
    const out: { p: V3; r: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const x = DECK.x0 - 1.0 - i * 0.78;
      const z = Math.sin(i * 0.35) * 1.2;
      out.push({ p: [x, terrainHeight(x, z) + 0.03, z], r: Math.sin(i * 1.7) * 0.4 });
    }
    return out;
  }, []);
  const rocks = useMemo(() => {
    const r = seeded(77);
    return Array.from({ length: 14 }, (_, i) => {
      const z = -22 + i * 3.3 + r() * 2;
      const x = -30.5 + Math.sin(z * 0.045) * 3 + r() * 2;
      return { p: [x, terrainHeight(x, z) + 0.1, z] as V3, s: 0.4 + r() * 0.8, g: i % 3 };
    });
  }, []);
  const rockGeos = useMemo(() => [0, 1, 2].map((i) => blobGeo(0.6, 1, 20 + i, 0.35, 0.6)), []);
  return (
    <Merge name="landscape" version={quality}>
      {PALMS.map(([x, z, v], i) => (
        <group key={`p${i}`} position={[x, terrainHeight(x, z), z]} rotation={[0, i * 1.7, 0]}>
          <G geometry={palmGeo(v).trunk} m="palmBark" />
          <G geometry={palmGeo(v).leaves} m="frond" />
        </group>
      ))}
      {BROADLEAF.slice(0, extra ? BROADLEAF.length : 9).map(([x, z, v], i) => {
        const g = broadleafGeo(v);
        return (
          <group key={`b${i}`} position={[x, terrainHeight(x, z) - 0.05, z]} rotation={[0, i * 2.1, 0]} scale={0.9 + (i % 3) * 0.15}>
            <G geometry={g.trunk} m="bark" />
            <G geometry={g.leaves} m={i % 2 ? 'leaf' : 'leafDark'} />
            {g.core && <G geometry={g.core} m="foliageDark" />}
          </group>
        );
      })}
      {BANANAS.map(([x, z], i) => (
        <group key={`ba${i}`} position={[x, terrainHeight(x, z), z]} rotation={[0, i, 0]}>
          <G geometry={bananaGeo(i % 2).trunk} m="foliage" />
          <G geometry={bananaGeo(i % 2).leaves} m="foliage" />
        </group>
      ))}
      {/* foundation planting & beds */}
      <ShrubBed p={[-4, 0, -7.0]} n={9} spread={7.5} seed={2} />
      <ShrubBed p={[4.5, 0, -7.0]} n={8} spread={6.5} seed={3} />
      <ShrubBed p={[-15, 0, -7.8]} n={6} spread={3} flowers="flowerPink" seed={4} />
      <ShrubBed p={[-15, 0, 7.8]} n={6} spread={3} flowers="flowerPink" seed={5} />
      <ShrubBed p={[36.5, 0, 6]} n={6} spread={3} flowers="flowerPink" seed={6} />
      <ShrubBed p={[24, 0, -10.6]} n={10} spread={18} seed={7} />
      {extra && <ShrubBed p={[24, 0, 8.7]} n={8} spread={12} flowers="flowerYellow" seed={8} />}
      <ShrubBed p={[10.5, 0, 11.5]} n={4} spread={2} flowers="flowerYellow" seed={9} />
      {/* plaza planters */}
      {[-7.5, 9.5].map((x) => (
        <group key={x}>
          <BB min={[x - 0.6, 0.06, 6.4]} max={[x + 0.6, 0.6, 7.6]} m="curb" />
          <ShrubBed p={[x, 0.45, 7.0]} n={3} spread={0.9} flowers="flowerPink" seed={x > 0 ? 12 : 13} />
        </group>
      ))}
      {/* stepping stones from the deck to the jetty */}
      {stepping.map((s, i) => (
        <B key={`st${i}`} s={[0.55, 0.06, 0.75]} p={s.p} r={[0, s.r, 0]} m="steppingStone" />
      ))}
      {rocks.map((r, i) => (
        <G key={`r${i}`} geometry={rockGeos[r.g]} p={r.p} scale={r.s} m="curb" />
      ))}
      <Jetty />
      {/* lawn benches facing the lake */}
      {[-6, 6].map((z) => (
        <group key={z} position={[-24, terrainHeight(-24, z), z]} rotation={[0, -Math.PI / 2, 0]}>
          <B s={[1.6, 0.05, 0.42]} p={[0, 0.45, 0]} m="oak" />
          <B s={[1.6, 0.35, 0.04]} p={[0, 0.7, -0.2]} r={[-0.15, 0, 0]} m="oak" />
          <B s={[0.06, 0.45, 0.42]} p={[-0.7, 0.22, 0]} m="blackSteel" />
          <B s={[0.06, 0.45, 0.42]} p={[0.7, 0.22, 0]} m="blackSteel" />
        </group>
      ))}
    </Merge>
  );
}

function Jetty() {
  const J = JETTY;
  const posts = [];
  for (let x = J.x0 + 0.5; x <= J.x1; x += 2.2) for (const z of [J.z0 - 0.05, J.z1 + 0.05]) posts.push(<C key={`${x}${z}`} rt={0.09} h={3.2} p={[x, JETTY_Y - 1.5, z]} m="walnut" seg={8} />);
  return (
    <group>
      <BB min={[J.x0, JETTY_Y - 0.12, J.z0]} max={[J.x1, JETTY_Y, J.z1]} m="deck" />
      <BB min={[J.x0 - 0.5, JETTY_Y - 0.12, J.z0 - 1.8]} max={[J.x0 + 4.5, JETTY_Y, J.z1 + 1.8]} m="deck" />
      {posts}
      {[J.z0 - 1.75, J.z1 + 1.75].map((z) => (
        <group key={z}>
          <BB min={[J.x0 - 0.45, JETTY_Y, z - 0.04]} max={[J.x0 + 4.45, JETTY_Y + 0.95, z + 0.04]} m="walnut" />
        </group>
      ))}
      <BB min={[J.x0 - 0.5, JETTY_Y, J.z0 - 1.8]} max={[J.x0 - 0.4, JETTY_Y + 0.95, J.z1 + 1.8]} m="walnut" />
      {/* benches at the end of the jetty facing the sunset */}
      {[-1.0, 1.0].map((z) => (
        <group key={z} position={[J.x0 + 1.2, JETTY_Y, z]} rotation={[0, -Math.PI / 2, 0]}>
          <B s={[1.4, 0.05, 0.42]} p={[0, 0.45, 0]} m="oak" />
          <B s={[0.06, 0.45, 0.4]} p={[-0.6, 0.22, 0]} m="walnut" />
          <B s={[0.06, 0.45, 0.4]} p={[0.6, 0.22, 0]} m="walnut" />
        </group>
      ))}
      {[J.x0 + 4, J.x1 - 1].map((x) => (
        <group key={x}>
          <C rt={0.06} h={1.2} p={[x, JETTY_Y + 0.6, J.z1 + 0.05]} m="blackSteel" seg={8} />
          <C rt={0.09} h={0.2} p={[x, JETTY_Y + 1.25, J.z1 + 0.05]} m="bulb" seg={10} cast={false} />
        </group>
      ))}
    </group>
  );
}
