import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MaterialContext, getMaterialSet } from '../lib/materials';
import { onSceneChanged, runtime } from '../lib/sceneEvents';
import { useLevelVisibility, useStore } from '../store/useStore';
import { planesFor } from './clipping';
import { GroundStructure, RoofStructure, UpperStructure } from './building/Structure';
import { CoffeeBar, GroundFurniture, Kitchen, Restroom, Storage, Utility } from './interior/GroundInterior';
import { BalconyFurniture, OutdoorFurniture, UpperFurniture } from './interior/UpperInterior';
import { ArtificialLights, FloorFixtures, SiteFixtures } from './Lighting';
import { Landscape, Parking, Road, SiteSign, Vehicles } from './site/Site';
import { Lake, Terrain } from './environment/Landform';

export function Model() {
  const renderMode = useStore((s) => s.renderMode);
  const xray = useStore((s) => s.xray);
  const cut = useStore((s) => s.cut);
  const cutPos = useStore((s) => s.cutPos);
  const planView = useStore((s) => s.planView);
  const exploded = useStore((s) => s.exploded);
  const { ground, upper, roof, layers } = useLevelVisibility();
  const mats = useMemo(() => getMaterialSet(renderMode, xray), [renderMode, xray]);

  // section / plan cuts via material clipping planes
  useEffect(() => {
    const planes = planesFor({ cut, cutPos, planView });
    for (const m of Object.values(mats)) {
      m.clippingPlanes = planes.length ? planes : null;
      m.clipIntersection = true;
      m.clipShadows = true;
      m.needsUpdate = true;
    }
    onSceneChanged();
  }, [mats, cut, cutPos, planView]);

  useEffect(() => {
    onSceneChanged();
  }, [ground, upper, roof, layers]);

  const upperRef = useRef<THREE.Group>(null);
  const roofRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const tu = exploded ? 5.5 : 0;
    const tr = exploded ? 11 : 0;
    const u = THREE.MathUtils.damp(runtime.explodeUpper, tu, 3.2, dt);
    const r = THREE.MathUtils.damp(runtime.explodeRoof, tr, 3.2, dt);
    const moving = Math.abs(u - runtime.explodeUpper) > 1e-4 || Math.abs(r - runtime.explodeRoof) > 1e-4;
    runtime.explodeUpper = Math.abs(u - tu) < 1e-3 ? tu : u;
    runtime.explodeRoof = Math.abs(r - tr) < 1e-3 ? tr : r;
    if (upperRef.current) upperRef.current.position.y = runtime.explodeUpper;
    if (roofRef.current) roofRef.current.position.y = runtime.explodeRoof;
    if (moving) onSceneChanged();
  });

  return (
    <MaterialContext.Provider value={mats}>
      <group name="model">
        <group name="ground-floor" visible={ground}>
          <GroundStructure />
          <group visible={layers.furniture} userData={{ noReflect: true }}>
            <GroundFurniture />
          </group>
          <group visible={layers.kitchen} userData={{ noReflect: true }}>
            <CoffeeBar />
            <Kitchen />
            <Storage />
          </group>
          <group visible={layers.fixtures} userData={{ noReflect: true }}>
            <Restroom />
            <Utility />
          </group>
          <group visible={layers.lighting} userData={{ noReflect: true }}>
            <FloorFixtures level={0} />
          </group>
        </group>
        <group name="second-floor" ref={upperRef} visible={upper}>
          <UpperStructure />
          <group visible={layers.furniture} userData={{ noReflect: true }}>
            <UpperFurniture />
            <BalconyFurniture />
          </group>
          <group visible={layers.lighting} userData={{ noReflect: true }}>
            <FloorFixtures level={1} />
          </group>
        </group>
        <group name="roof-level" ref={roofRef} visible={roof}>
          <RoofStructure />
        </group>
      </group>
      <group name="site">
        <group visible={layers.furniture && ground}>
          <OutdoorFurniture />
        </group>
        <group visible={layers.parking} userData={{ noReflect: true }}>
          <Parking />
          <SiteSign />
          <Road />
        </group>
        <group visible={layers.vehicles} userData={{ noReflect: true }}>
          <Vehicles />
        </group>
        <group visible={layers.landscape}>
          <Landscape />
        </group>
        <group visible={layers.lighting}>
          <SiteFixtures />
        </group>
        <group visible={layers.terrain}>
          <Terrain />
          <Lake />
        </group>
      </group>
      <ArtificialLights />
    </MaterialContext.Provider>
  );
}
