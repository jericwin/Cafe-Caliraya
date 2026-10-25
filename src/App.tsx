import * as THREE from 'three';
import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { useStore } from './store/useStore';
import { SceneContents } from './scene/Scene';
import { setAnisotropy } from './lib/textures';
import { TopBar, TabletCameraBar } from './ui/TopBar';
import { LeftPanel } from './ui/LeftPanel';
import { RightPanel } from './ui/RightPanel';
import { BottomBar } from './ui/BottomBar';
import { MobileDock, MobileDrawer, Joystick } from './ui/Mobile';
import { CinematicFrame, Compass, ConceptBadge, HelpModal, LoadingScreen, Toast } from './ui/Overlays';
import { openPlan, resetView, setCameraMode, takeScreenshot, toggleFullscreen } from './ui/actions';

class ErrorBoundary extends Component<{ children: ReactNode; onError: (m: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: Error) {
    console.error(err);
    this.props.onError(err.message || String(err));
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === 'INPUT' || t?.tagName === 'SELECT' || t?.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useStore.getState();
      const walking = s.cameraMode === 'walk';
      switch (e.key) {
        case '1':
          setCameraMode('orbit');
          break;
        case '2':
          setCameraMode('walk');
          break;
        case '3':
          setCameraMode('top');
          break;
        case 'r':
        case 'R':
          resetView();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'p':
        case 'P':
          takeScreenshot();
          break;
        case 'm':
        case 'M':
          s.set({ measuring: !s.measuring, cameraMode: walking ? 'orbit' : s.cameraMode });
          break;
        case 't':
        case 'T':
          s.set({ animate: !s.animate });
          break;
        case '[':
          s.set({ time: Math.max(6, s.time - 0.25), animate: false });
          break;
        case ']':
          s.set({ time: Math.min(22, s.time + 0.25), animate: false });
          break;
        case 'e':
        case 'E':
          if (!walking) s.set({ exploded: !s.exploded });
          break;
        case 'x':
        case 'X':
          s.set({ xray: !s.xray });
          break;
        case 'l':
        case 'L':
          s.set({ showLabels: !s.showLabels });
          break;
        case 'g':
        case 'G':
          s.set({ showGrid: !s.showGrid });
          break;
        case 'o':
        case 'O':
          if (!walking) s.set({ projection: s.projection === 'perspective' ? 'orthographic' : 'perspective' });
          break;
        case 'h':
        case 'H':
        case '?':
          s.set({ showHelp: !s.showHelp });
          break;
        case 'Escape':
          if (s.showHelp) s.set({ showHelp: false });
          else if (s.planView !== 'none') openPlan('none');
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function App() {
  const quality = useStore((s) => s.quality);
  const warm = useStore((s) => s.warm);
  const [error, setError] = useState<string | null>(() => (webglAvailable() ? null : 'Your browser or device does not support WebGL 2, which is required for real-time 3D.'));
  const [mountCanvas, setMountCanvas] = useState(false);
  useShortcuts();

  // let the loading screen paint before the (synchronous) procedural texture generation starts
  useEffect(() => {
    if (error) return;
    const id = window.setTimeout(() => setMountCanvas(true), 60);
    return () => window.clearTimeout(id);
  }, [error]);

  useEffect(() => {
    const onResize = () => {
      const s = useStore.getState();
      const mobile = window.innerWidth < 768;
      if (mobile !== s.isMobile) s.set({ isMobile: mobile });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      {mountCanvas && !error && (
        <ErrorBoundary onError={setError}>
          <Canvas
            className="absolute inset-0"
            shadows={{ type: quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap }}
            dpr={[1, 2]}
            frameloop={warm ? 'always' : 'never'}
            gl={{ antialias: quality !== 'low', preserveDrawingBuffer: true, powerPreference: 'high-performance', stencil: false }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.localClippingEnabled = true;
              gl.debug.checkShaderErrors = import.meta.env.DEV;
              setAnisotropy(Math.min(8, gl.capabilities.getMaxAnisotropy()));
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                setError('The graphics context was lost (GPU reset or out of memory). Try a lower quality setting and reload.');
              });
            }}
          >
            <Suspense fallback={null}>
              <SceneContents />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      )}
      <CinematicFrame />
      <div className="pointer-events-none absolute inset-0">
        <TopBar />
        <TabletCameraBar />
        <LeftPanel />
        <RightPanel />
        <BottomBar />
        <MobileDock />
        <MobileDrawer />
        <Joystick />
        <Compass />
        <ConceptBadge />
        <Toast />
        <HelpModal />
      </div>
      <LoadingScreen error={error} />
    </div>
  );
}
