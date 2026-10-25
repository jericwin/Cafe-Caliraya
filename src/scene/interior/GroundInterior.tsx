import * as THREE from 'three';
import { useMemo } from 'react';
import { FFL0 } from '../../config/layout';
import { B, BB, C, G, Merge, S } from '../../lib/primitives';
import type { MatKey } from '../../lib/materials';
import { Armchair, Chair, CoffeeTable, FloorLamp, Planter, Rug, Shelf, SmallPlant, Sofa, Table, TableSet } from './furniture';

type V3 = [number, number, number];
const Y = FFL0;

// ------------------------------------------------------------------ dining & lounge

export function GroundFurniture() {
  return (
    <Merge name="gf-furniture">
      {/* north banquette under the window */}
      <BB min={[-7.85, Y, -5.9]} max={[-3.0, Y + 0.42, -5.35]} m="walnut" />
      <BB min={[-7.85, Y + 0.42, -5.85]} max={[-3.0, Y + 0.5, -5.37]} m="fabricOlive" />
      <BB min={[-7.85, Y + 0.5, -5.9]} max={[-3.0, Y + 0.9, -5.76]} m="fabricOlive" />
      {[-7.0, -5.4, -3.8].map((x) => (
        <group key={x}>
          <Table p={[x, Y, -4.95]} w={0.7} d={0.6} />
          <Chair p={[x, Y, -4.38]} rot={Math.PI} />
        </group>
      ))}
      <TableSet p={[-6.5, Y, -2.75]} seats={4} />
      <TableSet p={[-4.3, Y, -2.75]} seats={4} />
      <TableSet p={[-7.1, Y, 1.9]} seats={2} rot={Math.PI / 2} />
      <TableSet p={[-4.6, Y, 2.0]} seats={4} round w={0.9} />
      <TableSet p={[-2.6, Y, 2.0]} seats={2} round w={0.65} chair="rattan" />
      {/* lounge corner */}
      <Rug p={[-6.0, Y, 4.5]} w={3.2} d={2.4} />
      <Sofa p={[-6.0, Y, 5.35]} rot={Math.PI} w={2.3} />
      <Armchair p={[-6.9, Y, 3.55]} rot={0} />
      <Armchair p={[-5.1, Y, 3.55]} rot={0} rattan />
      <CoffeeTable p={[-6.0, Y, 4.45]} w={1.1} d={0.6} />
      <FloorLamp p={[-7.6, Y, 5.6]} />
      <Planter p={[-7.55, Y, 3.0]} seed={4} size={1.1} />
      <Planter p={[-2.75, Y, 5.55]} seed={5} pot="potConcrete" />
      <Planter p={[0.75, Y, 5.6]} seed={6} />
      <Planter p={[-7.55, Y, -1.6]} seed={7} size={0.9} />
      {/* under-stair planting */}
      {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
        <SmallPlant key={x} p={[x, Y, -5.4]} seed={10 + i} />
      ))}
      <BB min={[-1.6, Y, -5.85]} max={[2.2, Y + 0.25, -5.0]} m="stone" />
      {/* bench by entrance */}
      <BB min={[0.75, Y, 2.8]} max={[2.85, Y + 0.45, 3.25]} m="oak" />
      {/* artwork */}
      <B s={[1.2, 0.8, 0.03]} p={[-0.1, 2.0, -4.6]} m="bookC" cast={false} />
    </Merge>
  );
}

// ------------------------------------------------------------------ coffee bar

function EspressoMachine({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B s={[0.55, 0.42, 0.78]} p={[0, 0.21, 0]} m="stainless" />
      <B s={[0.5, 0.08, 0.74]} p={[0, 0.46, 0]} m="applianceBlack" />
      <B s={[0.12, 0.05, 0.7]} p={[0.27, 0.05, 0]} m="applianceBlack" />
      {[-0.18, 0.18].map((z) => (
        <group key={z}>
          <C rt={0.04} h={0.08} p={[0.3, 0.24, z]} r={[0, 0, Math.PI / 2]} m="chrome" />
          <B s={[0.16, 0.025, 0.05]} p={[0.4, 0.2, z]} m="blackSteel" />
        </group>
      ))}
      <C rt={0.007} h={0.25} p={[0.3, 0.2, 0.34]} r={[0.3, 0, 0]} m="chrome" />
      {Array.from({ length: 6 }, (_, i) => (
        <C key={i} rt={0.035} rb={0.028} h={0.07} p={[-0.1 + (i % 3) * 0.1, 0.535, -0.2 + Math.floor(i / 3) * 0.2]} m="ceramic" seg={10} />
      ))}
    </group>
  );
}

