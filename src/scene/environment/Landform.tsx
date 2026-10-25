import * as THREE from 'three';
import { useCallback, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { WATER_Y } from '../../config/layout';
import { terrainHeight, fbm2 } from '../../lib/terrain';
import { getExtraTextures, getTextures } from '../../lib/textures';
import { blobGeo, seeded } from '../../lib/geometry';
import { neutral } from '../../lib/materials';
import { runtime } from '../../lib/sceneEvents';
import { useStore } from '../../store/useStore';

const NEAR = { cx: -10, cz: 0, size: 280, seg: 140 };
const FAR = { cx: -900, cz: 0, size: 5600, seg: 230 };

const SAND = new THREE.Color('#a89a7a');
const MUD = new THREE.Color('#5c5440');
const GRASS = new THREE.Color('#ffffff');
const DRY = new THREE.Color('#d8cf9a');
const FOREST = new THREE.Color('#47603a');
const FOREST2 = new THREE.Color('#5d7a45');

function buildTerrain(near: boolean) {
  const cfg = near ? NEAR : FAR;
  const g = new THREE.PlaneGeometry(cfg.size, cfg.size, cfg.seg, cfg.seg);
  g.rotateX(-Math.PI / 2);
  g.translate(cfg.cx, 0, cfg.cz);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const half = NEAR.size / 2 - 4;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    let h = terrainHeight(x, z);
    if (!near && Math.abs(x - NEAR.cx) < half && Math.abs(z - NEAR.cz) < half) h -= 4;
    pos.setY(i, h);
    uv.setXY(i, x, z);
    const n = fbm2(x * 0.05, z * 0.05);
    if (near) {
      if (h < WATER_Y + 0.1) c.copy(MUD).lerp(SAND, 0.3);
      else if (h < WATER_Y + 0.55) c.copy(SAND).lerp(GRASS, THREE.MathUtils.smoothstep(h, WATER_Y + 0.25, WATER_Y + 0.55));
      else c.copy(GRASS).lerp(DRY, Math.max(0, n - 0.55) * 1.2);
    } else {
      const shore = THREE.MathUtils.smoothstep(h, WATER_Y, WATER_Y + 3);
      c.copy(SAND).lerp(FOREST2, shore).lerp(FOREST, THREE.MathUtils.smoothstep(h, 4, 25) * 0.8 + n * 0.2);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export function Terrain() {
  const renderMode = useStore((s) => s.renderMode);
  const nearGeo = useMemo(() => buildTerrain(true), []);
  const farGeo = useMemo(() => buildTerrain(false), []);
  const mats = useMemo(() => {
    const t = getTextures().grass;
    const mk = (rep: number) => {
      const map = t.map.clone();
      map.repeat.set(1 / rep, 1 / rep);
      map.needsUpdate = true;
      const nm = t.normalMap!.clone();
      nm.repeat.set(1 / rep, 1 / rep);
      nm.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map, normalMap: nm, normalScale: new THREE.Vector2(0.5, 0.5), vertexColors: true, roughness: 0.95 });
    };
    return {
      near: mk(3),
      // same feature set as the near terrain (dummy normal map) so both share one shader program
      far: (() => {
        const m = mk(14);
        m.normalMap = neutral().normal;
        return m;
      })(),
      clay: new THREE.MeshStandardMaterial({ color: '#d6d2c8', roughness: 0.95 }),
      wire: new THREE.MeshBasicMaterial({ color: '#3d6d5a', wireframe: true, transparent: true, opacity: 0.35 }),
    };
  }, []);
  if (renderMode === 'blueprint') return null;
  const pick = (m: THREE.Material) => (renderMode === 'clay' ? mats.clay : renderMode === 'wireframe' ? mats.wire : m);
  return (
    <group name="terrain">
      <mesh geometry={nearGeo} material={pick(mats.near)} receiveShadow userData={{ terrain: true }} />
      <mesh geometry={farGeo} material={pick(mats.far)} receiveShadow={false} userData={{ terrain: true, noMeasure: true }} />
      <DistantForest />
    </group>
  );
}

function DistantForest() {
  const quality = useStore((s) => s.quality);
  const renderMode = useStore((s) => s.renderMode);
  const count = quality === 'high' ? 2400 : quality === 'medium' ? 1500 : 800;
  const { geo, matrices, colors } = useMemo(() => {
    const geo = blobGeo(1, 1, 7, 0.25, 1.25);
    geo.translate(0, 0.8, 0);
    const r = seeded(99);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const list: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];
    let tries = 0;
    while (list.length < count && tries < count * 6) {
      tries++;
      const x = -2600 + r() * 3600;
      const z = -1800 + r() * 3600;
      const d = Math.hypot(x - 10, z);
      if (d < 120) continue;
      const h = terrainHeight(x, z);
      if (h < WATER_Y + 1.5) continue;
      if (fbm2(x * 0.004, z * 0.004) < 0.42) continue; // clustered forest patches
      const s = 4 + r() * 6;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2);
      m.compose(new THREE.Vector3(x, h - 0.5, z), q, new THREE.Vector3(s, s * (0.9 + r() * 0.5), s));
      list.push(m.clone());
      cols.push(new THREE.Color().setHSL(0.25 + r() * 0.06, 0.35 + r() * 0.15, 0.09 + r() * 0.07));
    }
    return { geo, matrices: list, colors: cols };
  }, [count, quality]);
  // callback ref: (re)applies instance data whenever a new InstancedMesh is mounted (count or style change)
  const attach = useCallback(
    (im: THREE.InstancedMesh | null) => {
      if (!im) return;
      matrices.forEach((m, i) => {
        im.setMatrixAt(i, m);
        im.setColorAt(i, colors[i]);
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
    },
    [matrices, colors],
  );
  const mat = useMemo(
    () =>
      renderMode === 'clay'
        ? new THREE.MeshStandardMaterial({ color: '#e0ddd5', roughness: 0.9 })
        : renderMode === 'wireframe'
          ? new THREE.MeshBasicMaterial({ color: '#4c8a6a', wireframe: true })
          : new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 }),
    [renderMode],
  );
  return <instancedMesh ref={attach} args={[geo, mat, matrices.length]} key={`${matrices.length}-${renderMode}`} userData={{ noMeasure: true }} />;
}

