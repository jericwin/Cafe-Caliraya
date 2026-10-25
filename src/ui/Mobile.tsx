import { useRef, useState } from 'react';
import { Settings2, X, Ruler, Layers, SunMedium, Camera as CamIcon } from 'lucide-react';
import { useStore, type CameraMode, type FloorMode } from '../store/useStore';
import { VIEWPOINTS, WALK_STARTS } from '../config/viewpoints';
import { formatTime } from '../lib/sun';
import { runtime } from '../lib/sceneEvents';
import { Seg, Slider } from './controls';
import { FloorControls, HierarchyControls, PlanControls, Disclaimer } from './LeftPanel';
import { CameraControls, LightControls, RenderControls, TimeControls } from './RightPanel';
import { goToView, resetView, setCameraMode, walkTo } from './actions';

export function MobileDock() {
  const time = useStore((s) => s.time);
  const cameraMode = useStore((s) => s.cameraMode);
  const floorMode = useStore((s) => s.floorMode);
  const measuring = useStore((s) => s.measuring);
  const set = useStore((s) => s.set);
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-ink-950/85 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-3">
        <span className="w-[72px] shrink-0 font-mono text-[13px] font-semibold text-white">{formatTime(time)}</span>
        <div className="flex-1">
          <Slider className="time-slider" min={6} max={22} step={1 / 60} value={time} onChange={(v) => set({ time: v, animate: false })} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Seg<CameraMode>
          value={cameraMode}
          onChange={setCameraMode}
          options={[
            { v: 'orbit', label: 'Orbit' },
            { v: 'walk', label: 'Walk' },
            { v: 'top', label: 'Top' },
          ]}
        />
        <Seg<FloorMode>
          value={floorMode}
          onChange={(v) => set({ floorMode: v, planView: 'none' })}
          options={[
            { v: 'all', label: 'All' },
            { v: 'ground', label: 'GF' },
            { v: 'upper', label: '2F' },
          ]}
        />
        <button
          className={`btn-icon ml-auto !h-10 !w-10 border-white/10 ${measuring ? '!text-amber-300' : ''}`}
          onClick={() => set({ measuring: !measuring, cameraMode: cameraMode === 'walk' ? 'orbit' : cameraMode })}
          aria-label="Measure"
        >
          <Ruler size={19} />
        </button>
        <button className="btn-icon !h-10 !w-10 border-white/10 bg-white/[0.06]" onClick={() => set({ drawer: 'env' })} aria-label="Settings">
          <Settings2 size={19} />
        </button>
      </div>
    </div>
  );
}

export function MobileDrawer() {
  const drawer = useStore((s) => s.drawer);
  const set = useStore((s) => s.set);
  if (!drawer) return null;
  const tabs = [
    { id: 'env', label: 'Environment', icon: <SunMedium size={14} /> },
    { id: 'scene', label: 'Building', icon: <Layers size={14} /> },
    { id: 'views', label: 'Views', icon: <CamIcon size={14} /> },
  ] as const;
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col justify-end md:hidden" onClick={() => set({ drawer: null })}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="panel animate-in relative flex max-h-[78vh] flex-col rounded-b-none rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 border-b border-white/[0.08] p-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => set({ drawer: t.id })}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-medium ${drawer === t.id ? 'bg-white/[0.1] text-white' : 'text-ink-300'}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <button className="btn-icon !h-10 !w-10" onClick={() => set({ drawer: null })} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {drawer === 'env' && (
            <>
              <TimeControls compact />
              <LightControls />
              <RenderControls />
              <CameraControls />
            </>
          )}
          {drawer === 'scene' && (
            <>
              <FloorControls />
              <PlanControls />
              <HierarchyControls />
              <Disclaimer />
            </>
          )}
          {drawer === 'views' && (
            <div className="p-3">
              <button className="btn mb-3 w-full !py-2.5" onClick={() => (resetView(), set({ drawer: null }))}>
                Reset view
              </button>
              {(['Sunset', 'Exterior', 'Site', 'Interior'] as const).map((g) => (
                <div key={g} className="mb-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{g}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VIEWPOINTS.filter((v) => v.group === g).map((v) => (
                      <button key={v.id} className="btn !justify-start !py-2.5 text-left" onClick={() => (goToView(v), set({ drawer: null }))}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Walk from</div>
              <div className="grid grid-cols-2 gap-1.5">
                {WALK_STARTS.map((w) => (
                  <button key={w.id} className="btn !justify-start !py-2.5" onClick={() => (walkTo(w.id), set({ drawer: null }))}>
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Virtual joystick for touch walkthrough (left thumb); drag elsewhere on the canvas to look. */
export function Joystick() {
  const cameraMode = useStore((s) => s.cameraMode);
  const isMobile = useStore((s) => s.isMobile);
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState<[number, number]>([0, 0]);
  const [run, setRun] = useState(false);
  const touchy = isMobile || (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches);
  if (cameraMode !== 'walk' || !touchy) return null;
  const R = 46;
  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let x = e.clientX - (r.left + r.width / 2);
    let y = e.clientY - (r.top + r.height / 2);
    const l = Math.hypot(x, y);
    if (l > R) {
      x = (x / l) * R;
      y = (y / l) * R;
    }
    setKnob([x, y]);
    runtime.walk.moveX = x / R;
    runtime.walk.moveY = -y / R;
  };
  const end = () => {
    setKnob([0, 0]);
    runtime.walk.moveX = 0;
    runtime.walk.moveY = 0;
  };
  return (
    <>
      <div
        ref={base}
        className="pointer-events-auto absolute bottom-[132px] left-5 z-30 h-[120px] w-[120px] touch-none rounded-full border border-white/20 bg-black/30 backdrop-blur md:bottom-16"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          e.stopPropagation();
          update(e);
        }}
        onPointerMove={(e) => e.buttons && update(e)}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Move joystick"
      >
        <div className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full border border-white/40 bg-white/25 shadow-lg" style={{ transform: `translate(calc(-50% + ${knob[0]}px), calc(-50% + ${knob[1]}px))` }} />
      </div>
      <button
        className={`pointer-events-auto absolute bottom-[150px] left-[152px] z-30 rounded-full border px-3 py-2 text-xs font-semibold backdrop-blur md:bottom-20 ${run ? 'border-amber-400/60 bg-amber-400/20 text-amber-300' : 'border-white/20 bg-black/30 text-white'}`}
        onClick={() => {
          runtime.walk.run = !run;
          setRun(!run);
        }}
      >
        Run
      </button>
      <div className="pointer-events-none absolute bottom-[140px] right-5 z-20 rounded-lg bg-black/40 px-2 py-1 text-[11px] text-white/80 md:bottom-16">Drag to look around</div>
    </>
  );
}
