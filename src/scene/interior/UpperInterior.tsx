import * as THREE from 'three';
import { FFL1 } from '../../config/layout';
import { B, BB, C, G, Merge } from '../../lib/primitives';
import { Armchair, CoffeeTable, FloorLamp, Planter, Rug, Shelf, SmallPlant, Sofa, Stool, TableSet } from './furniture';

const Y = FFL1;

const SCREEN = new THREE.PlaneGeometry(1.6, 0.9);
SCREEN.rotateY(Math.PI);

export function UpperFurniture() {
  return (
    <Merge name="uf-furniture">
      {/* north reading corner */}
      <Shelf p={[-6.3, Y, -5.7]} w={2.6} h={2.1} />
      <Armchair p={[-7.2, Y, -4.4]} rot={Math.PI * 0.75} />
      <Armchair p={[-5.4, Y, -4.4]} rot={-Math.PI * 0.75} rattan />
      <CoffeeTable p={[-6.3, Y, -4.0]} w={0.55} round />
      <FloorLamp p={[-4.4, Y, -5.6]} />
      {/* communal table */}
      <TableSet p={[-4.6, Y, -0.1]} seats={8} w={2.8} d={1.0} top="walnut" />
      {/* window couples along the south glass */}
      {[-6.8, -4.6, -2.4, -0.2, 2.0].map((x) => (
        <TableSet key={x} p={[x, Y, 5.05]} seats={2} rot={Math.PI / 2} chair="rattan" />
      ))}
      {/* sofa lounge */}
      <Rug p={[0.8, Y, -1.5]} w={3.0} d={2.6} />
      <Sofa p={[0.8, Y, -2.55]} w={2.2} fabric="fabricOlive" />
      <Sofa p={[0.8, Y, -0.45]} rot={Math.PI} w={2.2} fabric="fabricSand" />
      <CoffeeTable p={[0.8, Y, -1.5]} w={1.2} d={0.6} />
      <Armchair p={[-0.9, Y, -1.5]} rot={Math.PI / 2} fabric="fabricRust" />
      <TableSet p={[-1.6, Y, 2.6]} seats={4} round w={0.9} />
      <TableSet p={[1.4, Y, 2.6]} seats={4} />
      <Planter p={[3.9, Y, 5.5]} seed={21} size={1.1} />
      <Planter p={[-7.6, Y, 3.6]} seed={22} pot="potConcrete" />
      <Planter p={[-7.55, Y, -2.0]} seed={23} size={0.85} />
      <Planter p={[3.1, Y, -2.2]} seed={24} size={0.9} />
      {/* function room */}
      <TableSet p={[6.3, Y, -3.0]} seats={8} w={2.6} d={1.0} rot={Math.PI / 2} top="walnut" />
      <G geometry={SCREEN} p={[6.3, Y + 1.6, -0.15]} m="screen" />
      <BB min={[5.3, Y, -0.6]} max={[7.3, Y + 0.6, -0.14]} m="walnut" />
      <Planter p={[4.95, Y, -5.5]} seed={25} size={0.9} />
      <SmallPlant p={[7.0, Y + 0.6, -0.35]} seed={26} />
      {/* self-service station */}
      <BB min={[4.75, Y, 0.07]} max={[7.9, Y + 0.88, 0.7]} m="walnut" />
      <BB min={[4.72, Y + 0.88, 0.07]} max={[7.92, Y + 0.92, 0.73]} m="terrazzo" />
      <B s={[0.32, 0.5, 0.32]} p={[5.2, Y + 1.17, 0.35]} m="plasticWhite" />
      <C rt={0.13} h={0.32} p={[5.2, Y + 1.58, 0.35]} m="displayGlass" seg={14} />
      {[5.8, 6.1, 6.4].map((x) => (
        <C key={x} rt={0.08} rb={0.09} h={0.32} p={[x, Y + 1.08, 0.35]} m="stainless" seg={14} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <C key={i} rt={0.04} rb={0.032} h={0.09} p={[6.9 + (i % 3) * 0.11, Y + 0.965 + Math.floor(i / 3) * 0.09, 0.35]} m="ceramic" seg={10} />
      ))}
      <C rt={0.2} h={0.7} p={[7.65, Y + 0.35, 1.0]} m="plasticBlack" seg={14} />
      <BB min={[4.75, Y + 1.5, 0.07]} max={[7.9, Y + 1.53, 0.35]} m="oak" />
      {/* reading nook */}
      <Shelf p={[6.3, Y, 2.6]} w={2.8} h={1.1} />
      <Armchair p={[5.4, Y, 4.3]} rot={Math.PI / 2} fabric="fabricSand" />
      <Armchair p={[7.2, Y, 4.6]} rot={-Math.PI / 2} />
      <CoffeeTable p={[6.3, Y, 4.4]} w={0.5} round />
      <FloorLamp p={[7.6, Y, 5.6]} />
      <SmallPlant p={[6.3, Y + 1.12, 2.6]} seed={27} />
    </Merge>
  );
}