function Grinder({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B s={[0.2, 0.32, 0.18]} p={[0, 0.16, 0]} m="applianceBlack" />
      <C rt={0.08} rb={0.04} h={0.2} p={[0, 0.42, 0]} m="displayGlass" seg={12} />
      <C rt={0.065} rb={0.035} h={0.12} p={[0, 0.39, 0]} m="coffee" seg={12} />
      <B s={[0.08, 0.06, 0.1]} p={[0.11, 0.12, 0]} m="stainless" />
    </group>
  );
}

function PastryCase({ p }: { p: V3 }) {
  const items = [];
  for (let s = 0; s < 2; s++)
    for (let i = 0; i < 5; i++) {
      const m: MatKey = (['cardboard', 'bookC', 'oak'] as MatKey[])[(i + s) % 3];
      items.push(<S key={`${s}${i}`} rad={0.05} p={[0, 0.06 + s * 0.2, -0.38 + i * 0.19]} scale={[1, 0.6, 1.2]} m={m} />);
    }
  return (
    <group position={p}>
      <B s={[0.5, 0.02, 1.0]} p={[0, 0.01, 0]} m="walnut" />
      <B s={[0.46, 0.012, 0.96]} p={[0, 0.2, 0]} m="displayGlass" cast={false} />
      <B s={[0.5, 0.45, 1.0]} p={[0, 0.225, 0]} m="displayGlass" cast={false} />
      {items}
    </group>
  );
}

const MENU_GEO = new THREE.PlaneGeometry(2.4, 1.2);
MENU_GEO.rotateY(-Math.PI / 2);

export function CoffeeBar() {
  const top = Y + 1.05;
  return (
    <Merge name="coffee-bar">
      {/* front service counter */}
      <BB min={[0.5, Y, -3.9]} max={[1.2, top - 0.04, 1.6]} m="walnut" />
      <BB min={[0.45, Y + 0.1, -3.9]} max={[0.5, top - 0.06, 1.6]} m="woodClad" />
      <BB min={[0.38, top - 0.04, -3.95]} max={[1.25, top, 1.65]} m="terrazzo" />
      <BB min={[0.47, Y, -3.9]} max={[0.52, Y + 0.1, 1.6]} m="blackSteel" />
      {/* return with lower ADA-height section */}
      <BB min={[0.5, Y, 1.6]} max={[2.25, top - 0.04, 2.3]} m="walnut" />
      <BB min={[0.45, Y + 0.1, 2.3]} max={[2.25, top - 0.06, 2.35]} m="woodClad" />
      <BB min={[0.38, top - 0.04, 1.6]} max={[2.3, top, 2.4]} m="terrazzo" />
      {/* equipment */}
      <EspressoMachine p={[0.86, top, -2.55]} />
      <Grinder p={[0.86, top, -1.75]} />
      <Grinder p={[0.86, top, -1.45]} />
      <PastryCase p={[0.82, top, 0.95]} />
      <B s={[0.03, 0.22, 0.3]} p={[0.88, top + 0.12, -0.2]} r={[0, 0, 0.25]} m="screen" />
      <B s={[0.12, 0.06, 0.12]} p={[0.9, top + 0.03, -0.2]} m="plasticBlack" />
      {Array.from({ length: 5 }, (_, i) => (
        <C key={i} rt={0.045} rb={0.035} h={0.11} p={[0.9, top + 0.055 + i * 0.1, -3.5]} m="plasticWhite" seg={12} />
      ))}
      <C rt={0.06} h={0.14} p={[0.7, top + 0.07, 1.95]} m="displayGlass" seg={12} />
      {/* back bar */}
      <BB min={[2.3, Y, -3.6]} max={[2.93, Y + 0.86, -0.1]} m="walnut" />
      <BB min={[2.26, Y + 0.86, -3.62]} max={[2.93, Y + 0.9, -0.08]} m="terrazzo" />
      <BB min={[2.28, Y + 0.08, -3.4]} max={[2.31, Y + 0.8, -2.3]} m="displayGlass" />
      <BB min={[2.31, Y + 0.1, -3.38]} max={[2.9, Y + 0.12, -2.32]} m="stainless" />
      {/* sink, blender, kettle, cold brew */}
      <BB min={[2.45, Y + 0.84, -1.2]} max={[2.85, Y + 0.905, -0.75]} m="stainless" />
      <C rt={0.01} h={0.3} p={[2.85, Y + 1.05, -0.98]} m="chrome" />
      <B s={[0.15, 0.25, 0.15]} p={[2.6, Y + 1.03, -0.4]} m="applianceBlack" />
      <C rt={0.065} h={0.22} p={[2.6, Y + 1.26, -0.4]} m="displayGlass" seg={12} />
      <C rt={0.08} rb={0.09} h={0.2} p={[2.6, Y + 1.0, -1.6]} m="stainless" seg={14} />
      {[-2.2, -2.5, -2.8].map((z) => (
        <group key={z}>
          <C rt={0.08} h={0.35} p={[2.62, Y + 1.08, z]} m="displayGlass" seg={14} />
          <C rt={0.07} h={0.25} p={[2.62, Y + 1.04, z]} m="coffee" seg={14} />
        </group>
      ))}
      {/* open shelves with cups and jars above back bar */}
      {[1.45, 1.8].map((y) => (
        <group key={y}>
          <BB min={[2.65, Y + y, -3.5]} max={[2.93, Y + y + 0.03, -0.2]} m="oak" />
          {Array.from({ length: 10 }, (_, i) => (
            <C key={i} rt={0.04} rb={0.032} h={0.09} p={[2.8, Y + y + 0.075, -3.3 + i * 0.33]} m={i % 3 === 0 ? 'displayGlass' : 'ceramic'} seg={10} />
          ))}
        </group>
      ))}
      <G geometry={MENU_GEO} p={[2.915, Y + 2.65, -1.85]} m="menu" cast={false} />
    </Merge>
  );
}

