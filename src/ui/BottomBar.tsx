import { useEffect, useState } from 'react';
import { Activity, Ruler, Trash2, MousePointer2, Magnet } from 'lucide-react';
import { useStore, type FloorMode } from '../store/useStore';
import { formatTime } from '../lib/sun';
import { runtime } from '../lib/sceneEvents';
import { Seg } from './controls';

export function usePerf() {
  const [p, setP] = useState({ fps: 60, calls: 0, tris: 0 });
  useEffect(() => {
    const id = window.setInterval(() => setP({ fps: runtime.fps, calls: runtime.calls, tris: runtime.tris }), 700);
    return () => window.clearInterval(id);
  }, []);
  return p;
}

const HINTS: Record<string, string> = {
  orbit: 'Drag: rotate · Right-drag / Shift-drag: pan · Scroll / pinch: zoom · Arrow keys: pan',
  walk: 'Click to look (Esc releases) · WASD / arrows: move · Shift: run · Stairs connect GF ↔ 2F',
  top: 'Drag: pan · Scroll / pinch: zoom · Plan views hide the floors above the cut',
  measure: 'Click two points to measure · Snaps to vertices · Esc cancels the current line',
};

export function BottomBar() {
  const cameraMode = useStore((s) => s.cameraMode);
  const measuring = useStore((s) => s.measuring);
  const measurements = useStore((s) => s.measurements);
  const snap = useStore((s) => s.snap);
  const time = useStore((s) => s.time);
  const floorMode = useStore((s) => s.floorMode);
  const planView = useStore((s) => s.planView);
  const set = useStore((s) => s.set);
  const perf = usePerf();
  const [showPerf, setShowPerf] = useState(true);
  const label = planView !== 'none' ? `Plan · ${planView === 'ground' ? 'Ground floor' : planView === 'upper' ? 'Second floor' : 'Site'}` : cameraMode === 'orbit' ? 'Orbit' : cameraMode === 'walk' ? 'Walkthrough' : 'Top-down';

  return (
    <footer className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 hidden h-11 items-center gap-3 border-t border-white/[0.06] bg-ink-950/75 px-3 text-[12px] backdrop-blur-xl md:flex">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-ink-300">
        <MousePointer2 size={13} className="shrink-0 text-ink-400" />
        <span className="truncate">{HINTS[measuring ? 'measure' : cameraMode]}</span>
      </div>
      <span className="chip">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {label}
      </span>
      <span className="chip font-mono">{formatTime(time)}</span>
      <Seg<FloorMode>
        value={floorMode}
        onChange={(v) => set({ floorMode: v, planView: 'none' })}
        options={[
          { v: 'all', label: 'All' },
          { v: 'ground', label: 'GF' },
          { v: 'upper', label: '2F' },
          { v: 'roof', label: 'Roof' },
        ]}
      />
      <div className="flex items-center gap-1">
        <button
          className={`btn ${measuring ? '!border-amber-400/60 !bg-amber-400/15 !text-amber-300' : ''}`}
          onClick={() => set({ measuring: !measuring, cameraMode: cameraMode === 'walk' ? 'orbit' : cameraMode })}
          title="Measure distances (M)"
        >
          <Ruler size={13} /> Measure{measurements.length ? ` (${measurements.length})` : ''}
        </button>
        {measuring && (
          <button className={`btn-icon !h-7 !w-7 ${snap ? 'text-amber-300' : ''}`} onClick={() => set({ snap: !snap })} title="Snap to vertices">
            <Magnet size={14} />
          </button>
        )}
        {measurements.length > 0 && (
          <button className="btn-icon !h-7 !w-7" onClick={() => set({ measurements: [] })} title="Clear measurements">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <button className="chip font-mono" onClick={() => setShowPerf(!showPerf)} title="Scene performance">
        <Activity size={12} className={perf.fps < 28 ? 'text-red-400' : perf.fps < 45 ? 'text-amber-400' : 'text-emerald-400'} />
        {showPerf ? `${perf.fps.toFixed(0)} fps · ${perf.calls} draws · ${(perf.tris / 1000).toFixed(0)}k tris` : `${perf.fps.toFixed(0)} fps`}
      </button>
    </footer>
  );
}
