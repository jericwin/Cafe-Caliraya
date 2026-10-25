import { B, C, G, S } from '../../lib/primitives';
import type { MatKey } from '../../lib/materials';
import { blobGeo, seeded } from '../../lib/geometry';
import * as THREE from 'three';

type V3 = [number, number, number];
type Pt = { p: V3; rot?: number };

/** All furniture faces +Z in local space (the sitter looks towards +Z). */

export function Chair({ p, rot = 0, kind = 'wood' }: Pt & { kind?: 'wood' | 'rattan' | 'metal' }) {
  const frame: MatKey = kind === 'metal' ? 'blackSteel' : kind === 'rattan' ? 'oak' : 'walnut';
  const seat: MatKey = kind === 'rattan' ? 'rattan' : kind === 'metal' ? 'oak' : 'oak';
  const legs: V3[] = [
    [-0.19, 0.22, -0.19],
    [0.19, 0.22, -0.19],
    [-0.19, 0.22, 0.19],
    [0.19, 0.22, 0.19],
  ];
  return (
    <group position={p} rotation={[0, rot, 0]}>
      {legs.map((l, i) => (
        <B key={i} s={[0.032, 0.45, 0.032]} p={l} m={frame} />
      ))}
      <B s={[0.44, 0.035, 0.44]} p={[0, 0.46, 0]} m={seat} />
      <B s={[0.032, 0.42, 0.032]} p={[-0.19, 0.67, -0.2]} m={frame} />
      <B s={[0.032, 0.42, 0.032]} p={[0.19, 0.67, -0.2]} m={frame} />
      {kind === 'rattan' ? (
        <B s={[0.4, 0.3, 0.02]} p={[0, 0.72, -0.21]} r={[-0.08, 0, 0]} m="rattan" />
      ) : (
        <>
          <B s={[0.42, 0.09, 0.022]} p={[0, 0.83, -0.21]} r={[-0.1, 0, 0]} m={frame} />
          <B s={[0.42, 0.04, 0.02]} p={[0, 0.62, -0.205]} m={frame} />
        </>
      )}
      <B s={[0.36, 0.02, 0.02]} p={[0, 0.16, 0.19]} m={frame} />
    </group>
  );
}

export function Stool({ p, rot = 0, h = 0.75 }: Pt & { h?: number }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <C rt={0.18} h={0.04} p={[0, h, 0]} m="oak" seg={20} />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return <B key={i} s={[0.025, h, 0.025]} p={[Math.cos(a) * 0.13, h / 2, Math.sin(a) * 0.13]} r={[Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08]} m="blackSteel" />;
      })}
      <C rt={0.15} h={0.015} p={[0, 0.3, 0]} m="blackSteel" seg={16} open />
    </group>
  );
}

export function Table({ p, rot = 0, w = 0.75, d = 0.75, h = 0.75, round = false, top = 'oak' as MatKey }: Pt & { w?: number; d?: number; h?: number; round?: boolean; top?: MatKey }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      {round ? (
        <>
          <C rt={w / 2} h={0.035} p={[0, h - 0.018, 0]} m={top} seg={28} />
          <C rt={0.04} h={h - 0.05} p={[0, (h - 0.05) / 2 + 0.02, 0]} m="blackSteel" seg={12} />
          <C rt={0.24} rb={0.26} h={0.03} p={[0, 0.015, 0]} m="blackSteel" seg={20} />
        </>
      ) : (
        <>
          <B s={[w, 0.035, d]} p={[0, h - 0.018, 0]} m={top} />
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([sx, sz], i) => (
            <B key={i} s={[0.04, h - 0.035, 0.04]} p={[(sx * (w - 0.1)) / 2, (h - 0.035) / 2, (sz * (d - 0.1)) / 2]} m="blackSteel" />
          ))}
          <B s={[w - 0.12, 0.05, 0.02]} p={[0, h - 0.06, (d - 0.1) / 2]} m="blackSteel" />
          <B s={[w - 0.12, 0.05, 0.02]} p={[0, h - 0.06, -(d - 0.1) / 2]} m="blackSteel" />
        </>
      )}
      {/* cups / dressing */}
      <C rt={0.04} rb={0.032} h={0.09} p={[w * 0.12, h + 0.045, d * 0.1]} m="ceramic" seg={12} />
      <C rt={0.07} h={0.01} p={[w * 0.12, h + 0.005, d * 0.1]} m="ceramic" seg={14} />
    </group>
  );
}