// ------------------------------------------------------------------ kitchen

function SSTable({ min, max, h = 0.9, splash = false, sinks = 0 }: { min: [number, number]; max: [number, number]; h?: number; splash?: boolean; sinks?: number }) {
  const [x0, z0] = min;
  const [x1, z1] = max;
  const legs: V3[] = [
    [x0 + 0.05, 0, z0 + 0.05],
    [x1 - 0.05, 0, z0 + 0.05],
    [x0 + 0.05, 0, z1 - 0.05],
    [x1 - 0.05, 0, z1 - 0.05],
  ];
  const w = x1 - x0;
  const d = z1 - z0;
  const along = w > d;
  return (
    <group>
      <BB min={[x0, Y + h - 0.04, z0]} max={[x1, Y + h, z1]} m="stainless" />
      <BB min={[x0 + 0.03, Y + 0.18, z0 + 0.03]} max={[x1 - 0.03, Y + 0.2, z1 - 0.03]} m="stainless" />
      {legs.map((l, i) => (
        <C key={i} rt={0.02} h={h} p={[l[0], Y + h / 2, l[2]]} m="stainless" seg={8} />
      ))}
      {splash && (along ? <BB min={[x0, Y + h, z0]} max={[x1, Y + h + 0.15, z0 + 0.02]} m="stainless" /> : <BB min={[x1 - 0.02, Y + h, z0]} max={[x1, Y + h + 0.15, z1]} m="stainless" />)}
      {Array.from({ length: sinks }, (_, i) => {
        const sx = along ? x0 + ((i + 0.5) / sinks) * w : (x0 + x1) / 2;
        const sz = along ? (z0 + z1) / 2 : z0 + ((i + 0.5) / sinks) * d;
        return (
          <group key={i}>
            <B s={[along ? w / sinks - 0.08 : d - 0.12, 0.012, along ? d - 0.12 : d / sinks - 0.08]} p={[sx, Y + h + 0.001, sz]} m="applianceBlack" cast={false} />
            <C rt={0.012} h={0.35} p={[along ? sx : x1 - 0.06, Y + h + 0.17, along ? z0 + 0.06 : sz]} m="chrome" />
            <B s={along ? [0.02, 0.02, 0.22] : [0.22, 0.02, 0.02]} p={[along ? sx : x1 - 0.17, Y + h + 0.34, along ? z0 + 0.16 : sz]} m="chrome" />
          </group>
        );
      })}
    </group>
  );
}

