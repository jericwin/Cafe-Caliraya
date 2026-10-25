import * as THREE from 'three';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useStore } from '../../store/useStore';
import { defaultViewFor } from '../../config/viewpoints';
import { runtime } from '../../lib/sceneEvents';
import { terrainHeight } from '../../lib/terrain';
import { WalkController } from './WalkController';

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Anim {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromT: THREE.Vector3;
  toT: THREE.Vector3;
  fromZoom: number;
  toZoom: number;
  t: number;
  dur: number;
}

export const rigTarget = new THREE.Vector3(...defaultViewFor(typeof window === 'undefined' ? 1.6 : window.innerWidth / window.innerHeight).target);

export function CameraRig() {
  const cameraMode = useStore((s) => s.cameraMode);
  const projection = useStore((s) => s.projection);
  const fov = useStore((s) => s.fov);
  const viewRequest = useStore((s) => s.viewRequest);
  const autoRotate = useStore((s) => s.autoRotate);
  const measuring = useStore((s) => s.measuring);
  const { size, camera } = useThree();

  const persp = useRef<THREE.PerspectiveCamera>(null);
  const ortho = useRef<THREE.OrthographicCamera>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const anim = useRef<Anim | null>(null);
  const lastControls = useRef<OrbitControlsImpl | null>(null);
  const prevCam = useRef<THREE.Camera | null>(null);

  const useOrtho = cameraMode === 'top' || (cameraMode === 'orbit' && projection === 'orthographic');
  const initialPos = useMemo(() => new THREE.Vector3(...defaultViewFor(window.innerWidth / window.innerHeight).pos), []);

  // when the active camera changes, carry over pose (and convert distance <-> zoom)
  useLayoutEffect(() => {
    const next = useOrtho ? ortho.current : persp.current;
    const prev = prevCam.current;
    if (next && prev && prev !== next) {
      next.position.copy(prev.position);
      next.quaternion.copy(prev.quaternion);
      const dist = prev.position.distanceTo(rigTarget);
      const p = persp.current!;
      const o = ortho.current!;
      if (next === o) {
        o.zoom = size.height / (2 * dist * Math.tan(THREE.MathUtils.degToRad(p.fov / 2)));
        o.updateProjectionMatrix();
      } else {
        const d = size.height / (2 * o.zoom * Math.tan(THREE.MathUtils.degToRad(p.fov / 2)));
        const dir = new THREE.Vector3().subVectors(prev.position, rigTarget).normalize();
        p.position.copy(rigTarget).addScaledVector(dir, THREE.MathUtils.clamp(d, 2, 600));
      }
    }
    prevCam.current = next;
  }, [useOrtho, size.height]);

  // view transitions
  useEffect(() => {
    if (!viewRequest) return;
    const cam = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
    const toPos = new THREE.Vector3(...viewRequest.pos);
    const toT = new THREE.Vector3(...viewRequest.target);
    let toZoom = (cam as THREE.OrthographicCamera).zoom ?? 1;
    if ((cam as THREE.OrthographicCamera).isOrthographicCamera) {
      const d = toPos.distanceTo(toT);
      toZoom = viewRequest.frame
        ? Math.min(size.height / viewRequest.frame, size.width / (viewRequest.frame * 1.25))
        : size.height / (2 * d * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
    }
    anim.current = {
      fromPos: cam.position.clone(),
      toPos,
      fromT: rigTarget.clone(),
      toT,
      fromZoom: (cam as THREE.OrthographicCamera).zoom ?? 1,
      toZoom,
      t: 0,
      dur: viewRequest.duration ?? 1.6,
    };
  }, [viewRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  // switching into top view frames the site from above
  const prevMode = useRef(cameraMode);
  useEffect(() => {
    if (cameraMode === 'top') {
      const st = useStore.getState();
      const site = st.planView === 'site';
      const t: [number, number, number] = site ? [8, 0, 0] : [0, 0, 0];
      st.requestView([t[0], 160, t[2] + 0.01], t, 1.4, site ? 110 : 34);
    }
    if (cameraMode === 'orbit' && prevMode.current === 'top') {
      useStore.getState().requestView([rigTarget.x + 30, 24, rigTarget.z + 34], [rigTarget.x, 2, rigTarget.z], 1.4);
    }
    prevMode.current = cameraMode;
  }, [cameraMode]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (c && c !== lastControls.current) {
      c.target.copy(rigTarget);
      c.update();
      lastControls.current = c;
      c.listenToKeyEvents?.(window as unknown as HTMLElement);
    }
    const cam = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
    const a = anim.current;
    if (a && cameraMode !== 'walk') {
      a.t = Math.min(1, a.t + dt / a.dur);
      const e = ease(a.t);
      cam.position.lerpVectors(a.fromPos, a.toPos, e);
      // lift the path a little so long moves arc over the building instead of through it
      const lift = Math.sin(e * Math.PI) * Math.min(18, a.fromPos.distanceTo(a.toPos) * 0.12);
      cam.position.y += lift;
      rigTarget.lerpVectors(a.fromT, a.toT, e);
      if ((cam as THREE.OrthographicCamera).isOrthographicCamera) {
        (cam as THREE.OrthographicCamera).zoom = THREE.MathUtils.lerp(a.fromZoom, a.toZoom, e);
        cam.updateProjectionMatrix();
      }
      if (c) c.target.copy(rigTarget);
      cam.lookAt(rigTarget);
      if (a.t >= 1) anim.current = null;
    } else if (c && cameraMode !== 'walk') {
      rigTarget.copy(c.target);
      // keep the orbit camera above the ground
      const g = terrainHeight(cam.position.x, cam.position.z);
      const minY = Math.max(g, -0.5) + 0.35;
      if (cam.position.y < minY) cam.position.y = minY;
    }
    runtime.cameraTarget = [rigTarget.x, rigTarget.y, rigTarget.z];
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    runtime.heading = Math.atan2(-dir.x, -dir.z);
    runtime.focusDist = cam.position.distanceTo(rigTarget);
  });

  const walk = cameraMode === 'walk';
  return (
    <>
      <PerspectiveCamera ref={persp} makeDefault={!useOrtho} fov={walk ? Math.max(fov, 60) : fov} near={0.08} far={14000} position={initialPos} />
      <OrthographicCamera ref={ortho} makeDefault={useOrtho} near={-2000} far={6000} position={[0, 160, 0.01]} zoom={8} />
      {!walk && (
        <OrbitControls
          ref={controls}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          enableRotate={cameraMode !== 'top'}
          screenSpacePanning
          minDistance={0.4}
          maxDistance={900}
          maxPolarAngle={cameraMode === 'top' ? 0.01 : Math.PI * 0.53}
          minPolarAngle={0}
          autoRotate={autoRotate && cameraMode === 'orbit'}
          autoRotateSpeed={0.5}
          zoomSpeed={0.9}
          panSpeed={0.9}
          keyPanSpeed={20}
          touches={{ ONE: measuring ? THREE.TOUCH.PAN : cameraMode === 'top' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          mouseButtons={{ LEFT: cameraMode === 'top' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
          onStart={() => (anim.current = null)}
        />
      )}
      {walk && <WalkController />}
    </>
  );
}