/** Table with chairs arranged around it. */
export function TableSet({
  p,
  rot = 0,
  seats = 4,
  round = false,
  w,
  d,
  chair = 'wood',
  top,
}: Pt & { seats?: 2 | 4 | 6 | 8; round?: boolean; w?: number; d?: number; chair?: 'wood' | 'rattan' | 'metal'; top?: MatKey }) {
  const W = w ?? (seats === 2 ? 0.7 : seats === 4 ? 0.85 : seats === 6 ? 1.6 : 2.4);
  const D = d ?? (seats === 2 ? 0.7 : seats === 4 ? 0.85 : 0.9);
  const off = D / 2 + 0.22;
  const chairs: { p: V3; rot: number }[] = [];
  if (seats === 2) {
    chairs.push({ p: [0, 0, -off], rot: 0 }, { p: [0, 0, off], rot: Math.PI });
  } else if (seats === 4 && round) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      chairs.push({ p: [Math.sin(a) * (W / 2 + 0.2), 0, Math.cos(a) * (W / 2 + 0.2)], rot: a + Math.PI });
    }
  } else if (seats === 4) {
    chairs.push({ p: [0, 0, -off], rot: 0 }, { p: [0, 0, off], rot: Math.PI }, { p: [-(W / 2 + 0.22), 0, 0], rot: Math.PI / 2 }, { p: [W / 2 + 0.22, 0, 0], rot: -Math.PI / 2 });
  } else {
    const per = seats / 2 - 1;
    for (let i = 0; i < per; i++) {
      const x = -W / 2 + ((i + 0.5) / per) * W;
      chairs.push({ p: [x, 0, -off], rot: 0 }, { p: [x, 0, off], rot: Math.PI });
    }
    chairs.push({ p: [-(W / 2 + 0.25), 0, 0], rot: Math.PI / 2 }, { p: [W / 2 + 0.25, 0, 0], rot: -Math.PI / 2 });
  }
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Table p={[0, 0, 0]} w={W} d={D} round={round} top={top} />
      {chairs.map((c, i) => (
        <Chair key={i} p={c.p} rot={c.rot} kind={chair} />
      ))}
    </group>
  );
}

export function Sofa({ p, rot = 0, w = 2.0, fabric = 'fabricSand' as MatKey }: Pt & { w?: number; fabric?: MatKey }) {
  const n = Math.max(2, Math.round(w / 0.7));
  const cw = (w - 0.3) / n;
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <B s={[w, 0.22, 0.85]} p={[0, 0.2, 0]} m={fabric} />
      {Array.from({ length: n }, (_, i) => (
        <B key={i} s={[cw - 0.02, 0.14, 0.62]} p={[-w / 2 + 0.15 + cw * (i + 0.5), 0.38, 0.08]} m={fabric} />
      ))}
      {Array.from({ length: n }, (_, i) => (
        <B key={`b${i}`} s={[cw - 0.02, 0.42, 0.16]} p={[-w / 2 + 0.15 + cw * (i + 0.5), 0.62, -0.3]} r={[-0.12, 0, 0]} m={fabric} />
      ))}
      <B s={[w, 0.5, 0.12]} p={[0, 0.55, -0.37]} m={fabric} />
      <B s={[0.15, 0.32, 0.85]} p={[-w / 2 + 0.075, 0.47, 0]} m={fabric} />
      <B s={[0.15, 0.32, 0.85]} p={[w / 2 - 0.075, 0.47, 0]} m={fabric} />
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <B key={i} s={[0.04, 0.09, 0.04]} p={[(sx * (w - 0.12)) / 2, 0.045, (sz * 0.72) / 2]} m="walnut" />
      ))}
      <B s={[0.38, 0.32, 0.12]} p={[-w / 2 + 0.38, 0.62, -0.17]} r={[-0.2, 0.2, 0]} m="fabricRust" />
    </group>
  );
}

