import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { useStore } from '../../store/useStore';
import { computeAtmosphere, ss, type Atmosphere } from '../../lib/sun';
import { horizonColor } from '../../lib/skyColor';
import { runtime, subscribeSceneChanged } from '../../lib/sceneEvents';

const MOON_DIR = new THREE.Vector3(0.45, 0.75, 0.35).normalize();

const domeVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
}`;

const domeFrag = /* glsl */ `
uniform float uNight;
uniform float uMoon;
uniform float uStars;
uniform float uTime;
uniform vec3 uMoonDir;
uniform vec3 uSunDir;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uGlow;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.45));
  vec2 sxz = normalize(uSunDir.xz + vec2(1e-5));
  vec2 dxz = normalize(d.xz + vec2(1e-5));
  float az = max(dot(sxz, dxz), 0.0);
  col += uGlow * pow(az, 3.0) * pow(1.0 - h, 4.0);
  vec3 sd = d * 280.0;
  vec3 cell = floor(sd);
  vec3 f = fract(sd) - 0.5;
  float r = hash(cell);
  float star = step(0.9962, r) * smoothstep(0.42, 0.0, length(f)) * smoothstep(0.02, 0.2, d.y);
  star *= 0.65 + 0.35 * sin(uTime * 1.7 + r * 311.0);
  float md = dot(d, normalize(uMoonDir));
  float moon = smoothstep(0.99978, 0.99988, md);
  float glow = pow(max(md, 0.0), 300.0) * 0.35 + pow(max(md, 0.0), 24.0) * 0.04;
  col += vec3(star) * uStars * 2.2 + vec3(0.95, 0.96, 1.0) * (moon * 2.5 + glow) * uMoon;
  gl_FragColor = vec4(col, clamp(uNight, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const cloudVert = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const cloudFrag = /* glsl */ `
uniform float uTime;
uniform float uCover;
uniform vec3 uSunDir;
uniform vec3 uLit;
uniform vec3 uShade;
uniform float uOpacity;
varying vec3 vWorld;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}
void main() {
  vec2 wind = uTime * vec2(0.006, 0.0022);
  vec2 p = vWorld.xz * 0.00042 + wind;
  float base = fbm(p * vec2(1.0, 2.2));
  float n = base * 0.75 + fbm(p * 3.1 + 7.0) * 0.25;
  float c = smoothstep(1.0 - uCover, 1.0 - uCover + 0.32, n);
  vec2 toSun = normalize(uSunDir.xz + vec2(1e-4)) * 0.035;
  float n2 = fbm((p + toSun) * vec2(1.0, 2.2)) * 0.75 + fbm((p + toSun) * 3.1 + 7.0) * 0.25;
  float lit = clamp(0.55 + (n - n2) * 4.0, 0.0, 1.0);
  vec3 vd = normalize(vWorld - cameraPosition);
  float fwd = pow(max(dot(vd, uSunDir), 0.0), 5.0);
  float edge = 1.0 - smoothstep(0.0, 0.45, c);
  vec3 col = mix(uShade, uLit, lit) * (1.0 + fwd * 1.6 + edge * fwd * 2.0);
  float dist = length(vWorld.xz - cameraPosition.xz);
  float fade = 1.0 - smoothstep(2600.0, 8200.0, dist);
  gl_FragColor = vec4(col, c * fade * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function createDomeMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: domeVert,
    fragmentShader: domeFrag,
    uniforms: {
      uNight: { value: 0 },
      uMoon: { value: 0 },
      uStars: { value: 0 },
      uTime: { value: 0 },
      uMoonDir: { value: MOON_DIR.clone() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uHorizon: { value: new THREE.Color('#1b2540') },
      uZenith: { value: new THREE.Color('#03050c') },
      uGlow: { value: new THREE.Color('#000000') },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
}

export function SkySystem() {
  const { gl, scene } = useThree();
  const time = useStore((s) => s.time);
  const doy = useStore((s) => s.doy);
  const weather = useStore((s) => s.weather);
  const sunMul = useStore((s) => s.sunMul);
  const shadows = useStore((s) => s.shadows);
  const shadowQuality = useStore((s) => s.shadowQuality);
  const renderMode = useStore((s) => s.renderMode);

  const atm = useMemo(() => computeAtmosphere(time, doy, weather, sunMul), [time, doy, weather, sunMul]);
  const atmRef = useRef<Atmosphere>(atm);
  atmRef.current = atm;
  runtime.lightsOn = atm.lightsOn;
  runtime.night = atm.night;
  runtime.atm = atm;

  const sky = useMemo(() => {
    const s = new Sky();
    const sm = s.material as THREE.ShaderMaterial;
    sm.uniforms.uGain = { value: 1 };
    sm.uniforms.uSat = { value: 1 };
    sm.uniforms.uBelt = { value: new THREE.Color(0, 0, 0) };
    sm.uniforms.uWarm = { value: new THREE.Color(0, 0, 0) };
    sm.fragmentShader = sm.fragmentShader
      .replace('uniform vec3 up;', 'uniform vec3 up;\nuniform float uGain;\nuniform float uSat;\nuniform vec3 uBelt;\nuniform vec3 uWarm;')
      .replace(
        'gl_FragColor = vec4( retColor, 1.0 );',
        `vec3 gcol = retColor;
        float glum = dot(gcol, vec3(0.2126, 0.7152, 0.0722));
        gcol = max(mix(vec3(glum), gcol, uSat), 0.0);
        float gaway = 1.0 - (dot(direction, vSunDirection) * 0.5 + 0.5);
        float glow = pow(1.0 - clamp(direction.y, 0.0, 1.0), 6.0);
        gcol += uBelt * pow(gaway, 1.5) * glow;
        gcol += uWarm * pow(max(dot(direction, vSunDirection), 0.0), 3.0) * glow;
        gl_FragColor = vec4( gcol * uGain, 1.0 );`,
      );
    s.scale.setScalar(9000);
    s.renderOrder = -10;
    s.frustumCulled = false;
    (s.material as THREE.ShaderMaterial).depthWrite = false;
    return s;
  }, []);
  const domeMat = useMemo(createDomeMaterial, []);
  const dome = useMemo(() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), domeMat);
    m.scale.setScalar(4300);
    m.renderOrder = -9;
    m.frustumCulled = false;
    return m;
  }, [domeMat]);
  const clouds = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: cloudVert,
      fragmentShader: cloudFrag,
      uniforms: {
        uTime: { value: 0 },
        uCover: { value: 0.4 },
        uSunDir: { value: new THREE.Vector3() },
        uLit: { value: new THREE.Color() },
        uShade: { value: new THREE.Color() },
        uOpacity: { value: 0.92 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const g = new THREE.PlaneGeometry(18000, 18000, 1, 1);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat);
    m.position.y = 1100;
    m.renderOrder = -8;
    m.frustumCulled = false;
    return m;
  }, []);

  // environment-map scene (rendered to PMREM when the sun moves)
  const env = useMemo(() => {
    const envScene = new THREE.Scene();
    const s2 = new Sky();
    s2.material = sky.material;
    s2.scale.setScalar(150);
    const d2 = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), domeMat);
    d2.scale.setScalar(70);
    const groundMat = new THREE.MeshBasicMaterial({ color: '#3a3a2a', side: THREE.DoubleSide });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 32), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -6;
    envScene.add(s2, d2, ground);
    return { envScene, groundMat };
  }, [sky, domeMat]);

  const pmrem = useMemo(() => new THREE.PMREMGenerator(gl), [gl]);
  const envRT = useRef<THREE.WebGLRenderTarget | null>(null);
  const lastEnv = useRef({ t: -1, key: '' });

  const light = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  const regenEnv = () => {
    const rt = pmrem.fromScene(env.envScene as unknown as THREE.Scene, 0.02, 0.1, 400);
    envRT.current?.dispose();
    envRT.current = rt;
    scene.environment = rt.texture;
    gl.shadowMap.needsUpdate = true;
  };

  // fog object lives on the scene
  useEffect(() => {
    scene.fog = new THREE.FogExp2('#c0a080', 0.0012);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // shadows refresh only when needed
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return subscribeSceneChanged(() => (gl.shadowMap.needsUpdate = true));
  }, [gl]);

  const quality = useStore((s) => s.quality);
  useEffect(() => {
    const type = quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    if (gl.shadowMap.type !== type) {
      gl.shadowMap.type = type;
      scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (m) (Array.isArray(m) ? m : [m]).forEach((x) => (x.needsUpdate = true));
      });
      gl.shadowMap.needsUpdate = true;
    }
  }, [quality, gl, scene]);

  useEffect(() => {
    const l = light.current;
    if (!l) return;
    const size = shadowQuality === 'high' ? 4096 : shadowQuality === 'medium' ? 2048 : 1024;
    l.shadow.mapSize.set(size, size);
    l.shadow.map?.dispose();
    l.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    l.castShadow = shadows;
    gl.shadowMap.needsUpdate = true;
  }, [shadowQuality, shadows, gl]);

  // apply atmosphere to uniforms, fog and lights
  useEffect(() => {
    const u = (sky.material as THREE.ShaderMaterial).uniforms;
    u.sunPosition.value.copy(atm.sunDir);
    u.turbidity.value = atm.turbidity;
    u.rayleigh.value = atm.rayleigh;
    u.mieCoefficient.value = atm.mie;
    u.mieDirectionalG.value = atm.mieG;
    u.uGain.value = atm.skyGain;
    u.uSat.value = atm.skySat;
    u.uBelt.value.copy(atm.skyBelt);
    u.uWarm.value.copy(atm.skyWarm);

    const du = domeMat.uniforms;
    const e = atm.elevDeg;
    // twilight dome takes over as soon as the physical sky model darkens below the horizon
    du.uNight.value = ss(e, 1.5, -2.5);
    du.uMoon.value = atm.night;
    du.uStars.value = atm.stars;
    du.uSunDir.value.copy(atm.sunDir);
    const glowAmt = ss(e, -11, -1.5) * (1 - ss(e, -1.5, 2));
    du.uGlow.value.set('#e0704a').multiplyScalar(glowAmt * 0.75);
    const clear = weather === 'clear';
    du.uHorizon.value.set(clear ? '#5a6fa8' : '#3a4150').lerp(new THREE.Color(clear ? '#26345e' : '#20242d'), ss(e, -2, -7)).lerp(new THREE.Color('#121829'), ss(e, -7, -14));
    du.uZenith.value.set(clear ? '#1f3266' : '#1a1e28').lerp(new THREE.Color('#0a1124'), ss(e, -3, -8)).lerp(new THREE.Color('#02040a'), ss(e, -8, -15));

    const cu = (clouds.material as THREE.ShaderMaterial).uniforms;
    cu.uCover.value = atm.cloudCover;
    cu.uSunDir.value.copy(atm.sunDir);
    cu.uLit.value.copy(atm.cloudLit);
    cu.uShade.value.copy(atm.cloudShade);

    // fog matches the horizon radiance of the sky model, then blends to night / overcast tones
    if (scene.fog instanceof THREE.FogExp2) {
      const hz = horizonColor(atm.sunDir, {
        turbidity: atm.turbidity,
        rayleigh: atm.rayleigh,
        mie: atm.mie,
        mieG: atm.mieG,
        gain: atm.skyGain,
        sat: atm.skySat,
        belt: atm.skyBelt,
        warm: atm.skyWarm,
      });
      const nightCol = new THREE.Color(du.uHorizon.value).multiplyScalar(0.9);
      hz.lerp(nightCol, du.uNight.value);
      if (weather !== 'clear') hz.lerp(new THREE.Color(atm.cloudShade).multiplyScalar(0.8), weather === 'cloudy' ? 0.55 : 0.75);
      scene.fog.color.copy(hz);
      scene.fog.density = renderMode === 'architectural' ? atm.fogDensity * 0.3 : atm.fogDensity;
    }
    env.groundMat.color.copy(new THREE.Color('#3f3b2c')).multiplyScalar(0.25 + 0.75 * (1 - atm.night));

    const l = light.current;
    if (l) {
      l.color.copy(atm.lightColor);
      l.intensity = atm.lightIntensity;
    }
    if (hemi.current) {
      hemi.current.color.copy(atm.hemiSky);
      hemi.current.groundColor.copy(atm.hemiGround);
      hemi.current.intensity = atm.hemiIntensity * (renderMode === 'clay' ? 0.8 : 0.45);
    }
    const mul = renderMode === 'architectural' ? 1.18 : renderMode === 'clay' ? 1.05 : 1;
    gl.toneMappingExposure = atm.exposure * mul;
    scene.environmentIntensity = atm.envIntensity / Math.max(0.5, atm.skyGain);
    gl.shadowMap.needsUpdate = true;
    if (!scene.environment) regenEnv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atm, sky, domeMat, clouds, scene, gl, env, weather, renderMode]);

  // background mode handling
  const showSky = renderMode !== 'blueprint';
  useEffect(() => {
    scene.background = renderMode === 'blueprint' ? new THREE.Color('#0d2748') : null;
    if (scene.fog instanceof THREE.FogExp2 && renderMode === 'blueprint') scene.fog.density = 0;
  }, [renderMode, scene]);

  useFrame(({ camera, clock }) => {
    const a = atmRef.current;
    dome.position.copy(camera.position);
    clouds.position.x = camera.position.x;
    clouds.position.z = camera.position.z;
    domeMat.uniforms.uTime.value = clock.elapsedTime;
    (clouds.material as THREE.ShaderMaterial).uniforms.uTime.value = clock.elapsedTime + 4000;
    const l = light.current;
    if (l) {
      const c = new THREE.Vector3(3, 0, 0);
      target.position.copy(c);
      l.position.copy(c).addScaledVector(a.lightDir, 160);
      target.updateMatrixWorld();
    }
    // throttled PMREM regeneration
    const key = `${a.sunDir.x.toFixed(3)}${a.sunDir.y.toFixed(3)}${a.turbidity.toFixed(2)}${a.night.toFixed(2)}`;
    const now = clock.elapsedTime;
    if (key !== lastEnv.current.key && now - lastEnv.current.t > 0.18) {
      lastEnv.current = { t: now, key };
      regenEnv();
    }
  });

  useEffect(
    () => () => {
      envRT.current?.dispose();
      pmrem.dispose();
    },
    [pmrem],
  );

  return (
    <>
      <primitive object={sky} visible={showSky} />
      <primitive object={dome} visible={showSky} />
      <primitive object={clouds} visible={showSky && renderMode !== 'wireframe'} />
      <primitive object={target} />
      <directionalLight
        ref={light}
        target={target}
        castShadow={shadows}
        shadow-bias={-0.00035}
        shadow-normalBias={0.035}
        shadow-camera-left={-46}
        shadow-camera-right={46}
        shadow-camera-top={46}
        shadow-camera-bottom={-46}
        shadow-camera-near={1}
        shadow-camera-far={420}
      />
      <hemisphereLight ref={hemi} />
    </>
  );
}