/** Sunset balcony: bar ledge facing the lake, stools and lounge chairs. */
export function BalconyFurniture() {
  const stools = [-4.6, -3.7, -2.8, -1.9, 1.9, 2.8, 3.7, 4.6];
  return (
    <Merge name="balcony-furniture">
      <BB min={[-10.62, Y + 1.0, -5.3]} max={[-10.3, Y + 1.04, 5.3]} m="walnut" />
      {[-5.0, -2.5, 2.5, 5.0].map((z) => (
        <B key={z} s={[0.04, 1.0, 0.04]} p={[-10.42, Y + 0.5, z]} m="blackSteel" />
      ))}
      {stools.map((z) => (
        <Stool key={z} p={[-10.0, Y, z]} />
      ))}
      <Armchair p={[-9.6, Y, -0.65]} rot={-Math.PI / 2 - 0.3} rattan />
      <Armchair p={[-9.6, Y, 0.75]} rot={-Math.PI / 2 + 0.3} rattan />
      <CoffeeTable p={[-10.2, Y, 0.05]} w={0.5} round />
      <SmallPlant p={[-8.4, Y, -5.6]} seed={30} />
      <SmallPlant p={[-8.4, Y, 5.6]} seed={31} />
    </Merge>
  );
}

/** Deck and plaza furniture (outdoor). */
export function OutdoorFurniture() {
  const DY = 0.15;
  return (
    <Merge name="outdoor-furniture">
      {/* covered deck under the balcony */}
      {[-4.4, -2.6, 2.6, 4.4].map((z) => (
        <TableSet key={z} p={[-9.6, DY, z]} seats={2} rot={Math.PI / 2} chair="rattan" />
      ))}
      {/* open deck — sunset seating */}
      {[-5.3, -1.9, 1.9, 5.3].map((z, i) => (
        <TableSet key={z} p={[-12.6, DY, z]} seats={4} round w={0.9} chair={i % 2 ? 'rattan' : 'wood'} />
      ))}
      {[-5.3, 5.3].map((z) => (
        <Umbrella key={z} p={[-12.6, DY, z]} />
      ))}
      {/* lounge chairs at the deck edge */}
      <Armchair p={[-13.2, DY, 0]} rot={-Math.PI / 2} rattan />
      {/* entrance plaza */}
      {[-6.6, -4.3].map((x) => (
        <group key={x}>
          <TableSet p={[x, 0.06, 8.6]} seats={4} round w={0.8} chair="metal" />
          <Umbrella p={[x, 0.06, 8.6]} />
        </group>
      ))}
      <BB min={[2.4, 0.06, 9.6]} max={[5.6, 0.5, 10.0]} m="oak" />
      <BB min={[2.5, 0.06, 9.65]} max={[2.7, 0.44, 9.95]} m="stone" />
      <BB min={[5.3, 0.06, 9.65]} max={[5.5, 0.44, 9.95]} m="stone" />
      {/* A-frame menu */}
      <B s={[0.55, 0.85, 0.04]} p={[-1.0, 0.5, 8.6]} r={[0.18, 0.4, 0]} m="screen" />
      {/* bike rack */}
      {[7.0, 7.6, 8.2].map((x) => (
        <group key={x}>
          <B s={[0.04, 0.8, 0.04]} p={[x, 0.46, 10.0]} m="stainless" />
          <B s={[0.04, 0.8, 0.04]} p={[x, 0.46, 10.6]} m="stainless" />
          <B s={[0.04, 0.04, 0.64]} p={[x, 0.86, 10.3]} m="stainless" />
        </group>
      ))}
    </Merge>
  );
}

export function Umbrella({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <C rt={0.025} h={2.45} p={[0, 1.22, 0]} m="oak" seg={8} />
      <C rt={0.02} rb={1.45} h={0.42} p={[0, 2.4, 0]} m="umbrella" seg={8} open />
      <C rt={0.04} h={0.12} p={[0, 2.66, 0]} m="oak" seg={8} />
    </group>
  );
}