function Pots({ x, z, y }: { x: number; z: number; y: number }) {
  return (
    <group>
      <C rt={0.14} h={0.18} p={[x, y + 0.09, z]} m="stainless" seg={16} />
      <C rt={0.12} h={0.12} p={[x + 0.32, y + 0.06, z]} m="stainless" seg={16} />
      <C rt={0.1} h={0.25} p={[x - 0.32, y + 0.125, z]} m="plasticWhite" seg={12} />
    </group>
  );
}

export function Kitchen() {
  return (
    <Merge name="kitchen">
      {/* north wall: 3-compartment sink, dishwasher, range + fryer under extraction hood */}
      <SSTable min={[4.0, -5.9]} max={[5.6, -5.2]} splash sinks={3} />
      <BB min={[5.6, Y, -5.9]} max={[6.2, Y + 0.86, -5.25]} m="stainless" />
      <BB min={[5.62, Y + 0.6, -5.26]} max={[6.18, Y + 0.64, -5.23]} m="applianceBlack" />
      <BB min={[6.2, Y, -5.9]} max={[7.1, Y + 0.88, -5.15]} m="stainless" />
      <BB min={[6.22, Y + 0.88, -5.88]} max={[7.08, Y + 0.92, -5.17]} m="applianceBlack" />
      {[6.42, 6.88].map((x) =>
        [-5.7, -5.35].map((z) => <C key={`${x}${z}`} rt={0.1} h={0.02} p={[x, Y + 0.93, z]} m="blackSteel" seg={14} open />),
      )}
      <BB min={[6.25, Y + 0.45, -5.16]} max={[7.05, Y + 0.85, -5.14]} m="applianceBlack" />
      <BB min={[7.1, Y, -5.9]} max={[7.9, Y + 0.9, -5.15]} m="stainless" />
      <BB min={[7.2, Y + 0.85, -5.8]} max={[7.5, Y + 0.91, -5.3]} m="applianceBlack" />
      <BB min={[7.55, Y + 0.85, -5.8]} max={[7.85, Y + 0.91, -5.3]} m="applianceBlack" />
      {/* hood */}
      <BB min={[6.1, Y + 2.05, -5.9]} max={[7.9, Y + 2.55, -4.95]} m="stainless" />
      <BB min={[6.6, Y + 2.55, -5.9]} max={[7.4, SLABB, -5.5]} m="stainless" />
      {/* wall shelf above sinks */}
      <BB min={[4.0, Y + 1.55, -5.9]} max={[5.6, Y + 1.58, -5.6]} m="stainless" />
      <Pots x={4.5} z={-5.75} y={Y + 1.58} />
      {/* upright freezer + reach-in refrigerator */}
      <BB min={[3.1, Y, -5.88]} max={[3.88, Y + 2.0, -5.05]} m="appliance" />
      <BB min={[3.86, Y + 1.0, -5.75]} max={[3.89, Y + 1.5, -5.7]} m="chrome" />
      <BB min={[3.88, Y + 1.7, -5.85]} max={[3.89, Y + 1.85, -5.1]} m="plasticBlack" />
      <BB min={[5.0, Y, -0.88]} max={[6.3, Y + 2.05, -0.1]} m="stainless" />
      <BB min={[5.645, Y + 0.08, -0.9]} max={[5.655, Y + 2.0, -0.88]} m="applianceBlack" />
      {[5.55, 5.75].map((x) => (
        <BB key={x} min={[x - 0.015, Y + 1.0, -0.94]} max={[x + 0.015, Y + 1.5, -0.9]} m="chrome" />
      ))}
      <BB min={[6.4, Y, -0.85]} max={[7.3, Y + 0.88, -0.1]} m="appliance" />
      <BB min={[6.42, Y + 0.88, -0.83]} max={[7.28, Y + 0.9, -0.12]} m="stainless" />
      <BB min={[6.45, Y + 0.7, -0.87]} max={[7.25, Y + 0.75, -0.85]} m="chrome" />
      {/* pass counter under the pickup hatch, with heat lamp */}
      <SSTable min={[3.1, -3.4]} max={[3.78, -0.2]} />
      <BB min={[3.1, Y + 1.6, -2.4]} max={[3.5, Y + 1.66, -1.0]} m="applianceBlack" />
      {/* centre prep island */}
      <SSTable min={[4.7, -3.6]} max={[6.3, -2.4]} />
      <B s={[0.5, 0.03, 0.35]} p={[5.2, Y + 0.915, -3.0]} m="oak" />
      <Pots x={5.8} z={-3.0} y={Y + 0.9} />
      {/* east prep under window */}
      <SSTable min={[7.2, -5.1]} max={[7.9, -3.45]} splash />
      {/* wire shelving */}
      <group>
        {[0.4, 0.9, 1.4, 1.9].map((y) => (
          <BB key={y} min={[7.45, Y + y, -1.9]} max={[7.9, Y + y + 0.02, -0.95]} m="stainless" />
        ))}
        <BB min={[7.45, Y, -1.9]} max={[7.47, Y + 1.95, -1.88]} m="stainless" />
        <BB min={[7.45, Y, -0.97]} max={[7.47, Y + 1.95, -0.95]} m="stainless" />
        <Pots x={7.68} z={-1.42} y={Y + 0.92} />
        <Pots x={7.68} z={-1.42} y={Y + 1.42} />
      </group>
      {/* hand wash sink by door */}
      <BB min={[3.1, Y + 0.75, -4.95]} max={[3.45, Y + 0.95, -4.75]} m="stainless" />
      {/* floor drain grates */}
      <BB min={[4.0, Y + 0.002, -4.75]} max={[7.0, Y + 0.006, -4.6]} m="grate" cast={false} />
      {/* trash / recycling */}
      <C rt={0.22} h={0.75} p={[7.6, Y + 0.375, -2.55]} m="plasticBlack" seg={14} />
    </Merge>
  );
}
const SLABB = 3.48;

