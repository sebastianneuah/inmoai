// Componentes visuales reutilizables.
import React, { useEffect } from 'react';
import type { Club, CrestDef, IndKey } from '../engine/types';
import { IND_INFO } from '../engine/relations';
import { money } from '../engine/util';

// ------------------------------------------------------------------ escudos
export function Crest({ club, crest, short, size = 36 }: { club?: Club | null; crest?: CrestDef; short?: string; size?: number }) {
  const c = crest ?? club?.crest ?? { shape: 'escudo', pattern: 'liso', c1: '#d4af37', c2: '#0b0f19' };
  const label = (short ?? club?.short ?? '').slice(0, 3);
  const id = `cr-${label}-${c.c1.slice(1)}-${c.c2.slice(1)}-${c.pattern}`;
  const shapes: Record<string, string> = {
    escudo: 'M32 3 58 11v21c0 15-11 24-26 29C17 56 6 47 6 32V11z',
    clasico: 'M8 6h48v24c0 16-11 25-24 30C19 55 8 46 8 30z',
    circulo: 'M32 4a28 28 0 1 1 0 56a28 28 0 1 1 0-56z',
    diamante: 'M32 3 60 32 32 61 4 32z',
    rombo: 'M12 6h40l6 18-26 37L6 24z',
  };
  const d = shapes[c.shape] ?? shapes.escudo;
  const light = isLight(c.c1);
  let pattern: React.ReactNode = null;
  if (c.pattern === 'franja') pattern = <rect x="0" y="24" width="64" height="16" fill={c.c2} />;
  if (c.pattern === 'bastones') pattern = <g fill={c.c2}>{[8, 24, 40, 56].map((x) => <rect key={x} x={x - 4} y="0" width="8" height="64" />)}</g>;
  if (c.pattern === 'banda') pattern = <path d="M-6 50 50 -6 70 -6 6 64 -6 64z" fill={c.c2} />;
  if (c.pattern === 'mitad') pattern = <rect x="32" y="0" width="32" height="64" fill={c.c2} />;
  const textColor = c.pattern === 'liso' ? (light ? '#111' : '#fff') : '#fff';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ flex: '0 0 auto' }}>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="64" height="64" fill={c.c1} />
        {pattern}
      </g>
      <path d={d} fill="none" stroke="#d4af37" strokeOpacity="0.85" strokeWidth="2.5" />
      {label && size >= 26 && (
        <text x="32" y="38" textAnchor="middle" fontSize="15" fontWeight="800" fontFamily="Inter, sans-serif" fill={textColor} stroke={c.pattern === 'liso' ? 'none' : 'rgba(0,0,0,.55)'} strokeWidth="2.6" paintOrder="stroke">
          {label}
        </text>
      )}
    </svg>
  );
}

export function NationFlag({ code, size = 28 }: { code: string; size?: number }) {
  const colors: Record<string, [string, string, string?]> = {
    ARG: ['#74acdf', '#ffffff', '#74acdf'], BRA: ['#009c3b', '#ffdf00'], URU: ['#ffffff', '#0038a8'], COL: ['#fcd116', '#003893', '#ce1126'], CHI: ['#ffffff', '#d52b1e'], PAR: ['#d52b1e', '#ffffff', '#0038a8'], PER: ['#d91023', '#ffffff', '#d91023'], ECU: ['#ffd100', '#034ea2', '#ef3340'], VEN: ['#ffcc00', '#00247d', '#cf142b'], BOL: ['#d52b1e', '#f9e300', '#007934'],
    FRA: ['#0055a4', '#ffffff', '#ef4135'], ESP: ['#aa151b', '#f1bf00', '#aa151b'], ENG: ['#ffffff', '#ce1124'], GER: ['#000000', '#dd0000', '#ffce00'], ITA: ['#009246', '#ffffff', '#ce2b37'], POR: ['#006600', '#ff0000'], MEX: ['#006847', '#ffffff', '#ce1126'], USA: ['#3c3b6e', '#ffffff', '#b22234'],
  };
  const c = colors[code] ?? ['#2a3346', '#8a95a8'];
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 30 21" aria-hidden style={{ borderRadius: 3, flex: '0 0 auto', boxShadow: '0 0 0 1px rgba(255,255,255,.12)' }}>
      {c[2] ? (
        <>
          <rect width="30" height="7" fill={c[0]} />
          <rect y="7" width="30" height="7" fill={c[1]} />
          <rect y="14" width="30" height="7" fill={c[2]} />
        </>
      ) : (
        <>
          <rect width="30" height="21" fill={c[0]} />
          <rect y="7" width="30" height="7" fill={c[1]} />
        </>
      )}
      {code === 'ARG' && <circle cx="15" cy="10.5" r="2.2" fill="#f6b40e" />}
    </svg>
  );
}

