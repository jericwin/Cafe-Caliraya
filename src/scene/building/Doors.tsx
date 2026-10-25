import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useMats } from '../../lib/materials';
import { boxGeo, cylGeo } from '../../lib/primitives';
import type { DoorSpec } from './wallGen';

const OPEN = Math.PI / 2 * 0.92;
const tmp = new THREE.Vector3();

function Door({ d }: { d: DoorSpec }) {
  const mats = useMats();
  const ref = useRef<THREE.Group>(null);
  const amt = useRef(0);
  const centre = useMemo(() => new THREE.Vector3(...d.center), [d.center]);
  useFrame(({ camera }, dt) => {
    if (!ref.current) return;
    ref.current.getWorldPosition(tmp);
    const dy = camera.position.y - (tmp.y + 1.4);
    const near = Math.hypot(camera.position.x - centre.x, camera.position.z - centre.z) < 2.6 && Math.abs(dy) < 1.6;
    const target = near ? 1 : 0;
    amt.current = THREE.MathUtils.damp(amt.current, target, 4, dt);
    ref.current.rotation.y = d.closedYaw + d.openSign * OPEN * amt.current;
  });
  const t = d.leaf === 'glass' ? 0.04 : 0.045;
  const leafMat = d.leaf === 'wood' ? mats.walnut : mats.stainless;
  return (
    <group ref={ref} position={d.hinge} rotation={[0, d.closedYaw, 0]}>
      {d.leaf === 'glass' ? (
        <>
          <mesh geometry={boxGeo(d.width, 0.07, t)} material={mats.frame} position={[d.width / 2, 0.035, 0]} castShadow receiveShadow />
          <mesh geometry={boxGeo(d.width, 0.07, t)} material={mats.frame} position={[d.width / 2, d.height - 0.035, 0]} castShadow receiveShadow />
          <mesh geometry={boxGeo(0.07, d.height, t)} material={mats.frame} position={[0.035, d.height / 2, 0]} castShadow receiveShadow />
          <mesh geometry={boxGeo(0.07, d.height, t)} material={mats.frame} position={[d.width - 0.035, d.height / 2, 0]} castShadow receiveShadow />
          <mesh geometry={boxGeo(d.width - 0.14, d.height - 0.14, 0.012)} material={mats.glass} position={[d.width / 2, d.height / 2, 0]} receiveShadow />
          <mesh geometry={cylGeo(0.016, 0.016, 1.2, 10)} material={mats.brass} position={[d.width - 0.16, 1.05, 0.07]} castShadow receiveShadow />
          <mesh geometry={cylGeo(0.016, 0.016, 1.2, 10)} material={mats.brass} position={[d.width - 0.16, 1.05, -0.07]} castShadow receiveShadow />
        </>
      ) : (
        <>
          <mesh geometry={boxGeo(d.width, d.height, t)} material={leafMat} position={[d.width / 2, d.height / 2, 0]} castShadow receiveShadow />
          <mesh geometry={boxGeo(0.14, 0.025, 0.12)} material={d.leaf === 'wood' ? mats.brass : mats.blackSteel} position={[d.width - 0.12, 1.0, 0]} receiveShadow />
          {d.leaf === 'steel' && <mesh geometry={boxGeo(0.35, 0.35, t + 0.01)} material={mats.glass} position={[d.width / 2, 1.5, 0]} receiveShadow />}
          {d.leaf === 'steel' && <mesh geometry={boxGeo(d.width, 0.3, t + 0.01)} material={mats.blackSteel} position={[d.width / 2, 0.15, 0]} receiveShadow />}
        </>
      )}
    </group>
  );
}

export function Doors({ doors }: { doors: DoorSpec[] }) {
  return (
    <>
      {doors.map((d) => (
        <Door key={d.id} d={d} />
      ))}
    </>
  );
}
