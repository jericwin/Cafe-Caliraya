import type { ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function Section({ title, icon, children, right }: { title: string; icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="border-b border-white/[0.06] px-4 py-3.5 last:border-b-0">
      <div className="section-title">
        {icon}
        <span className="flex-1">{title}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Toggle({ label, on, onChange, hint, icon }: { label: string; on: boolean; onChange: (v: boolean) => void; hint?: string; icon?: ReactNode }) {
  return (
    <button className="toggle-row" onClick={() => onChange(!on)} title={hint} aria-pressed={on}>
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className={`relative h-[18px] w-8 rounded-full transition ${on ? 'bg-amber-500/80' : 'bg-white/15'}`}>
        <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all ${on ? 'left-[16px]' : 'left-[2px]'}`} />
      </span>
    </button>
  );
}

export function EyeRow({ label, on, onChange, onFocus, indent = 0 }: { label: string; on: boolean; onChange: (v: boolean) => void; onFocus?: () => void; indent?: number }) {
  return (
    <div className="group flex items-center rounded-lg pr-1 transition hover:bg-white/[0.05]" style={{ paddingLeft: 8 + indent * 14 }}>
      <button className={`flex-1 truncate py-1.5 text-left text-[13px] ${on ? 'text-ink-100' : 'text-ink-400'}`} onClick={onFocus} title={onFocus ? `Fly to ${label}` : label}>
        {label}
      </button>
      <button className="rounded-md p-1.5 text-ink-300 hover:bg-white/10 hover:text-white" onClick={() => onChange(!on)} title={on ? `Hide ${label}` : `Show ${label}`} aria-label={on ? `Hide ${label}` : `Show ${label}`}>
        {on ? <Eye size={15} /> : <EyeOff size={15} className="text-ink-500" />}
      </button>
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, full }: { value: T; options: { v: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; full?: boolean }) {
  return (
    <div className={`seg ${full ? 'flex w-full' : ''}`} role="radiogroup">
      {options.map((o) => (
        <button key={o.v} data-on={value === o.v} onClick={() => onChange(o.v)} title={o.title} className={full ? 'flex-1' : ''} role="radio" aria-checked={value === o.v}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  display,
  className,
  fill,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  label?: string;
  display?: string;
  className?: string;
  fill?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      {label && (
        <div className="mb-0.5 flex justify-between text-[12px] text-ink-300">
          <span>{label}</span>
          <span className="font-mono text-ink-100">{display ?? value}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className={className}
        style={{ ['--pct' as string]: `${pct}%`, ['--fill' as string]: fill }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
      />
    </label>
  );
}
