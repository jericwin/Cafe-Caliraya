import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CEIL1, FFL0, FFL1, SLAB_BOTTOM } from '../config/layout';
import { B, C, G, Merge, S } from '../lib/primitives';
import { taperedTube } from '../lib/geometry';
import { EMISSIVE_KEYS, useMats, type MatKey } from '../lib/materials';
import { runtime } from '../lib/sceneEvents';
import { useLevelVisibility, useStore, type Quality } from '../store/useStore';
import { FloorLamp, Pendant, WallSconce } from './interior/furniture';

type V3 = [number, number, number];

// ------------------------------------------------------------------ fixture placement (single source of truth)
const GF_C = SLAB_BOTTOM - 0.03;
const UF_C = CEIL1;
export const PENDANTS: { p: V3; kind: 'rattan' | 'linen' | 'globe'; drop: number; level: 0 | 1 }[] = [
  ...[-7, -5.4, -3.8].map((x) => ({ p: [x, GF_C, -4.95] as V3, kind: 'rattan' as const, drop: 1.45, level: 0 as const })),
  ...[-6.5, -4.3].map((x) => ({ p: [x, GF_C, -2.75] as V3, kind: 'linen' as const, drop: 1.35, level: 0 as const })),
  { p: [-4.6, GF_C, 2.0], kind: 'rattan', drop: 1.35, level: 0 },
  { p: [-2.6, GF_C, 2.0], kind: 'globe', drop: 1.5, level: 0 },
  { p: [-7.1, GF_C, 1.9], kind: 'globe', drop: 1.5, level: 0 },
  ...[-2.6, -0.6, 1.2].map((z) => ({ p: [0.85, GF_C, z] as V3, kind: 'rattan' as const, drop: 1.2, level: 0 as const })),
  ...[-5.7, -4.6, -3.5].map((x) => ({ p: [x, UF_C - 0.22, -0.1] as V3, kind: 'linen' as const, drop: 1.3, level: 1 as const })),
  ...[-6.8, -4.6, -2.4, -0.2, 2.0].map((x) => ({ p: [x, UF_C, 5.05] as V3, kind: 'globe' as const, drop: 1.5, level: 1 as const })),
  { p: [0.8, UF_C, -1.5], kind: 'rattan', drop: 1.2, level: 1 },
  { p: [-1.6, UF_C, 2.6], kind: 'rattan', drop: 1.4, level: 1 },
  { p: [1.4, UF_C, 2.6], kind: 'rattan', drop: 1.4, level: 1 },
  { p: [6.3, UF_C, -3.6], kind: 'linen', drop: 1.4, level: 1 },
  { p: [6.3, UF_C, -2.4], kind: 'linen', drop: 1.4, level: 1 },
];

interface LightSpec {
  pos: V3;
  kind: 'point' | 'spot';
  intensity: number;
  distance: number;
  color: string;
  tier: Quality; // minimum quality tier
  level: 0 | 1 | 2 | -1; // 2 = roof-mounted, -1 = site
  target?: V3;
  angle?: number;
}

// Kept deliberately few: every light is unrolled into every lit shader, and shader compile time on
// Windows (ANGLE / Direct3D) grows with it. Emissive fixtures + bloom carry the rest of the glow.
export const LIGHTS: LightSpec[] = [
  { pos: [-4.4, 2.5, -1.0], kind: 'point', intensity: 16, distance: 13, color: '#ffbf7a', tier: 'low', level: 0 },
  { pos: [-11.9, 2.7, 0], kind: 'point', intensity: 9, distance: 12, color: '#ffae5c', tier: 'low', level: -1 },
  { pos: [-2.5, 5.9, 0.5], kind: 'point', intensity: 16, distance: 13, color: '#ffbf7a', tier: 'medium', level: 1 },
  { pos: [2.0, 2.4, -1.0], kind: 'point', intensity: 8, distance: 9, color: '#ffc48a', tier: 'medium', level: 0 },
  { pos: [-1.0, 3.0, 7.6], kind: 'point', intensity: 6, distance: 9, color: '#ffbe7d', tier: 'high', level: -1 },
  { pos: [5.5, 3.1, -3.0], kind: 'point', intensity: 8, distance: 8, color: '#fff1de', tier: 'high', level: 0 },
  { pos: [6.3, 6.1, -2.0], kind: 'point', intensity: 6, distance: 8, color: '#ffc896', tier: 'high', level: 1 },
];

const TIER: Record<Quality, number> = { low: 0, medium: 1, high: 2 };

export function ArtificialLights() {
  const quality = useStore((s) => s.quality);
  const lighting = useStore((s) => s.layers.lighting);
  const vis = useLevelVisibility();
  const specs = useMemo(() => LIGHTS.filter((l) => TIER[l.tier] <= TIER[quality]), [quality]);
  const refs = useRef<(THREE.PointLight | THREE.SpotLight | null)[]>([]);
  const mats = useMats();
  const visRef = useRef(vis);
  visRef.current = vis;

  // lights stay in the scene permanently (intensity only): toggling them would force slow shader recompiles
  useFrame(() => {
    const on = lighting ? runtime.lightsOn : 0;
    const v = visRef.current;
    specs.forEach((s, i) => {
      const l = refs.current[i];
      if (!l) return;
      const shown = s.level === 0 ? v.ground : s.level === 1 ? v.upper : true;
      l.intensity = s.intensity * 2.4 * on * (shown ? 1 : 0);
      const off = s.level === 1 ? runtime.explodeUpper : 0;
      l.position.y = s.pos[1] + off;
    });
    for (const k of EMISSIVE_KEYS) {
      const m = mats[k] as THREE.MeshStandardMaterial;
      if (!m || !('emissiveIntensity' in m)) continue;
      const base = k === 'bulb' ? 3.2 : k === 'headlight' ? 0 : k === 'sign' ? 1.6 : k === 'capiz' ? 0.6 : 2.2;
      m.emissiveIntensity = base * on;
    }
  });

  return (
    <group name="artificial-lights">
      {specs.map((s, i) =>
        s.kind === 'point' ? (
          <pointLight key={i} ref={(r) => (refs.current[i] = r)} position={s.pos} intensity={0} distance={s.distance} decay={2} color={s.color} />
        ) : (
          <SpotLightWithTarget key={i} spec={s} setRef={(r) => (refs.current[i] = r)} />
        ),
      )}
    </group>
  );
}