function isLight(hex: string) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 170;
}

// ------------------------------------------------------------------ íconos
const P: Record<string, string> = {
  home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  inbox: 'M4 4h16v10h-4l-2 3h-4l-2-3H4zM4 14v6h16v-6',
  trophy: 'M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 13v4M8 20h8l-1-3H9z',
  shirt: 'M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c-1 2-2 3-4 3S9 5 8 3z',
  money: 'M3 6h18v12H3zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM6 9v.01M18 15v.01',
  landmark: 'M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M2 10h20L12 3z',
  building: 'M4 21V5l8-2v18M12 21V9l8 2v10M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  news: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  play: 'M7 5v14l11-7z',
  ff: 'M4 6v12l8-6zM12 6v12l8-6z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6 6 18',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 11a3 3 0 1 0 0-6M21 20c0-2.5-1.5-4.2-4-4.8',
  shield: 'M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  ball: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8l4 3-1.5 4.5h-5L8 11z',
  alert: 'M12 4 2 20h20zM12 10v4M12 17v.01',
};
export function Icon({ name, size = 20, stroke = 1.8, style }: { name: keyof typeof P | string; size?: number; stroke?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', ...style }} aria-hidden>
      <path d={P[name] ?? P.more} />
    </svg>
  );
}

// ------------------------------------------------------------------ indicadores
export function indColor(v: number, inverse = false) {
  const x = inverse ? 100 - v : v;
  if (x >= 65) return 'var(--green)';
  if (x >= 40) return 'var(--gold)';
  if (x >= 25) return 'var(--amber)';
  return 'var(--red)';
}
export function Bar({ value, inverse, color }: { value: number; inverse?: boolean; color?: string }) {
  return (
    <div className="bar">
      <i style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color ?? indColor(value, inverse) }} />
    </div>
  );
}
export function IndRow({ k, value, delta }: { k: IndKey; value: number; delta?: number }) {
  const info = IND_INFO[k];
  return (
    <div className="ind-row" title={info.desc}>
      <span className="name ellipsis">{info.name}</span>
      <span className="val" style={{ color: indColor(value, info.inverse) }}>
        {Math.round(value)}
        {delta ? <span className={`tiny ${delta > 0 !== !!info.inverse ? 'pos' : 'neg'}`}> {delta > 0 ? '▲' : '▼'}</span> : null}
      </span>
      <Bar value={value} inverse={info.inverse} />
    </div>
  );
}

export function Money({ v, sign, className }: { v: number; sign?: boolean; className?: string }) {
  return <span className={`num ${className ?? ''} ${sign ? (v > 0 ? 'pos' : v < 0 ? 'neg' : '') : ''}`}>{money(v, { sign })}</span>;
}

export function Form({ list }: { list: string[] }) {
  return (
    <span className="row gap-s">
      {list.length ? list.map((r, i) => <span key={i} className={`form-res ${r}`}>{r}</span>) : <span className="muted small">Sin partidos</span>}
    </span>
  );
}

export function KPI({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>{value}</div>
      {sub !== undefined && <div className="sub">{sub}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: React.ReactNode; hidden?: boolean }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.filter((t) => !t.hidden).map((t) => (
        <button key={t.id} role="tab" className={`tab ${t.id === value ? 'on' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, sub, onClose, children, footer, wide, closable = true }: { title?: React.ReactNode; sub?: React.ReactNode; onClose?: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean; closable?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && closable && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose, closable]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && closable && onClose?.()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal>
        {(title || closable) && (
          <div className="modal-h">
            <div className="grow">
              {title && <h2 style={{ fontSize: 19 }}>{title}</h2>}
              {sub && <div className="muted small mt-s">{sub}</div>}
            </div>
            {closable && onClose && (
              <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                <Icon name="x" size={18} />
              </button>
            )}
          </div>
        )}
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="toggle">
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        {desc && <div className="muted small">{desc}</div>}
      </div>
      <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} aria-label={label} />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Card({ title, right, children, className, tight }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; tight?: boolean }) {
  return (
    <div className={`card ${tight ? 'tight' : ''} ${className ?? ''}`}>
      {(title || right) && (
        <div className="card-title">
          {typeof title === 'string' ? <h3>{title}</h3> : title}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function OpinionChip({ v }: { v: number }) {
  const cls = v >= 30 ? 'green' : v >= 8 ? 'blue' : v > -8 ? '' : v > -40 ? 'amber' : 'red';
  return <span className={`chip ${cls}`}>{v > 0 ? '+' : ''}{Math.round(v)}</span>;
}

export const POS_LABEL = { POR: 'ARQ', DEF: 'DEF', MED: 'MED', DEL: 'DEL' } as const;