export function Armchair({ p, rot = 0, fabric = 'fabricOlive' as MatKey, rattan = false }: Pt & { fabric?: MatKey; rattan?: boolean }) {
  const frame: MatKey = rattan ? 'rattan' : fabric;
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <B s={[0.78, 0.2, 0.78]} p={[0, 0.25, 0]} m={frame} />
      <B s={[0.56, 0.14, 0.6]} p={[0, 0.42, 0.06]} m={rattan ? 'cushion' : fabric} />
      <B s={[0.78, 0.5, 0.14]} p={[0, 0.6, -0.32]} r={[-0.12, 0, 0]} m={frame} />
      <B s={[0.11, 0.24, 0.72]} p={[-0.335, 0.47, 0]} m={frame} />
      <B s={[0.11, 0.24, 0.72]} p={[0.335, 0.47, 0]} m={frame} />
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <B key={i} s={[0.04, 0.15, 0.04]} p={[sx * 0.34, 0.075, sz * 0.34]} m="walnut" />
      ))}
    </group>
  );
}

export function CoffeeTable({ p, rot = 0, w = 1.0, d = 0.6, round = false }: Pt & { w?: number; d?: number; round?: boolean }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      {round ? <C rt={w / 2} h={0.05} p={[0, 0.42, 0]} m="walnut" seg={28} /> : <B s={[w, 0.05, d]} p={[0, 0.42, 0]} m="walnut" />}
      {round ? <C rt={w / 2 - 0.08} h={0.38} p={[0, 0.2, 0]} m="rattan" seg={20} /> : <B s={[w - 0.1, 0.03, d - 0.1]} p={[0, 0.12, 0]} m="walnut" />}
      {!round &&
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], i) => <B key={i} s={[0.05, 0.4, 0.05]} p={[(sx * (w - 0.08)) / 2, 0.2, (sz * (d - 0.08)) / 2]} m="walnut" />)}
      <B s={[0.25, 0.04, 0.18]} p={[0.15, 0.465, 0]} m="bookB" />
      <C rt={0.05} rb={0.04} h={0.1} p={[-0.2, 0.495, 0.05]} m="ceramic" seg={12} />
    </group>
  );
}

export function Rug({ p, w, d, rot = 0 }: Pt & { w: number; d: number }) {
  return <B s={[w, 0.012, d]} p={[p[0], p[1] + 0.006, p[2]]} r={[0, rot, 0]} m="rug" cast={false} />;
}

export function Shelf({ p, rot = 0, w = 1.6, h = 2.0, d = 0.35, books = true }: Pt & { w?: number; h?: number; d?: number; books?: boolean }) {
  const shelves = Math.round(h / 0.4);
  const r = seeded(Math.floor(p[0] * 13 + p[2] * 7));
  const items = [];
  if (books)
    for (let s = 0; s < shelves; s++) {
      let x = -w / 2 + 0.05;
      while (x < w / 2 - 0.12) {
        const bw = 0.03 + r() * 0.04;
        const bh = 0.2 + r() * 0.12;
        if (r() < 0.15) {
          x += 0.15;
          continue;
        }
        const m: MatKey = (['bookA', 'bookB', 'bookC', 'oak'] as MatKey[])[Math.floor(r() * 4)];
        items.push(<B key={`${s}-${x}`} s={[bw, bh, d - 0.08]} p={[x + bw / 2, s * (h / shelves) + 0.03 + bh / 2, 0]} m={m} />);
        x += bw + 0.004;
      }
    }
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <B s={[0.03, h, d]} p={[-w / 2, h / 2, 0]} m="walnut" />
      <B s={[0.03, h, d]} p={[w / 2, h / 2, 0]} m="walnut" />
      <B s={[w, h, 0.02]} p={[0, h / 2, -d / 2 + 0.01]} m="walnut" />
      {Array.from({ length: shelves + 1 }, (_, s) => (
        <B key={s} s={[w, 0.03, d]} p={[0, s * (h / shelves) + 0.015, 0]} m="walnut" />
      ))}
      {items}
    </group>
  );
}

