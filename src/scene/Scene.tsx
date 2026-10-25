import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import { runtime, subscribeSceneChanged } from '../lib/sceneEvents';
import { SkySystem } from './environment/SkySystem';
import { CameraRig } from './camera/CameraRig';
import { Model } from './Model';
import { MeasureTool } from './tools/Measure';
import { Annotations } from './tools/Annotations';
import { Effects, useEffectsEnabled } from './Effects';

export const capture: { fn: null | (() => string) } = { fn: null };

/** Rain streaks wrapped around the camera, animated entirely on the GPU. */
function Rain() {
  const weather = useStore((s) => s.weather);
  const quality = useStore((s) => s.quality);
  const count = quality === 'high' ? 7000 : quality === 'medium' ? 4000 : 1800;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() } },
        vertexShader: /* glsl */ `
          attribute float aEnd; attribute float aSeed;
          uniform float uTime; uniform vec3 uCam;
          varying float vA;
          void main() {
            vec3 p = position;
            float fall = mod(p.y - uTime * (8.0 + aSeed * 4.0), 26.0);
            vec3 wp = vec3(uCam.x + mod(p.x - uCam.x + 22.0, 44.0) - 22.0, uCam.y - 9.0 + fall + aEnd * 0.5, uCam.z + mod(p.z - uCam.z + 22.0, 44.0) - 22.0);
            wp.x += aEnd * 0.06;
            vA = 1.0 - aEnd * 0.7;
            gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          varying float vA;
          void main() { gl_FragColor = vec4(0.72, 0.76, 0.82, 0.32 * vA); }`,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 6);
    const end = new Float32Array(count * 2);
    const seed = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 44;
      const y = Math.random() * 26;
      const z = Math.random() * 44;
      const s = Math.random();
      pos.set([x, y, z, x, y, z], i * 6);
      end.set([1, 0], i * 2);
      seed.set([s, s], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    return g;
  }, [count]);
  useFrame(({ camera, clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uCam.value.copy(camera.position);
  });
  if (weather !== 'rainy') return null;
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />;
}

/** Advances the clock when the sun animation is playing. */
function TimeAnimator() {
  useFrame((_, dt) => {
    const s = useStore.getState();
    if (!s.animate) return;
    let t = s.time + Math.min(dt, 0.1) * s.timeSpeed;
    if (t > 22) t = 6;
    s.set({ time: t });
  });
  return null;
}

/** Technical edges for the Blueprint preset. */
function BlueprintEdges() {
  const renderMode = useStore((s) => s.renderMode);
  const { scene } = useThree();
  useEffect(() => {
    if (renderMode !== 'blueprint') return;
    const mat = new THREE.LineBasicMaterial({ color: '#e8f2ff', transparent: true, opacity: 0.75 });
    const added: THREE.LineSegments[] = [];
    const build = () => {
      added.forEach((l) => l.parent?.remove(l));
      added.length = 0;
      for (const name of ['model', 'site']) {
        scene.getObjectByName(name)?.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || !m.userData.merged) return;
          if (['leaf', 'leafDark', 'frond', 'foliage', 'foliageDark', 'glass', 'displayGlass', 'lawn'].includes(m.userData.m)) return;
          let eg = m.userData.edges as THREE.BufferGeometry | undefined;
          if (!eg) {
            eg = new THREE.EdgesGeometry(m.geometry, 32);
            m.userData.edges = eg;
          }
          const ls = new THREE.LineSegments(eg, mat);
          ls.userData.noMeasure = true;
          ls.raycast = () => undefined;
          m.add(ls);
          added.push(ls);
        });
      }
    };
    let timer = 0;
    const id = window.setTimeout(build, 30);
    const unsub = subscribeSceneChanged(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(build, 200);
    });
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(timer);
      unsub();
      added.forEach((l) => l.parent?.remove(l));
      mat.dispose();
    };
  }, [renderMode, scene]);
  return null;
}

/** FPS / draw-call sampling and adaptive resolution for slower devices. */
function PerfMonitor() {
  const { gl, setDpr } = useThree();
  const quality = useStore((s) => s.quality);
  const acc = useRef({ frames: 0, t: 0, low: 0, dpr: 1, age: 0 });
  const maxDpr = useMemo(() => {
    const d = window.devicePixelRatio || 1;
    return quality === 'high' ? Math.min(d, 2) : quality === 'medium' ? Math.min(d, 1.5) : Math.min(d, 1);
  }, [quality]);
  useEffect(() => {
    gl.info.autoReset = false;
    acc.current.dpr = maxDpr;
    setDpr(maxDpr);
  }, [gl, maxDpr, setDpr]);
  // read last frame's totals (all passes: shadows, reflections, post) then reset
  useFrame((_, dt) => {
    runtime.calls = gl.info.render.calls;
    runtime.tris = gl.info.render.triangles;
    gl.info.reset();
    const a = acc.current;
    a.age += dt;
    if (a.age < 10) return; // ignore shader-compile hitches right after start-up
    a.frames++;
    a.t += dt;
    if (a.t >= 2) {
      const fps = a.frames / a.t;
      runtime.fps = fps;
      a.frames = 0;
      a.t = 0;
      if (fps < 26 && a.dpr > 0.7) {
        a.dpr = Math.max(0.7, a.dpr - 0.2);
        setDpr(a.dpr);
      } else if (fps > 52 && a.dpr < maxDpr) {
        a.dpr = Math.min(maxDpr, a.dpr + 0.1);
        setDpr(a.dpr);
      }
      if (fps < 18 && a.dpr <= 0.71) {
        a.low++;
        const st = useStore.getState();
        if (a.low >= 3 && st.quality !== 'low' && st.autoQuality) {
          a.low = 0;
          const next = st.quality === 'high' ? 'medium' : 'low';
          st.set({ quality: next, shadowQuality: next === 'low' ? 'low' : 'medium' });
          st.notify(`Performance: switched to ${next} quality`);
        }
      } else a.low = 0;
    }
  });
  return null;
}

function Capture() {
  const { gl, scene } = useThree();
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __scene: scene, __gl: gl });
    capture.fn = () => gl.domElement.toDataURL('image/png');
    return () => {
      capture.fn = null;
    };
  }, [gl, scene]);
  return null;
}

/**
 * Compiles every shader program in parallel (KHR_parallel_shader_compile) before the first frame,
 * so start-up does not freeze on synchronous driver compiles (very slow on ANGLE / Direct3D).
 */
function Warmup() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        scene.updateMatrixWorld(true);
        await gl.compileAsync(scene, camera);
      } catch (e) {
        console.warn('Shader warm-up skipped', e);
      }
      if (!cancelled) useStore.getState().set({ warm: true });
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [gl, scene, camera]);
  return null;
}

function ReadySignal() {
  const n = useRef(0);
  useFrame(() => {
    n.current++;
    if (n.current === 4) useStore.getState().set({ ready: true });
  });
  return null;
}

export function SceneContents() {
  const fx = useEffectsEnabled();
  return (
    <>
      <SkySystem />
      <CameraRig />
      <Model />
      <Rain />
      <MeasureTool />
      <Annotations />
      <BlueprintEdges />
      <TimeAnimator />
      <PerfMonitor />
      <Capture />
      <Warmup />
      <ReadySignal />
      {fx.any && <Effects key={`${fx.ao}${fx.dof}${fx.bloom}`} />}
    </>
  );
}