// ------------------------------------------------------------------ dry storage

export function Storage() {
  return (
    <Merge name="storage">
      {[0, 1].map((k) => {
        const x0 = 3.2 + k * 1.05;
        return (
          <group key={k}>
            {[0.15, 0.6, 1.05, 1.5, 1.95].map((y) => (
              <BB key={y} min={[x0, Y + y, 1.85]} max={[x0 + 1.0, Y + y + 0.025, 2.3]} m="stainless" />
            ))}
            {[x0, x0 + 0.98].map((x) => (
              <BB key={x} min={[x, Y, 1.85]} max={[x + 0.02, Y + 2.0, 1.87]} m="stainless" />
            ))}
            {[0.6, 1.05, 1.5].map((y, i) => (
              <group key={y}>
                <BB min={[x0 + 0.05, Y + y + 0.025, 1.9]} max={[x0 + 0.45, Y + y + 0.3, 2.28]} m="cardboard" />
                <BB min={[x0 + 0.5, Y + y + 0.025, 1.9]} max={[x0 + 0.92, Y + y + 0.22 + i * 0.03, 2.28]} m={i === 1 ? 'plasticWhite' : 'cardboard'} />
              </group>
            ))}
          </group>
        );
      })}
      {/* pallet with green coffee bean sacks */}
      <BB min={[4.6, Y, 0.15]} max={[5.35, Y + 0.12, 0.65]} m="oak" />
      {[0, 1, 2].map((i) => (
        <S key={i} rad={0.3} p={[4.75 + (i % 2) * 0.38, Y + 0.3 + Math.floor(i / 2) * 0.32, 0.4]} scale={[0.7, 0.45, 0.8]} m="burlap" />
      ))}
    </Merge>
  );
}

// ------------------------------------------------------------------ accessible CR

