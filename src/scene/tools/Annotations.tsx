import { Html, Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { BALCONY, BLD, DECK, EAVE, FFL0, FFL1, PARKING, ROOMS, STAIR, rectArea } from '../../config/layout';
import { useStore } from '../../store/useStore';

type V3 = [number, number, number];

function DimLine({ a, b, label, color = '#9fd0ff', tick = 0.35 }: { a: V3; b: V3; label: string; color?: string; tick?: number }) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va).normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(tick);
  const t1: V3[] = [va.clone().add(perp).toArray() as V3, va.clone().sub(perp).toArray() as V3];
  const t2: V3[] = [vb.clone().add(perp).toArray() as V3, vb.clone().sub(perp).toArray() as V3];
  const mid = va.clone().lerp(vb, 0.5);
  return (
    <group>
      <Line points={[a, b]} color={color} lineWidth={1.4} depthTest={false} renderOrder={990} />
      <Line points={t1} color={color} lineWidth={1.4} depthTest={false} renderOrder={990} />
      <Line points={t2} color={color} lineWidth={1.4} depthTest={false} renderOrder={990} />
      <Html position={mid} center zIndexRange={[15, 5]} style={{ pointerEvents: 'none' }}>
        <div className="dim-label">{label}</div>
      </Html>
    </group>
  );
}