function SpotLightWithTarget({ spec, setRef }: { spec: LightSpec; setRef: (l: THREE.SpotLight | null) => void }) {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...(spec.target ?? [spec.pos[0], 0, spec.pos[2]]));
    return o;
  }, [spec]);
  return (
    <>
      <primitive object={target} />
      <spotLight ref={setRef} position={spec.pos} target={target} angle={spec.angle ?? 0.8} penumbra={0.7} intensity={0} distance={spec.distance} decay={1.6} color={spec.color} />
    </>
  );
}

// ------------------------------------------------------------------ fixture meshes

export function FloorFixtures({ level }: { level: 0 | 1 }) {
  const y = level === 0 ? FFL0 : FFL1;
  return (
    <Merge name={`fixtures-${level}`}>
      {PENDANTS.filter((p) => p.level === level).map((p, i) => (
        <Pendant key={i} p={p.p} kind={p.kind} drop={p.drop} />
      ))}
      {level === 0 && (
        <>
          {/* exterior wall sconces on the lakeside stone wall */}
          {[-4.2, 4.2].map((z) => (
            <WallSconce key={z} p={[-8.12, y + 2.3, z]} rot={-Math.PI / 2} />
          ))}
          {/* track spots over the coffee bar */}
          <B s={[0.04, 0.04, 5.0]} p={[1.9, GF_C - 0.02, -1.2]} m="blackSteel" cast={false} />
        </>
      )}
      {level === 1 && (
        <>
          {[-4, 0, 4].map((z) => (
            <WallSconce key={z} p={[-8.12, y + 2.3, z]} rot={-Math.PI / 2} />
          ))}
          <FloorLamp p={[-7.5, y, 0.6]} />
        </>
      )}
    </Merge>
  );
}

/** Catenary festoon string with bulbs between two anchor points. */
function festoon(a: V3, b: V3, sag: number, bulbs: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const cable = taperedTube(curve, 0.006, 0.006, 24, 4);
  const bulbPos: V3[] = [];
  for (let i = 1; i < bulbs; i++) {
    const p = curve.getPoint(i / bulbs);
    bulbPos.push([p.x, p.y - 0.06, p.z]);
  }
  return { cable, bulbPos };
}

export const BOLLARDS: [number, number][] = [
  [9.2, 7.3],
  [11.6, 7.3],
  [14.0, 7.3],
  [9.2, 10.1],
  [11.6, 10.1],
  [-8.6, 10.6],
  [-3.2, 10.6],
  [1.4, 10.6],
  [-16.5, -2.0],
  [-19.5, 1.8],
  [-22.5, -1.4],
  [-25.5, 1.6],
  [-28.2, -1.2],
];

export function SiteFixtures() {
  const strings = useMemo(() => {
    const posts: V3[] = [
      [-14.1, 3.0, -7.3],
      [-14.1, 3.0, -2.5],
      [-14.1, 3.0, 2.5],
      [-14.1, 3.0, 7.3],
    ];
    const cols: V3[] = [
      [-10.55, 3.3, -5.8],
      [-10.55, 3.3, 0],
      [-10.55, 3.3, 5.8],
    ];
    const pairs: [V3, V3][] = [
      [posts[0], cols[0]],
      [posts[1], cols[0]],
      [posts[1], cols[1]],
      [posts[2], cols[1]],
      [posts[2], cols[2]],
      [posts[3], cols[2]],
      [posts[0], posts[1]],
      [posts[1], posts[2]],
      [posts[2], posts[3]],
    ];
    return { posts, spans: pairs.map(([a, b]) => festoon(a, b, 0.35, 9)) };
  }, []);
  const bulbMat: MatKey = 'bulb';
  return (
    <Merge name="site-fixtures">
      {strings.posts.map((p, i) => (
        <C key={i} rt={0.05} h={3.05} p={[p[0], 1.52 + 0.1, p[2]]} m="walnut" seg={8} />
      ))}
      {strings.spans.map((s, i) => (
        <group key={i}>
          <G geometry={s.cable} m="blackSteel" cast={false} />
          {s.bulbPos.map((b, j) => (
            <S key={j} rad={0.045} p={b} m={bulbMat} cast={false} ws={8} hs={6} />
          ))}
        </group>
      ))}
      {BOLLARDS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <C rt={0.08} h={0.75} p={[0, 0.375, 0]} m="blackSteel" seg={12} />
          <C rt={0.065} h={0.12} p={[0, 0.66, 0]} m="bulb" seg={12} cast={false} />
          <C rt={0.09} h={0.03} p={[0, 0.77, 0]} m="blackSteel" seg={12} />
        </group>
      ))}
    </Merge>
  );
}
