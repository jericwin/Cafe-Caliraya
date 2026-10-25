import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { runtime } from '../lib/sceneEvents';

export function Compass() {
  const ref = useRef<HTMLDivElement>(null);
  const rightOpen = useStore((s) => s.rightOpen);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (ref.current) ref.current.style.transform = `rotate(${(runtime.heading * 180) / Math.PI}deg)`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={`pointer-events-none absolute top-[72px] z-10 transition-all ${rightOpen ? 'right-3 md:right-[336px]' : 'right-3'}`} aria-hidden>
      <div className="relative grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-ink-950/60 backdrop-blur">
        <div ref={ref} className="absolute inset-0">
          <div className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-bold text-amber-400">N</div>
          <div className="absolute left-1/2 top-[18px] h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[14px] border-x-transparent border-b-amber-400" />
          <div className="absolute bottom-[18px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[14px] border-x-transparent border-t-white/40" />
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] text-white/50">S</div>
          <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-white/50">W</div>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-white/50">E</div>
        </div>
      </div>
      <div className="mt-1 text-center text-[9px] uppercase tracking-wider text-white/50">Lake ← W</div>
    </div>
  );
}

export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-[76px] z-50 -translate-x-1/2">
      <div className="panel animate-in px-4 py-2 text-[13px] font-medium text-white">{toast}</div>
    </div>
  );
}

export function CinematicFrame() {
  const renderMode = useStore((s) => s.renderMode);
  const cameraMode = useStore((s) => s.cameraMode);
  if (renderMode !== 'cinematic' || cameraMode === 'top') return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      <div className="vignette absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-[4.5vh] bg-black/80" />
      <div className="absolute inset-x-0 bottom-0 h-[4.5vh] bg-black/80" />
    </div>
  );
}

export function ConceptBadge() {
  const leftOpen = useStore((s) => s.leftOpen);
  return (
    <div className={`pointer-events-none absolute bottom-[132px] z-10 hidden rounded-md border border-white/10 bg-black/45 px-2 py-1 text-[10.5px] text-white/70 backdrop-blur sm:block md:bottom-14 ${leftOpen ? 'left-3 md:left-[304px]' : 'left-3'}`}>
      Preliminary concept · not for construction · dimensions in metres
    </div>
  );
}

export function LoadingScreen({ error }: { error?: string | null }) {
  const ready = useStore((s) => s.ready);
  if (ready && !error) return null;
  return (
    <div className="absolute inset-0 z-[60] grid place-items-center bg-[radial-gradient(ellipse_at_bottom,#3a2318_0%,#120f12_45%,#08090c_100%)]">
      <div className="max-w-sm px-6 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-ink-950 shadow-lg">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M3 11 12 5l9 6" />
            <path d="M6 10v9h12v-9" />
            <path d="M10 19v-5h4v5" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Caliraya Coffee House</h1>
        <p className="mt-1 text-[13px] text-ink-300">Lakeside café · Caliraya, Laguna</p>
        {error ? (
          <div className="mt-6 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-left text-[13px] text-red-200">
            <b className="block text-red-100">The 3D viewer could not start.</b>
            {error}
            <button className="btn mt-3 w-full" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        ) : (
          <>
            <div className="mx-auto mt-6 h-1 w-56 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-amber-400 to-rose-400" />
            </div>
            <LoadingStage />
          </>
        )}
      </div>
      <style>{`@keyframes loading { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }`}</style>
    </div>
  );
}

function LoadingStage() {
  const warm = useStore((s) => s.warm);
  return <p className="mt-3 text-[12px] text-ink-400">{warm ? 'Lighting the sunset…' : 'Generating materials, terrain and the sunset sky…'}</p>;
}

const SHORTCUTS: [string, string][] = [
  ['1 / 2 / 3', 'Orbit · Walk · Top-down'],
  ['R', 'Reset view'],
  ['F', 'Fullscreen'],
  ['P', 'Screenshot'],
  ['M', 'Measure tool'],
  ['T', 'Animate sun on / off'],
  ['[  ]', 'Time −/+ 15 min'],
  ['E', 'Exploded floors'],
  ['X', 'X-ray walls'],
  ['L / G', 'Room labels · grid'],
  ['O', 'Perspective / orthographic'],
  ['H', 'This help'],
];

export function HelpModal() {
  const show = useStore((s) => s.showHelp);
  const set = useStore((s) => s.set);
  if (!show) return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => set({ showHelp: false })}>
      <div className="panel animate-in w-full max-w-xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center">
          <h2 className="flex-1 text-[15px] font-semibold text-white">Navigation & shortcuts</h2>
          <button className="btn-icon" onClick={() => set({ showHelp: false })} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 text-[13px] sm:grid-cols-2">
          <div>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">Mouse / trackpad</h3>
            <ul className="space-y-1 text-ink-200">
              <li>Left-drag — orbit</li>
              <li>Right-drag or Shift-drag — pan</li>
              <li>Scroll — zoom</li>
              <li>Walk mode: click to capture the mouse, WASD to move, Shift to run, Esc to release</li>
            </ul>
            <h3 className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-amber-300">Touch</h3>
            <ul className="space-y-1 text-ink-200">
              <li>One finger — orbit (pan in Top view)</li>
              <li>Two fingers — pinch zoom & pan</li>
              <li>Walk — left joystick moves, drag to look</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">Keyboard</h3>
            <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
              {SHORTCUTS.map(([k, d]) => (
                <div key={k} className="contents">
                  <dt>
                    <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-white">{k}</kbd>
                  </dt>
                  <dd className="text-ink-200">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <p className="mt-4 border-t border-white/10 pt-3 text-[11.5px] text-ink-400">
          The building is a preliminary concept. Sun positions use the NOAA solar model for Caliraya (14.29°N, 121.52°E, UTC+8); weather is a visual simulation.
        </p>
      </div>
    </div>
  );
}