const PLANT_GEOS = new Map<number, THREE.BufferGeometry>();
function plantBlob(seed: number) {
  let g = PLANT_GEOS.get(seed);
  if (!g) {
    g = blobGeo(0.4, 2, seed, 0.35, 1.2);
    PLANT_GEOS.set(seed, g);
  }
  return g;
}

/** Indoor planter: terracotta or concrete pot with a leafy plant (fiddle-leaf / monstera character). */
export function Planter({ p, size = 1, pot = 'potTerracotta' as MatKey, seed = 1 }: { p: V3; size?: number; pot?: MatKey; seed?: number }) {
  const r = seeded(seed);
  return (
    <group position={p} scale={size}>
      <C rt={0.24} rb={0.18} h={0.42} p={[0, 0.21, 0]} m={pot} seg={18} />
      <C rt={0.22} h={0.02} p={[0, 0.41, 0]} m="soil" seg={16} />
      <C rt={0.02} h={0.6} p={[0, 0.7, 0]} m="bark" seg={6} />
      <G geometry={plantBlob(seed)} p={[0, 1.15, 0]} m="foliage" scale={[0.8, 1, 0.8]} />
      {Array.from({ length: 7 }, (_, i) => (
        <B key={i} s={[0.5, 0.5, 0.001]} p={[(r() - 0.5) * 0.5, 0.95 + r() * 0.5, (r() - 0.5) * 0.5]} r={[r() * 3, r() * 3, 0]} m="leaf" cast />
      ))}
    </group>
  );
}

export function SmallPlant({ p, seed = 3 }: { p: V3; seed?: number }) {
  return (
    <group position={p}>
      <C rt={0.08} rb={0.06} h={0.14} p={[0, 0.07, 0]} m="potConcrete" seg={12} />
      <G geometry={plantBlob(seed)} p={[0, 0.22, 0]} m="foliage" scale={0.28} />
    </group>
  );
}

export function Pendant({ p, kind = 'rattan', drop = 0.9 }: { p: V3; kind?: 'rattan' | 'linen' | 'globe'; drop?: number }) {
  return (
    <group position={p}>
      <C rt={0.004} h={drop} p={[0, -drop / 2, 0]} m="blackSteel" seg={4} cast={false} />
      <C rt={0.05} h={0.03} p={[0, -0.015, 0]} m="blackSteel" seg={10} cast={false} />
      {kind === 'rattan' && <S rad={0.24} p={[0, -drop - 0.12, 0]} scale={[1, 0.75, 1]} m="lampShade" cast={false} />}
      {kind === 'linen' && <C rt={0.12} rb={0.24} h={0.26} p={[0, -drop - 0.1, 0]} m="lampLinen" seg={20} cast={false} open />}
      {kind === 'globe' && <S rad={0.13} p={[0, -drop - 0.1, 0]} m="bulb" cast={false} />}
      {kind !== 'globe' && <S rad={0.05} p={[0, -drop - 0.12, 0]} m="bulb" cast={false} />}
    </group>
  );
}

export function FloorLamp({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <C rt={0.15} h={0.025} p={[0, 0.012, 0]} m="blackSteel" seg={16} />
      <C rt={0.012} h={1.45} p={[0, 0.74, 0]} m="brass" seg={8} />
      <C rt={0.14} rb={0.2} h={0.25} p={[0, 1.55, 0]} m="lampLinen" seg={18} open cast={false} />
      <S rad={0.04} p={[0, 1.5, 0]} m="bulb" cast={false} />
    </group>
  );
}

export function WallSconce({ p, rot = 0 }: Pt) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <B s={[0.12, 0.2, 0.04]} p={[0, 0, 0.02]} m="brass" cast={false} />
      <C rt={0.07} rb={0.05} h={0.16} p={[0, 0.03, 0.1]} m="lampLinen" seg={14} cast={false} />
    </group>
  );
}
