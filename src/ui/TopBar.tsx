import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  Footprints,
  Maximize,
  Minimize,
  HelpCircle,
  Map as MapIcon,
  Orbit,
  PanelLeft,
  PanelRight,
  RotateCcw,
  Sunset,
  Box,
  Square,
} from 'lucide-react';
import { useStore, type Quality } from '../store/useStore';
import { VIEWPOINTS, WALK_STARTS } from '../config/viewpoints';
import { goToView, resetView, setCameraMode, sunsetMode, takeScreenshot, toggleFullscreen, walkTo } from './actions';
import { Seg } from './controls';

export function useFullscreen() {
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const f = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  return fs;
}

function ViewsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cameraMode = useStore((s) => s.cameraMode);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);
  const groups = ['Sunset', 'Exterior', 'Site', 'Interior'] as const;
  return (
    <div className="relative" ref={ref}>
      <button className="btn" onClick={() => setOpen(!open)} title="Camera viewpoints">
        <Camera size={14} /> Views <ChevronDown size={13} />
      </button>
      {open && (
        <div className="panel animate-in scroll-thin absolute left-1/2 top-11 z-50 max-h-[70vh] w-72 -translate-x-1/2 overflow-y-auto p-2">
          {groups.map((g) => (
            <div key={g} className="mb-1">
              <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{g}</div>
              {VIEWPOINTS.filter((v) => v.group === g).map((v) => (
                <button
                  key={v.id}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-[13px] text-ink-100 hover:bg-white/[0.08]"
                  onClick={() => {
                    goToView(v);
                    setOpen(false);
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          ))}
          <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Walk from… {cameraMode === 'walk' && '(teleport)'}</div>
          <div className="grid grid-cols-2 gap-1 px-1 pb-1">
            {WALK_STARTS.map((w) => (
              <button
                key={w.id}
                className="rounded-md px-2 py-1 text-left text-[12px] text-ink-200 hover:bg-white/[0.08]"
                onClick={() => {
                  walkTo(w.id);
                  setOpen(false);
                }}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const cameraMode = useStore((s) => s.cameraMode);
  const projection = useStore((s) => s.projection);
  const quality = useStore((s) => s.quality);
  const leftOpen = useStore((s) => s.leftOpen);
  const rightOpen = useStore((s) => s.rightOpen);
  const set = useStore((s) => s.set);
  const fs = useFullscreen();

  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-white/[0.06] bg-ink-950/75 px-2 backdrop-blur-xl sm:px-3">
      <button className="btn-icon hidden md:inline-flex" onClick={() => set({ leftOpen: !leftOpen })} title="Toggle scene panel" aria-label="Toggle scene panel">
        <PanelLeft size={18} className={leftOpen ? 'text-amber-400' : ''} />
      </button>
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-ink-950 shadow">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M3 11 12 5l9 6" />
            <path d="M6 10v9h12v-9" />
            <path d="M10 19v-5h4v5" />
          </svg>
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[14px] font-semibold tracking-tight text-white">Caliraya Coffee House</div>
          <div className="hidden truncate text-[11px] text-ink-400 sm:block">Conceptual design · Caliraya, Laguna, PH</div>
        </div>
      </div>

      <div className="mx-auto hidden items-center gap-2 xl:flex">
        <Seg
          value={cameraMode}
          onChange={setCameraMode}
          options={[
            { v: 'orbit', label: <span className="flex items-center gap-1.5"><Orbit size={13} />Orbit</span>, title: 'Orbit (1)' },
            { v: 'walk', label: <span className="flex items-center gap-1.5"><Footprints size={13} />Walk</span>, title: 'First-person walkthrough (2)' },
            { v: 'top', label: <span className="flex items-center gap-1.5"><MapIcon size={13} />Top</span>, title: 'Top-down plan view (3)' },
          ]}
        />
        <Seg
          value={projection}
          onChange={(v) => set({ projection: v, cameraMode: cameraMode === 'walk' ? 'orbit' : cameraMode })}
          options={[
            { v: 'perspective', label: <span className="flex items-center gap-1"><Box size={13} />Persp</span>, title: 'Perspective camera' },
            { v: 'orthographic', label: <span className="flex items-center gap-1"><Square size={13} />Ortho</span>, title: 'Orthographic camera' },
          ]}
        />
        <ViewsMenu />
        <button className="btn" onClick={resetView} title="Reset view (R)">
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1 xl:ml-0">
        <button className="btn-accent" onClick={sunsetMode} title="Sunset Mode — repeat to cycle sunset viewpoints">
          <Sunset size={15} /> <span className="hidden whitespace-nowrap sm:inline">Sunset Mode</span>
        </button>
        <select
          className="hidden md:block"
          value={quality}
          onChange={(e) => set({ autoQuality: false, quality: e.target.value as Quality, shadowQuality: e.target.value === 'low' ? 'low' : e.target.value === 'medium' ? 'medium' : 'high' })}
          title="Rendering quality"
          aria-label="Rendering quality"
        >
          <option value="low">Quality: Low</option>
          <option value="medium">Quality: Medium</option>
          <option value="high">Quality: High</option>
        </select>
        <button className="btn-icon" onClick={takeScreenshot} title="Screenshot (P)" aria-label="Screenshot">
          <Camera size={18} />
        </button>
        <button className="btn-icon" onClick={toggleFullscreen} title="Fullscreen (F)" aria-label="Fullscreen">
          {fs ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
        <button className="btn-icon hidden sm:inline-flex" onClick={() => set({ showHelp: true })} title="Controls & shortcuts (H)" aria-label="Help">
          <HelpCircle size={18} />
        </button>
        <button className="btn-icon hidden md:inline-flex" onClick={() => set({ rightOpen: !rightOpen })} title="Toggle settings panel" aria-label="Toggle settings panel">
          <PanelRight size={18} className={rightOpen ? 'text-amber-400' : ''} />
        </button>
      </div>
    </header>
  );
}

/** Compact camera controls for tablets (md..lg) where the centre toolbar is hidden. */
export function TabletCameraBar() {
  const cameraMode = useStore((s) => s.cameraMode);
  return (
    <div className="pointer-events-auto absolute left-1/2 top-16 z-20 hidden -translate-x-1/2 items-center gap-2 md:flex xl:hidden">
      <div className="panel flex items-center gap-2 p-1.5">
        <Seg
          value={cameraMode}
          onChange={setCameraMode}
          options={[
            { v: 'orbit', label: 'Orbit' },
            { v: 'walk', label: 'Walk' },
            { v: 'top', label: 'Top' },
          ]}
        />
        <ViewsMenu />
        <button className="btn" onClick={resetView}>
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