export function Lake() {
  const quality = useStore((s) => s.quality);
  const renderMode = useStore((s) => s.renderMode);
  const weather = useStore((s) => s.weather);
  const geo = useMemo(() => new THREE.PlaneGeometry(9000, 9000), []);
  // planar (mirror) reflections are reserved for the High tier: the extra scene pass and its shader
  // variants are too costly for integrated GPUs, which use the env-mapped surface instead
  const reflective = quality === 'high' && renderMode !== 'wireframe';
  const res = 768;

  const water = useMemo(() => {
    if (!reflective) return null;
    const w = new Water(geo, {
      textureWidth: res,
      textureHeight: res,
      waterNormals: getExtraTextures().water,
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0xffffff,
      waterColor: 0x0d2f3a,
      distortionScale: 2.4,
      fog: true,
      alpha: 1,
    });
    // tone the mirror term down by day so the lake keeps its deep colour (sunset glare is kept via the specular term)
    const wm = w.material as THREE.ShaderMaterial;
    wm.uniforms.uReflectK = { value: 0.9 };
    wm.fragmentShader = wm.fragmentShader
      .replace('uniform float alpha;', 'uniform float alpha;\nuniform float uReflectK;')
      .replace('( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight )', '( vec3( 0.02 ) + reflectionSample * uReflectK + reflectionSample * specularLight )');
    w.rotation.x = -Math.PI / 2;
    w.position.set(FAR.cx, WATER_Y, 0);
    (w.material as THREE.ShaderMaterial).uniforms.size.value = 1.4;
    w.userData.noMeasure = true;
    // the mirror pass doesn't need interior furniture, fixtures or small site props: hide them while it renders
    const base = w.onBeforeRender.bind(w);
    const hidden: THREE.Object3D[] = [];
    w.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      hidden.length = 0;
      scene.traverse((o) => {
        if (o.userData.noReflect && o.visible) {
          o.visible = false;
          hidden.push(o);
        }
      });
      base(renderer, scene, camera, geometry, material, group);
      for (const o of hidden) o.visible = true;
    };
    return w;
  }, [geo, res, reflective]);

  const simple = useMemo(() => {
    const nm = getExtraTextures().water.clone();
    nm.repeat.set(220, 220);
    nm.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color: '#0e2c35', roughness: 0.06, metalness: 0.1, normalMap: nm, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.2 });
  }, []);

  useEffect(() => () => water?.material.dispose(), [water]);

  useFrame((_, dt) => {
    const a = runtime.atm;
    if (!a) return;
    const speed = weather === 'rainy' ? 1.6 : weather === 'cloudy' ? 0.9 : 0.55;
    if (water) {
      const u = (water.material as THREE.ShaderMaterial).uniforms;
      u.time.value += dt * speed;
      u.sunDirection.value.copy(a.lightDir);
      const sunlit = a.elevDeg > -3 ? THREE.MathUtils.clamp(a.sunIntensity / 2.4, 0, 1) : 0.3;
      u.sunColor.value.copy(a.lightColor).multiplyScalar(sunlit);
      u.waterColor.value.copy(a.waterColor);
      u.uReflectK.value = THREE.MathUtils.lerp(0.95, 0.4, THREE.MathUtils.clamp((a.elevDeg - 6) / 25, 0, 1));
      u.distortionScale.value = weather === 'rainy' ? 5 : weather === 'cloudy' ? 3.2 : 2.4;
    } else {
      simple.normalMap!.offset.x += dt * 0.004 * speed;
      simple.normalMap!.offset.y += dt * 0.0025 * speed;
      simple.color.copy(a.waterColor);
    }
  });

  if (renderMode === 'blueprint') return null;
  if (renderMode === 'clay')
    return (
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[FAR.cx, WATER_Y, 0]} userData={{ noMeasure: true }}>
        <meshStandardMaterial color="#c9d3d6" roughness={0.2} />
      </mesh>
    );
  if (water) return <primitive object={water} />;
  return <mesh geometry={geo} material={simple} rotation={[-Math.PI / 2, 0, 0]} position={[FAR.cx, WATER_Y, 0]} userData={{ noMeasure: true }} />;
}