export function Annotations() {
  const planView = useStore((s) => s.planView);
  const showLabels = useStore((s) => s.showLabels);
  const showDims = useStore((s) => s.showDims);
  const showGrid = useStore((s) => s.showGrid);
  const showAxes = useStore((s) => s.showAxes);
  const floorMode = useStore((s) => s.floorMode);
  const exploded = useStore((s) => s.exploded);
  const renderMode = useStore((s) => s.renderMode);

  const levels = useMemo(() => {
    if (planView === 'ground') return [0, -1];
    if (planView === 'upper') return [1];
    if (planView === 'site') return [0, -1];
    if (floorMode === 'ground') return [0, -1];
    if (floorMode === 'upper') return [1];
    return [0, 1, -1];
  }, [planView, floorMode]);

  const labels = showLabels || planView !== 'none';
  const dims = showDims || planView !== 'none';
  const upOff = exploded ? 5.5 : 0;
  const yFor = (lvl: number) => (lvl === 1 ? FFL1 + 0.05 + upOff : lvl === 0 ? FFL0 + 0.05 : 0.12);

  return (
    <group name="annotations">
      {labels &&
        ROOMS.filter((r) => levels.includes(r.level) && (planView !== 'site' || (r.level !== 0 && r.id !== 'deck') || r.id === 'dining')).map((r) => {
          const [x, z] = r.label ?? [(r.rect.x0 + r.rect.x1) / 2, (r.rect.z0 + r.rect.z1) / 2];
          return (
            <Html key={r.id} position={[x, yFor(r.level) + 0.9, z]} center zIndexRange={[14, 4]} style={{ pointerEvents: 'none' }}>
              <div className={`room-label ${r.level === -1 ? 'site' : ''}`}>
                <b>{planView === 'site' && r.id === 'dining' ? 'Caliraya Coffee House' : r.name}</b>
                <span>
                  {r.level === 1 ? '2F' : r.level === 0 ? 'GF' : 'Site'} · {rectArea(r.rect).toFixed(1)} m²
                </span>
              </div>
            </Html>
          );
        })}
      {dims && levels.includes(0) && planView !== 'site' && (
        <>
          <DimLine a={[BLD.x0, yFor(0), BLD.z0 - 1.6]} b={[BLD.x1, yFor(0), BLD.z0 - 1.6]} label={`${(BLD.x1 - BLD.x0).toFixed(2)} m`} />
          <DimLine a={[BLD.x1 + 1.4, yFor(0), BLD.z0]} b={[BLD.x1 + 1.4, yFor(0), BLD.z1]} label={`${(BLD.z1 - BLD.z0).toFixed(2)} m`} />
          <DimLine a={[DECK.x0, yFor(0), DECK.z1 + 1.0]} b={[DECK.x1, yFor(0), DECK.z1 + 1.0]} label={`Deck ${(DECK.x1 - DECK.x0).toFixed(2)} m`} />
          <DimLine a={[3, yFor(0), -1.0]} b={[8, yFor(0), -1.0]} label="Kitchen 5.00 m" color="#f2b45e" tick={0.2} />
          <DimLine a={[STAIR.x0, yFor(0) + 0.02, -4.3]} b={[STAIR.x1, yFor(0) + 0.02, -4.3]} label={`Stair run ${(STAIR.x1 - STAIR.x0).toFixed(2)} m · ${STAIR.risers}R @ ${(STAIR.rise * 1000).toFixed(0)} mm`} color="#f2b45e" tick={0.2} />
        </>
      )}
      {dims && levels.includes(1) && planView !== 'site' && (
        <>
          <DimLine a={[BALCONY.x0, yFor(1), BALCONY.z1 + 1.2]} b={[BALCONY.x1, yFor(1), BALCONY.z1 + 1.2]} label={`Balcony ${(BALCONY.x1 - BALCONY.x0).toFixed(2)} m`} />
          <DimLine a={[BLD.x0, yFor(1), BLD.z0 - 1.6]} b={[BLD.x1, yFor(1), BLD.z0 - 1.6]} label={`${(BLD.x1 - BLD.x0).toFixed(2)} m`} />
        </>
      )}
      {dims && planView === 'site' && (
        <>
          <DimLine a={[PARKING.x0, 0.2, PARKING.z0 - 2]} b={[PARKING.x1, 0.2, PARKING.z0 - 2]} label={`Parking ${(PARKING.x1 - PARKING.x0).toFixed(1)} m`} />
          <DimLine a={[PARKING.x1 + 2, 0.2, PARKING.z0]} b={[PARKING.x1 + 2, 0.2, PARKING.z1]} label={`${(PARKING.z1 - PARKING.z0).toFixed(1)} m`} />
          <DimLine a={[14, 0.2, -9.0]} b={[16.5, 0.2, -9.0]} label="Stall 2.50 × 5.00" color="#f2b45e" tick={0.2} />
          <DimLine a={[BLD.x0, 0.2, BLD.z0 - 3]} b={[BLD.x1, 0.2, BLD.z0 - 3]} label="Building 16.00 m" />
        </>
      )}
      {(dims || showLabels) && planView === 'none' && (
        <>
          {[
            { y: FFL0, t: `GF  FFL +${FFL0.toFixed(2)}` },
            { y: FFL1 + upOff, t: `2F  FFL +${FFL1.toFixed(2)}` },
            { y: EAVE + (exploded ? 11 : 0), t: `Eave +${EAVE.toFixed(2)}` },
          ].map((l) => (
            <Html key={l.t} position={[BLD.x1 + 0.6, l.y, BLD.z1 + 0.6]} zIndexRange={[14, 4]} style={{ pointerEvents: 'none' }}>
              <div className="level-tag">▸ {l.t}</div>
            </Html>
          ))}
        </>
      )}
      {renderMode === 'blueprint' && (
        <group position={[0, -0.02, 0]}>
          <gridHelper args={[400, 80, '#3d6aa3', '#1d3d66']} />
        </group>
      )}
      {showGrid && (
        <group position={[0, 0.08, 0]}>
          <gridHelper args={[120, 120, '#5c7da8', '#2c3a4d']} />
          <gridHelper args={[120, 24, '#8fb6e8', '#8fb6e8']} position={[0, 0.005, 0]} />
        </group>
      )}
      {showAxes && (
        <group position={[0, 0.1, 0]}>
          <axesHelper args={[6]} />
          <Html position={[6.4, 0, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="axis-tag x">+X East</div>
          </Html>
          <Html position={[0, 0, -6.4]} center style={{ pointerEvents: 'none' }}>
            <div className="axis-tag z">−Z North</div>
          </Html>
          <Html position={[0, 6.4, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="axis-tag y">+Y Up</div>
          </Html>
        </group>
      )}
    </group>
  );
}
