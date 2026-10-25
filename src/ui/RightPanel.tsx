import { useMemo } from 'react';
import { Cloud, CloudRain, Clock, Pause, Play, Sun, Video, Palette, SunMedium, Aperture } from 'lucide-react';
import { useStore, type RenderMode, type ShadowQuality, type Quality } from '../store/useStore';
import { MONTHS, TIME_PRESETS, compass, dayOfYear, formatTime, solarPosition, type Weather } from '../lib/sun';
import { Section, Seg, Slider, Toggle } from './controls';
import { setTimePreset } from './actions';

export function TimeControls({ compact = false }: { compact?: boolean }) {
  const time = useStore((s) => s.time);
  const doy = useStore((s) => s.doy);
  const animate = useStore((s) => s.animate);
  const timeSpeed = useStore((s) => s.timeSpeed);
  const set = useStore((s) => s.set);
  const sp = useMemo(() => solarPosition(time, doy), [time, doy]);
  const elev = (sp.elevation * 180) / Math.PI;
  const az = (sp.azimuth * 180) / Math.PI;
  const month = useMemo(() => {
    let m = 0;
    for (let i = 0; i < 12; i++) if (doy >= dayOfYear(i, 1)) m = i;
    return m;
  }, [doy]);
  const activePreset = TIME_PRESETS.reduce<{ id: string; d: number } | null>((best, p) => {
    const d = Math.abs(p.time(doy) - time);
    return d < 0.08 && (!best || d < best.d) ? { id: p.id, d } : best;
  }, null)?.id;

  return (
    <Section title="Time of day" icon={<Clock size={13} />}>
      <div className="mb-1 flex items-end justify-between">
        <div className="font-mono text-2xl font-semibold tracking-tight text-white">{formatTime(time)}</div>
        <div className="text-right text-[11px] leading-tight text-ink-300">
          Sun {elev >= 0 ? `${elev.toFixed(1)}°` : `${elev.toFixed(1)}° (below)`}
          <br />
          {compass(sp.azimuth)} {az.toFixed(0)}°
        </div>
      </div>
      <Slider className="time-slider" min={6} max={22} step={1 / 60} value={time} onChange={(v) => set({ time: v, animate: false })} />
      <div className="mt-0.5 flex justify-between font-mono text-[10px] text-ink-400">
        <span>6 AM</span>
        <span>10</span>
        <span>2 PM</span>
        <span>6</span>
        <span>10 PM</span>
      </div>
      <div className={`mt-2 grid gap-1 ${compact ? 'grid-cols-4' : 'grid-cols-4'}`}>
        {TIME_PRESETS.map((p) => (
          <button
            key={p.id}
            className={`rounded-md border px-1 py-1.5 text-[11px] font-medium transition ${activePreset === p.id ? 'border-amber-400/60 bg-amber-400/15 text-amber-300' : 'border-white/10 bg-white/[0.03] text-ink-200 hover:bg-white/[0.08]'}`}
            onClick={() => setTimePreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button className={`btn ${animate ? '!border-amber-400/60 !text-amber-300' : ''}`} onClick={() => set({ animate: !animate })} title="Animate the sun across the sky (T)">
          {animate ? <Pause size={13} /> : <Play size={13} />} {animate ? 'Pause' : 'Animate sun'}
        </button>
        <select value={timeSpeed} onChange={(e) => set({ timeSpeed: parseFloat(e.target.value) })} aria-label="Animation speed">
          <option value={0.05}>Slow</option>
          <option value={0.2}>Normal</option>
          <option value={0.6}>Fast</option>
          <option value={1.5}>Very fast</option>
        </select>
        <select value={month} onChange={(e) => set({ doy: dayOfYear(parseInt(e.target.value), parseInt(e.target.value) === 9 ? 25 : 21) })} aria-label="Month (sun path)" title="Date for the solar path">
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </Section>
  );
}

export function LightControls() {
  const sunMul = useStore((s) => s.sunMul);
  const shadows = useStore((s) => s.shadows);
  const shadowQuality = useStore((s) => s.shadowQuality);
  const weather = useStore((s) => s.weather);
  const set = useStore((s) => s.set);
  return (
    <>
      <Section title="Sunlight & shadows" icon={<SunMedium size={13} />}>
        <Slider label="Sun intensity" min={0} max={2} step={0.05} value={sunMul} onChange={(v) => set({ sunMul: v })} display={`${Math.round(sunMul * 100)}%`} />
        <div className="mt-1.5">
          <Toggle label="Cast shadows" on={shadows} onChange={(v) => set({ shadows: v })} />
        </div>
        <div className="mt-1 flex items-center justify-between px-2 text-[13px] text-ink-100">
          <span>Shadow resolution</span>
          <Seg<ShadowQuality>
            value={shadowQuality}
            onChange={(v) => set({ shadowQuality: v })}
            options={[
              { v: 'low', label: '1K' },
              { v: 'medium', label: '2K' },
              { v: 'high', label: '4K' },
            ]}
          />
        </div>
      </Section>
      <Section title="Weather & atmosphere" icon={<Cloud size={13} />}>
        <Seg<Weather>
          full
          value={weather}
          onChange={(v) => set({ weather: v })}
          options={[
            { v: 'clear', label: <span className="flex items-center justify-center gap-1"><Sun size={13} />Clear</span> },
            { v: 'cloudy', label: <span className="flex items-center justify-center gap-1"><Cloud size={13} />Cloudy</span> },
            { v: 'rainy', label: <span className="flex items-center justify-center gap-1"><CloudRain size={13} />Rainy</span> },
          ]}
        />
        <p className="mt-1.5 px-1 text-[11px] text-ink-400">Visual simulation only — not a live forecast.</p>
      </Section>
    </>
  );
}

const PRESETS: { v: RenderMode; label: string; desc: string }[] = [
  { v: 'photo', label: 'Photorealistic', desc: 'PBR, reflections, shadows' },
  { v: 'cinematic', label: 'Cinematic', desc: 'Grade, framing; DOF & bloom on High' },
  { v: 'architectural', label: 'Architectural', desc: 'Balanced, clear, no haze' },
  { v: 'clay', label: 'Clay Model', desc: 'Monochrome massing study' },
  { v: 'blueprint', label: 'Blueprint', desc: 'Technical edges on blue' },
  { v: 'wireframe', label: 'Wireframe', desc: 'Mesh inspection' },
];

export function RenderControls() {
  const renderMode = useStore((s) => s.renderMode);
  const quality = useStore((s) => s.quality);
  const bloom = useStore((s) => s.bloom);
  const ao = useStore((s) => s.ao);
  const set = useStore((s) => s.set);
  return (
    <Section title="Visual style" icon={<Palette size={13} />}>
      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.v}
            onClick={() => set({ renderMode: p.v, fov: p.v === 'cinematic' ? 38 : useStore.getState().fov === 38 ? 42 : useStore.getState().fov })}
            className={`rounded-lg border p-2 text-left transition ${renderMode === p.v ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}
          >
            <div className={`text-[12.5px] font-semibold ${renderMode === p.v ? 'text-amber-300' : 'text-ink-100'}`}>{p.label}</div>
            <div className="text-[10.5px] leading-tight text-ink-400">{p.desc}</div>
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between px-2 text-[13px] text-ink-100">
        <span>Quality</span>
        <Seg<Quality>
          value={quality}
          onChange={(v) => set({ autoQuality: false, quality: v, shadowQuality: v === 'low' ? 'low' : v === 'medium' ? 'medium' : 'high' })}
          options={[
            { v: 'low', label: 'Low' },
            { v: 'medium', label: 'Med' },
            { v: 'high', label: 'High' },
          ]}
        />
      </div>
      <div className="mt-1 space-y-0.5">
        <Toggle label="Bloom / glow" on={bloom} onChange={(v) => set({ bloom: v })} hint="High quality only" />
        <Toggle label="Ambient occlusion (GTAO)" on={ao} onChange={(v) => set({ ao: v })} hint="High quality only" />
      </div>
    </Section>
  );
}

export function CameraControls() {
  const fov = useStore((s) => s.fov);
  const projection = useStore((s) => s.projection);
  const walkSpeed = useStore((s) => s.walkSpeed);
  const autoRotate = useStore((s) => s.autoRotate);
  const cameraMode = useStore((s) => s.cameraMode);
  const set = useStore((s) => s.set);
  return (
    <Section title="Camera" icon={<Video size={13} />}>
      <Slider label="Field of view" min={20} max={80} step={1} value={fov} onChange={(v) => set({ fov: v })} display={`${fov}°`} />
      <div className="mt-1.5 flex items-center justify-between px-2 text-[13px] text-ink-100">
        <span className="flex items-center gap-1.5">
          <Aperture size={13} className="text-ink-400" />
          Projection
        </span>
        <Seg
          value={projection}
          onChange={(v) => set({ projection: v, cameraMode: cameraMode === 'walk' ? 'orbit' : cameraMode })}
          options={[
            { v: 'perspective', label: 'Persp' },
            { v: 'orthographic', label: 'Ortho' },
          ]}
        />
      </div>
      <div className="mt-1.5">
        <Slider label="Walk speed" min={0.6} max={4} step={0.1} value={walkSpeed} onChange={(v) => set({ walkSpeed: v })} display={`${walkSpeed.toFixed(1)} m/s`} />
      </div>
      <div className="mt-1">
        <Toggle label="Auto-rotate (orbit)" on={autoRotate} onChange={(v) => set({ autoRotate: v })} />
      </div>
    </Section>
  );
}

export function RightPanel() {
  const open = useStore((s) => s.rightOpen);
  if (!open) return null;
  return (
    <aside className="panel animate-in scroll-thin pointer-events-auto absolute bottom-14 right-3 top-[68px] z-20 hidden w-[312px] overflow-y-auto md:block">
      <TimeControls />
      <LightControls />
      <RenderControls />
      <CameraControls />
    </aside>
  );
}
