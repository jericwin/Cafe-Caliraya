import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { runtime } from '../lib/sceneEvents';
import { useStore } from '../store/useStore';

export function useEffectsEnabled() {
  const renderMode = useStore((s) => s.renderMode);
  const bloom = useStore((s) => s.bloom);
  const ao = useStore((s) => s.ao);
  const quality = useStore((s) => s.quality);
  const cameraMode = useStore((s) => s.cameraMode);
  const technical = renderMode === 'blueprint' || renderMode === 'wireframe';
  // post effects are reserved for the High tier — integrated GPUs stay on the direct (MSAA) render path
  const dof = renderMode === 'cinematic' && cameraMode !== 'top' && quality === 'high';
  const useBloom = bloom && !technical && quality === 'high';
  const useAO = ao && quality === 'high' && (renderMode === 'photo' || renderMode === 'architectural' || renderMode === 'clay' || renderMode === 'cinematic');
  return { dof, bloom: useBloom, ao: useAO, any: dof || useBloom || useAO };
}

/** Post-processing chain (three.js EffectComposer): AO → depth of field → bloom → tone mapping/output. */
export function Effects() {
  const { gl, scene, camera, size } = useThree();
  const fx = useEffectsEnabled();
  const renderMode = useStore((s) => s.renderMode);
  const quality = useStore((s) => s.quality);

  const composer = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: quality === 'high' ? 4 : 2 });
    const c = new EffectComposer(gl, rt);
    c.addPass(new RenderPass(scene, camera));
    let ao: GTAOPass | null = null;
    if (fx.ao) {
      ao = new GTAOPass(scene, camera, size.width, size.height);
      ao.blendIntensity = 0.85;
      ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      c.addPass(ao);
    }
    let bokeh: BokehPass | null = null;
    if (fx.dof) {
      bokeh = new BokehPass(scene, camera, { focus: 30, aperture: 0.00006, maxblur: 0.006 });
      c.addPass(bokeh);
    }
    let bloom: UnrealBloomPass | null = null;
    if (fx.bloom) {
      bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.35, 0.55, 0.95);
      c.addPass(bloom);
    }
    c.addPass(new OutputPass());
    return { c, bokeh, bloom, ao };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, fx.ao, fx.dof, fx.bloom, quality]);

  useEffect(() => {
    composer.c.setPixelRatio(gl.getPixelRatio());
    composer.c.setSize(size.width, size.height);
  }, [composer, size, gl]);

  useEffect(() => () => composer.c.dispose(), [composer]);

  useFrame(() => {
    if (composer.bokeh) {
      const u = composer.bokeh.uniforms as unknown as Record<string, { value: number }>;
      u.focus.value = THREE.MathUtils.lerp(u.focus.value, runtime.focusDist, 0.15);
      u.aperture.value = runtime.focusDist < 8 ? 0.0004 : 0.00008;
    }
    if (composer.bloom) {
      const night = runtime.night;
      composer.bloom.strength = (renderMode === 'cinematic' ? 0.42 : 0.28) + night * 0.3;
      composer.bloom.threshold = 2.2 - night * 1.25;
    }
    composer.c.render();
  }, 1);

  return null;
}
