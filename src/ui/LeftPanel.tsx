import { Layers, Building2, Ruler, Scissors, Info, Map as MapIcon } from 'lucide-react';
import { useStore, LAYER_LABELS, type LayerKey, type FloorMode, type CutMode } from '../store/useStore';
import { VIEWPOINTS } from '../config/viewpoints';
import { CUT_RANGES } from '../scene/clipping';
import { EyeRow, Section, Seg, Slider, Toggle } from './controls';
import { goToView, openPlan } from './actions';

const TREE: { group: string; keys: LayerKey[] }[] = [
  { group: 'Building', keys: ['groundFloor', 'secondFloor', 'roof'] },
  { group: 'Interior', keys: ['furniture', 'kitchen', 'fixtures', 'lighting'] },
  { group: 'Site', keys: ['landscape', 'parking', 'vehicles', 'terrain'] },
];
const FOCUS: Partial<Record<LayerKey, string>> = {
  groundFloor: 'dining',
  secondFloor: 'lounge2',
  roof: 'aerial',
  furniture: 'dining',
  kitchen: 'kitchen',
  fixtures: 'cr',
  landscape: 'site-overview',
  parking: 'parking',
  vehicles: 'parking',
  terrain: 'lake-aerial',
};

export function FloorControls() {
  const floorMode = useStore((s) => s.floorMode);
  const exploded = useStore((s) => s.exploded);
  const xray = useStore((s) => s.xray);
  const cut = useStore((s) => s.cut);
  const cutPos = useStore((s) => s.cutPos);
  const roof = useStore((s) => s.layers.roof);
  const set = useStore((s) => s.set);
  const setLayer = useStore((s) => s.setLayer);
  return (
    <>
      <Section title="Floor isolation" icon={<Building2 size={13} />}>
        <Seg<FloorMode>
          full
          value={floorMode}
          onChange={(v) => set({ floorMode: v, planView: 'none' })}
          options={[
            { v: 'all', label: 'All', title: 'Entire building' },
            { v: 'ground', label: 'GF', title: 'Ground floor only' },
            { v: 'upper', label: '2F', title: 'Second floor only' },
            { v: 'roof', label: 'Roof', title: 'Roof only' },
          ]}
        />
        <div className="mt-2 space-y-0.5">
          <Toggle label="Show roof" on={roof} onChange={(v) => setLayer('roof', v)} hint="Hide the roof to look into the second floor" />
          <Toggle label="Exploded floors" on={exploded} onChange={(v) => set({ exploded: v, cameraMode: useStore.getState().cameraMode === 'walk' ? 'orbit' : useStore.getState().cameraMode })} hint="Separate the levels vertically (E)" />
          <Toggle label="X-ray walls" on={xray} onChange={(v) => set({ xray: v })} hint="Transparent envelope reveals the interior layout (X)" />
        </div>
      </Section>
      <Section title="Cutaway / section" icon={<Scissors size={13} />}>
        <select
          className="w-full"
          value={cut}
          onChange={(e) => {
            const v = e.target.value as CutMode;
            set({ cut: v, planView: 'none', cutPos: v === 'none' ? 0 : CUT_RANGES[v].def });
          }}
          aria-label="Cutaway mode"
        >
          <option value="none">No cut</option>
          <option value="section-ns">Section — remove south half (looks north)</option>
          <option value="section-ew">Section — remove west part (stair & bar)</option>
          <option value="horizontal">Horizontal cut (plan cut)</option>
        </select>
        {cut !== 'none' && (
          <div className="mt-2">
            <Slider label={CUT_RANGES[cut].label} min={CUT_RANGES[cut].min} max={CUT_RANGES[cut].max} step={0.05} value={cutPos} onChange={(v) => set({ cutPos: v })} display={`${cutPos.toFixed(2)} m`} />
          </div>
        )}
      </Section>
    </>
  );
}

export function HierarchyControls() {
  const layers = useStore((s) => s.layers);
  const setLayer = useStore((s) => s.setLayer);
  return (
    <Section title="Scene hierarchy" icon={<Layers size={13} />}>
      {TREE.map((g) => (
        <div key={g.group} className="mb-1">
          <div className="px-2 pb-0.5 pt-1 text-[11px] font-medium text-ink-400">{g.group}</div>
          {g.keys.map((k) => (
            <EyeRow
              key={k}
              indent={1}
              label={LAYER_LABELS[k]}
              on={layers[k]}
              onChange={(v) => setLayer(k, v)}
              onFocus={FOCUS[k] ? () => goToView(VIEWPOINTS.find((v) => v.id === FOCUS[k])!) : undefined}
            />
          ))}
        </div>
      ))}
    </Section>
  );
}

export function PlanControls() {
  const planView = useStore((s) => s.planView);
  const showLabels = useStore((s) => s.showLabels);
  const showDims = useStore((s) => s.showDims);
  const showGrid = useStore((s) => s.showGrid);
  const showAxes = useStore((s) => s.showAxes);
  const set = useStore((s) => s.set);
  return (
    <Section title="Plans & annotation" icon={<MapIcon size={13} />}>
      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            ['ground', 'GF Plan'],
            ['upper', '2F Plan'],
            ['site', 'Site Plan'],
          ] as const
        ).map(([v, l]) => (
          <button key={v} className={`btn ${planView === v ? '!border-amber-400/60 !bg-amber-400/15 !text-amber-300' : ''}`} onClick={() => openPlan(planView === v ? 'none' : v)}>
            {l}
          </button>
        ))}
      </div>
      {planView !== 'none' && (
        <button className="btn mt-1.5 w-full" onClick={() => openPlan('none')}>
          Exit plan view
        </button>
      )}
      <div className="mt-2 space-y-0.5">
        <Toggle label="Room labels & areas" on={showLabels} onChange={(v) => set({ showLabels: v })} hint="L" />
        <Toggle label="Dimensions & levels" on={showDims} onChange={(v) => set({ showDims: v })} icon={<Ruler size={13} className="text-ink-400" />} />
        <Toggle label="Grid (1 m / 5 m)" on={showGrid} onChange={(v) => set({ showGrid: v })} hint="G" />
        <Toggle label="Coordinate axes" on={showAxes} onChange={(v) => set({ showAxes: v })} />
      </div>
    </Section>
  );
}

export function Disclaimer() {
  return (
    <div className="m-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-3 text-[11.5px] leading-relaxed text-ink-200">
      <div className="mb-1 flex items-center gap-1.5 font-semibold text-amber-300">
        <Info size={13} /> Conceptual design
      </div>
      All dimensions are preliminary, editable values (metres) in <code className="text-amber-200">src/config/layout.ts</code>. They are not verified site measurements. Final
      plans require a topographic survey, structural design and sealed drawings by licensed Philippine professionals.
    </div>
  );
}

export function LeftPanel() {
  const open = useStore((s) => s.leftOpen);
  if (!open) return null;
  return (
    <aside className="panel animate-in scroll-thin pointer-events-auto absolute bottom-14 left-3 top-[68px] z-20 hidden w-[288px] overflow-y-auto md:block">
      <FloorControls />
      <HierarchyControls />
      <PlanControls />
      <Disclaimer />
    </aside>
  );
}