export function Restroom() {
  const wcGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.19, 0.15, 0.4, 20);
    g.scale(1, 1, 1.3);
    return g;
  }, []);
  return (
    <Merge name="restroom">
      {/* water closet (back to the east wall, centred 0.45 m from side wall) */}
      <G geometry={wcGeo} p={[5.05, Y + 0.2, 5.42]} r={[0, Math.PI / 2, 0]} m="ceramic" />
      <BB min={[5.2, Y + 0.38, 5.24]} max={[5.43, Y + 0.8, 5.62]} m="ceramic" />
      <B s={[0.5, 0.025, 0.38]} p={[5.0, Y + 0.415, 5.42]} m="plasticWhite" />
      <B s={[0.08, 0.02, 0.04]} p={[5.3, Y + 0.81, 5.3]} m="chrome" />
      {/* grab bars */}
      <C rt={0.018} h={0.9} p={[4.85, Y + 0.85, 5.85]} r={[0, 0, Math.PI / 2]} m="chrome" />
      <C rt={0.018} h={0.6} p={[4.35, Y + 1.15, 5.85]} m="chrome" />
      <C rt={0.018} h={0.7} p={[4.95, Y + 0.75, 4.95]} r={[0, 0, Math.PI / 2]} m="chrome" />
      <B s={[0.04, 0.12, 0.08]} p={[5.4, Y + 0.75, 4.95]} m="chrome" />
      <C rt={0.06} h={0.12} p={[4.8, Y + 0.7, 5.84]} r={[0, 0, Math.PI / 2]} m="plasticWhite" seg={12} />
      {/* wall-hung lavatory with mirror and visible P-trap */}
      <BB min={[3.75, Y + 0.78, 2.47]} max={[4.35, Y + 0.86, 2.95]} m="ceramic" />
      <B s={[0.4, 0.02, 0.3]} p={[4.05, Y + 0.865, 2.72]} m="applianceBlack" cast={false} />
      <C rt={0.012} h={0.2} p={[4.05, Y + 0.95, 2.53]} m="chrome" />
      <B s={[0.02, 0.02, 0.14]} p={[4.05, Y + 1.04, 2.6]} m="chrome" />
      <C rt={0.02} h={0.25} p={[4.05, Y + 0.65, 2.75]} m="chrome" seg={10} />
      <C rt={0.02} h={0.25} p={[4.05, Y + 0.52, 2.62]} r={[Math.PI / 2, 0, 0]} m="chrome" seg={10} />
      <B s={[0.6, 0.85, 0.02]} p={[4.05, Y + 1.55, 2.485]} m="mirror" cast={false} />
      <B s={[0.1, 0.18, 0.08]} p={[4.55, Y + 1.15, 2.52]} m="plasticWhite" />
      {/* hand dryer, waste bin, exhaust fan */}
      <B s={[0.12, 0.3, 0.25]} p={[3.14, Y + 1.15, 2.95]} m="plasticWhite" />
      <C rt={0.14} h={0.4} p={[3.3, Y + 0.2, 5.6]} m="stainless" seg={14} />
      <B s={[0.03, 0.3, 0.3]} p={[5.42, Y + 2.85, 3.3]} m="plasticWhite" />
      <BB min={[4.6, Y + 0.002, 3.8]} max={[4.75, Y + 0.006, 3.95]} m="grate" cast={false} />
      {/* PWD / CR signage on corridor side */}
      <B s={[0.02, 0.22, 0.22]} p={[2.92, Y + 1.5, 3.2]} m="paintBlue" cast={false} />
      {/* baby changing station */}
      <BB min={[3.07, Y + 0.85, 4.8]} max={[3.2, Y + 1.4, 5.6]} m="plasticWhite" />
    </Merge>
  );
}

export function Utility() {
  return (
    <Merge name="utility">
      {/* main distribution panel + conduits */}
      <BB min={[6.8, Y + 1.25, 0.07]} max={[7.4, Y + 2.05, 0.24]} m="appliance" />
      <BB min={[6.82, Y + 1.27, 0.24]} max={[7.38, Y + 2.03, 0.25]} m="plasticBlack" />
      {[6.9, 7.1, 7.3].map((x) => (
        <C key={x} rt={0.018} h={1.4} p={[x, Y + 2.75, 0.15]} m="plasticWhite" seg={8} />
      ))}
      <BB min={[7.5, Y + 1.4, 0.07]} max={[7.8, Y + 1.8, 0.2]} m="appliance" />
      {/* water heater */}
      <C rt={0.25} h={1.2} p={[7.6, Y + 0.9, 0.5]} m="appliance" seg={18} />
      <C rt={0.02} h={1.2} p={[7.6, Y + 2.1, 0.5]} m="chrome" seg={8} />
      {/* lockers */}
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i}>
          <BB min={[5.65 + i * 0.36, Y, 5.45]} max={[5.99 + i * 0.36, Y + 1.85, 5.9]} m="carGrey" />
          <BB min={[5.92 + i * 0.36, Y + 1.0, 5.43]} max={[5.95 + i * 0.36, Y + 1.15, 5.45]} m="chrome" />
        </group>
      ))}
      {/* staff table */}
      <TableSet p={[6.7, Y, 3.0]} seats={2} chair="metal" rot={Math.PI / 2} />
      <Shelf p={[7.7, Y, 2.0]} rot={-Math.PI / 2} w={1.0} h={1.6} d={0.35} books={false} />
      {/* mop sink */}
      <BB min={[5.6, Y, 0.15]} max={[6.2, Y + 0.3, 0.65]} m="terrazzo" />
      <C rt={0.012} h={0.5} p={[5.9, Y + 0.9, 0.12]} m="chrome" />
    </Merge>
  );
}
